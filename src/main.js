import { setupScene } from './sceneSetup.js';
import { createRoad } from './roadManager.js';
import { createPlayer, setupPlayerControls } from './playerManager.js';

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

  animate(); // Inicia a animação
}

function animate() { 
  requestAnimationFrame(animate); 
  renderer.render(scene, camera); 
}

init();
