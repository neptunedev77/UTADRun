import * as THREE from 'three';
import { setupScene, toggleLight, setCameraMode, getActiveCamera } from './sceneSetup.js';
import { updateClouds } from './sceneSetup.js';
import { createRoad, updateRoad, toggleLights, getPostsLightsState } from './roadManager.js';
import { createPlayer, setupPlayerControls, updatePlayer, getHeadlightsState, triggerCollisionAnimation, setBlockPlayerInput, isVanFlying, getFlyingStartTime, getFlyingDuration, getPlayerPosition, isVanDescending, getFlyingTimeLeft } from './playerManager.js';
import { loadObstacles, updateObstacles, getScrollSpeed } from './obstacleManager.js';
import { loadTrees, updateTrees } from './treeManager.js';
import { createAnimatedHorse, updateAnimatedHorse } from './animatedHorse.js';
import { updateDistance, getDistance } from './distanceTracker.js';
import { loadDistanceSign, updateDistanceSign } from './distanceSignLoader.js';
import { createBeerCrate } from './beerCrateManager.js';
import './easterEggConfetti.js';

// Configuração do jogo
const GAME_CONFIG = {
    FPS: 60,
    FIXED_TIMESTEP: 1 / 60,
    MAX_FRAME_TIME: 0.2,
    UI_UPDATE_INTERVAL: 100,
    MAX_PHYSICS_STEPS: 10
};

// Estado do jogo
let scene, camera, renderer;
let gameTime = 0;
let lastTime = 0;
let accumulator = 0;
let lastUIUpdate = 0;
let fps = 0;
let frameCount = 0;
let lastFpsUpdate = 0;
let isGameActive = false; // Inicia como falso até o jogador pressionar uma tecla
let isPaused = false;     // Variável para controlar o estado de pausa do jogo
let showHitboxes = false;
let playerLives = 3;
let isGameOver = false;
let blockPlayerInput = false;
let lastFlightTimeLeft = null;

// Referência para o elemento da tela de carregamento
const loadingScreen = document.getElementById('loadingScreen');

// --- ÁUDIO DE FUNDO DO CARRO ---
let carEngineAudio = null;
function setupCarEngineAudio() {
  if (!carEngineAudio) {
    carEngineAudio = new Audio('assets/audio/car_engine_loop.mp3');
    carEngineAudio.loop = true;
    carEngineAudio.volume = 0.35;
    carEngineAudio.preload = 'auto';
  }
}
function playCarEngineAudio() {
  if (carEngineAudio && carEngineAudio.paused) {
    carEngineAudio.currentTime = 0;
    carEngineAudio.play().catch(() => {});
  }
}
function pauseCarEngineAudio() {
  if (carEngineAudio && !carEngineAudio.paused) {
    carEngineAudio.pause();
  }
}
// --- FIM ÁUDIO DE FUNDO ---

// Função para mostrar/esconder a tela de carregamento
function setLoadingScreen(visible) {
  loadingScreen.style.display = visible ? 'flex' : 'none';
  updateHeartsUI();
}

// Função para renderizar a tela de carregamento
function renderLoadingScreen() {
  // Não é mais necessário renderizar nada aqui, pois usamos HTML/CSS
}

// Função para iniciar o jogo quando uma tecla for pressionada
function startGame() {
  if (!isGameActive) {
    isGameActive = true;
    lastTime = performance.now() / 1000;
    gameTime = 0;
    setLoadingScreen(false); // Esconde a tela de carregamento
    setupCarEngineAudio();
    playCarEngineAudio();
    console.log('Game started!');
  }
}

// Adicionar listener para teclado
document.addEventListener('keydown', startGame);

