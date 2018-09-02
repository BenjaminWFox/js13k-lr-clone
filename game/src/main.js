//All of your game code will go here
 var g = ga(
  1024, 768, setup,
  [
    'world.json',
    'tileset.png',
  ]
);

document.getElementById('restart').addEventListener('click', ()=>{location.reload()});
/***********************************************************************************
General TODO List:

-- Implement level-end mechanic (direction UP @ door)

-- Add enemies

-- Add sounds

***********************************************************************************/

var config = {
  playerMoveSpeed: 150,
  enemyMoveSpeed: 250,
  blockRespawnSpeed: 3300,
  introTextFadein: 2000,
  pathUpdateFrequency: 500,
  enemyUnstuckSpeed: undefined, //see below
  difficulties: {
    easy: 'easy',
    normal: 'normal',
    hard: 'hard',
  },
  difficulty: undefined,
}
config.difficulty = config.difficulties.normal;
config.enemyUnstuckSpeed = config.blockRespawnSpeed / 3;

//Start the Ga engine
g.start();
//Declare your global variables (global to this game)
var dungeon, player, treasure, enemies, chimes, exit,
    healthBar, message, gameScene, gameOverScene, sound;
destroyedBlocks = {
  queue: [],
  hash: {},
}

holesWithEnemies = [];
batteryHash = {};
exitHash = {};
totalBatteries = 0;
collectedBatteries = 0;
enemies = [];

function lose() {
  gameScene.visible = false;
  gameOverScene.visible = true;
  titleScreen.visible = false
  endMessage.content = "Oh no! You're part of the building, now.";
  endMessage.x = 155;
  endMessage.y = g.canvas.height / 2 - 35;
}

function win() {
  gameScene.visible = false;
  titleScreen.visible = false
  gameOverScene.visible = true;
  endMessage.content = "You made it! Nice work!";
  endMessage.x = 300;
  endMessage.y = g.canvas.height / 2 - 35;
}

function title() {
  titleScreen.visible = true;
  gameScene.visible = false;
  gameOverScene.visible = false;
  introScene.visible = false;
}

function intro() {
  gameScene.visible = false;
  titleScreen.visible = false;
  gameOverScene.visible = false;
  introScene.visible = true;
  g.wait(config.introTextFadein, () => { introMessage2.visible = true });
  g.wait(config.introTextFadein * 2, () => { introMessage3.visible = true });
  g.wait(config.introTextFadein * 3, () => { introMessage4.visible = true });
}

