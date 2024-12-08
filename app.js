class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(message, listener) {
    if (!this.listeners[message]) {
      this.listeners[message] = [];
    }
    this.listeners[message].push(listener);
  }

  emit(message, payload = null) {
    if (this.listeners[message]) {
      this.listeners[message].forEach((l) => l(message, payload));
    }
  }

  clear() {
    this.listeners = {};
  }
}

class GameObject {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dead = false;
    this.type = "";
    this.width = 0;
    this.height = 0;
    this.img = undefined;
  }

  rectFromGameObject() {
    return {
      top: this.y,
      left: this.x,
      bottom: this.y + this.height,
      right: this.x + this.width,
    };
  }

  draw(ctx) {
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }
}

class Hero extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 99;
    this.height = 75;
    this.type = "Hero";
    this.cooldown = 0;
    this.life = 3;
    this.points = 0;
    this.meteorCooldown = 0; // meteor 쿨타임(ms). 0이면 발사 가능
    this.speed = 5; // 이동 속도 추가
  }

  fire() {
    if (this.canFire()) {
      gameObjects.push(new Laser(this.x + 45, this.y - 10));
      this.cooldown = 500;
      let id = setInterval(() => {
        if (this.cooldown > 0) {
          this.cooldown -= 100;
        } else {
          clearInterval(id);
        }
      }, 100);
    }
  }

  canFire() {
    return this.cooldown === 0;
  }

  fireMeteor() {
    if (this.canFireMeteor()) {
      gameObjects.push(new MeteorBig(this.x + 45 - 32, this.y - 40));
      this.meteorCooldown = 10000; // 10초 쿨타임
      let id = setInterval(() => {
        if (this.meteorCooldown > 0) {
          this.meteorCooldown -= 1000;
        } else {
          clearInterval(id);
        }
      }, 1000);
    }
  }

  canFireMeteor() {
    return this.meteorCooldown === 0;
  }

  decrementLife() {
    this.life--;
    if (this.life === 0) {
      this.dead = true;
    }
  }

  incrementPoints() {
    this.points += 100;
  }
}

class Laser extends GameObject {
  constructor(x, y, width = 9, height = 33) {
    super(x, y);
    this.width = width;
    this.height = height;
    this.type = "Laser";
    this.img = laserImg;
    let id = setInterval(() => {
      if (this.y > 0) {
        this.y -= 15;
      } else {
        this.dead = true;
        clearInterval(id);
      }
    }, 100);
  }
}

// UFO 레이저
class UFOLaser extends GameObject {
  constructor(x, y, width = 15, height = 33) {
    super(x, y);
    this.width = width;
    this.height = height;
    this.type = "UFOLaser";
    this.img = ufoLaserImg;
    let id = setInterval(() => {
      if (this.y < canvas.height) {
        this.y += 10;
      } else {
        this.dead = true;
        clearInterval(id);
      }
    }, 100);
  }
}

// MeteorBig (영웅이 F키로 발사하는 강력한 투사체)
class MeteorBig extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 64;
    this.height = 64;
    this.type = "MeteorBig";
    this.img = meteorBigImg;
    let id = setInterval(() => {
      if (this.y > 0) {
        this.y -= 10;
      } else {
        this.dead = true;
        clearInterval(id);
      }
    }, 100);
  }
}

class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.type = "Enemy";
    this.exploding = false;
    this.speedY = 5;

    this.intervalId = setInterval(() => {
      if (!this.exploding) {
        if (this.y < canvas.height - this.height) {
          this.y += this.speedY;
        } else {
          this.dead = true;
          clearInterval(this.intervalId);
        }
      }
    }, 300);
  }

  draw(ctx) {
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }
}

class HelperShip extends GameObject {
  constructor(xOffset, yOffset) {
    super(0, 0);
    this.width = 50;
    this.height = 37.5;
    this.type = "Helper";
    this.xOffset = xOffset;
    this.yOffset = yOffset;

    this.fireInterval = setInterval(() => {
      if (!this.dead) {
        gameObjects.push(
          new Laser(this.x + this.width / 2 - 3, this.y, 6, 22)
        );
      } else {
        clearInterval(this.fireInterval);
      }
    }, 3000);
  }

  updatePosition(heroX, heroY) {
    this.x = heroX + this.xOffset;
    this.y = heroY + this.yOffset;
  }
}

