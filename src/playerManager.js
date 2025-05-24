import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';
import { getScrollSpeed } from './obstacleManager.js';
import { setupLights, setupLightControls, updateLights, getLightState } from './lightManager.js';

// Variáveis para o sistema de partículas
let particleSystem;
let particles = [];
const maxParticles = 100;
const particleSpeed = 0.1;
const particleSize = 0.2;
const particleColors = [0xFFA500, 0xFF8C00, 0xFF7F50, 0xFF6347, 0xFF4500]; // Tons de laranja/vermelho

const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('/assets/models/van/textures/van_03_a.png');

let targetX = 0;
let targetRotation = 0;
let van;
let currentLaneIndex = 1; // começa no meio
const lanePositions = [-2.5, 0, 2.5];

// Variáveis para controle de voo
let isFlying = false;
let flyingStartTime = 0;
let flyingDuration = 8; // duração total do voo em segundos
let flyingHeight = 0;
let flyingTargetHeight = 4; // altura máxima reduzida para voo mais baixo
let flyingSpeed = 0;
let flyingTilt = 0; // inclinação lateral
let flyingForwardTilt = 0; // inclinação para frente
let rocketPower = 0; // potência do foguete
let rocketTrail = []; // rastro do foguete
let isRocketBoosting = false; // se está com turbo ativado

// Configurações do efeito de foguete
const ROCKET_POWER = 0.15;        // Reduzida para subir mais devagar
const MAX_ROCKET_POWER = 0.7;     // Potência máxima reduzida
const ROCKET_DECAY = 0.95;
const ROCKET_ACCELERATION = 0.5;  // Aceleração reduzida
const MAX_FLYING_SPEED = 4;       // Velocidade máxima reduzida
const TILT_FACTOR = 0.1;
const CAMERA_SHAKE_INTENSITY = 0.2; // Trepidação reduzida

// Partículas do rastro do foguete
function createRocketTrail() {
  return {
    position: new THREE.Vector3(0, 0, 0),
    size: 1 + Math.random() * 2,
    life: 1.0,
    maxLife: 1.0 + Math.random()
  };
}

// Variáveis para controle de animação
let mixer;
let animations = [];
let isPlayingAnimation = false;

// Fator de suavização para movimento (valor maior = movimento mais rápido)
const movementSmoothness = 0.11; 
// Ângulo máximo de rotação durante curvas (em radianos)
const maxTurnAngle = Math.PI / 8;