//The `setup` function will run only once.
//Use it for initialization tasks
function setup() {

  class Sound {
    constructor(context) {
      this.context = context;
    }

    init() {
      this.oscillator = this.context.createOscillator();
      this.gainNode = this.context.createGain();

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.context.destination);
      this.oscillator.type = 'sine';
    }

    play(value, time) {
      this.init();

      this.oscillator.frequency.value = value;
      this.gainNode.gain.setValueAtTime(.5, this.context.currentTime);
              
      this.oscillator.start(time);
      this.stop(time);

    }

    stop(time) {
      this.gainNode.gain.exponentialRampToValueAtTime(0.001, time + .25);
      this.oscillator.stop(time + .25);
    }

    battery() {
      this.play(8000, this.context.currentTime);
    }

    move() {
      this.play(5, this.context.currentTime);
    }

    doorOpen() {
      this.play(261.63, this.context.currentTime + .25);
      this.play(329.63, this.context.currentTime + .35);
    }

    win() {
      this.play(261.63, this.context.currentTime + .25);
      this.play(329.63, this.context.currentTime + .35);
      this.play(392.00, this.context.currentTime + .45);
      this.play(523.25, this.context.currentTime + .55);
    }

    lose() {
      this.play(261.63, this.context.currentTime + .25);
      this.play(246.94, this.context.currentTime + .35);
      this.play(233.08, this.context.currentTime + .45);
    }

    blast() {
      this.play(185, this.context.currentTime + .25);
    }
  }
  let context = new (window.AudioContext || window.webkitAudioContext)();
  sound = new Sound(context);

  //Set the canvas border and background color
  g.canvas.style.border = "none";
  g.backgroundColor = "black";

  //Add some text for the game over message
  endMessage = g.text("Placeholder Text", "32px Consolas", "#15e815", 0, 0);
  //Create a `gameOverScene` group and add the message sprite to it
  gameOverScene = g.group(endMessage);
  //Make the `gameOverScene` invisible for now
  gameOverScene.visible = false;

  //Add some text for the game over message
  introMessage1 = g.text(
    "I'm glad you're coming on shift sir! That earthquake really messed up the building!", 
    "22px Consolas", "#15e815", 0, 0);
  introMessage1.x = 15;
  introMessage1.y = 150;
  introMessage2 = g.text(
    "Electronics are offline, batteries scattered, and the organic security is haywire!",
    "22px Consolas", "#15e815", 0, 0);
  introMessage2.x = 15;
  introMessage2.y = 185;
  introMessage2.visible = false;
  introMessage3 = g.text(
    "Barely enough juice to open the door. You'll need all the batteries to fix it up!",
    "22px Consolas", "#15e815", 0, 0);
  introMessage3.x = 15;
  introMessage3.y = 220;
  introMessage3.visible = false;
  introMessage4 = g.text(
    "You're the best Organic Electro-Chemical Technician we've got. You can do it! >>>",
    "22px Consolas", "#15e815", 0, 0);
  introMessage4.visible = false;
  introMessage4.x = 15;
  introMessage4.y = 255;
  //Create a `gameOverScene` group and add the message sprite to it
  introScene = g.group(introMessage1, introMessage2, introMessage3, introMessage4);
  //Make the `gameOverScene` invisible for now
  introScene.visible = false;

  //Add some text for the game over message
  titleMessageMain = g.text("---- OECT ----", "64px Consolas", "#15e815", 0, 0);
  titleMessageSub1 = g.text("By Ben Fox.", "32px Consolas", "#15e815", 0, 0);
  titleMessageSub2 = g.text("[ SPACE ] to page/pause.", "32px Consolas", "#15e815", 0, 0);
  titleMessageSub3 = g.text("[ A/D ] to blast the floor. [ ARROWS ] to move.", "32px Consolas", "#15e815", 0, 0);
  titleMessageMain.x = 250;
  titleMessageMain.y = 250;
  titleMessageSub1.x = 400;
  titleMessageSub1.y = 350;
  titleMessageSub2.x = 290;
  titleMessageSub2.y = 400;
  titleMessageSub3.x = 100;
  titleMessageSub3.y = 450;
  //Create a `gameOverScene` group and add the message sprite to it
  titleScreen = g.group(titleMessageMain, titleMessageSub1, titleMessageSub2, titleMessageSub3);
  //Make the `gameOverScene` invisible for now
  titleScreen.visible = false;

  world = g.makeTiledWorld('world.json', 'tileset.png');

  // DEV ONLY
  // world.objects[0].data.filter((el, idx) => {
  //   if(el===0)
  //     console.log(`WARNING: INDEX ${idx} HAS NO TILE`);
  //   return el === 0;
  // });

  //Create the `gameScene` group
  gameScene = g.group();

  // Create reference to level tiles
  exits = world.getObjects(g.tileTypes.door);
  // airs = world.getObjects(g.tileTypes.air);
  floors = world.getObjects(g.tileTypes.floor);
  ladders = world.getObjects(g.tileTypes.ladder);
  batteries = world.getObjects(g.tileTypes.battery);

  // Render level tiles
  exits.forEach(exit => {
    gameScene.addChild(exit);
    exit.canUse = false;
    exit.alpha = .25;
    exitHash[exit.index] = exit;
  })
  floors.forEach(floor => {
    gameScene.addChild(floor);
  })
  batteries.forEach(battery => {
    gameScene.addChild(battery);
    batteryHash[battery.index] = battery;
  })
  totalBatteries = Object.keys(batteryHash).length;
  // airs.forEach(air => {
  //   gameScene.addChild(air);
  // })
  ladders.forEach(ladder => {
    gameScene.addChild(ladder);
  })

  // pointer = g.pointer;

  // pointer.press = function() {
  //   const index = g.getIndex(pointer.centerX, pointer.centerY, 32, 32, 32);
  //   const currentCoords = g.getTile(index, world.objects[0].data, world);
  //   console.log(index, currentCoords.x, currentCoords.y);
  // }

  //Left arrow key `press` method
  directions = {
    up: 'u',
    down: 'd',
    left: 'l',
    right: 'r',
    current: 'c',
    still: 'still',
  }

  // movement = {
  //   falling: false,
  //   moving: false,
  //   direction: directions.still,
  // }

  // Create and render player
  function makePlayer(sX, sY) {
    let player = g.sprite({image: "tileset.png", x: 128, y: 0, width: 32, height: 32})
    player.spawnX = 32;
    player.spawnY = 704;
    player.x = player.spawnX;
    player.y = player.spawnY;
    player.dead = false;
    player.won = false;
    player.landingTile = undefined;
    player.movement = {
      falling: false,
      moving: false,
      direction: directions.still,
    }
    player.freshSpawn = true;
    player.currentTile = g.getSpriteIndex(player);
    return player;
  }
  player = makePlayer(32, 704)
  gameScene.addChild(player);

  function makeEnemy(sX, sY, id) {
    let enemy = g.sprite({image: "tileset.png", x: 160, y: 0, width: 32, height: 32})
    enemy.spawnX = sX;
    enemy.spawnY = sY;
    enemy.x = enemy.spawnX;
    enemy.y = enemy.spawnY;
    enemy.id = id;
    enemy.movement = {
      falling: false,
      moving: false,
      stuck: false,
      stuckAt: undefined,
      direction: directions.still,
    }
    enemy.allowMoveAgain = function() {
      enemy.movement.moving = false;
    }
    enemy.makeStuck = function(blockRef) {
      this.movement.moving = false;
      this.movement.falling = false;
      this.movement.stuck = true;
      this.inHoleRef = blockRef;
      this.movement.stuckAt = Date.now();
    }
    enemy.unStick = function() {
      this.movement.stuck = false;
      this.inHoleRef = undefined;
      this.movement.stuckAt = undefined;
      this.climbingOut = true;
    }
    enemy.climbingOut = false;
    enemy.currentTile = g.getSpriteIndex(enemy);
    enemy.dead = false;
    enemy.freshSpawn = true;
    enemy.inHoleRef = undefined;
    enemy.needsPath = true;
    enemy.pathData = {
      path: null,
      updated: null,
      distance: null,
    }
    return enemy;
  }

  // test enemy:
  // enemies.push(makeEnemy(416, 704, 1));

  enemies.push(makeEnemy(672, 256, 1));
  enemies.push(makeEnemy(0, 128, 2));
  enemies.push(makeEnemy(320, 352, 3));
  enemies.push(makeEnemy(288, 32, 4));
  enemies.push(makeEnemy(928, 704, 5));

  enemies.forEach(enemy => {
    gameScene.addChild(enemy);
  })

