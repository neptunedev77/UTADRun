import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';
import { getScrollSpeed } from './obstacleManager.js';
import { setupLights, setupLightControls, updateLights, getLightState } from './lightManager.js';

const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('/assets/models/van/textures/van_03_a.png');

let targetX = 0;
let targetRotation = 0;
let van;
let currentLaneIndex = 1; // começa no meio
const lanePositions = [-2.5, 0, 2.5];

// Variáveis para controle de animação
let mixer;
let animations = [];
let isPlayingAnimation = false;

// Fator de suavização para movimento (valor maior = movimento mais rápido)
const movementSmoothness = 0.11; 
// Ângulo máximo de rotação durante curvas (em radianos)
const maxTurnAngle = Math.PI / 8;

export function createPlayer(scene) {
  const loader = new FBXLoader();

  loader.load('/assets/models/van/van.fbx', (fbx) => {
    van = fbx;
    van.scale.set(0.8, 0.8, 0.8);
    van.position.set(lanePositions[currentLaneIndex], 1, 4);
    van.rotation.y = Math.PI;

    van.traverse((child) => {
      if (child.isMesh) {
        // Only enable shadows for the main body of the van
        child.castShadow = child.name.includes('body') || child.name.includes('chassis');
        child.receiveShadow = true;
        child.material = new THREE.MeshStandardMaterial({
          map: texture,
          metalness: 0.2,
          roughness: 0.7,
        });
      }
    });

    // Configurar o mixer de animação e guardar as animações
    if (fbx.animations && fbx.animations.length > 0) {
      mixer = new THREE.AnimationMixer(van);
      animations = fbx.animations;
      console.log(`Carregadas ${animations.length} animações para a van`);
    }

    scene.add(van);
    
    // Setup all lights after van is loaded
    setupLights(van);
    setupLightControls();
  }, undefined, (error) => {
    console.error("Erro ao carregar .fbx:", error);
  });
}

export function setupPlayerControls() {
  window.addEventListener('keydown', (event) => {
    if (!van) return;

    if (event.key === 'a' || event.key === 'ArrowLeft') {
      if (currentLaneIndex > 0) {
        currentLaneIndex--;
        updateLanePosition();
      }
    }

    if (event.key === 'd' || event.key === 'ArrowRight') {
      if (currentLaneIndex < lanePositions.length - 1) {
        currentLaneIndex++;
        updateLanePosition();
      }
    }
    
    // Tecla W, espaço ou seta para cima para tocar a animação 1
    if (event.key === 'w' || event.key === ' ' || event.key === 'ArrowUp') {
      playVanAnimation(1); // Indice 0 para a animação 1
    }
  });
}

// Reproduz animação da carrinha
function playVanAnimation(animationIndex) {
  if (isPlayingAnimation) {
    // Se já estiver a tocar uma animação, não faz nada
    return;
  }
  
  if (!mixer || !animations || animations.length === 0) {
    console.warn('Erro ao carregar animações da carrinha.');
    return;
  }
  
  // Verifica se a animação existe
  if (animationIndex >= animations.length) {
    console.warn(`Animação ${animationIndex + 1} não existe. Total de animações: ${animations.length}`);
    return;
  }
  
  // Toca a animação selecionada
  const animation = animations[animationIndex];
  const action = mixer.clipAction(animation);
  
  action.setLoop(THREE.LoopOnce);
  action.clampWhenFinished = true;
  action.zeroSlopeAtEnd = true;
  
  mixer.stopAllAction();
  mixer.removeEventListener('finished', onAnimationFinished);
  mixer.addEventListener('finished', onAnimationFinished);
  
  action.fadeIn(0.2).play();
  isPlayingAnimation = true;
}

function onAnimationFinished(e) {
  isPlayingAnimation = false;
  setTimeout(() => {}, 50);
}

function updateLanePosition() {
  targetX = lanePositions[currentLaneIndex];
  
  // Calcula o ângulo de rotação para as curvas baseado na direção do movimento
  const moveDirection = targetX - van.position.x;
  
  // Se estiver virando para a esquerda, rotaciona no sentido anti-horário (valor negativo)
  // Se estiver virando para a direita, rotaciona no sentido horário (valor positivo)
  if (Math.abs(moveDirection) > 0.1) {
    targetRotation = Math.PI - Math.sign(moveDirection) * maxTurnAngle;
  }
}

export function updatePlayer(deltaTime = 0.016) {
  if (!van) return;
  
  // Obtém a velocidade atual do jogo
  const currentGameSpeed = getScrollSpeed();
  
  // Calcula o fator de velocidade para rotação baseado na velocidade do jogo
  // À medida que a velocidade aumenta, a rotação deve ser mais rápida
  const speedScaleFactor = 1.0 + (currentGameSpeed / 0.3);
  
  // Fator de suavização baseado no delta time para movimento consistente
  const movementSpeedFactor = movementSmoothness * (60 * deltaTime);
  
  // Fator de rotação que aumenta proporcionalmente à velocidade do jogo
  const rotationSpeedFactor = movementSpeedFactor * speedScaleFactor;
  
  // Movimento horizontal com suavização
  van.position.x += (targetX - van.position.x) * movementSpeedFactor * speedScaleFactor;
  
  // Rotação suavizada
  // Calcula a diferença entre a rotação atual e a destino
  const rotationDiff = targetRotation - van.rotation.y;
  
  // Normaliza a diferença para evitar problemas com valores próximos a PI
  let normRotationDiff = rotationDiff;
  if (normRotationDiff > Math.PI) normRotationDiff -= Math.PI * 2;
  if (normRotationDiff < -Math.PI) normRotationDiff += Math.PI * 2;
  
  // Aplica a rotação suavizada com velocidade adaptativa
  van.rotation.y += normRotationDiff * rotationSpeedFactor;
  
  // Quando estiver próximo ao destino, retorna gradualmente à rotação normal
  // O limiar de proximidade também se adapta à velocidade (menor tolerância em altas velocidades)
  const proximityThreshold = Math.max(0.1, 0.2 / speedScaleFactor);
  if (Math.abs(targetX - van.position.x) < proximityThreshold) {
    targetRotation = Math.PI; // Rotação padrão (virado para trás na tela)
  }
  
  // Atualiza o mixer de animação, se existir
  if (mixer) {
    mixer.update(deltaTime);
  }
  
  // Atualiza as luzes
  updateLights();
}

export function getPlayerPosition() {
  if (!van) return new THREE.Vector3(0, 0, 0);
  return van.position.clone();
}

export function getHeadlightsState() {
  return getLightState().headlights;
}

export function isAnimationPlaying() {
  return isPlayingAnimation;
}

export function getVanAnimationsCount() {
  return animations ? animations.length : 0;
}