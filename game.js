const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const levelEl = document.getElementById('level');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');

const world = {
  speed: 3,
  gravity: 0.15,
  tick: 0,
  score: 0,
  level: 1,
  gameOver: false,
  bgOffset: 0,
  high: Number(localStorage.getItem('rainboy-highscore') || 0),
  bossActive: false,
};

const player = { x: 140, y: 250, w: 56, h: 36, vy: 0 };
let dinos = [];
let obstacles = [];

function playBeep(freq = 440, time = 0.08, type = 'square') {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ac.destination);
    g.gain.value = 0.02;
    o.start();
    o.stop(ac.currentTime + time);
  } catch {}
}

function reset() {
  world.speed = 3;
  world.tick = 0;
  world.score = 0;
  world.level = 1;
  world.gameOver = false;
  world.bgOffset = 0;
  world.bossActive = false;
  player.y = 250;
  player.vy = 0;
  dinos = [];
  obstacles = [];
  statusEl.textContent = 'Catch dinos (+10), avoid obstacles!';
  highEl.textContent = `High Score: ${world.high}`;
}

function spawnDino(isBoss = false) {
  const y = 70 + Math.random() * (canvas.height - 140);
  dinos.push({
    x: canvas.width + 30,
    y,
    w: isBoss ? 70 : 40,
    h: isBoss ? 42 : 26,
    boss: isBoss,
    color: isBoss ? '#ffd93d' : `hsl(${Math.random() * 360},80%,55%)`
  });
  if (isBoss) {
    world.bossActive = true;
    statusEl.textContent = 'Boss dino appeared! Catch it for +50!';
  }
}

function spawnObstacle() {
  const type = Math.random() > 0.5 ? 'rock' : 'bird';
  const y = type === 'rock' ? canvas.height - 70 : 80 + Math.random() * 220;
  obstacles.push({ x: canvas.width + 30, y, w: type === 'rock' ? 34 : 44, h: type === 'rock' ? 42 : 28, type });
}

function collide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawBackground() {
  world.bgOffset = (world.bgOffset + world.speed * 0.6) % canvas.width;
  ctx.fillStyle = '#8de3ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = -1; i < 2; i++) {
    const x = i * canvas.width - world.bgOffset;
    ctx.fillStyle = '#c6ffd3';
    ctx.beginPath(); ctx.arc(x + 180, 420, 180, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 510, 430, 220, Math.PI, 2 * Math.PI); ctx.fill();
  }

  ctx.fillStyle = '#62cf7c';
  ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
}

function drawPlayer() {
  ctx.fillStyle = '#00b894';
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(player.x + 36, player.y + 8, 8, 8);
  ctx.fillStyle = '#000';
  ctx.fillRect(player.x + 40, player.y + 11, 3, 3);
  ctx.fillStyle = '#00b894';
  ctx.fillRect(player.x + 52, player.y + 13, 10, 9);
}

function drawDino(d) {
  ctx.fillStyle = d.color;
  ctx.fillRect(d.x, d.y, d.w, d.h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(d.x + d.w - 14, d.y + 6, 6, 6);
  if (d.boss) {
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(d.x + 8, d.y - 8, 54, 6);
  }
}

function drawObstacle(o) {
  if (o.type === 'rock') {
    ctx.fillStyle = '#676e7a';
    ctx.fillRect(o.x, o.y, o.w, o.h);
  } else {
    ctx.fillStyle = '#ff7675';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#ffd1d1';
    ctx.fillRect(o.x + 8, o.y + 8, 8, 8);
  }
}

function updateDifficulty() {
  world.level = 1 + Math.floor(world.score / 60);
  world.speed = Math.min(8, 3 + world.level * 0.4);
}

function updateHighScore() {
  if (world.score > world.high) {
    world.high = world.score;
    localStorage.setItem('rainboy-highscore', String(world.high));
  }
  highEl.textContent = `High Score: ${world.high}`;
}

function update() {
  if (world.gameOver) return;
  world.tick++;

  player.vy += world.gravity;
  player.y += player.vy;
  if (player.y < 10) { player.y = 10; player.vy = 0; }
  if (player.y + player.h > canvas.height - 36) {
    player.y = canvas.height - 36 - player.h;
    player.vy = 0;
  }

  const dinoInterval = Math.max(35, 120 - world.level * 10);
  const obsInterval = Math.max(50, 170 - world.level * 12);
  if (world.tick % dinoInterval === 0) spawnDino();
  if (world.tick % obsInterval === 0) spawnObstacle();

  if (!world.bossActive && world.score > 0 && world.score % 100 === 0 && world.tick % 60 === 0) {
    spawnDino(true);
  }

  dinos.forEach(d => d.x -= world.speed + (d.boss ? 0.8 : 1.3));
  obstacles.forEach(o => o.x -= world.speed + 1.8);

  dinos = dinos.filter(d => d.x + d.w > -20);
  obstacles = obstacles.filter(o => o.x + o.w > -20);

  for (let i = dinos.length - 1; i >= 0; i--) {
    if (collide(player, dinos[i])) {
      const pts = dinos[i].boss ? 50 : 10;
      world.score += pts;
      playBeep(dinos[i].boss ? 760 : 540, 0.09, 'triangle');
      if (dinos[i].boss) {
        world.bossActive = false;
        statusEl.textContent = 'Boss caught! +50 🔥';
      }
      dinos.splice(i, 1);
      updateDifficulty();
      updateHighScore();
    }
  }

  for (const o of obstacles) {
    if (collide(player, o)) {
      world.gameOver = true;
      statusEl.textContent = 'Game Over! Press Restart';
      playBeep(120, 0.2, 'sawtooth');
      updateHighScore();
      break;
    }
  }

  scoreEl.textContent = `Score: ${world.score}`;
  levelEl.textContent = `Level: ${world.level}`;
}

function draw() {
  drawBackground();
  drawPlayer();
  dinos.forEach(drawDino);
  obstacles.forEach(drawObstacle);

  if (world.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 42px Trebuchet MS';
    ctx.fillText('Game Over', canvas.width / 2 - 110, canvas.height / 2 - 10);
    ctx.font = 'bold 26px Trebuchet MS';
    ctx.fillText(`Final Score: ${world.score}`, canvas.width / 2 - 95, canvas.height / 2 + 35);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') player.vy -= 2.8;
  if (e.key === 'ArrowDown') player.vy += 2.8;
});

restartBtn.addEventListener('click', reset);

reset();
loop();