function init() {
  // Mostrar a tela de carregamento
  setLoadingScreen(true);
  
  // Inicializar cena do jogo
  const setup = setupScene(); 
  scene = setup.scene;
  camera = setup.camera;
  renderer = setup.renderer;
  
  // Configurar cor de fundo
  renderer.setClearColor(0x000000);

  // Carregar recursos do jogo em segundo plano
  setTimeout(() => {
    // Configurar controles do jogador
    setupPlayerControlsWithBlock();
    
    // Carregar elementos do jogo
    const road = createRoad();
    scene.add(road);
    
    createPlayer(scene);
    loadObstacles(scene);
    loadTrees(scene);
    createAnimatedHorse(scene);
    loadDistanceSign(scene);
    
    console.log('Game resources loaded, waiting for key press...');
  }, 100);
  
  // Atalhos de teclado para mudar a câmara e iluminação
  window.addEventListener('keydown', (event) => {
    // Tecla P para pausar/resumir o jogo
    if (event.key.toLowerCase() === 'p') {
      togglePause();
    }
    
    if (event.key.toLowerCase() === 'c') {
      // Toggle entre câmaras
      const currentMode = getActiveCamera() === camera ? 'orthographic' : 'default';
      setCameraMode(currentMode);
    }

    // Controlo de iluminação individual usando números
    if (event.key === '1') {
      toggleLight('ambient');
      updateLightingHint();
    }
    if (event.key === '2') {
      toggleLight('directional');
      updateLightingHint();
    }
    if (event.key === '3') {
      toggleLights(!getPostsLightsState());
      updateLightingHint();
    }

    if (event.key.toLowerCase() === 'h') {
      showHitboxes = !showHitboxes;
      if (!showHitboxes && window.clearHitboxes && scene) {
        window.clearHitboxes(scene);
      }
    }
  });

    window.addEventListener('headlightsToggled', () => {
    updateLightingHint();
  });

  // Já carregado no setTimeout
  updateLightingHint();
}

function updateLightingHint() {
  const hintElement = document.getElementById('cameraHint');
  if (hintElement) {
    const cameraText = getActiveCamera() === camera ? 
                       "[C] Câmara Perspetiva" : 
                       "[C] Câmara Ortográfica";
    const ambient = toggleLight('ambient', null, true) ? "ON" : "OFF";
    const directional = toggleLight('directional', null, true) ? "ON" : "OFF";
    const streetLights = getPostsLightsState() ? "ON" : "OFF";
    const headlights = getHeadlightsState() ? "ON" : "OFF";
    
    hintElement.textContent = 
      `${cameraText} | [P] Pausar | [H] Hitboxes | Luzes: [1] Ambiente: ${ambient}` +
      ` | [2] Direcional: ${directional}` +
      ` | [3] Postes: ${streetLights}` +
      ` | [4] Faróis: ${headlights}`;
  }
}

// Função para pausar o jogo
function togglePause() {
  if (isGameActive) {
    isPaused = !isPaused;
    updatePauseScreen();
    if (isPaused) {
      pauseCarEngineAudio();
    } else {
      playCarEngineAudio();
    }
    console.log(isPaused ? 'Game paused' : 'Game resumed');
  }
}

// Função para mostrar/esconder a tela de pausa
function updatePauseScreen() {
  let pauseScreen = document.getElementById('pauseScreen');
  
  if (!pauseScreen && isPaused) {
    // Criar a tela de pausa se não existir
    pauseScreen = document.createElement('div');
    pauseScreen.id = 'pauseScreen';
    pauseScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      font-family: Arial, sans-serif;
      z-index: 999;
    `;
    
    const pauseText = document.createElement('h2');
    pauseText.textContent = 'JOGO PAUSADO';
    pauseText.style.cssText = `
      font-size: 3em;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    `;
    
    pauseScreen.appendChild(pauseText);
    document.body.appendChild(pauseScreen);
  } else if (pauseScreen && !isPaused) {
    // Remover a tela de pausa
    pauseScreen.remove();
  }
}

function createHeartsUI() {
  let hearts = document.getElementById('heartsUI');
  if (!hearts) {
    hearts = document.createElement('div');
    hearts.id = 'heartsUI';
    hearts.style.cssText = `
      position: fixed;
      top: 24px;
      left: 24px;
      z-index: 1500;
      display: flex;
      gap: 16px;
      pointer-events: none;
      user-select: none;
    `;
    document.body.appendChild(hearts);
  }
}

function updateHeartsUI() {
  let hearts = document.getElementById('heartsUI');
  if (!hearts) return;
  // Limpa
  hearts.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const heart = document.createElement('span');
    heart.innerHTML = i < playerLives ? '❤️' : '🤍';
    heart.style.fontSize = '3em';
    heart.style.filter = i < playerLives ? '' : 'grayscale(1) opacity(0.5)';
    heart.style.transition = 'filter 0.2s';
    hearts.appendChild(heart);
  }
  // Esconde se game over ou loading
  hearts.style.display = (isGameOver || loadingScreen.style.display === 'flex') ? 'none' : 'flex';
}

// Chamar na inicialização e sempre que vidas mudam
createHeartsUI();
updateHeartsUI();

function showGameOverScreen() {
  isGameOver = true;
  isGameActive = false;
  setLoadingScreen(false);
  updatePauseScreen();
  updateHeartsUI();
  pauseCarEngineAudio();
  // Cria tela de Game Over
  let gameOverScreen = document.getElementById('gameOverScreen');
  if (!gameOverScreen) {
    gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'gameOverScreen';
    gameOverScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.85);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      font-family: Arial, sans-serif;
      z-index: 2000;
    `;
    const title = document.createElement('h1');
    title.textContent = 'GAME OVER';
    title.style.cssText = 'font-size: 4em; margin-bottom: 20px;';
    const score = document.createElement('p');
    score.id = 'finalScore';
    score.style.cssText = 'font-size: 2em; margin-bottom: 30px;';
    const restartBtn = document.createElement('button');
    restartBtn.textContent = 'Recomeçar';
    restartBtn.style.cssText = 'font-size: 1.5em; padding: 10px 30px; border-radius: 10px; border: none; background: #fff; color: #222; cursor: pointer;';
    restartBtn.onclick = restartGame;
    gameOverScreen.appendChild(title);
    gameOverScreen.appendChild(score);
    gameOverScreen.appendChild(restartBtn);
    document.body.appendChild(gameOverScreen);
  }
  // Atualiza a pontuação final
  document.getElementById('finalScore').textContent = `Pontuação: ${Math.floor(getDistance())}m`;
}

