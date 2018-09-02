/************* MOVEMENT CODE *******************/

function destroyBlock(dir) {
  currentTile = g.getSpriteIndex(player);
  tileToDestroy = g.getAdjacentTile(currentTile, dir);
  aboveTile = g.getAdjacentTile(tileToDestroy.index, directions.up);

  // don't allow destroying the same block if it's already destroyed
  if(!destroyedBlocks.hash[tileToDestroy.index] && aboveTile.type !== g.tileTypes.floor) {

    spriteToDestroy = floors.find(el => {
      return el.index === tileToDestroy.index;
    })

    if(spriteToDestroy && spriteToDestroy.visible) {
      let adjust = 1;
      if(dir === 'dl') {
        adjust *= -1;
      }
      var line = g.line('yellow', 3, player.centerX + 10*adjust, player.centerY + 2, spriteToDestroy.centerX  + 2*adjust, spriteToDestroy.centerY - 16);
      g.wait(35, () => {
        g.remove(line)
      });
      // ga.line = function(strokeStyle, lineWidth, ax, ay, bx, by) {

      sound.blast();
      // Change the block type to air:
      world.children[0].data[tileToDestroy.index] = 1;
      // fade out the block:
      g.fadeOut(spriteToDestroy, 15);
      // store relevant data for the destroyed block:
      let blockData = {
        sprite: spriteToDestroy,
        tile: tileToDestroy,
        time: Date.now(),
        occupied: false,
        occupy: function() {
          this.occupied = true;
          world.children[0].data[this.tile.index] = 2;
        },
        vacate: function() {
          this.occupied = false;
          world.children[0].data[this.tile.index] = 1;
        },
      };
      addDestroyedBlock(blockData);
    }
  }
}

function respawnNextBlock() {
  let blockIndex = destroyedBlocks.queue[0];
  let blockData = destroyedBlocks.hash[blockIndex];
  if(blockIndex === player.currentTile) {
    sound.lose();
    player.dead = true;
    player.visible = false;
    setTimeout(function() {
      g.resume();
      g.state = lose
    }, 1500);
    g.pause();
  }
  removeDestroyBlock(blockData);
  world.children[0].data[blockData.tile.index] = 2;
  let tween = g.fadeIn(blockData.sprite, 6)
}

function addDestroyedBlock(bData) {
  // add the block data to easily accessible hash
  destroyedBlocks.hash[bData.tile.index] = bData;
  // add the block index to a queue to track respawn
  destroyedBlocks.queue.push(bData.tile.index);
}

function removeDestroyBlock(bData) {
  // shift block index from the queue, delete it from the hash
  delete destroyedBlocks.hash[destroyedBlocks.queue.shift()];
}

function respawnEnemy(eSprite) {
  eSprite.needsPath = true;
  eSprite.x = eSprite.spawnX;
  eSprite.y = eSprite.spawnY;
  eSprite.currentTile = g.getSpriteIndex(eSprite);
  eSprite.inHoleRef = undefined;
  eSprite.freshSpawn = true;
  eSprite.movement = {
    falling: false,
    moving: false,
    stuck: false,
    stuckAt: undefined,
    direction: directions.still,
  }
  eSprite.pathData = {
    path: null,
    updated: null,
    distance: null,
  }
  setTimeout(function(){
    eSprite.visible = true;
  }, 250);
  setTimeout(function(){
    eSprite.dead = false;
  }, 1000);
}

function canMoveFromTo(sprite, currentTile, destTile) {
  let dir = currentTile.index - destTile.index;
  switch(dir) {
    case 32:
      if(destTile.type && 
        currentTile.type === g.tileTypes.ladder && 
        destTile.type !== g.tileTypes.floor) {
        return true;
      }
    break;
    case -32:
      if(destTile.type && currentTile.type === g.tileTypes.ladder && destTile.type !== g.tileTypes.floor || 
        destTile.type && destTile.type === g.tileTypes.ladder ||
        destTile.type && sprite.movement.falling) {
        return true;
      }
    break;
    case -1:
      if(destTile.type && destTile.type !== g.tileTypes.floor) {
        return true;
      }
    break;
    case 1:
      if(destTile.type && destTile.type !== g.tileTypes.floor) {
        return true;
      }
    break;
    default:
      return false;
    break;
  }
}

