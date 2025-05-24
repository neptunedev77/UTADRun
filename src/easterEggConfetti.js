// Easter Egg: Explosão de confetis e texto ao detetar 'utad'

let confettiSequence = ['u', 't', 'a', 'd'];
let confettiCurrent = [];
let confettiActive = false;
let confettiParticles = [];
let confettiTextAlpha = 0;
let confettiFrame;
let confettiStartTime = 0;
const CONFETTI_DURATION = 4000;
const CONFETTI_COUNT = 120;

// Canvas do confetti
const confettiCanvas = document.createElement('canvas');
confettiCanvas.id = 'confettiEasterEggCanvas';
confettiCanvas.style.position = 'fixed';
confettiCanvas.style.top = '0';
confettiCanvas.style.left = '0';
confettiCanvas.style.pointerEvents = 'none';
confettiCanvas.style.zIndex = '2000';
document.body.appendChild(confettiCanvas);

function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}
resizeConfettiCanvas();
window.addEventListener('resize', resizeConfettiCanvas);

function randomColor() {
    const colors = ['#e53935', '#fbc02d', '#43a047', '#1e88e5', '#8e24aa', '#ffb300', '#00bcd4', '#ff4081'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function spawnConfetti() {
    confettiParticles = [];
    for (let i = 0; i < CONFETTI_COUNT; i++) {
        confettiParticles.push({
            x: Math.random() * confettiCanvas.width,
            y: -20 - Math.random() * 100,
            r: 6 + Math.random() * 8,
            color: randomColor(),
            speed: 2 + Math.random() * 4,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.2,
            sway: (Math.random() - 0.5) * 2
        });
    }
}

function drawConfetti() {
    const ctx = confettiCanvas.getContext('2d');
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    // Partículas
    for (let p of confettiParticles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r);
        ctx.restore();
    }
    // Texto central
    ctx.save();
    ctx.globalAlpha = confettiTextAlpha;
    ctx.font = 'bold 54px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#1e88e5';
    ctx.shadowBlur = 16;
    ctx.fillText('Computação Gráfica é fixe!', confettiCanvas.width/2, confettiCanvas.height/2);
    ctx.restore();
}

function animateConfetti() {
    let now = Date.now();
    let elapsed = now - confettiStartTime;
    // Fade in/out do texto
    if (elapsed < 600) confettiTextAlpha = elapsed / 600;
    else if (elapsed > CONFETTI_DURATION - 800) confettiTextAlpha = Math.max(0, 1 - (elapsed - (CONFETTI_DURATION - 800)) / 800);
    else confettiTextAlpha = 1;
    // Atualizar partículas
    for (let p of confettiParticles) {
        p.y += p.speed;
        p.x += Math.sin(p.y / 30) * p.sway;
        p.angle += p.spin;
        if (p.y > confettiCanvas.height + 20) {
            p.y = -20;
            p.x = Math.random() * confettiCanvas.width;
        }
    }
    drawConfetti();
    if (elapsed < CONFETTI_DURATION) {
        confettiFrame = requestAnimationFrame(animateConfetti);
    } else {
        confettiActive = false;
        confettiTextAlpha = 0;
        const ctx = confettiCanvas.getContext('2d');
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
}

function triggerConfettiEasterEgg() {
    if (!confettiActive) {
        confettiActive = true;
        confettiStartTime = Date.now();
        spawnConfetti();
        animateConfetti();
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key.length === 1) {
        confettiCurrent.push(e.key.toLowerCase());
        if (confettiCurrent.length > confettiSequence.length) {
            confettiCurrent.shift();
        }
        if (confettiCurrent.join('') === confettiSequence.join('')) {
            triggerConfettiEasterEgg();
        }
    }
});

// Permite remover o canvas se necessário
export function removeConfettiEasterEggCanvas() {
    if (confettiCanvas.parentNode) {
        confettiCanvas.parentNode.removeChild(confettiCanvas);
    }
    if (confettiFrame) {
        cancelAnimationFrame(confettiFrame);
    }
} 