class UFO extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 128;
    this.height = 64;
    this.type = "UFO";
    this.health = 70;

    // 이동 패턴용 변수들
    this.initialX = x; 
    // 이동 패턴: 중심(0), 왼(-25), 오른(+50), 다시 왼(-25) => 총 4단계
    this.movementPattern = [0, -100, +150, -100]; 
    this.movementIndex = 0; 

    this.fireInterval = setInterval(() => {
      if (!this.dead) {
        // UFO 레이저 발사
        gameObjects.push(new UFOLaser(this.x + this.width/2 - 4, this.y + this.height));
      } else {
        clearInterval(this.fireInterval);
        clearInterval(this.moveInterval);
      }
    }, 2000); // 2초마다 레이저 발사

    // 위치 이동 Interval (5초마다)
    this.moveInterval = setInterval(() => {
      if (this.dead) {
        clearInterval(this.moveInterval);
        return;
      }
      // 다음 패턴으로 이동
      this.movementIndex = (this.movementIndex + 1) % this.movementPattern.length;
      // 현재 패턴에 맞춰 위치 이동
      let offset = this.movementPattern[this.movementIndex];
      // offset을 기반으로 초기 위치 대비로만 이동
      this.x = this.initialX + offset;
    }, 5000); // 5초마다 위치 변경
  }

  takeDamage() {
    this.health -= 1;
    if (this.health <= 0) {
      this.dead = true;
      // UFO가 죽으면 이동 Interval 정리
      clearInterval(this.moveInterval);
    }
  }
}

const Messages = {
  KEY_EVENT_UP: "KEY_EVENT_UP",
  KEY_EVENT_DOWN: "KEY_EVENT_DOWN",
  KEY_EVENT_LEFT: "KEY_EVENT_LEFT",
  KEY_EVENT_RIGHT: "KEY_EVENT_RIGHT",
  KEY_EVENT_SPACE: "KEY_EVENT_SPACE",
  KEY_EVENT_F: "KEY_EVENT_F",
  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",
  GAME_END_LOSS: "GAME_END_LOSS",
  GAME_END_WIN: "GAME_END_WIN",
  KEY_EVENT_ENTER: "KEY_EVENT_ENTER",
  STAGE_CLEARED: "STAGE_CLEARED",
  UFO_HIT: "UFO_HIT"
};

let heroImg,
  enemyImg,
  laserImg,
  explosionImg,
  lifeImg,
  ufoImg,
  ufoLaserImg,
  meteorBigImg,
  canvas,
  ctx,
  gameObjects = [],
  hero,
  helper1,
  helper2,
  eventEmitter = new EventEmitter();

let gameLoopId = null;
let stage = 1;
let stageCleared = false;
let ufoSpawned = false;

// 추가: 스피드 부스트 관련 전역 변수
let canUseSpeedBoost = true;   // 스피드 부스트 사용 가능 여부
let speedBoostActive = false;  // 스피드 부스트가 현재 활성화 중인지 여부

function loadTexture(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = path;
    img.onload = () => {
      resolve(img);
    };
  });
}

function initGame() {
  stage = 1;
  stageCleared = false;
  ufoSpawned = false;
  gameObjects = [];
  eventEmitter.clear();

  createStageEnemies();
  createHeroAndHelpers();

  eventEmitter.on(Messages.KEY_EVENT_UP, () => {
    hero.y -= hero.speed; // hero.speed로 변경
  });
  eventEmitter.on(Messages.KEY_EVENT_DOWN, () => {
    hero.y += hero.speed; // hero.speed로 변경
  });
  eventEmitter.on(Messages.KEY_EVENT_LEFT, () => {
    hero.x -= hero.speed; // hero.speed로 변경
  });
  eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => {
    hero.x += hero.speed; // hero.speed로 변경
  });
  eventEmitter.on(Messages.KEY_EVENT_SPACE, () => {
    if (hero.canFire()) {
      hero.fire();
    }
  });
  eventEmitter.on(Messages.KEY_EVENT_F, () => {
    if (hero.canFireMeteor()) {
      hero.fireMeteor();
    }
  });

  // c키 이벤트 처리
  eventEmitter.on("KEY_EVENT_C", () => {
    // 스피드 부스트 발동 조건 체크
    if (canUseSpeedBoost && !speedBoostActive) {
      hero.speed = 10;
      speedBoostActive = true;
      canUseSpeedBoost = false;

      // 5초 후 속도 원상복귀
      setTimeout(() => {
        hero.speed = 5;
        speedBoostActive = false;
      }, 5000);

      // 15초 후 다시 스피드 부스트 사용 가능
      setTimeout(() => {
        canUseSpeedBoost = true;
      }, 15000);
    }
  });

  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
    // MeteorBig이 아닐 때만 발사체 제거
    if (first.type !== "MeteorBig") {
      first.dead = true; 
    }
  
    if (second.type === "Enemy") {
      second.dead = true; 
      hero.incrementPoints();
    } else if (second.type === "UFO") {
      eventEmitter.emit(Messages.UFO_HIT, { ufo: second });
    }
    checkStageClear();
  });

  eventEmitter.on(Messages.COLLISION_ENEMY_HERO, (_, { enemy }) => {
    enemy.dead = true;
    hero.decrementLife();
    if (isHeroDead())  {
      eventEmitter.emit(Messages.GAME_END_LOSS);
      return;
    }
    checkStageClear();
  });

  eventEmitter.on(Messages.UFO_HIT, (_, { ufo }) => {
    ufo.takeDamage();
    if (ufo.dead) {
      eventEmitter.emit(Messages.GAME_END_WIN);
    }
  });

  eventEmitter.on(Messages.GAME_END_WIN, () => {
    endGame(true);
  });

  eventEmitter.on(Messages.GAME_END_LOSS, () => {
    endGame(false);
  });

  eventEmitter.on(Messages.STAGE_CLEARED, () => {
    stageCleared = true;
    showStageClearMessage();
  });

  eventEmitter.on(Messages.KEY_EVENT_ENTER, () => {
    if (stageCleared && stage === 1) {
      stage = 2;
      startNextStage();
    } else if (stageCleared && stage === 2 && ufoSpawned) {
      resetGame();
    }
  });
}

