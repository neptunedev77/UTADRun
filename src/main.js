import { setupScene } from './sceneSetup.js';
import { createRoad, updateRoad } from './roadManager.js';
import { createPlayer, setupPlayerControls, updatePlayer } from './playerManager.js';
import { loadObstacles, updateObstacles } from './obstacleManager.js';


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

  animate(); // Inicia a animação
}

let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastTime) / 1000; // segundos
  lastTime = now;

  updateObstacles(delta); // passa deltaTime
  updateRoad();
  updatePlayer();
  renderer.render(scene, camera);
}


init();
