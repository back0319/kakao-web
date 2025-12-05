// app.js

// ====================================
// 0. 공통 상수 및 이미지 로더
// ====================================
const LASER_WIDTH = 9;
const LASER_HEIGHT = 33;

// 이동 속도
const HERO_SPEED = 3;

// 일반 샷 쿨다운(ms) – 스페이스 연타 간격
const HERO_FIRE_COOLDOWN_MS = 300;

// 차지 관련
const CHARGE_THRESHOLD_MS = 300; // 이 이상 눌러야 차지 샷
const MAX_CHARGE_MS = 2000; // 최대 차지 시간
const MIN_PIERCE_ENEMIES = 2; // 최소 관통 수
const MAX_PIERCE_ENEMIES = 6; // 최대 관통 수

// 아이템 관련
const ITEM_SPAWN_INTERVAL_MS = 2000; // 2초마다 스폰 시도
const ITEM_SPEED = 8; // 아이템 하강 속도 (적보다 빠르게)

function loadTexture(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = path;
    img.onload = () => resolve(img);
  });
}

// ====================================
// 1. 배경(별 패턴)
// ====================================
let backgroundPattern = null;

function createStarPattern(ctx) {
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = 200;
  patternCanvas.height = 200;
  const pctx = patternCanvas.getContext("2d");

  pctx.fillStyle = "black";
  pctx.fillRect(0, 0, patternCanvas.width, patternCanvas.height);

  pctx.fillStyle = "white";
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * patternCanvas.width;
    const y = Math.random() * patternCanvas.height;
    const size = Math.random() * 2 + 1;
    pctx.fillRect(x, y, size, size);
  }

  return ctx.createPattern(patternCanvas, "repeat");
}

function drawBackground(ctx, canvas) {
  if (!backgroundPattern) {
    backgroundPattern = createStarPattern(ctx);
  }
  ctx.fillStyle = backgroundPattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ====================================
// 2. EventEmitter
// ====================================
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

// ====================================
// 3. 메시지 상수 정의
// ====================================
const Messages = {
  GAME_END_LOSS: "GAME_END_LOSS",
  GAME_END_WIN: "GAME_END_WIN",
  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",
  KEY_EVENT_ENTER: "KEY_EVENT_ENTER",
};

// ====================================
// 4. 전역 변수
// ====================================
let heroImg;
let enemyImg;
let laserRedImg;
let laserGreenImg;
let explosionRedImg;
let explosionGreenImg;
let lifeImg;
let shieldImg; // 실드 이미지
let supportLeftImg; // playerLeft.png
let supportRightImg; // playerRight.png

let canvas;
let ctx;
let gameObjects = [];
let hero;
let supportShips = [];
let eventEmitter = new EventEmitter();
let gameLoopId = null;
let itemSpawnLoopId = null;

// 방향키 상태
let keys = {
  up: false,
  down: false,
  left: false,
  right: false,
};

// ====================================
// 5. GameObject 기본 클래스
// ====================================
class GameObject {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dead = false;
    this.type = ""; // "Hero", "Enemy", "Laser", "Explosion", "SupportShip", "Item"
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
    if (!this.img) return;
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }
}

