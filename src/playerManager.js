import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';
import { getScrollSpeed } from './obstacleManager.js';
import { setupLights, setupLightControls, updateLights, getLightState } from './lightManager.js';

const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('/assets/models/van/textures/van_03_a.png');

let targetX = 0;
let targetRotation = 0;
let van;
let currentLaneIndex = 1; // Começar no meio
const lanePositions = [-2.5, 0, 2.5];

// Variáveis para controlar o voo
let isFlying = false;
let flyingStartTime = 0;
let flyingDuration = 5;
let flyingHeight = 0;
let flyingTargetHeight = 4;
let flyingSpeed = 0;
let rocketPower = 0;
let isRocketBoosting = false;

// Configurações de aceleração durante o voo
const ROCKET_POWER = 0.15;
const MAX_FLYING_SPEED = 4;
const CAMERA_SHAKE_INTENSITY = 0.2;

// Variáveis para salto
let isJumping = false;
let jumpStartTime = 0;
let jumpDuration = 0.7;
let jumpHeight = 1.25;

// Variáveis para controle de animação
let mixer;
let animations = [];
let isPlayingAnimation = false;

// Variáveis de movimento
const movementSmoothness = 0.11; 
const maxTurnAngle = Math.PI / 8;

// Variáveis da colisão
let collisionAnimationActive = false;
let collisionAnimationStart = 0;
let collisionAnimationDuration = 0.7;
let originalVanColor = null;
let originalVanScale = null;
let originalVanRotationZ = 0;
let collisionImpactDirection = 1;

export function createPlayer(scene) {
  
  const loader = new FBXLoader();

  loader.load('/assets/models/van/van.fbx', (fbx) => {
    van = fbx;
    van.scale.set(0.8, 0.8, 0.8);
    van.position.set(lanePositions[currentLaneIndex], 0.5, 4);
    van.rotation.y = Math.PI;

    van.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
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
    setupLights(van);
    setupLightControls();
  }, undefined, (error) => {
    console.error("Erro ao carregar .fbx:", error);
  });
}

// Recebe o bloqueio de input do main.js
export let blockPlayerInput = false;
export function setBlockPlayerInput(val) { blockPlayerInput = val; }

// Importa isGameActive do main.js para verificar o estado do jogo
let isGameActive = false;
export function setGameActive(active) {
  isGameActive = active;
}

