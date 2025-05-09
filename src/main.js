import * as THREE from 'three';
import { setupScene, toggleLight, setCameraMode, getActiveCamera } from './sceneSetup.js';
import { createRoad, updateRoad, toggleLights, getPostsLightsState } from './roadManager.js';
import { createPlayer, setupPlayerControls, updatePlayer, getPlayerPosition } from './playerManager.js';
import { loadObstacles, updateObstacles, getScrollSpeed } from './obstacleManager.js';
import { loadTrees, updateTrees } from './treeManager.js';

let scene, camera, renderer;

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

  const road = createRoad();
  scene.add(road);
  
  createPlayer(scene); // Carrega o jogador na cena
  setupPlayerControls(); // Configura os controlos do jogador

  loadObstacles(scene); // Carrega os obstáculos na cena
  loadTrees(scene); // Carrega as árvores na cena

  animate(); // Inicia a animação
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
    
    hintElement.textContent = `${cameraText} | Luzes: [1] Ambiente: ${ambient} | [2] Direcional: ${directional} | [3] Postes: ${streetLights}`;
  }
}

function animate() {
  requestAnimationFrame(animate);

  updatePlayer();     // <- aqui faz a carrinha deslizar  
  updateRoad();       // faz a estrada "andar"
  updateObstacles();  // Atualiza os obstáculos
  updateTrees();      // Atualiza as árvores

  document.getElementById('speed').textContent =
    'Velocidade: ' + getScrollSpeed().toFixed(2) + 'x';

  // Usa a câmera apropriada baseada no modo
  renderer.render(scene, getActiveCamera());
}

init();