// ====================================
// 6. Hero – 메인 비행선 (life/points + 차지 + 실드)
// ====================================
class Hero extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 99;
    this.height = 75;
    this.type = "Hero";

    this.life = 3;
    this.points = 0;

    // 일반 샷 쿨다운
    this.lastFireTime = 0;

    // 차지 상태
    this.isCharging = false;
    this.chargeStartTime = 0;

    // 실드 상태
    this.hasShield = false;
  }

  // 일반 샷 쿨다운 체크
  canFireNormal() {
    const now = performance.now();
    return now - this.lastFireTime >= HERO_FIRE_COOLDOWN_MS;
  }

  fireNormal() {
    if (!this.canFireNormal()) return;

    const scale = 1;
    const laserX = this.x + this.width / 2 - (LASER_WIDTH * scale) / 2;
    const laserY = this.y - 10;
    gameObjects.push(new Laser(laserX, laserY, laserRedImg, 1, scale));

    this.lastFireTime = performance.now();
  }

  // 차지 샷 – 관통 수 + 크기
  fireCharged(chargeDurationMs) {
    const clamped = Math.min(
      Math.max(chargeDurationMs, CHARGE_THRESHOLD_MS),
      MAX_CHARGE_MS
    );

    // 관통 수 계산
    const ratioPierce =
      (clamped - CHARGE_THRESHOLD_MS) / (MAX_CHARGE_MS - CHARGE_THRESHOLD_MS);
    const pierce =
      MIN_PIERCE_ENEMIES +
      Math.round(ratioPierce * (MAX_PIERCE_ENEMIES - MIN_PIERCE_ENEMIES));
    const finalPierce = Math.max(
      MIN_PIERCE_ENEMIES,
      Math.min(pierce, MAX_PIERCE_ENEMIES)
    );

    // 크기(스케일) 계산
    const minScale = 1.0;
    const maxScale = 2.5;
    const scale = minScale + ratioPierce * (maxScale - minScale);

    const laserX = this.x + this.width / 2 - (LASER_WIDTH * scale) / 2;
    const laserY = this.y - 10;

    const chargedLaser = new Laser(
      laserX,
      laserY,
      laserRedImg,
      finalPierce,
      scale
    );
    gameObjects.push(chargedLaser);

    this.lastFireTime = performance.now();
  }

  decrementLife() {
    this.life--;
    if (this.life <= 0) {
      this.dead = true;
    }
  }

  incrementPoints() {
    this.points += 100;
  }

  draw(ctx) {
    // 기본 비행선
    super.draw(ctx);

    // 실드 표시 (hero 주변에 shield.png 오버레이)
    if (this.hasShield && shieldImg) {
      ctx.save();
      const padding = 10;
      ctx.globalAlpha = 0.7;
      ctx.drawImage(
        shieldImg,
        this.x - padding,
        this.y - padding,
        this.width + padding * 2,
        this.height + padding * 2
      );
      ctx.restore();
    }

    // 차지 이펙트
    if (this.isCharging) {
      const now = performance.now();
      const elapsed = now - this.chargeStartTime;
      const ratio = Math.max(0, Math.min(elapsed / MAX_CHARGE_MS, 1)); // 0~1

      const cx = this.x + this.width / 2;
      const cy = this.y - 10;

      const maxRadiusX = 30;
      const maxRadiusY = 50;
      const radiusX = 10 + maxRadiusX * ratio;
      const radiusY = 15 + maxRadiusY * ratio;

      ctx.save();
      ctx.fillStyle = "rgba(0, 255, 255, 0.4)";
      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ====================================
// 7. SupportShip – 보조 비행선 (초록 레이저 자동)
// ====================================
class SupportShip extends GameObject {
  constructor(heroRef, side, img) {
    super(0, 0);
    this.hero = heroRef;
    this.side = side; // "left" | "right"
    this.scale = 0.7;
    this.type = "SupportShip";
    this.img = img;

    this.width = this.hero.width * this.scale;
    this.height = this.hero.height * this.scale;

    this.fireInterval = setInterval(() => {
      if (this.dead) {
        clearInterval(this.fireInterval);
        return;
      }
      this.fire();
    }, 700);
  }

  updatePositionFromHero() {
    const mainX = this.hero.x;
    const mainY = this.hero.y;
    const mainW = this.hero.width;
    const gap = 20;

    if (this.side === "left") {
      this.x = mainX - this.width - gap;
    } else {
      this.x = mainX + mainW + gap;
    }
    this.y = mainY + 20;
  }

  fire() {
    this.updatePositionFromHero();

    const centerX = this.x + this.width / 2;
    const laserX = centerX - LASER_WIDTH / 2;
    const laserY = this.y - 10;

    gameObjects.push(new Laser(laserX, laserY, laserRedImg, 1, 1));
  }

  draw(ctx) {
    this.updatePositionFromHero();
    super.draw(ctx);
  }
}

// ====================================
// 8. Enemy – 적
// ====================================
class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.type = "Enemy";

    const id = setInterval(() => {
      if (this.dead) {
        clearInterval(id);
        return;
      }
      if (this.y < canvas.height - this.height) {
        this.y += 5;
      } else {
        clearInterval(id);
      }
    }, 300);
  }
}

// ====================================
// 9. Laser – 레이저 (관통 수 + 스케일)
// ====================================
class Laser extends GameObject {
  constructor(x, y, img, pierce = 1, scale = 1) {
    super(x, y);
    this.type = "Laser";
    this.img = img;

    this.width = LASER_WIDTH * scale;
    this.height = LASER_HEIGHT * scale;

    this.pierceRemaining = pierce;

    const id = setInterval(() => {
      if (this.dead) {
        clearInterval(id);
        return;
      }
      if (this.y > 0) {
        this.y -= 15;
      } else {
        this.dead = true;
        clearInterval(id);
      }
    }, 100);
  }
}

