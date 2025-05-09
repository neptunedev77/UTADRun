import * as THREE from 'three';

let ambientLight;
let directionalLight;
let lightStates = {
  ambient: true,
  directional: true
};
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
  const frustumSize = 30;
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

  // Luz ambiente - ajustada para um dia ensolarado (azul leve para simular luz do céu)
  ambientLight = new THREE.AmbientLight(0xc4d1ff, 0.4);
  ambientLight.visible = lightStates.ambient;
  scene.add(ambientLight);

  // Luz direcional - ajustada para simular o sol (mais intensa e amarelada)
  directionalLight = new THREE.DirectionalLight(0xfffacd, 1.2);
  directionalLight.position.set(0, 20, 10);
  directionalLight.castShadow = true; // Ativa sombras
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.visible = lightStates.directional;
  scene.add(directionalLight);

  // Ativar sombras no renderer
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  return { scene, camera, renderer };
}

export function getActiveCamera() {
  if (cameraMode === 'orthographic') {
    return orthographicCamera;
  } else {
    return camera;
  }
}

export function setCameraMode(mode) {
  cameraMode = mode;
  updateCameraHint();
}

// Função para ligar/desligar cada luz
export function toggleLight(type, value, justCheck = false) {
  if (justCheck) {
    return lightStates[type];
  }
  
  switch(type) {
    case 'ambient':
      lightStates.ambient = value !== undefined ? value : !lightStates.ambient;
      ambientLight.visible = lightStates.ambient;
      break;
    case 'directional':
      lightStates.directional = value !== undefined ? value : !lightStates.directional;
      directionalLight.visible = lightStates.directional;
      break;
  }
  
  if (!justCheck) {
    updateLightingHint();
  }
  
  return lightStates[type];
}

// Função que controla o texto das luzes
function getLightStatusText() {
  const ambient = lightStates.ambient ? "ON" : "OFF";
  const directional = lightStates.directional ? "ON" : "OFF";
  
  // Para obter acesso ao estado dos postes, importamos a variável do main.js
  let streetLightsStatus = "OFF";
  try {
    // Tenta acessar a variável global definida em main.js 
    if (window.streetLightsOn !== undefined) {
      streetLightsStatus = window.streetLightsOn ? "ON" : "OFF";
    }
  } catch (e) {
    // Se falhar, mantém como OFF
  }
  
  return `Luzes: [1] Ambiente: ${ambient} | [2] Direcional: ${directional} | [3] Postes: ${streetLightsStatus}`;
}

// Atualiza o texto no canto inferior esquerdo com a vista ativa
function updateCameraHint() {
  const hintElement = document.getElementById('cameraHint');
  if (hintElement) {
    const lightText = getLightStatusText();
    
    // Texto baseado na câmara atual
    let cameraText = "";
    if (cameraMode === 'orthographic') {
      cameraText = "[C] Câmara Ortogonal";
    } else {
      cameraText = "[C] Câmara Perspetiva";
    }
    
    hintElement.textContent = cameraText + ' | ' + lightText;
  }
}

// Função que atualiza o texto das luzes na UI
function updateLightingHint() {
  updateCameraHint();
}

// Supondo que o objeto do veículo se chama 'car'
if (cameraMode === 'orthographic') {
  orthographicCamera.position.x = car.position.x;
  orthographicCamera.position.z = car.position.z;
  orthographicCamera.lookAt(car.position.x, 0, car.position.z);
}