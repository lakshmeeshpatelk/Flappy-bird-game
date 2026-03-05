const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const pauseBtn = document.getElementById("pauseBtn");
const soundBtn = document.getElementById("soundBtn");
const difficultyBtns = Array.from(document.querySelectorAll(".difficulty-btn"));

const WORLD = {
    width: canvas.width,
    height: canvas.height,
    groundHeight: 92
};

const DIFFICULTY_SETTINGS = {
    easy: {
        gravity: 0.31,
        flapVelocity: -6.8,
        maxFallVelocity: 10.2,
        pipeWidth: 74,
        pipeGap: 190,
        pipeSpeed: 2.3,
        spawnEveryMs: 1650
    },
    normal: {
        gravity: 0.36,
        flapVelocity: -7.2,
        maxFallVelocity: 11,
        pipeWidth: 74,
        pipeGap: 170,
        pipeSpeed: 2.7,
        spawnEveryMs: 1500
    },
    hard: {
        gravity: 0.41,
        flapVelocity: -7.7,
        maxFallVelocity: 11.8,
        pipeWidth: 78,
        pipeGap: 150,
        pipeSpeed: 3.25,
        spawnEveryMs: 1320
    }
};

const SOUND_PREF_KEY = "flappy_sound_enabled";
const BEST_PREFIX = "flappy_best_score_";

const audio = {
    enabled: localStorage.getItem(SOUND_PREF_KEY) !== "false",
    ctx: null
};

const state = {
    phase: "ready",
    lastFrameTime: 0,
    spawnTimer: 0,
    score: 0,
    difficulty: "normal",
    best: 0,
    bird: {
        x: 96,
        y: WORLD.height * 0.42,
        radius: 15,
        velocityY: 0
    },
    pipes: []
};

state.best = loadBest(state.difficulty);
bestEl.textContent = String(state.best);
scoreEl.textContent = "0";
updateDifficultyButtons();
updatePauseButton();
updateSoundButton();

function getBestKey(difficulty) {
    return `${BEST_PREFIX}${difficulty}`;
}

function loadBest(difficulty) {
    return Number(localStorage.getItem(getBestKey(difficulty)) || 0);
}

function getSettings() {
    return DIFFICULTY_SETTINGS[state.difficulty];
}

function updateDifficultyButtons() {
    for (const button of difficultyBtns) {
        const active = button.dataset.difficulty === state.difficulty;
        button.classList.toggle("is-active", active);
    }
}

function updatePauseButton() {
    pauseBtn.textContent = state.phase === "paused" ? "Resume (P)" : "Pause (P)";
}

function updateSoundButton() {
    soundBtn.textContent = `Sound: ${audio.enabled ? "On" : "Off"}`;
    soundBtn.setAttribute("aria-pressed", String(audio.enabled));
    localStorage.setItem(SOUND_PREF_KEY, String(audio.enabled));
}

function updateBestLabel() {
    bestEl.textContent = String(state.best);
}

function updateScore(value) {
    state.score = value;
    scoreEl.textContent = String(state.score);
}

function resetBird() {
    state.bird.x = 96;
    state.bird.y = WORLD.height * 0.42;
    state.bird.velocityY = 0;
}

function startRound() {
    state.phase = "running";
    state.spawnTimer = 0;
    state.pipes = [];
    updateScore(0);
    resetBird();
    updatePauseButton();
}

function endRound() {
    if (state.phase !== "running") {
        return;
    }

    state.phase = "gameover";
    playHitSound();

    if (state.score > state.best) {
        state.best = state.score;
        updateBestLabel();
        localStorage.setItem(getBestKey(state.difficulty), String(state.best));
    }

    updatePauseButton();
}

function spawnPipe() {
    const settings = getSettings();
    const marginTop = 130;
    const marginBottom = WORLD.groundHeight + 130;
    const minCenter = marginTop + settings.pipeGap / 2;
    const maxCenter = WORLD.height - marginBottom - settings.pipeGap / 2;
    const centerY = minCenter + Math.random() * (maxCenter - minCenter);

    state.pipes.push({
        x: WORLD.width + 20,
        centerY,
        passed: false
    });
}

