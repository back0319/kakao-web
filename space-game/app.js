function loadTexture(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = path;
    img.onload = () => {
      resolve(img);
    };
  });
}

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
  const pattern = createStarPattern(ctx);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPlayerWithSupportShips(ctx, canvas, heroImg) {
  const mainScale = 1.0;
  const sideScale = 0.6;

  const mainWidth = heroImg.width * mainScale;
  const mainHeight = heroImg.height * mainScale;
  const sideWidth = heroImg.width * sideScale;
  const sideHeight = heroImg.height * sideScale;

  const centerX = canvas.width / 2;
  const baseY = canvas.height - canvas.height / 4;

  const mainCenterX = centerX;
  const mainCenterY = baseY + mainHeight / 2;

  const gap = 40;

  const sideCenterOffsetX = mainWidth / 2 + sideWidth / 2 + gap;

  const leftCenterX = mainCenterX - sideCenterOffsetX;
  const rightCenterX = mainCenterX + sideCenterOffsetX;
  const sideCenterY = mainCenterY + 20;

  const mainX = mainCenterX - mainWidth / 2;
  const mainY = mainCenterY - mainHeight / 2;

  const leftX = leftCenterX - sideWidth / 2;
  const leftY = sideCenterY - sideHeight / 2;

  const rightX = rightCenterX - sideWidth / 2;
  const rightY = sideCenterY - sideHeight / 2;

  ctx.drawImage(heroImg, mainX, mainY, mainWidth, mainHeight);
  ctx.drawImage(heroImg, leftX, leftY, sideWidth, sideHeight);
  ctx.drawImage(heroImg, rightX, rightY, sideWidth, sideHeight);
}

function createEnemies2(ctx, canvas, enemyImg) {
  const maxRows = 5;

  for (let row = 0; row < maxRows; row++) {
    const enemiesInRow = maxRows - row;
    const rowWidth = enemiesInRow * enemyImg.width;
    const startX = (canvas.width - rowWidth) / 2;
    const y = row * (enemyImg.height + 10);

    for (let i = 0; i < enemiesInRow; i++) {
      const x = startX + i * enemyImg.width;
      ctx.drawImage(enemyImg, x, y);
    }
  }
}

window.onload = async () => {
  const canvas = document.getElementById("myCanvas");
  const ctx = canvas.getContext("2d");

  const heroImg = await loadTexture("assets/player.png");
  const enemyImg = await loadTexture("assets/enemyShip.png");

  drawBackground(ctx, canvas);

  drawPlayerWithSupportShips(ctx, canvas, heroImg);

  createEnemies2(ctx, canvas, enemyImg);
};