/******************* GRAPHING AND dijkstra ************************/
  levelGraph = makeLevelGraph();
  
  dijkstra2 = new Graph(levelGraph);

  function makeLevelGraph() {
    const graph = {};

    // There should be 48 tiles in the graph
    // object[n].index is the unique ID for this tile.
    objects = world.objects;

    for(let i = 1, len = objects.length; i < objects.length; i++) {
      let co = objects[i]
      if(co.name !== g.tileTypes.floor) {
        // Can re-enable this to omit some tiles from the graph.
        // But currently causes some undefined issues.
        ruleOut = {current: g.getAdjacentTile(co.index, 'c'), below: g.getAdjacentTile(co.index, 'd')}

        if(ruleOut.current.type !== g.tileTypes.ladder && !ruleOut.below.isStable) {
          // skip
        } else {
          graph[co.index] = {};
          // These should all be tiles which are walkable.
          adjTiles = g.getAdjacentTiles(co.index);
          if(canMoveFromTo(player, adjTiles.c, adjTiles.u)) {
            graph[co.index][adjTiles.u.index] = 1;
          }
          if(canMoveFromTo(player, adjTiles.c, adjTiles.d)) {
            graph[co.index][adjTiles.d.index] = 1;
          }
          if(canMoveFromTo(player, adjTiles.c, adjTiles.l)) {
            graph[co.index][adjTiles.l.index] = 1;
          }
          if(canMoveFromTo(player, adjTiles.c, adjTiles.r)) {
            graph[co.index][adjTiles.r.index] = 1;
          }
        }
      }
    }

    return graph;
  }