function handleInput() {
    if (state.phase === "paused") {
        return;
    }

    if (state.phase === "ready" || state.phase === "gameover") {
        startRound();
    }

    if (state.phase === "running") {
        state.bird.velocityY = getSettings().flapVelocity;
        playFlapSound();
    }
}

function setDifficulty(nextDifficulty) {
    if (!DIFFICULTY_SETTINGS[nextDifficulty] || state.difficulty === nextDifficulty) {
        return;
    }

    state.difficulty = nextDifficulty;
    state.best = loadBest(state.difficulty);
    updateBestLabel();
    updateDifficultyButtons();
}

function togglePause() {
    if (state.phase === "running") {
        state.phase = "paused";
        updatePauseButton();
        playPauseSound();
    } else if (state.phase === "paused") {
        state.phase = "running";
        updatePauseButton();
        playPauseSound();
    }
}

function toggleSound() {
    audio.enabled = !audio.enabled;
    updateSoundButton();
    if (audio.enabled) {
        initAudio();
        playTone(660, 0.08, "triangle", 0.05, 780);
    }
}

function intersectsPipe(pipe) {
    const settings = getSettings();
    const bird = state.bird;
    const inPipeX =
        bird.x + bird.radius > pipe.x &&
        bird.x - bird.radius < pipe.x + settings.pipeWidth;

    if (!inPipeX) {
        return false;
    }

    const topPipeBottom = pipe.centerY - settings.pipeGap / 2;
    const bottomPipeTop = pipe.centerY + settings.pipeGap / 2;

    const hitsTopPipe = bird.y - bird.radius < topPipeBottom;
    const hitsBottomPipe = bird.y + bird.radius > bottomPipeTop;
    return hitsTopPipe || hitsBottomPipe;
}

