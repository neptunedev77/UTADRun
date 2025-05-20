import * as THREE from 'three';
import { setupScene, toggleLight, setCameraMode, getActiveCamera } from './sceneSetup.js';
import { createRoad, updateRoad, toggleLights, getPostsLightsState } from './roadManager.js';
import { createPlayer, setupPlayerControls, updatePlayer, getPlayerPosition, getHeadlightsState } from './playerManager.js';
import { loadObstacles, updateObstacles, getScrollSpeed } from './obstacleManager.js';
import { loadTrees, updateTrees } from './treeManager.js';
import { createAnimatedHorse, updateAnimatedHorse } from './animatedHorse.js';
import { updateDistance, getDistance } from './distanceTracker.js';
import { loadDistanceSign, updateDistanceSign } from './distanceSignLoader.js';

let scene, camera, renderer;
let lastTime = 0;

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
  
  createPlayer(scene); // Carrega o jogador na cena
  setupPlayerControls(); // Configura os controlos do jogador

  loadObstacles(scene); // Carrega os obstáculos na cena
  loadTrees(scene); // Carrega as árvores na cena
  createAnimatedHorse(scene); // Cria o cavalo animado
  loadDistanceSign(scene); // Carrega o letreiro de distância a partir do modelo FBX

  lastTime = performance.now();
  animate(); // Inicia a animação

  updateLightingHint();
}

// Função que atualiza o texto da interface com o estado das luzes
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

function animate(currentTime) {
  requestAnimationFrame(animate);
  
  if (!currentTime) currentTime = performance.now();
  const deltaTime = (currentTime - lastTime) / 1000; // Converte para segundos
  lastTime = currentTime;
  
  // Limita o delta time para evitar saltos grandes quando a aba está em background
  const clampedDeltaTime = Math.min(deltaTime, 0.1);

  updatePlayer(clampedDeltaTime);     // Atualiza a posição e rotação da carrinha
  updateRoad(clampedDeltaTime);       // Faz a estrada "andar"
  updateObstacles(clampedDeltaTime);  // Atualiza os obstáculos com delta time
  updateTrees(clampedDeltaTime, scene); // Atualiza as árvores
  updateAnimatedHorse(clampedDeltaTime); // Atualiza o cavalo animado
  updateDistance(clampedDeltaTime);   // Atualiza a distância percorrida
  updateDistanceSign();               // Atualiza o letreiro de distância

  document.getElementById('speed').textContent =
    'Velocidade: ' + getScrollSpeed().toFixed(2) + 'x | Distância: ' + Math.floor(getDistance()) + ' m';

  // Usa a câmera apropriada baseada no modo
  renderer.render(scene, getActiveCamera());
}

init();