function moveOneTile(sprite, currentTileIndex, dir) {
  // let adjacentTiles = g.getAdjacentTiles(currentTileIndex);
  let currentTile = g.getAdjacentTile(sprite.currentTile, directions.current);
  let moveToTile = g.getAdjacentTile(sprite.currentTile, dir);

  canMove = canMoveFromTo(sprite, currentTile, moveToTile);

  if(canMove) {
    let nextTileIndex = moveToTile.index;
    let currentCoords = g.getTile(currentTileIndex, world.objects[0].data, world);
    let nextCoords = g.getTile(nextTileIndex, world.objects[0].data, world);
    nextX = nextCoords.x;
    nextY = nextCoords.y;
    sprite.x = nextX;
    sprite.y = nextY;
    sprite.currentTile = nextTileIndex;
    return true;
  }
  // Prevent bug at bottom of map w/ infinite loop
  return false;
}

function teleportTo(sprite, tile) {
    nextCoords = g.getTile(tile, world.objects[0].data, world);
    nextX = nextCoords.x;
    nextY = nextCoords.y;
    sprite.x = nextX;
    sprite.y = nextY;
    return true;
}

function isFalling(sprite) {
  thisTile = g.getAdjacentTile(sprite.currentTile, directions.current);
  belowTile = g.getAdjacentTile(sprite.currentTile, directions.down);

  if(thisTile.type !== g.tileTypes.ladder && !belowTile.isStable && belowTile.index) {//adjacentTiles.d.type === g.tileTypes.air) {
    // sprite.movement.falling = true;
    return true;
  } else {
    // sprite.movement.falling = false;
    return false;
  }
}

function allowPlayerMoveAgain() {
  player.movement.moving = false;
}

function checkForPlayerKill(enemy){
  if(enemy.currentTile === player.currentTile) {
    console.log('DEV ONLY: You Died!');
    sound.lose();
    player.dead = true;
    setTimeout(function() {
      g.resume();
      g.state = lose
    }, 1500);
    g.pause();
  }
}

function checkForFallenIntoBlock(enemy) {
  let occupiedBlock = destroyedBlocks.hash[enemy.currentTile];
  if(occupiedBlock) {
    // console.log('Stuck and occupied');
    enemy.makeStuck(occupiedBlock);
    occupiedBlock.occupy();
  }
}

function getOutOfHole(enemy) {
  if(!enemy.dead && destroyedBlocks.hash[enemy.inHoleRef.tile.index]) {
    enemy.inHoleRef.vacate();
    enemy.unStick();
  } else {
    enemy.dead = true;
    enemy.visible = false;
    respawnEnemy(enemy);
  }
}

function moveEnemy(enemy) {
  if(enemy.freshSpawn) {
    enemy.movement.falling = isFalling(enemy);
    enemy.freshSpawn = false;
  }
  // Everything happens in !moving, to save resources
  if(!enemy.movement.moving) {
    // Make sure we're not falling now...
    if(!enemy.movement.stuck) {
      enemy.movement.falling = isFalling(enemy);
    }

    // Figure out if enemy needs path
    if(!enemy.movement.falling && enemy.needsPath) {
      if(enemy.movement.stuck) {
        enemy.currentTile -= 32;
      }

      if(config.difficulty === config.difficulties.hard) {
        enemy.pathData = dijkstra2.shortestPath(enemy.currentTile, player.movement.falling ? player.landingTile : player.currentTile);
      } else {
        enemy.pathData = dijkstra2.shortestPath(enemy.currentTile, player.currentTile);        
      }
      enemy.needsPath = false;
    }
    if(!enemy.movement.falling && Date.now() - enemy.pathData.updated > config.pathUpdateFrequency) {
      enemy.needsPath = true;
    }

    if (enemy.movement.stuck) {
      if(Date.now() - enemy.movement.stuckAt > config.enemyUnstuckSpeed) {
        getOutOfHole(enemy);
      }
    }

    // if(!nextTile && eSprite.pathData.distance !== Infinity) {
    //   eSprite.needsPath = true;
    // }

    let enemyDidMove = false;
    let nextTile = enemy.pathData.path ? enemy.pathData.path[1] : undefined;

    if(!enemy.movement.stuck) {
      if(enemy.movement.falling) {
        // Prevent enemies falling into the same hole.
        if(destroyedBlocks.hash[enemy.currentTile + 32] && !destroyedBlocks.hash[enemy.currentTile + 32].occupied
          || !destroyedBlocks.hash[enemy.currentTile + 32]) {
          enemyDidMove = moveOneTile(enemy, enemy.currentTile, directions.down);
        }
      } else if (nextTile) {
        // Prevent enemies from climbing straight up and falling back into the hole
        if(enemy.climbingOut && (enemy.currentTile === nextTile || enemy.currentTile - 32 === nextTile)) {
          nextTile += Math.random() < 0.5 ? -1 : 1;
        }
        enemy.movement.direction = getEnemyMoveDir(enemy.currentTile, nextTile);
        enemyDidMove = moveOneTile(enemy, enemy.currentTile, enemy.movement.direction);
      }

      if(enemyDidMove) {
        !enemy.movement.falling && enemy.pathData.path ? enemy.pathData.path.shift() : '';
        
        enemy.movement.moving = true;
        g.wait(config.enemyMoveSpeed, enemy.allowMoveAgain);
      }
    }
    if(!enemy.movement.stuck) {
      enemy.movement.falling = isFalling(enemy);
    }
  }

  function getEnemyMoveDir(cT, nT) {
    if(nT < cT) {
      // moving l/u
      if(nT + 1 === cT) {
        return directions.left;
      } else {
        return directions.up;
      }
    } else if (nT > cT) {
      // moving r/d
      if(nT - 1 === cT) {
        return directions.right;
      } else {
        return directions.down;
      }
    }
  }

}

