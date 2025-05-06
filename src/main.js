import * as THREE from 'three';
import { setupScene, setLightMode, updatePointLightPosition, setCameraMode, getActiveCamera } from './sceneSetup.js';
import { createRoad, updateRoad } from './roadManager.js';
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
    if (event.key.toLowerCase() === 'l') {
      setCameraMode('orthographic');
    }

    if (event.key.toLowerCase() === 'k') {
      setCameraMode('default');
    }

    // Controles de iluminação
    if (event.key === '0') {
      setLightMode(0);
    }
    if (event.key === '1') {
      setLightMode(1);
    }
    if (event.key === '2') {
      setLightMode(2);
    }
    if (event.key === '3') {
      setLightMode(3);
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

function animate() {
  requestAnimationFrame(animate);

  updatePlayer();     // <- aqui faz a carrinha deslizar  
  updateRoad();       // faz a estrada "andar"
  updateObstacles();  // Atualiza os obstáculos
  updateTrees();      // Atualiza as árvores

  // Atualiza a posição da luz da carrinha
  const playerPos = getPlayerPosition();
  if (playerPos) {
    updatePointLightPosition(playerPos);
  }

  document.getElementById('speed').textContent =
    'Velocidade: ' + getScrollSpeed().toFixed(2) + 'x';

  // Usa a câmera apropriada baseada no modo
  renderer.render(scene, getActiveCamera());
}

init();
