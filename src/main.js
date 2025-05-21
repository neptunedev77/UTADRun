import { setupScene, toggleLight, setCameraMode, getActiveCamera } from './sceneSetup.js';
import { createRoad, updateRoad, toggleLights, getPostsLightsState } from './roadManager.js';
import { createPlayer, setupPlayerControls, updatePlayer, getHeadlightsState } from './playerManager.js';
import { loadObstacles, updateObstacles, getScrollSpeed } from './obstacleManager.js';
import { loadTrees, updateTrees } from './treeManager.js';
import { createAnimatedHorse, updateAnimatedHorse } from './animatedHorse.js';
import { updateDistance, getDistance } from './distanceTracker.js';
import { loadDistanceSign, updateDistanceSign } from './distanceSignLoader.js';

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
let isGameActive = true;

function init() {
  const setup = setupScene(); 
  scene = setup.scene;
  camera = setup.camera;
  renderer = setup.renderer;

  // Atalhos de teclado para mudar a câmara e iluminação
  window.addEventListener('keydown', (event) => {
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
  });

    window.addEventListener('headlightsToggled', () => {
    updateLightingHint();
  });

  const road = createRoad();
  scene.add(road);
  
  createPlayer(scene);
  setupPlayerControls();

  loadObstacles(scene);
  loadTrees(scene);
  createAnimatedHorse(scene);
  loadDistanceSign(scene);
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
      `${cameraText} | Luzes: [1] Ambiente: ${ambient}` +
      ` | [2] Direcional: ${directional}` +
      ` | [3] Postes: ${streetLights}` +
      ` | [4] Faróis: ${headlights}`;
  }
}

/**
 * Atualiza a lógica do jogo com passo de tempo fixo
 * @param {number} deltaTime - Tempo desde a última atualização em segundos
 */
function updateGame(deltaTime) {
    if (!isGameActive) return;

    // Atualiza o tempo total de jogo
    gameTime += deltaTime;
    
    // Atualiza a física do jogo com passo de tempo fixo
    let steps = 0;
    while (accumulator >= GAME_CONFIG.FIXED_TIMESTEP && steps < GAME_CONFIG.MAX_PHYSICS_STEPS) {
        // Atualiza a lógica do jogo com passo de tempo fixo
        updatePlayer(GAME_CONFIG.FIXED_TIMESTEP);
        updateRoad(GAME_CONFIG.FIXED_TIMESTEP);
        updateObstacles(GAME_CONFIG.FIXED_TIMESTEP);
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
                `Distância: ${Math.floor(getDistance())}m | ` +
                `FPS: ${Math.round(fps)}`;
        }
        lastUIUpdate = currentTime;
    }
}

/**
 * Loop principal de renderização
 * @param {number} currentTime - Timestamp atual
 */
function render(currentTime) {
    requestAnimationFrame(render);
    
    if (!currentTime) currentTime = performance.now();
    
    // Calcula o delta time em segundos e limita para evitar saltos grandes
    let deltaTime = (currentTime - lastTime) / 1000;
    deltaTime = Math.min(deltaTime, GAME_CONFIG.MAX_FRAME_TIME);
    
    // Atualiza o contador de FPS
    updateFpsCounter(currentTime);
    
    // Atualiza o acumulador com o tempo decorrido
    accumulator += deltaTime;
    lastTime = currentTime;
    
    // Atualiza a lógica do jogo
    updateGame(deltaTime);
    
    // Renderiza a cena
    if (scene && camera) {
        renderer.render(scene, getActiveCamera());
    }
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

// Inicializa o jogo quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    try {
        init();
        lastTime = performance.now();
        lastFpsUpdate = lastTime;
        render(lastTime);
        console.log('Jogo inicializado com sucesso!');
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