export function setupPlayerControls() {
  window.addEventListener('keydown', (event) => {
    // Processa inputs apenas se o jogo estiver ativo
    if (!isGameActive || blockPlayerInput) return;
    if (!van) return;
    if (event.key === 'a' || event.key === 'ArrowLeft') {
      if (isFlying) {
        // Quando estiver a voar, apenas muda de faixa se não estiver na faixa mais à esquerda
        if (currentLaneIndex > 0) {
          currentLaneIndex--;
          targetX = lanePositions[currentLaneIndex];
          playVanAnimation(0);
          if (van) {
            van.rotation.y = Math.PI + 0.5;
            van.rotation.z = 0.3;
          }
        }
      } else if (currentLaneIndex > 0) {
        // Movimento normal quando não está a voar
        currentLaneIndex--;
        updateLanePosition();
      }
    }
    if (event.key === 'd' || event.key === 'ArrowRight') {
      if (isFlying) {
        // Quando estiver a voar, apenas muda de faixa se não estiver na faixa mais à direita
        if (currentLaneIndex < lanePositions.length - 1) {
          currentLaneIndex++;
          targetX = lanePositions[currentLaneIndex];
          playVanAnimation(2);
          if (van) {
            van.rotation.y = Math.PI - 0.5;
            van.rotation.z = -0.3;
          }
        }
      } else if (currentLaneIndex < lanePositions.length - 1) {
        // Movimento normal quando não está a voar
        currentLaneIndex++;
        updateLanePosition();
      }
    }
    const key = event.key.toLowerCase();
    if ((key === ' ' || key === 'arrowup' || key === 'w') && !isVanFlying() && !isJumping) {
      isJumping = true;
      jumpStartTime = performance.now() / 1000;
      playVanAnimation(1);
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
  if (Math.abs(moveDirection) > 0.1) {
    targetRotation = Math.PI - Math.sign(moveDirection) * maxTurnAngle;
  }
}

export function triggerCollisionAnimation(duration = 0.7) {
  if (!van) return;
  collisionAnimationActive = true;
  collisionAnimationStart = performance.now() / 1000;
  collisionAnimationDuration = duration;
  // Guarda cor, escala e rotação originais
  van.traverse(child => {
    if (child.isMesh && child.material) {
      if (!originalVanColor) originalVanColor = child.material.color.clone();
      child.material.color.set('#ff3333');
    }
  });
  if (!originalVanScale) originalVanScale = van.scale.clone();
  originalVanRotationZ = van.rotation.z;
  collisionImpactDirection = Math.random() > 0.5 ? 1 : -1;
  setTimeout(() => {
    collisionAnimationActive = false;
    // Restaura cor, escala e rotação
    van.traverse(child => {
      if (child.isMesh && child.material && originalVanColor) {
        child.material.color.copy(originalVanColor);
      }
    });
    if (originalVanScale) van.scale.copy(originalVanScale);
    van.rotation.z = originalVanRotationZ;
  }, duration * 1000);
}

export function updatePlayer(deltaTime = 0.016) {
  if (!van) return;
  
  // Obtém a velocidade atual do jogo
  const currentGameSpeed = getScrollSpeed();
  
  // Calcula o fator de velocidade para rotação baseado na velocidade do jogo
  // À medida que a velocidade aumenta, a rotação torna-se mais rápida
  const speedScaleFactor = 1.0 + (currentGameSpeed / 0.3);
  const movementSpeedFactor = movementSmoothness * (60 * deltaTime);
  const rotationSpeedFactor = movementSpeedFactor * speedScaleFactor;
  updateFlyingState(deltaTime);
  van.position.x += (targetX - van.position.x) * movementSpeedFactor * speedScaleFactor;
  const rotationDiff = targetRotation - van.rotation.y;
  let normRotationDiff = rotationDiff;
  if (normRotationDiff > Math.PI) normRotationDiff -= Math.PI * 2;
  if (normRotationDiff < -Math.PI) normRotationDiff += Math.PI * 2;
  van.rotation.y += normRotationDiff * rotationSpeedFactor;
  const proximityThreshold = Math.max(0.1, 0.2 / speedScaleFactor);
  if (Math.abs(targetX - van.position.x) < proximityThreshold) {
    targetRotation = Math.PI;
  }
  
  // Atualiza o mixer de animação, se existir
  if (mixer) {
    mixer.update(deltaTime);
  }
  
  // Atualiza as luzes
  updateLights();
  
  // Atualiza o salto
  if (isJumping) {
    const now = performance.now() / 1000;
    const t = (now - jumpStartTime) / jumpDuration;
    if (t >= 1) {
      isJumping = false;
      van.position.y = 0.5;
    } else {
      const jumpY = Math.sin(Math.PI * t) * jumpHeight;
      van.position.y = 0.5 + jumpY;
    }
  } else if (!isFlying && van.position.y !== 0.5) {
    van.position.y = 0.5;
  }

  // Animação de colisão
  if (collisionAnimationActive) {
    const t = (performance.now() / 1000 - collisionAnimationStart);
    const progress = Math.min(t / collisionAnimationDuration, 1);
    let squashY = 1 - 0.32 * Math.sin(Math.PI * progress);
    let squashX = 1 + 0.18 * Math.sin(Math.PI * progress);
    if (originalVanScale) {
      van.scale.y = originalVanScale.y * squashY;
      van.scale.x = originalVanScale.x * squashX;
    }
    const shake = Math.sin(t * 38) * 0.18 * (1 - progress) * collisionImpactDirection;
    van.position.x += shake;
    van.rotation.z = originalVanRotationZ + Math.sin(progress * Math.PI) * 0.22 * collisionImpactDirection;
    van.traverse(child => {
      if (child.isMesh && child.material && originalVanColor) {
        child.material.color.set('#ff3333');
      }
    });
  }
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

// Função para atualizar o estado de voo
function updateFlyingState(deltaTime) {
  
  if (!isFlying) return;
  
  if (van) {
    const targetYRotation = Math.PI;
    van.rotation.y += (targetYRotation - van.rotation.y) * 0.05;
    van.rotation.z *= 0.95;
  }
  
  const currentTime = performance.now() / 1000;
  const elapsedTime = currentTime - flyingStartTime;
  const progress = Math.min(elapsedTime / flyingDuration, 1);
  
  // Calcula a velocidade vertical
  flyingSpeed = Math.min(flyingSpeed + rocketPower * deltaTime * 2, MAX_FLYING_SPEED);
  flyingHeight = Math.min(flyingHeight + flyingSpeed * deltaTime, flyingTargetHeight);
  
  // Atualiza a posição e rotação da van
  if (van) {
    van.position.x = lanePositions[currentLaneIndex];
    van.position.y = 1 + flyingHeight;
    const targetPitch = 0.2;
    van.rotation.x = targetPitch;
    flyingTilt = 0;
    flyingForwardTilt = targetPitch;
    
    if (isRocketBoosting) {
      const shakeIntensity = CAMERA_SHAKE_INTENSITY * rocketPower * 0.5;
      const shake = (Math.random() - 0.5) * shakeIntensity;
      van.position.x += shake * 0.2;
      van.position.z += shake * 0.1;
    }
    
    van.position.x += (lanePositions[currentLaneIndex] - van.position.x) * 0.1;
  }
  
  // Fase do voo: 0-0.2 = subida, 0.2-0.7 = pairar, 0.7-1.0 = descida
  let phase = 'climb';
  if (progress >= 0.2 && progress < 0.7) {
    phase = 'hover';
  } else if (progress >= 0.7) {
    phase = 'descend';
  }
  currentFlightPhase = phase;
  
  // Aplica forças e acelerações baseadas na fase
  if (phase === 'climb') {
    // Subida
    const climbProgress = progress / 0.2;
    flyingHeight = flyingTargetHeight * easeOutBack(climbProgress);
    
    if (van) {
      van.rotation.x = 0.2;
      van.position.x = lanePositions[currentLaneIndex];
    }
  } 
  // Fase de pairar
  else if (phase === 'hover') {
    flyingHeight = flyingTargetHeight;
    
    if (van) {
      van.rotation.x = 0.2;
      van.position.x = lanePositions[currentLaneIndex];
    }
  }
  else if (phase === 'fly') {
    const baseHeight = flyingTargetHeight * 0.6;
    const bob = Math.sin((performance.now() / 1000 - flyingStartTime) * 1.0) * 0.3;
    const wobble = Math.sin((performance.now() / 1000 - flyingStartTime) * 1.2) * 0.1;
    
    flyingHeight = baseHeight + bob + wobble * 0.3;
    
    if (van) {
      van.position.x = lanePositions[currentLaneIndex];
      const targetPitch = 0.2;
      van.rotation.x = targetPitch;
      const floatSpeed = 1.0;
      const floatAmount = 0.1;
      const floatOffset = Math.sin((performance.now() / 1000 - flyingStartTime) * floatSpeed) * floatAmount;
      van.position.y = 1 + flyingHeight + floatOffset;
      van.rotation.z = 0;
    }
  } 
  else if (phase === 'descend') {
    // Descida
    const descendProgress = (progress - 0.7) / 0.3;
    const easeDescend = easeInOutQuad(descendProgress);
    flyingHeight = flyingTargetHeight * (1 - easeDescend);
    
    if (van) {
      const targetPitch = Math.PI * 0.2 * easeDescend;
      van.rotation.x += (targetPitch - van.rotation.x) * 0.1;
      van.rotation.z *= (1 - easeDescend * 0.9);
      van.position.x += (lanePositions[currentLaneIndex] - van.position.x) * 0.1;
    }
    
    if (flyingHeight < 0.1) {
      isFlying = false;
      flyingHeight = 0;

      if (van) {
        van.position.y = 1.1;
        setTimeout(() => {
          if (van) {
            van.position.y = 1.0;
            van.rotation.set(0, van.rotation.y, 0);
          }
        }, 200);
      }
      
      console.log('Carrinha aterrou!');
    }
  } else if (flyingHeight > 0) {
    const landingSpeed = 5.0;
    flyingHeight = Math.max(0, flyingHeight - landingSpeed * deltaTime);
    
    if (van) {
      van.position.y = 1 + flyingHeight;
      
      if (flyingHeight <= 0) {
        flyingHeight = 0;
        flyingSpeed = 0;
        rocketPower = 0;
      }
    }
  }
}

// Inicialização do voo da carrinha
export function startFlying() {
  if (!isFlying) {
    isFlying = true;
    isRocketBoosting = true;
    flyingStartTime = performance.now() / 1000;
    flyingSpeed = 0;
    flyingHeight = 0;
    rocketPower = ROCKET_POWER;
    flyingTilt = 0;
    flyingForwardTilt = 0;

    if (van) {
      van.position.y += 0.3;
    }

    console.log('Foguete ativado! Carrinha a descolar...');
    if (window.playSound) {
      window.playSound('rocket_launch');
    }

    if (mixer && animations && animations.length > 0) {
      playVanAnimation(0);
    }
    const flyingEvent = new CustomEvent('vanStartedFlying');
    window.dispatchEvent(flyingEvent);

    setTimeout(() => {
      if (van) {
        setInterval(() => {
          if (isFlying && isRocketBoosting) {
            for (let i = 0; i < 5; i++) {}
          }
        }, 50);
      }
    }, 300);
  }
}

// Verifica se a carrinha está a voar
export function isVanFlying() {
  return isFlying;
}

export function getVanAnimationsCount() {
  return animations ? animations.length : 0;
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

let vanHitboxHelper = null;

window.drawVanHitbox = function(scene) {
  if (!van) return;
  if (vanHitboxHelper) {
    scene.remove(vanHitboxHelper);
    vanHitboxHelper = null;
  }
  vanHitboxHelper = new THREE.BoxHelper(van, 0x00ff00);
  scene.add(vanHitboxHelper);
};

window.clearHitboxes = window.clearHitboxes || function(scene) {};
window.clearHitboxes = (function(oldClear) {
  return function(scene) {
    if (vanHitboxHelper) {
      scene.remove(vanHitboxHelper);
      vanHitboxHelper = null;
    }
    if (typeof oldClear === 'function') oldClear(scene);
  };
})(window.clearHitboxes);

// Export para saber se está a saltar
export function isVanJumping() {
  return isJumping;
}

export function getFlyingStartTime() {
  return flyingStartTime;
}

export function getFlyingDuration() {
  return flyingDuration;
}

let currentFlightPhase = null;

export function isVanDescending() {
  return isFlying && currentFlightPhase === 'descend';
}

export function getFlyingTimeLeft() {
  if (!isFlying) return 0;
  const now = performance.now() / 1000;
  const elapsed = now - flyingStartTime;
  const descendStart = flyingDuration * 0.8;
  return Math.max(0, descendStart - elapsed);
}