// Cria o sistema de partículas
function createParticleSystem(scene) {
  const particleGeometry = new THREE.BufferGeometry();
  const particleMaterial = new THREE.PointsMaterial({
    size: particleSize,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  
  // Cria partículas iniciais (serão posicionadas dinamicamente)
  const positions = [];
  const colors = [];
  
  for (let i = 0; i < maxParticles; i++) {
    // Posições iniciais serão atualizadas durante o jogo
    positions.push(0, 0, 0);
    
    // Cores aleatórias da paleta
    const color = new THREE.Color(particleColors[Math.floor(Math.random() * particleColors.length)]);
    colors.push(color.r, color.g, color.b);
    
    // Inicializa partículas inativas
    particles.push({
      active: false,
      life: 0,
      maxLife: 1 + Math.random() * 2,
      speed: 0.02 + Math.random() * 0.03,
      direction: new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize()
    });
  }
  
  particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  
  particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  particleSystem.visible = false;
  scene.add(particleSystem);
}

// Atualiza as partículas
function updateParticles(deltaTime) {
  if (!particleSystem) return;
  
  const positions = particleSystem.geometry.attributes.position.array;
  const colors = particleSystem.geometry.attributes.color.array;
  
  particles.forEach((particle, i) => {
    const idx = i * 3;
    
    if (particle.active) {
      // Atualiza posição
      positions[idx] += particle.direction.x * particle.speed * 60 * deltaTime;
      positions[idx + 1] += particle.direction.y * particle.speed * 60 * deltaTime;
      positions[idx + 2] += particle.direction.z * particle.speed * 60 * deltaTime;
      
      // Atualiza vida
      particle.life -= deltaTime;
      
      // Atualiza opacidade baseado na vida
      const colorIdx = i * 3;
      colors[colorIdx + 3] = particle.life / particle.maxLife; // Alfa
      
      // Desativa partícula se a vida acabar
      if (particle.life <= 0) {
        particle.active = false;
        // Move para longe para não ser renderizada
        positions[idx] = -1000;
        positions[idx + 1] = -1000;
        positions[idx + 2] = -1000;
      }
    }
  });
  
  // Atualiza os buffers
  particleSystem.geometry.attributes.position.needsUpdate = true;
  particleSystem.geometry.attributes.color.needsUpdate = true;
}

// Emite partículas
function emitParticles(position, count = 10) {
  if (!particleSystem) return;
  
  const positions = particleSystem.geometry.attributes.position.array;
  
  let emitted = 0;
  for (let i = 0; i < particles.length && emitted < count; i++) {
    if (!particles[i].active) {
      const idx = i * 3;
      
      // Define posição inicial
      positions[idx] = position.x + (Math.random() - 0.5) * 0.5;
      positions[idx + 1] = position.y + (Math.random() - 0.5) * 0.5;
      positions[idx + 2] = position.z + (Math.random() - 0.5) * 0.5;
      
      // Reinicia partícula
      particles[i].active = true;
      particles[i].life = particles[i].maxLife;
      particles[i].speed = 0.05 + Math.random() * 0.1;
      
      // Direção aleatória com leve tendência para cima
      particles[i].direction.set(
        (Math.random() - 0.5) * 2,
        Math.random() * 0.5 + 0.5, // Mais para cima
        (Math.random() - 0.5) * 2
      ).normalize();
      
      emitted++;
    }
  }
}

export function createPlayer(scene) {
  // Cria o sistema de partículas
  createParticleSystem(scene);
  
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
    if ((event.key === 'w' || event.key === ' ' || event.key === 'ArrowUp') && !isVanFlying()) {
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
  
  // Atualiza o estado de voo
  updateFlyingState(deltaTime);
  
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

// Atualiza o rastro do foguete
function updateRocketTrail(deltaTime) {
  if (!van) return;
  
  // Atualiza partículas existentes
  for (let i = 0; i < rocketTrail.length; i++) {
    const particle = rocketTrail[i];
    particle.life -= deltaTime * 0.5;
    
    // Move as partículas para baixo e para trás
    if (particle.life > 0) {
      particle.position.y -= 0.1;
      particle.position.z += 0.05;
    } else {
      // Reutiliza partículas que morreram
      rocketTrail[i] = createRocketTrail();
      rocketTrail[i].position.copy(van.position);
      rocketTrail[i].position.y -= 1;
    }
  }
  
  // Emite partículas contínuas do foguete
  if (isRocketBoosting && Math.random() > 0.3) {
    emitParticles(new THREE.Vector3(
      van.position.x + (Math.random() - 0.5) * 0.5,
      van.position.y - 1.5,
      van.position.z - 0.5
    ), 2);
  }
}

// Função para atualizar o estado de voo
function updateFlyingState(deltaTime) {
  // Atualiza partículas
  updateParticles(deltaTime);
  updateRocketTrail(deltaTime);
  
  if (!isFlying) return;
  
  const currentTime = performance.now() / 1000;
  const elapsedTime = currentTime - flyingStartTime;
  const progress = Math.min(elapsedTime / flyingDuration, 1);
  
  // Atualiza a potência do foguete
  if (isRocketBoosting) {
    rocketPower = Math.min(rocketPower + ROCKET_ACCELERATION * deltaTime, MAX_ROCKET_POWER);
    
    // Desativa o turbo após alguns segundos
    if (elapsedTime > 3) {
      isRocketBoosting = false;
    }
  } else {
    // Reduz gradualmente a potência após o boost
    rocketPower = Math.max(rocketPower * ROCKET_DECAY, ROCKET_POWER * 0.7);
  }
  
  // Calcula a velocidade vertical baseada na potência do foguete
  flyingSpeed = Math.min(flyingSpeed + rocketPower * deltaTime * 2, MAX_FLYING_SPEED);
  
  // Atualiza a altura com base na velocidade
  const previousHeight = flyingHeight;
  flyingHeight = Math.min(flyingHeight + flyingSpeed * deltaTime, flyingTargetHeight);
  
  // Atualiza a posição e rotação da van
  if (van) {
    // Mantém a posição X fixa na pista atual
    van.position.x = lanePositions[currentLaneIndex];
    
    // Movimento vertical suave sem oscilações
    van.position.y = 1 + flyingHeight;
    
    // Inclinação fixa para frente durante o voo
    const targetPitch = 0.2; // Ângulo fixo de inclinação para frente
    
    // Aplica as rotações com inclinação fixa
    van.rotation.set(
      targetPitch,  // Inclinação para frente fixa
      van.rotation.y,  // Mantém a rotação Y original
      0                // Sem inclinação lateral
    );
    
    // Reseta as variáveis de inclinação dinâmica
    flyingTilt = 0;
    flyingForwardTilt = targetPitch;
    
    // Efeito de câmera tremendo durante o turbo
    if (isRocketBoosting) {
      const shakeIntensity = CAMERA_SHAKE_INTENSITY * rocketPower * 0.5;
      const shake = (Math.random() - 0.5) * shakeIntensity;
      van.position.x += shake * 0.2;
      van.position.z += shake * 0.1;
    }
    
    // Efeito de arrasto no ar (reduz a velocidade lateral)
    van.position.x += (lanePositions[currentLaneIndex] - van.position.x) * 0.1;
  }
  
  // Fase do voo: 0-0.2 = subida, 0.2-0.8 = pairar, 0.8-1.0 = descida
  let phase = 'climb';
  if (progress >= 0.2 && progress < 0.8) {
    phase = 'hover';
  } else if (progress >= 0.8) {
    phase = 'descend';
  }
  
  // Aplica forças e acelerações baseadas na fase
  if (phase === 'climb') {
    // Subida poderosa
    const climbProgress = progress / 0.2; // Normaliza para 0-1
    flyingHeight = flyingTargetHeight * easeOutBack(climbProgress);
    
    // Inclinação para frente durante a subida
    if (van) {
      van.rotation.x = 0.2; // Inclinação fixa para frente
      van.position.x = lanePositions[currentLaneIndex]; // Mantém alinhado com a pista
    }
    
    // Emite mais partículas durante a decolagem
    if (Math.random() > 0.7) {
      emitParticles(new THREE.Vector3(
        van.position.x,
        van.position.y - 0.5,
        van.position.z - 1
      ), 3);
    }
  } 
  // Fase de pairar - mantém a posição estável
  else if (phase === 'hover') {
    // Mantém a altura constante
    flyingHeight = flyingTargetHeight;
    
    if (van) {
      // Mantém a inclinação fixa para frente
      van.rotation.x = 0.2;
      // Mantém a posição X fixa na pista
      van.position.x = lanePositions[currentLaneIndex];
    }
  }
  else if (phase === 'fly') {
    // Voo com movimentos aleatórios e engraçados
    const flyProgress = (progress - 0.3) / 0.4; // Normaliza para 0-1
    
    // Altura com oscilação suave (mais baixa e controlada)
    const baseHeight = flyingTargetHeight * 0.6; // 60% da altura máxima para permitir subir e descer
    const bob = Math.sin((performance.now() / 1000 - flyingStartTime) * 1.0) * 0.3;
    const wobble = Math.sin((performance.now() / 1000 - flyingStartTime) * 1.2) * 0.1;
    
    flyingHeight = baseHeight + bob + wobble * 0.3;
    
    // Movimentos mais suaves e controlados durante o voo
    if (van) {
      // Mantém a posição X fixa na pista atual
      van.position.x = lanePositions[currentLaneIndex];
      
      // Pequena inclinação para frente constante
      const targetPitch = 0.2; // Inclinação para frente suave
      
      // Aplica rotações com suavização
      van.rotation.x = targetPitch;
      
      // Pequeno movimento de flutuação vertical
      const floatSpeed = 1.0;
      const floatAmount = 0.1;
      const floatOffset = Math.sin((performance.now() / 1000 - flyingStartTime) * floatSpeed) * floatAmount;
      
      // Altura com flutuação suave
      van.position.y = 1 + flyingHeight + floatOffset;
      
      // Mantém a rotação Y original (direção da pista)
      // e remove rotações laterais indesejadas
      van.rotation.z = 0;
    }
    
    // Emite partículas ocasionalmente
    if (Math.random() > 0.8) {
      emitParticles(new THREE.Vector3(
        van.position.x + (Math.random() - 0.5) * 2,
        van.position.y - 0.5,
        van.position.z - 1 + (Math.random() - 0.5) * 2
      ), 2);
    }
  } 
  else if (phase === 'descend') {
    // Descida controlada
    const descendProgress = (progress - 0.7) / 0.3; // Normaliza para 0-1
    const easeDescend = easeInOutQuad(descendProgress);
    
    // Altura diminui suavemente
    flyingHeight = flyingTargetHeight * (1 - easeDescend);
    
    // Ajusta a rotação para frente durante a descida
    if (van) {
      // Suaviza a rotação para frente durante a descida
      const targetPitch = Math.PI * 0.2 * easeDescend;
      van.rotation.x += (targetPitch - van.rotation.x) * 0.1;
      
      // Reduz o balanço lateral durante a descida
      van.rotation.z *= (1 - easeDescend * 0.9);
      
      // Mantém a posição X alinhada com a pista durante a descida
      van.position.x += (lanePositions[currentLaneIndex] - van.position.x) * 0.1;
    }
    
    // Se a altura for menor que 0.1, termina o voo
    if (flyingHeight < 0.1) {
      isFlying = false;
      flyingHeight = 0;
      
      // Efeito de impacto ao pousar
      if (van) {
        // Pequeno salto ao pousar
        van.position.y = 1.1;
        
        // Emite uma explosão de partículas ao pousar
        for (let i = 0; i < 30; i++) {
          emitParticles(new THREE.Vector3(
            van.position.x + (Math.random() - 0.5) * 3,
            0.2,
            van.position.z + (Math.random() - 0.5) * 3
          ), 1);
        }
        
        // Pequeno recuo ao pousar
        setTimeout(() => {
          if (van) {
            van.position.y = 1.0;
            van.rotation.set(0, van.rotation.y, 0);
          }
        }, 200);
      }
      
      console.log('Van pousou!');
    }
  } else if (flyingHeight > 0) {
    // Se não está voando mas ainda está no ar, faz a van pousar suavemente
    const landingSpeed = 5.0;
    flyingHeight = Math.max(0, flyingHeight - landingSpeed * deltaTime);
    
    if (van) {
      van.position.y = 1 + flyingHeight;
      
      // Se chegou ao chão, reseta as variáveis
      if (flyingHeight <= 0) {
        flyingHeight = 0;
        flyingSpeed = 0;
        rocketPower = 0;
        
        // Efeito de poeira ao pousar
        for (let i = 0; i < 30; i++) {
          emitParticles(new THREE.Vector3(
            van.position.x + (Math.random() - 0.5) * 3,
            0.2,
            van.position.z + (Math.random() - 0.5) * 3
          ), 1);
        }
      }
    }
  }
}

// Inicia o voo da van
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

    // Inicializa o rastro do foguete
    rocketTrail = [];
    for (let i = 0; i < 20; i++) {
      const trail = createRocketTrail();
      if (van) {
        trail.position.copy(van.position);
        trail.position.y -= 1;
      }
      rocketTrail.push(trail);
    }

    // Efeito de explosão inicial
    if (van) {
      // Grande explosão de partículas
      for (let i = 0; i < 150; i++) {
        emitParticles(new THREE.Vector3(
          van.position.x + (Math.random() - 0.5) * 3,
          van.position.y + (Math.random() - 0.5) * 2,
          van.position.z + (Math.random() - 0.5) * 3
        ), 1);
      }

      // Pequeno salto antes da decolagem
      van.position.y += 0.3;
    }

    console.log('Foguete ativado! Decolagem em andamento...');

    // Toca o som de foguete (se houver sistema de som)
    if (window.playSound) {
      window.playSound('rocket_launch');
    }

    // Toca a animação (se houver)
    if (mixer && animations && animations.length > 0) {
      playVanAnimation(0);
    }

    // Dispara o evento
    const flyingEvent = new CustomEvent('vanStartedFlying');
    window.dispatchEvent(flyingEvent);

    // Adiciona um pequeno atraso antes de começar a subir
    setTimeout(() => {
      if (van) {
        // Efeito de partículas contínuas do foguete
        setInterval(() => {
          if (isFlying && isRocketBoosting) {
            for (let i = 0; i < 5; i++) {
              emitParticles(new THREE.Vector3(
                van.position.x + (Math.random() - 0.5) * 0.5,
                van.position.y - 1.5,
                van.position.z - 0.5
              ), 1);
            }
          }
        }, 50);
      }
    }, 300);
  }
}

// Verifica se a van está voando
export function isVanFlying() {
  return isFlying;
}

export function getVanAnimationsCount() {
  return animations ? animations.length : 0;
}

// Funções de easing melhoradas
function easeInQuad(t) {
  return t * t;
}

function easeOutQuad(t) {
  return t * (2 - t);
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInOutBack(t) {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  
  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
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