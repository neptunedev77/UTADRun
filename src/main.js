import * as THREE from 'three';
import { setupScene, toggleLight, setCameraMode, getActiveCamera } from './sceneSetup.js';
import { createRoad, updateRoad, toggleLights, getPostsLightsState } from './roadManager.js';
import { createPlayer, setupPlayerControls, updatePlayer, getHeadlightsState } from './playerManager.js';
import { loadObstacles, updateObstacles, getScrollSpeed } from './obstacleManager.js';
import { loadTrees, updateTrees } from './treeManager.js';
import { createAnimatedHorse, updateAnimatedHorse } from './animatedHorse.js';
import { updateDistance, getDistance } from './distanceTracker.js';
import { loadDistanceSign, updateDistanceSign } from './distanceSignLoader.js';
import { createBeerCrate } from './beerCrateManager.js';

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

// Referência para o elemento da tela de carregamento
const loadingScreen = document.getElementById('loadingScreen');

// Função para mostrar/esconder a tela de carregamento
function setLoadingScreen(visible) {
  loadingScreen.style.display = visible ? 'flex' : 'none';
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
    setupPlayerControls();
    
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

/**
 * Atualiza a lógica do jogo com passo de tempo fixo
 * @param {number} deltaTime - Tempo desde a última atualização em segundos
 */
function updateGame(deltaTime) {
    if (!isGameActive || isPaused) return;

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
                `Pontuação: ${Math.floor(getDistance())}m | ` +
                `FPS: ${Math.round(fps)}`;
        }
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