import * as THREE from 'three';
import { setupScene } from './sceneSetup.js';
import { createRoad, updateRoad } from './roadManager.js';
import { createPlayer, setupPlayerControls, updatePlayer, getPlayerPosition } from './playerManager.js';
import { loadObstacles, updateObstacles, getScrollSpeed } from './obstacleManager.js';
import { loadTrees, updateTrees } from './treeManager.js';

let scene, camera, renderer;
let cameraMode = 'default'; // 'default' ou 'top'
let defaultCameraPosition;
let defaultLookAt = new THREE.Vector3(0, 0, 0);
const fixedTopCameraZ = 4; // posição Z aproximada da carrinha no início

function init() {
  const setup = setupScene(); 
  scene = setup.scene;
  camera = setup.camera;
  renderer = setup.renderer;

  // Guarda a posição e direção da câmara inicial
  defaultCameraPosition = camera.position.clone();
  defaultLookAt = new THREE.Vector3(0, 0, 0); // olha para o centro da estrada

  // Atalhos de teclado para mudar a câmara
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'l') {
      // Vista aérea fixa na lane do meio
      cameraMode = 'top';
      camera.position.set(0, 15, fixedTopCameraZ);
      camera.lookAt(0, 0, fixedTopCameraZ);
      updateCameraHint("Vista aérea (L)");
    }

    if (event.key.toLowerCase() === 'k') {
      // Repõe a vista inicial original (posição exata de arranque)
      cameraMode = 'default';
      camera.position.copy(defaultCameraPosition);
      camera.lookAt(defaultLookAt);
      updateCameraHint("Vista padrão (K)");
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

  document.getElementById('speed').textContent =
    'Velocidade: ' + getScrollSpeed().toFixed(2) + 'x';

  renderer.render(scene, camera);
}

// Atualiza o texto no canto inferior esquerdo com a vista ativa
function updateCameraHint(text) {
  const hintElement = document.getElementById('cameraHint');
  if (hintElement) {
    hintElement.textContent = 'Atalhos: [K] Vista Inicial | [L] Vista Aérea — ' + text;
  }
}

init();
