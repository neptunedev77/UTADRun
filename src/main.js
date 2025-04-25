import { setupScene } from './sceneSetup.js';
import { createRoad, updateRoad } from './roadManager.js';
import { createPlayer, setupPlayerControls, updatePlayer } from './playerManager.js';
import { loadObstacles, updateObstacles, getScrollSpeed } from './obstacleManager.js';
import { loadTrees, updateTrees } from './treeManager.js';


let scene, camera, renderer;

function init() {
  const setup = setupScene(); 
  scene = setup.scene;
  camera = setup.camera;
  renderer = setup.renderer;

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
  updateRoad(); // faz a estrada "andar"
  updateObstacles(); // Atualiza os obstáculos
  updateTrees(); // Atualiza as árvores
  document.getElementById('speed').textContent = 'Velocidade: ' + getScrollSpeed().toFixed(2) + 'x';

  renderer.render(scene, camera);
}

init();