function movePlayer() {
  if(player.freshSpawn) {
    player.movement.falling = isFalling(player);
    player.freshSpawn = false;
  }
  if(!player.movement.moving) {
    let playerDidMove;

    if(player.movement.falling) {
      playerDidMove = moveOneTile(player, player.currentTile, directions.down);
    } else if (player.movement.direction !== directions.still) {
      playerDidMove = moveOneTile(player, player.currentTile, player.movement.direction);
    }


    if(playerDidMove) {
      sound.move();
      player.movement.moving = true;
      g.wait(config.playerMoveSpeed, allowPlayerMoveAgain);
    }

    player.movement.falling = isFalling(player);
    if(player.movement.falling && !player.landingTile) {
      idx = player.currentTile;
      while(!world.tileTypes[world.objects[0].data[idx] - 1].isStable) {
        idx += 32;
      }
      player.landingTile = idx - 32;
      console.log('landingtile', player.landingTile);
    } else if(!player.movement.falling) {
      player.landingTile = undefined;
    }
  }
}

//The `play` state
function play() {
  // player.currentTile will need setting.
  movePlayer();
  
  checkForBatteryPickup();
  checkForExitWin();


  enemies.forEach(enemy => {
    if(!enemy.dead) {
      // console.log(`Cycling for enemy ${enemy.id}`)
      moveEnemy(enemy);
      if(!enemy.movement.stuck) {
        checkForPlayerKill(enemy);
        checkForFallenIntoBlock(enemy);
      }
    }
  })

  checkForBlockRespawn();
}

function checkForBlockRespawn() {
  try {
    if (destroyedBlocks.queue.length && Date.now() - destroyedBlocks.hash[destroyedBlocks.queue[0]].time > config.blockRespawnSpeed) {
      respawnNextBlock();
    }
  } catch (err) {
    console.log('Block respawn error', err)
    console.log('Queue length', destroyedBlocks.queue.length);
    console.log('Queue', destroyedBlocks.queue);
    console.log('Hash', destroyedBlocks.hash);
  }
}

function checkForBatteryPickup() {
  if(batteryHash[player.currentTile] && batteryHash[player.currentTile].visible) {
    batteryHash[player.currentTile].visible = false;
    collectedBatteries++;
    sound.battery();
    console.log('COLLECTED A BATTERY');
    if(totalBatteries === collectedBatteries) {
      sound.doorOpen();
      doorsOpen();
      console.log('ALL BATTERIES GOTTEN');
    }
  }
}

function checkForExitWin() {
  if(!player.won && exitHash[player.currentTile] && exitHash[player.currentTile].canUse) {
    console.log('DEV ONLY: You Won!')
    player.won = true;
    sound.win();
    g.state = win;
  }
}
/************* MOVEMENT CODE **********************/