/******************* GRAPHING AND dijkstra ************************/

/******************* MESSAGING AND KEYS ************************/
  //You can also do it the long way, like this:
  g.key.space.press = function() {
    if (g.state === title) {
      g.state === 'temp';
      console.log('switch from title', titleScreen);

      g.shake(titleScreen, 16, false, 120);

      g.wait(2000, () => {
        g.state = intro;
      });
    } else if (g.state === intro) {
      g.state = play;
      console.log('switch from into');
      gameScene.visible = true;
      introScene.visible = false;
    } else if(g.state === play) {
      if(g.paused && !player.dead) {
        g.resume();
      } else {
        g.pause();
      }
    } else if (g.state === win || g.state === lose) {
      location.reload();
    }
  }
  g.key.rightArrow.press = function() {
    player.movement.direction = directions.right;
  };
  g.key.leftArrow.press = function() {
    player.movement.direction = directions.left;
  };
  g.key.upArrow.press = function() {
    player.movement.direction = directions.up;
  };
  g.key.downArrow.press = function() {
    player.movement.direction = directions.down;
  };
  g.key.a.press = function() {
    destroyBlock('dl');
  };
  g.key.d.press = function() {
    destroyBlock('dr');
  };

  g.key.rightArrow.release = function() {
    if(player.movement.direction === directions.right) {
      player.movement.direction = directions.still;
    }
  };
  g.key.leftArrow.release = function() {
    if(player.movement.direction === directions.left) {
      player.movement.direction = directions.still;
    }
  };
  g.key.upArrow.release = function() {
    if(player.movement.direction === directions.up) {
      player.movement.direction = directions.still;
    }
  };
  g.key.downArrow.release = function() {
    if(player.movement.direction === directions.down) {
      player.movement.direction = directions.still;
    }
  };
/******************* MESSAGING AND KEYS ************************/

  //set the game state to `play`
  g.state = title;
  // for dev:
  // g.state = play;
}