function createHeroAndHelpers() {
  hero = new Hero(canvas.width / 2 - 45, canvas.height - canvas.height / 4);
  hero.img = heroImg;
  gameObjects.push(hero);

  helper1 = new HelperShip(-70, 20);
  helper1.img = heroImg;
  gameObjects.push(helper1);

  helper2 = new HelperShip(120, 20);
  helper2.img = heroImg;
  gameObjects.push(helper2);
}

function createStageEnemies() {
  if (stage === 1) {
    // 기존 스테이지1 적 배치 로직 그대로
    const MONSTER_TOTAL = 5;
    const MONSTER_WIDTH = MONSTER_TOTAL * 98;
    const START_X = (canvas.width - MONSTER_WIDTH) / 2;
    const STOP_X = START_X + MONSTER_WIDTH;

    for (let x = START_X; x < STOP_X; x += 98) {
      for (let y = 0; y < 50 * 5; y += 50) {
        const enemy = new Enemy(x, y);
        enemy.img = enemyImg;
        gameObjects.push(enemy);
      }
    }
  } else if (stage === 2) {
    // 동심원 형태로 여러 레이어를 만들어 적을 배치
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 4;

    // 원하는 만큼 레이어를 지정 (예: 3개의 레이어)
    // 각 레이어마다 적의 수(count)와 반경(radius)를 지정
    const rings = [
      { count: 15, radius: 200 }, // 가장 바깥쪽 원
      { count: 10, radius: 130 }, // 중간 원
      { count: 5,  radius: 60 }   // 가장 안쪽 원
    ];

    // 각 레이어별로 적 배치
    rings.forEach(ring => {
      for (let i = 0; i < ring.count; i++) {
        const angle = (2 * Math.PI / ring.count) * i;
        const x = centerX + ring.radius * Math.cos(angle);
        const y = centerY + ring.radius * Math.sin(angle);
        const enemy = new Enemy(x - 98 / 2, y - 50 / 2);
        enemy.img = enemyImg;
        gameObjects.push(enemy);
      }
    });
  }
}

function spawnUFO() {
  const ufoX = (canvas.width / 2) - 64;
  const ufoY = 50;
  let ufo = new UFO(ufoX, ufoY);
  ufo.img = ufoImg;
  gameObjects.push(ufo);
  ufoSpawned = true;
}

function drawGameObjects(ctx) {
  gameObjects.forEach((go) => go.draw(ctx));
}

function updateGameObjects() {
  if (stageCleared) return;

  const enemies = gameObjects.filter((go) => go.type === "Enemy");
  const lasers = gameObjects.filter((go) => go.type === "Laser" || go.type === "MeteorBig");
  const ufo = gameObjects.find((go) => go.type === "UFO" && !go.dead);
  const ufoLasers = gameObjects.filter((go) => go.type === "UFOLaser");

  helper1.updatePosition(hero.x, hero.y);
  helper2.updatePosition(hero.x, hero.y);

  // UFO 레이저와 영웅 충돌 체크
  ufoLasers.forEach((ul) => {
    const heroRect = hero.rectFromGameObject();
    if (intersectRect(heroRect, ul.rectFromGameObject())) {
      ul.dead = true;
      hero.decrementLife();
      if (isHeroDead()) {
        eventEmitter.emit(Messages.GAME_END_LOSS);
      }
    }
  });

  // 레이저 / 메테오 빅 vs 적/UFO
  lasers.forEach((l) => {
    enemies.forEach((m) => {
      if (intersectRect(l.rectFromGameObject(), m.rectFromGameObject())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, {
          first: l,
          second: m,
        });
      }
    });
    if (ufo && intersectRect(l.rectFromGameObject(), ufo.rectFromGameObject())) {
      eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, {
        first: l,
        second: ufo,
      });
    }
  });

  // 적 vs 영웅
  enemies.forEach((enemy) => {
    const heroRect = hero.rectFromGameObject();
    if (intersectRect(heroRect, enemy.rectFromGameObject())) {
      eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy });
    }
  });

  gameObjects = gameObjects.filter((go) => !go.dead);

  // 2스테이지에서 적 모두 처치 후 UFO 미출현시 UFO 스폰
  if (stage === 2 && !ufoSpawned && isEnemiesDead() && !stageCleared) {
    spawnUFO();
  }
}