function hideGameOverScreen() {
  let gameOverScreen = document.getElementById('gameOverScreen');
  if (gameOverScreen) gameOverScreen.remove();
  updateHeartsUI();
}

function restartGame() {
  hideGameOverScreen();
  playerLives = 3;
  isGameOver = false;
  isGameActive = false;
  setLoadingScreen(true);
  updateHeartsUI();
  pauseCarEngineAudio();
  window.location.reload();
}

function loseLife() {
  if (isGameOver) return;
  playerLives--;
  updateHeartsUI();
  if (playerLives <= 0) {
    setBlockPlayerInput(true);
    triggerCollisionAnimation(0.7); // animação de colisão longa na última vida
    setTimeout(() => {
      showGameOverScreen();
      setBlockPlayerInput(false);
    }, 400); // atraso reduzido
  } else {
    triggerCollisionAnimation(0.35); // animação de colisão curta nas outras colisões
  }
}

/**
 * Atualiza a lógica do jogo com passo de tempo fixo
 * @param {number} deltaTime - Tempo desde a última atualização em segundos
 */
function updateGame(deltaTime) {
    if (!isGameActive || isPaused || isGameOver) return;

    // Atualiza o tempo total de jogo
    gameTime += deltaTime;
    
    // Atualiza a física do jogo com passo de tempo fixo
    let steps = 0;
    while (accumulator >= GAME_CONFIG.FIXED_TIMESTEP && steps < GAME_CONFIG.MAX_PHYSICS_STEPS) {
        // Atualiza a lógica do jogo com passo de tempo fixo
        updatePlayer(GAME_CONFIG.FIXED_TIMESTEP);
        updateRoad(GAME_CONFIG.FIXED_TIMESTEP);
        updateObstacles(GAME_CONFIG.FIXED_TIMESTEP, scene);
        updateAnimatedHorse(GAME_CONFIG.FIXED_TIMESTEP);
        updateDistance(GAME_CONFIG.FIXED_TIMESTEP);
        
        // Atualiza as árvores e o letreiro
        updateTrees(scene);
        updateDistanceSign();
        
        accumulator -= GAME_CONFIG.FIXED_TIMESTEP;
        steps++;
    }
    
    // Se estivermos atrasados, pula alguns frames para recuperar
    if (accumulator > GAME_CONFIG.FIXED_TIMESTEP * 2) {
        console.warn('Atraso na física do jogo, pulando frames...');
        accumulator = 0;
    }
    
    // Atualiza a UI com throttling
    updateUI();
}

/**
 * Atualiza a interface do utilizador
 */
function updateUI() {
    const currentTime = performance.now();
    
    // Atualiza a UI apenas a cada UI_UPDATE_INTERVAL ms
    if (currentTime - lastUIUpdate > GAME_CONFIG.UI_UPDATE_INTERVAL) {
        const speedElement = document.getElementById('speed');
        if (speedElement) {
            speedElement.textContent = 
                `Velocidade: ${getScrollSpeed().toFixed(2)}x | ` +
                `Pontuação: ${Math.floor(getDistance())}m | ` +
                `FPS: ${Math.round(fps)}`;
        }
        updateHeartsUI();
        updateFlightTimerUI();
        lastUIUpdate = currentTime;
    }
}