// ====================================
// 10. Explosion – 폭발
// ====================================
class Explosion extends GameObject {
  constructor(x, y, img) {
    super(x, y);
    this.width = 98;
    this.height = 98;
    this.type = "Explosion";
    this.img = img;

    setTimeout(() => {
      this.dead = true;
    }, 300);
  }
}

// ====================================
// 11. Item – 아이템 (실드 / 왼쪽 / 오른쪽 보조 비행선)
// ====================================
class Item extends GameObject {
  // effectType: "shield" | "leftSupport" | "rightSupport"
  constructor(x, y, img, effectType) {
    super(x, y);
    this.type = "Item";
    this.img = img;
    this.effectType = effectType;

    this.width = 40;
    this.height = 40;

    const id = setInterval(() => {
      if (this.dead) {
        clearInterval(id);
        return;
      }
      this.y += ITEM_SPEED;
      if (this.y > canvas.height) {
        this.dead = true;
        clearInterval(id);
      }
    }, 80);
  }
}

// ====================================
// 12. 충돌 판정
// ====================================
function intersectRect(r1, r2) {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

// ====================================
// 13. 적 / 영웅 생성
// ====================================
function createEnemies() {
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
}

function createHero() {
  hero = new Hero(canvas.width / 2 - 45, canvas.height - canvas.height / 4);
  hero.img = heroImg;
  gameObjects.push(hero);

  supportShips = []; // 처음에는 보조 비행선 없음
}

// ====================================
// 14. 점수 / 목숨 표시
// ====================================
function drawText(message, x, y) {
  ctx.fillText(message, x, y);
}

function drawPoints() {
  if (!hero) return;
  ctx.font = "30px Arial";
  ctx.fillStyle = "red";
  ctx.textAlign = "left";
  drawText("Points: " + hero.points, 10, canvas.height - 20);
}

function drawLife() {
  if (!hero) return;
  const START_POS = canvas.width - 180;
  for (let i = 0; i < hero.life; i++) {
    ctx.drawImage(lifeImg, START_POS + 45 * (i + 1), canvas.height - 37);
  }
}

function isHeroDead() {
  return !hero || hero.life <= 0;
}

function isEnemiesDead() {
  const enemies = gameObjects.filter((go) => go.type === "Enemy" && !go.dead);
  return enemies.length === 0;
}

// 활성화된 보조 비행선 여부
function hasActiveLeftSupport() {
  return supportShips.some((s) => s.side === "left" && !s.dead);
}
function hasActiveRightSupport() {
  return supportShips.some((s) => s.side === "right" && !s.dead);
}

// ====================================
// 15. 메시지 표시 + 게임 종료/재시작
// ====================================
function displayMessage(message, color = "red") {
  ctx.font = "30px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

function stopGameLoop() {
  if (gameLoopId) {
    clearInterval(gameLoopId);
    gameLoopId = null;
  }
}

function stopItemSpawnLoop() {
  if (itemSpawnLoopId) {
    clearInterval(itemSpawnLoopId);
    itemSpawnLoopId = null;
  }
}

function endGame(win) {
  stopGameLoop();
  stopItemSpawnLoop();

  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (win) {
      displayMessage("Victory!!! Press [Enter] to start a new game", "green");
    } else {
      displayMessage("You died !!! Press [Enter] to start a new game");
    }
  }, 200);
}

function resetGame() {
  stopGameLoop();
  stopItemSpawnLoop();
  eventEmitter.clear();

  gameObjects = [];
  supportShips = [];
  initGame();
  startGameLoop();
  startItemSpawnLoop();
}

// ====================================
// 16. 그리기 / 업데이트 / 이동 처리
// ====================================
function drawGameObjects(ctx) {
  gameObjects.forEach((go) => go.draw(ctx));
}

