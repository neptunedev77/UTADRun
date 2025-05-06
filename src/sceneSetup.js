import * as THREE from 'three';

let pointLight;
let ambientLight;
let directionalLight;
let currentLightMode = 0; // 0: default, 1: point, 2: directional, 3: ambient
let camera;
let orthographicCamera;
let cameraMode = 'default';

export function setupScene() {
  const scene = new THREE.Scene();
  
  // Carregar a textura do céu
  const textureLoader = new THREE.TextureLoader();
  const skyTexture = textureLoader.load('assets/textures/sky.png');
  scene.background = skyTexture;

  // Câmera em perspectiva
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);

  // Câmera ortográfica
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 20;
  orthographicCamera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  orthographicCamera.position.set(0, 15, 0);
  orthographicCamera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Luz ambiente
  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Luz direcional
  directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  // PointLight (luz da carrinha)
  pointLight = new THREE.PointLight(0xffffff, 100, 70);
  pointLight.position.set(0, 2, 4); // Posição inicial similar à da carrinha
  pointLight.visible = false;
  scene.add(pointLight);

  return { scene, camera, renderer };
}

export function setCameraMode(mode) {
  cameraMode = mode;
  switch(mode) {
    case 'orthographic':
      updateCameraHint("Vista ortográfica (L)");
      break;
    case 'default':
      updateCameraHint("Vista padrão (K)");
      break;
  }
}

export function getActiveCamera() {
  return cameraMode === 'orthographic' ? orthographicCamera : camera;
}

export function setLightMode(mode) {
  currentLightMode = mode;
  
  // Reset all lights to default state
  ambientLight.intensity = 0.5;
  directionalLight.intensity = 0.8;
  pointLight.visible = false;
  
  switch(mode) {
    case 0: // Default (all lights)
      ambientLight.intensity = 0.5;
      directionalLight.intensity = 0.8;
      pointLight.visible = false;
      break;
    case 1: // PointLight only (luz da carrinha)
      ambientLight.intensity = 0.15;
      directionalLight.intensity = 0.05;
      pointLight.visible = true;
      break;
    case 2: // DirectionalLight only
      ambientLight.intensity = 0.3;
      directionalLight.intensity = 1.0;
      pointLight.visible = false;
      break;
    case 3: // AmbientLight only
      ambientLight.intensity = 1.0;
      directionalLight.intensity = 0.0;
      pointLight.visible = false;
      break;
  }
}

export function updatePointLightPosition(vanPosition) {
  if (pointLight && pointLight.visible) {
    pointLight.position.x = vanPosition.x;
    pointLight.position.z = vanPosition.z;
    pointLight.position.y = vanPosition.y + 1.5;
  }
}

// Atualiza o texto no canto inferior esquerdo com a vista ativa
function updateCameraHint(text) {
  const hintElement = document.getElementById('cameraHint');
  if (hintElement) {
    hintElement.textContent = 'Atalhos: [K] Vista Inicial | [L] Vista Ortográfica | [0] Iluminação: Padrão | [1] Iluminação: Luz da Carrinha | [2] Iluminação: DirectionalLight | [3] Iluminação: AmbientLight — ' + text;
  }
}