/**
 * Loop principal de renderização
 * @param {number} currentTime - Timestamp atual
 */
let lastFrameTime = performance.now();

function animate(currentTime) {
  // Garante que currentTime está definido
  currentTime = currentTime || performance.now();
  
  // Calcula o delta time em segundos e limita para evitar saltos grandes
  let deltaTime = (currentTime - lastFrameTime) / 1000;
  deltaTime = Math.min(deltaTime, GAME_CONFIG.MAX_FRAME_TIME);
  
  // Se o jogo estiver pausado, apenas atualiza o lastFrameTime para evitar saltos grandes
  // quando o jogo for resumido, mas continua renderizando a cena congelada
  if (isPaused) {
    requestAnimationFrame(animate);
    return;
  }
  
  // Atualiza o acumulador para a física
  accumulator += deltaTime;
  
  // Se o jogo não estiver ativo, mostra a tela de carregamento
  if (!isGameActive) {
    renderLoadingScreen();
  } else {
    // Se o jogo estiver ativo, atualiza a lógica e renderiza a cena
    updateFpsCounter(currentTime);
    
    // Atualiza a física do jogo
    updateGame(deltaTime);
    
    // Atualiza as nuvens
    updateClouds(deltaTime);
    
    // Renderiza a cena
    if (scene && camera) {
      renderer.render(scene, getActiveCamera());
      drawHitboxes();
    }
  }
  
  lastFrameTime = currentTime;
  // Agenda o próximo frame
  requestAnimationFrame(animate);
}

/**
 * Atualiza o contador de FPS
 * @param {number} currentTime - Timestamp atual
 */
function updateFpsCounter(currentTime) {
    frameCount++;
    
    // Atualiza o FPS a cada segundo
    if (currentTime - lastFpsUpdate >= 1000) {
        fps = frameCount * 1000 / (currentTime - lastFpsUpdate);
        frameCount = 0;
        lastFpsUpdate = currentTime;
    }
}

function drawHitboxes() {
  if (!showHitboxes || !scene) return;
  // Funções utilitárias para desenhar hitboxes
  if (window.drawVanHitbox) window.drawVanHitbox(scene);
  if (window.drawObstaclesHitboxes) window.drawObstaclesHitboxes(scene);
}

// Inicializa o jogo quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Inicializa a cena e o renderer primeiro
        init();
        
        // Configura o tempo inicial
        lastTime = performance.now();
        lastFpsUpdate = lastTime;
        
        // Inicia a animação
        requestAnimationFrame(animate);
        console.log('Jogo inicializado com sucesso! Pressione qualquer tecla para começar.');
    } catch (error) {
        console.error('Erro ao inicializar o jogo:', error);
        const errorElement = document.createElement('div');
        errorElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            padding: 20px;
            background: #ffebee;
            color: #c62828;
            font-family: Arial, sans-serif;
            z-index: 10000;
        `;
        errorElement.textContent = `Erro ao carregar o jogo: ${error.message}`;
        document.body.prepend(errorElement);
    }
});

export function setupPlayerControlsWithBlock() {
  window.addEventListener('keydown', (event) => {
    if (blockPlayerInput) {
      event.preventDefault();
      return;
    }
  }, true);
  setupPlayerControls();
}

export { loseLife };

function createFlightTimerUI() {
  let flightTimer = document.getElementById('flightTimerUI');
  if (!flightTimer) {
    flightTimer = document.createElement('div');
    flightTimer.id = 'flightTimerUI';
    flightTimer.style.cssText = `
      position: fixed;
      top: 32px;
      right: 48px;
      z-index: 2000;
      background: rgba(30, 30, 30, 0.85);
      color: #ffe066;
      font-family: Arial, sans-serif;
      font-size: 2.2em;
      font-weight: bold;
      padding: 10px 32px;
      border-radius: 16px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.25);
      pointer-events: none;
      user-select: none;
      text-align: center;
      display: none;
    `;
    document.body.appendChild(flightTimer);
  }
}

createFlightTimerUI();

function updateFlightTimerUI() {
  const flightTimer = document.getElementById('flightTimerUI');
  if (!flightTimer) return;
  if (isVanFlying()) {
    let timeLeft;
    if (isVanDescending()) {
      timeLeft = 0.0;
    } else {
      timeLeft = getFlyingTimeLeft();
    }
    flightTimer.textContent = `VOO: ${timeLeft.toFixed(1)}s`;
    flightTimer.style.display = 'block';
  } else {
    flightTimer.style.display = 'none';
  }
}