function updateGameObjects() {
  const enemies = gameObjects.filter((go) => go.type === "Enemy");
  const lasers = gameObjects.filter((go) => go.type === "Laser");
  const items = gameObjects.filter((go) => go.type === "Item");
  const supports = gameObjects.filter((go) => go.type === "SupportShip");

  // 레이저 vs 적 충돌
  lasers.forEach((l) => {
    enemies.forEach((m) => {
      if (
        !l.dead &&
        !m.dead &&
        intersectRect(l.rectFromGameObject(), m.rectFromGameObject())
      ) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, {
          first: l,
          second: m,
        });
      }
    });
  });

  // Hero vs Enemy 충돌
  if (hero && !hero.dead) {
    enemies.forEach((enemy) => {
      if (enemy.dead) return;
      const heroRect = hero.rectFromGameObject();
      const enemyRect = enemy.rectFromGameObject();
      if (intersectRect(heroRect, enemyRect)) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy });
      }
    });
  }

  // SupportShip vs Enemy 충돌 – 보조 비행선은 적에게 맞으면 즉시 사라짐
  supports.forEach((ship) => {
    if (ship.dead) return;
    const shipRect = ship.rectFromGameObject();
    enemies.forEach((enemy) => {
      if (enemy.dead) return;
      if (intersectRect(shipRect, enemy.rectFromGameObject())) {
        ship.dead = true;
        enemy.dead = true;
        hero.incrementPoints();

        let explosionImage = explosionRedImg;
        const explosion = new Explosion(enemy.x, enemy.y, explosionImage);
        gameObjects.push(explosion);
      }
    });
  });

  // Hero vs Item 충돌 – 아이템 효과 적용
  if (hero && !hero.dead) {
    items.forEach((item) => {
      if (item.dead) return;
      if (intersectRect(hero.rectFromGameObject(), item.rectFromGameObject())) {
        applyItemEffect(item);
        item.dead = true;
      }
    });
  }

  // dead 객체 제거
  gameObjects = gameObjects.filter((go) => !go.dead);
}

// 방향키에 따른 부드러운 이동 + 경계 처리
function handleMovement() {
  if (!hero || hero.dead) return;

  if (keys.up) hero.y -= HERO_SPEED;
  if (keys.down) hero.y += HERO_SPEED;
  if (keys.left) hero.x -= HERO_SPEED;
  if (keys.right) hero.x += HERO_SPEED;

  // 경계 처리
  if (hero.x < 0) hero.x = 0;
  if (hero.y < 0) hero.y = 0;
  if (hero.x > canvas.width - hero.width) {
    hero.x = canvas.width - hero.width;
  }
  if (hero.y > canvas.height - hero.height) {
    hero.y = canvas.height - hero.height;
  }
}

// ====================================
// 17. 아이템 스폰 및 효과 적용
// ====================================
function spawnRandomItem() {
  if (!hero || hero.dead) return;

  const possibleTypes = ["shield"];

  if (!hasActiveLeftSupport()) {
    possibleTypes.push("leftSupport");
  }
  if (!hasActiveRightSupport()) {
    possibleTypes.push("rightSupport");
  }

  if (possibleTypes.length === 0) return;

  const idx = Math.floor(Math.random() * possibleTypes.length);
  const effectType = possibleTypes[idx];

  let img = null;
  if (effectType === "shield") img = shieldImg;
  else if (effectType === "leftSupport") img = supportLeftImg;
  else if (effectType === "rightSupport") img = supportRightImg;

  if (!img) return;

  const x = Math.random() * (canvas.width - 40);
  const y = -40;
  const item = new Item(x, y, img, effectType);
  gameObjects.push(item);
}

function applyItemEffect(item) {
  if (!hero) return;

  if (item.effectType === "shield") {
    hero.hasShield = true;
  } else if (item.effectType === "leftSupport") {
    if (!hasActiveLeftSupport()) {
      const leftSupport = new SupportShip(hero, "left", supportLeftImg);
      supportShips.push(leftSupport);
      gameObjects.push(leftSupport);
    }
  } else if (item.effectType === "rightSupport") {
    if (!hasActiveRightSupport()) {
      const rightSupport = new SupportShip(hero, "right", supportRightImg);
      supportShips.push(rightSupport);
      gameObjects.push(rightSupport);
    }
  }
}

function startItemSpawnLoop() {
  stopItemSpawnLoop();
  itemSpawnLoopId = setInterval(() => {
    // 30% 확률 정도로 스폰 시도
    if (Math.random() < 0.5) {
      spawnRandomItem();
    }
  }, ITEM_SPAWN_INTERVAL_MS);
}