function drawLife() {
  const START_POS = canvas.width - 180;
  for (let i = 0; i < hero.life; i++) {
    ctx.drawImage(lifeImg, START_POS + 45 * (i + 1), canvas.height - 37);
  }
}

function drawPoints() {
  ctx.font = "30px Arial";
  ctx.fillStyle = "red";
  ctx.textAlign = "left";
  drawText("Points: " + hero.points, 10, canvas.height - 20);
}

function drawText(message, x, y) {
  ctx.fillText(message, x, y);
}

function intersectRect(r1, r2) {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

function isHeroDead() {
  return hero.life <= 0;
}

function isEnemiesDead() {
  const enemies = gameObjects.filter((go) => go.type === "Enemy" && !go.dead);
  return enemies.length === 0;
}

function checkStageClear() {
  if (stage === 1) {
    if (isEnemiesDead() && !stageCleared && !ufoSpawned) {
      eventEmitter.emit(Messages.STAGE_CLEARED);
    }
  }
}

function displayMessage(message, color = "red") {
  ctx.font = "30px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

function endGame(win) {
  clearInterval(gameLoopId);
  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (win) {
      displayMessage(
        "Victory!!! Pew Pew... - Press [Enter] to start a new game Captain Pew Pew",
        "green"
      );
      stageCleared = true;
    } else {
      displayMessage(
        "You died !!! Press [Enter] to start a new game Captain Pew Pew"
      );
      stageCleared = true;
    }
  }, 200);
}

function showStageClearMessage() {
  clearInterval(gameLoopId);
  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    displayMessage("Stage Cleared! Press [Enter] to continue...", "yellow");
  }, 200);
}

function startNextStage() {
  stageCleared = false;
  gameObjects = [hero, helper1, helper2];
  createStageEnemies();
  gameLoopId = setInterval(gameLoop, 100);
}

function resetGame() {
  if (gameLoopId) {
    clearInterval(gameLoopId);
  }
  initGame();
  gameLoopId = setInterval(gameLoop, 100);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawPoints();
  drawLife();
  updateGameObjects();
  drawGameObjects(ctx);
}

window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");

  heroImg = await loadTexture("assets/player.png");
  enemyImg = await loadTexture("assets/enemyShip.png");
  laserImg = await loadTexture("assets/laserRed.png");
  explosionImg = await loadTexture("assets/laserGreenShot.png");
  lifeImg = await loadTexture("assets/life.png");
  ufoImg = await loadTexture("assets/enemyUFO.png");
  ufoLaserImg = await loadTexture("assets/laserGreen.png");
  meteorBigImg = await loadTexture("assets/meteorBig.png");

  initGame();
  gameLoopId = setInterval(gameLoop, 100);

  window.addEventListener("keyup", (evt) => {
    if (evt.key === "ArrowUp") {
      eventEmitter.emit(Messages.KEY_EVENT_UP);
    } else if (evt.key === "ArrowDown") {
      eventEmitter.emit(Messages.KEY_EVENT_DOWN);
    } else if (evt.key === "ArrowLeft") {
      eventEmitter.emit(Messages.KEY_EVENT_LEFT);
    } else if (evt.key === "ArrowRight") {
      eventEmitter.emit(Messages.KEY_EVENT_RIGHT);
    } else if (evt.keyCode === 32) {
      eventEmitter.emit(Messages.KEY_EVENT_SPACE);
    } else if (evt.key === "Enter") {
      eventEmitter.emit(Messages.KEY_EVENT_ENTER);
    } else if (evt.key === "f" || evt.key === "F") {
      eventEmitter.emit(Messages.KEY_EVENT_F);
    } else if (evt.key === "c" || evt.key === "C") {
      eventEmitter.emit("KEY_EVENT_C");
    }
  });
};