function updateWorld(deltaMs) {
    const settings = getSettings();
    const step = deltaMs / 16.6667;
    const bird = state.bird;

    state.spawnTimer += deltaMs;
    if (state.spawnTimer >= settings.spawnEveryMs) {
        state.spawnTimer = 0;
        spawnPipe();
    }

    bird.velocityY += settings.gravity * step;
    if (bird.velocityY > settings.maxFallVelocity) {
        bird.velocityY = settings.maxFallVelocity;
    }
    bird.y += bird.velocityY * step;

    if (bird.y - bird.radius <= 0 || bird.y + bird.radius >= WORLD.height - WORLD.groundHeight) {
        endRound();
    }

    for (let i = state.pipes.length - 1; i >= 0; i -= 1) {
        const pipe = state.pipes[i];
        pipe.x -= settings.pipeSpeed * step;

        if (!pipe.passed && pipe.x + settings.pipeWidth < bird.x) {
            pipe.passed = true;
            updateScore(state.score + 1);
            playScoreSound();
        }

        if (intersectsPipe(pipe)) {
            endRound();
        }

        if (pipe.x + settings.pipeWidth < -10) {
            state.pipes.splice(i, 1);
        }
    }
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    gradient.addColorStop(0, "#7fd4ff");
    gradient.addColorStop(0.65, "#b9ebff");
    gradient.addColorStop(1, "#d7f3ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    drawCloud(72, 86, 20);
    drawCloud(182, 136, 16);
    drawCloud(310, 92, 22);
}

function drawCloud(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r, y + 3, r * 0.9, 0, Math.PI * 2);
    ctx.arc(x + r * 2, y, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
}

function drawPipes() {
    const settings = getSettings();
    for (const pipe of state.pipes) {
        const topPipeHeight = pipe.centerY - settings.pipeGap / 2;
        const bottomPipeY = pipe.centerY + settings.pipeGap / 2;
        const bottomPipeHeight = WORLD.height - WORLD.groundHeight - bottomPipeY;

        ctx.fillStyle = "#2f9f4c";
        ctx.fillRect(pipe.x, 0, settings.pipeWidth, topPipeHeight);
        ctx.fillRect(pipe.x, bottomPipeY, settings.pipeWidth, bottomPipeHeight);

        ctx.fillStyle = "#1f6e34";
        ctx.fillRect(pipe.x - 4, topPipeHeight - 18, settings.pipeWidth + 8, 18);
        ctx.fillRect(pipe.x - 4, bottomPipeY, settings.pipeWidth + 8, 18);
    }
}

function drawGround() {
    const y = WORLD.height - WORLD.groundHeight;
    ctx.fillStyle = "#dfc47a";
    ctx.fillRect(0, y, WORLD.width, WORLD.groundHeight);

    ctx.fillStyle = "#c9ab5e";
    for (let x = 0; x < WORLD.width; x += 24) {
        ctx.fillRect(x, y + 20, 12, 7);
    }
}

function drawBird() {
    const bird = state.bird;
    const tilt = Math.max(-0.45, Math.min(0.9, bird.velocityY / 10));

    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(tilt);

    ctx.fillStyle = "#ffd64f";
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f4be25";
    ctx.beginPath();
    ctx.ellipse(-5, 3, 7, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(6, -5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.arc(7, -5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f08f23";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(22, 2);
    ctx.lineTo(12, 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawCenterMessage(title, subtitle) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(40, 210, WORLD.width - 80, 180);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 36px Trebuchet MS";
    ctx.fillText(title, WORLD.width / 2, 278);

    ctx.font = "20px Trebuchet MS";
    ctx.fillText(subtitle, WORLD.width / 2, 318);
}

function drawHUDText() {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(16, 38, 54, 0.35)";
    ctx.font = "bold 54px Trebuchet MS";
    ctx.fillText(String(state.score), WORLD.width / 2, 86);
}

function drawScene() {
    drawBackground();
    drawPipes();
    drawGround();
    drawBird();
    drawHUDText();

    if (state.phase === "ready") {
        drawCenterMessage("Flappy Bird", "Press Space or click to start");
    } else if (state.phase === "paused") {
        drawCenterMessage("Paused", "Press P or Pause button to resume");
    } else if (state.phase === "gameover") {
        drawCenterMessage("Game Over", "Press Space or click to retry");
    }
}

function gameLoop(timestamp) {
    if (!state.lastFrameTime) {
        state.lastFrameTime = timestamp;
    }

    const deltaMs = Math.min(34, timestamp - state.lastFrameTime);
    state.lastFrameTime = timestamp;

    if (state.phase === "running") {
        updateWorld(deltaMs);
    }

    drawScene();
    requestAnimationFrame(gameLoop);
}

function initAudio() {
    if (!audio.enabled) {
        return;
    }

    if (!audio.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            return;
        }
        audio.ctx = new AudioCtx();
    }

    if (audio.ctx.state === "suspended") {
        audio.ctx.resume().catch(() => {});
    }
}

function playTone(frequency, durationSec, type, gainLevel, glideTo) {
    if (!audio.enabled) {
        return;
    }

    initAudio();
    if (!audio.ctx) {
        return;
    }

    const now = audio.ctx.currentTime;
    const oscillator = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (glideTo) {
        oscillator.frequency.exponentialRampToValueAtTime(glideTo, now + durationSec);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainLevel, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    oscillator.connect(gain);
    gain.connect(audio.ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + durationSec + 0.01);
}

function playFlapSound() {
    playTone(520, 0.08, "triangle", 0.05, 390);
}

function playScoreSound() {
    playTone(680, 0.11, "square", 0.045, 910);
}

function playHitSound() {
    playTone(220, 0.19, "sawtooth", 0.05, 120);
}

function playPauseSound() {
    playTone(460, 0.08, "triangle", 0.04, 460);
}

canvas.addEventListener("pointerdown", () => {
    initAudio();
    handleInput();
});

pauseBtn.addEventListener("click", () => {
    initAudio();
    togglePause();
});

soundBtn.addEventListener("click", () => {
    initAudio();
    toggleSound();
});

for (const button of difficultyBtns) {
    button.addEventListener("click", () => {
        if (state.phase === "running" || state.phase === "paused") {
            return;
        }
        setDifficulty(button.dataset.difficulty);
    });
}

window.addEventListener("keydown", (event) => {
    if (event.code === "KeyP") {
        event.preventDefault();
        initAudio();
        togglePause();
        return;
    }

    if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        initAudio();
        handleInput();
    }
});

requestAnimationFrame(gameLoop);