// ====================================
// 18. 키 이벤트 등록
//   - 방향키: 상태 플래그
//   - Space:
//       * keydown: 차지 시작
//       * keyup: 짧게 → 일반샷, 길게 → 차지샷
//   - Enter: 재시작
// ====================================
function registerKeyHandlers() {
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        keys.up = true;
        break;
      case "ArrowDown":
        e.preventDefault();
        keys.down = true;
        break;
      case "ArrowLeft":
        e.preventDefault();
        keys.left = true;
        break;
      case "ArrowRight":
        e.preventDefault();
        keys.right = true;
        break;
      case " ":
      case "Spacebar":
        e.preventDefault();
        if (!hero || hero.dead) return;
        if (!hero.isCharging) {
          hero.isCharging = true;
          hero.chargeStartTime = performance.now();
        }
        break;
      default:
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.key) {
      case "ArrowUp":
        keys.up = false;
        break;
      case "ArrowDown":
        keys.down = false;
        break;
      case "ArrowLeft":
        keys.left = false;
        break;
      case "ArrowRight":
        keys.right = false;
        break;
      case " ":
      case "Spacebar": {
        e.preventDefault();
        if (!hero || hero.dead) return;
        if (!hero.isCharging) return;

        const now = performance.now();
        const duration = now - hero.chargeStartTime;
        hero.isCharging = false;

        if (duration < CHARGE_THRESHOLD_MS) {
          hero.fireNormal(); // 연타용 일반 샷
        } else {
          hero.fireCharged(duration); // 차지 샷
        }
        break;
      }
      case "Enter":
        eventEmitter.emit(Messages.KEY_EVENT_ENTER);
        break;
      default:
        break;
    }
  });
}

// ====================================
// 19. initGame – 이벤트 핸들러 등록
// ====================================
function initGame() {
  createEnemies();
  createHero();

  // 레이저-적 충돌: 관통 처리 + 폭발 + 점수 + 승리 체크
  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
    const laser = first;
    const enemy = second;

    enemy.dead = true;
    hero.incrementPoints();

    let explosionImage = explosionRedImg;
    if (laser.img === laserRedImg) {
      explosionImage = explosionRedImg;
    }
    const explosion = new Explosion(enemy.x, enemy.y, explosionImage);
    gameObjects.push(explosion);

    if (typeof laser.pierceRemaining === "number") {
      laser.pierceRemaining -= 1;
      if (laser.pierceRemaining <= 0) {
        laser.dead = true;
      }
    } else {
      laser.dead = true;
    }

    if (isEnemiesDead()) {
      eventEmitter.emit(Messages.GAME_END_WIN);
    }
  });

  // Hero-Enemy 충돌: 실드 → 생명 순서
  eventEmitter.on(Messages.COLLISION_ENEMY_HERO, (_, { enemy }) => {
    enemy.dead = true;

    if (hero.hasShield) {
      hero.hasShield = false; // 실드 한 번 소모
    } else {
      hero.decrementLife();
    }

    if (isHeroDead()) {
      eventEmitter.emit(Messages.GAME_END_LOSS);
      return;
    }
    if (isEnemiesDead()) {
      eventEmitter.emit(Messages.GAME_END_WIN);
    }
  });

  // 승리/패배
  eventEmitter.on(Messages.GAME_END_WIN, () => {
    endGame(true);
  });
  eventEmitter.on(Messages.GAME_END_LOSS, () => {
    endGame(false);
  });

  // Enter로 재시작
  eventEmitter.on(Messages.KEY_EVENT_ENTER, () => {
    resetGame();
  });
}

// ====================================
// 20. 게임 루프
// ====================================
function startGameLoop() {
  stopGameLoop();
  gameLoopId = setInterval(() => {
    handleMovement();
    drawBackground(ctx, canvas);
    drawPoints();
    drawLife();
    updateGameObjects();
    drawGameObjects(ctx);
  }, 16); // ~60fps
}

// ====================================
// 21. window.onload – 초기화
// ====================================
window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");

  heroImg = await loadTexture("assets/player.png");
  enemyImg = await loadTexture("assets/enemyShip.png");
  laserRedImg = await loadTexture("assets/laserRed.png");
  laserGreenImg = await loadTexture("assets/laserGreen.png");
  explosionRedImg = await loadTexture("assets/laserRedShot.png");
  explosionGreenImg = await loadTexture("assets/laserGreenShot.png");
  lifeImg = await loadTexture("assets/life.png");
  shieldImg = await loadTexture("assets/shield.png");
  supportLeftImg = await loadTexture("assets/playerLeft.png");
  supportRightImg = await loadTexture("assets/playerRight.png");

  registerKeyHandlers();
  initGame();
  startGameLoop();
  startItemSpawnLoop();
};