function doorsOpen() {
  exits.forEach(exit => {
    exit.alpha = 1;
    exit.canUse = true;
  })
}

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
  let currentTile = g.getAdjacentTile(currentTileIndex, directions.current);
  let moveToTile = g.getAdjacentTile(currentTileIndex, dir);

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
    } else {
      // console.log('Stuck!', enemy.currentTile, enemy.pathData);
    }


    // Figure out if enemy needs path
    if(!enemy.movement.falling && enemy.needsPath) {
      let adjust = 0;
      if(enemy.movement.stuck) {
        adjust = 32;
      }

      if(config.difficulty === config.difficulties.hard) {
        enemy.pathData = dijkstra2.shortestPath(enemy.currentTile - adjust, player.movement.falling ? player.landingTile : player.currentTile);
      } else {
        enemy.pathData = dijkstra2.shortestPath(enemy.currentTile - adjust, player.currentTile);
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
    let currentPathTile = enemy.pathData.path ? enemy.pathData.path[0] : undefined;
    let nextTile = enemy.pathData.path ? enemy.pathData.path[1] : undefined;

    if(!enemy.movement.stuck) {
      if(enemy.movement.falling) {
        // Prevent enemies falling into the same hole.
        if(destroyedBlocks.hash[enemy.currentTile + 32] && !destroyedBlocks.hash[enemy.currentTile + 32].occupied
          || !destroyedBlocks.hash[enemy.currentTile + 32]) {
          enemyDidMove = moveOneTile(enemy, enemy.currentTile, directions.down);
        }
      } else if (nextTile) {
        // console.log('Need to move', enemy.climbingOut, enemy.currentTile, currentPathTile, nextTile);
        // Prevent enemies from climbing straight up and falling back into the hole
        // if(enemy.climbingOut && (enemy.currentTile === nextTile || enemy.currentTile - 32 === nextTile)) {
        //   console.log('nextTile', nextTile);
        //   nextTile += Math.random() < 0.5 ? -1 : 1;
        //   console.log('nextTile', nextTile);
        // }
        enemy.movement.direction = getEnemyMoveDir(currentPathTile, nextTile);
        enemyDidMove = moveOneTile(enemy, currentPathTile, enemy.movement.direction);
        // console.log('enemyDidMove', enemyDidMove);
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
      
      while(!player.landingTile) {
        let tile = world.tileTypes[world.objects[0].data[idx] - 1];
        if(tile && tile.isStable) {
          player.landingTile = idx - 32;
        } else if (!tile) {
          player.landingTile = idx - 32;
        } else {
          idx += 32;  
        }
        console.log('idx', idx);
      }

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

/**************** DIJKSTRA CODE ******************/

/** from: https://github.com/mburst/dijkstras-algorithm/blob/master/dijkstras.js
 * Basic priority queue implementation. If a better priority queue is wanted/needed,
 * this code works with the implementation in google's closure library (https://code.google.com/p/closure-library/).
 * Use goog.require('goog.structs.PriorityQueue'); and new goog.structs.PriorityQueue()
 */

function PriorityQueue () {
  this._nodes = [];

  this.enqueue = function (priority, key) {
    this._nodes.push({key: key, priority: priority });
    this.sort();
  };
  this.dequeue = function () {
    return this._nodes.shift().key;
  };
  this.sort = function () {
    this._nodes.sort(function (a, b) {
      return a.priority - b.priority;
    });
  };
  this.isEmpty = function () {
    return !this._nodes.length;
  };
}

/**
 * Pathfinding starts here
 */
function Graph(vertices){
  var INFINITY = 1/0;
  this.vertices = vertices;

  this.addVertex = function(name, edges){
    this.vertices[name] = edges;
  };

  this.shortestPath = function (start, finish) {
    start = start.toString();
    finish = finish.toString();

    var nodes = new PriorityQueue(),
        distances = {},
        previous = {},
        path = [],
        smallest, vertex, neighbor, alt;

    for(vertex in this.vertices) {
      if(vertex === start) {
        distances[vertex] = 0;
        nodes.enqueue(0, vertex);
      }
      else {
        distances[vertex] = INFINITY;
        nodes.enqueue(INFINITY, vertex);
      }

      previous[vertex] = null;
    }

    while(!nodes.isEmpty()) {
      smallest = nodes.dequeue();

      if(smallest === finish) {
        path = [];

        while(previous[smallest]) {
          path.push(Number(smallest));
          smallest = previous[smallest];
        }

        break;
      }

      if(!smallest || distances[smallest] === INFINITY){
        continue;
      }

      for(neighbor in this.vertices[smallest]) {
        alt = distances[smallest] + this.vertices[smallest][neighbor];

        if(alt < distances[neighbor]) {
          distances[neighbor] = alt;
          previous[neighbor] = smallest;

          nodes.enqueue(alt, neighbor);
        }
      }
    }

    return {
      path: path.concat([Number(start)]).reverse(),
      distance: path.length,
      updated: Date.now(),
    }
  };
}
/**************** DIJKSTRA CODE ******************/
