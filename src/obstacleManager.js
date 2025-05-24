import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';
import { addBeerCrateToObstacles } from './beerCrateManager.js';
import { getPlayerPosition, startFlying, isVanFlying, isVanJumping } from './playerManager.js';
import { loseLife } from './main.js';

const obstacles = [];
const obstacleTemplates = {};
const lanePositions = [-3.2, 0, 3.2];
const maxObstacles = 10;
const spawnZStart = -80;

const loader = new FBXLoader();
const textureLoader = new THREE.TextureLoader();

const modelList = [
  { name: 'cone', generator: createConeDeTransito },
  { name: 'cavalo', file: './assets/models/obstaculos/cavalo.fbx', scale: 0.02 },
  { name: 'tampa', file: './assets/models/obstaculos/tampa.fbx', scale: 0.0015 },
  { name: 'beerCrate', generator: () => null } // Will be added in loadObstacles
];

// Gerador de buraco
function createBuraco() {
  const texture = textureLoader.load('/assets/textures/buraco.jpg');

  const geometry = new THREE.CircleGeometry(1.2, 32); // um pouco maior que a tampa
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    metalness: 0.2,
    roughness: 0.8
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.userData.type = 'buraco';

  return mesh;
}

// Função para criar o cone de trânsito
function createConeDeTransito() {
  const coneDeTransito = new THREE.Group();

  // Textura do cone
  const texture = textureLoader.load('/assets/textures/cone_stripes.png');
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  const coneGeometry = new THREE.ConeGeometry(0.75, 2, 16);

  // Material do cone usando a textura
  const coneMaterial = new THREE.MeshStandardMaterial({ 
    map: texture,
    roughness: 0.7,
    metalness: 0.2
  });

  // Mesh do cone
  const cone = new THREE.Mesh(coneGeometry, coneMaterial);

  cone.position.y = 1.5;
  coneDeTransito.add(cone);

  // Base do cone
  const baseGeometry = new THREE.BoxGeometry(1.6, 0.2, 1.6);

  // Clona a textura e ajusta para mostrar só a parte inferior
  const baseTexture = texture.clone();
  baseTexture.offset.set(0, 0.8); // Mostra só a parte de baixo da textura
  baseTexture.repeat.set(1, 0.2); // Comprime verticalmente

  // Material da base
  const baseMaterial = new THREE.MeshStandardMaterial({
    map: baseTexture,
    roughness: 0.7,
    metalness: 0.2
  });

  // Mesh da base
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  // Posiciona a base no chão
  base.position.y = 0.5;
  coneDeTransito.add(base);

  coneDeTransito.userData = { type: 'cone' };
  return coneDeTransito;
}

export function loadObstacles(scene) {
  let loaded = 0;

  modelList.forEach(({ name, file, texture, scale, generator }) => {
    if (generator) {
      const mesh = generator();
      obstacleTemplates[name] = mesh;
      checkAllLoaded();
    } else {
      loader.load(file, (fbx) => {
        fbx.scale.set(scale, scale, scale);

        // Aplica a textura tampa.png apenas à tampa
        let tex = null;
        if (name === 'tampa') {
          tex = textureLoader.load('/assets/textures/tampa.png');
        } else if (texture && name !== 'tampa') {
          tex = textureLoader.load(texture);
        }

        fbx.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;

            if (tex) {
              child.material = new THREE.MeshStandardMaterial({
                map: tex,
                metalness: 0.2,
                roughness: 0.7
              });
            }
          }
        });

        fbx.userData = { type: name };
        obstacleTemplates[name] = fbx;
        checkAllLoaded();
      }, undefined, (error) => {
        console.error(`Erro ao carregar modelo ${name}:`, error);
      });
    }
  });

  function checkAllLoaded() {
    loaded++;
    if (loaded === modelList.length) {
      // Add beer crate to obstacle templates
      addBeerCrateToObstacles(obstacleTemplates);
      generateObstacles(scene);
    }
  }
}

function generateObstacles(scene) {
  const baseZ = spawnZStart;
  const spacing = 15; // distância média entre obstáculos
  const variation = 5; // aleatoriedade permitida

  for (let i = 0; i < maxObstacles; i++) {
    const { template, type } = getRandomTemplate();
    if (!template) continue;

    const clone = template.clone();
    clone.userData.type = type; // <- só o principal!
    lastObstacleType = type;

    let y = 0.051;
    if (clone.geometry?.type === 'CircleGeometry' || type.includes('tampa')) {
      y = type.includes('tampa') ? 0.09 : 0.07;
    } else if (type.includes('cone')) {
      y = 0.25;
    } else if (type.includes('cavalo')) {
      y = 0.15;
    } else if (type.includes('beercrate')) {
      y = 0.1;
    }

    const z = baseZ - i * spacing - Math.random() * variation;
    clone.position.set(getRandomLaneX(), y, z);
    scene.add(clone);
    obstacles.push(clone);
  }
}

function getRandomTemplate() {
  const weightedList = [
    'cone', 'cone', 'cone',  // Cones com mais peso
    'cavalo',                // Menos frequente
    'tampa', 'tampa',        // Tampa de esgoto
    'beerCrate',  // Grade de cerveja
  ];

  let chosenName;
  let attempts = 0;
  do {
    const randIndex = Math.floor(Math.random() * weightedList.length);
    chosenName = weightedList[randIndex];
    // Garante que tampa não aparece ao lado de buraco
    if (lastObstacleType === 'buraco' && chosenName === 'tampa') continue;
    if (lastObstacleType === 'tampa' && chosenName === 'buraco') continue;
  } while (
    obstacleTemplates[chosenName]?.userData?.type === lastObstacleType &&
    attempts++ < 10
  );
  return { template: obstacleTemplates[chosenName], type: chosenName };
}

function getRandomLaneX() {
  const index = Math.floor(Math.random() * lanePositions.length);
  return lanePositions[index];
}

let scrollSpeed = 0.3;
export function getScrollSpeed() {
  return scrollSpeed;
}

let spacing = 15;
let variation = 5;
let lastObstacleType = null;
let timeElapsed = 0;

export function updateObstacles(deltaTime = 0.016, scene) {
  timeElapsed += deltaTime;

  // Aumentar dificuldade
  const previousStep = Math.floor((timeElapsed - deltaTime) / 2);
  const currentStep = Math.floor(timeElapsed / 2);
  
  if (currentStep > previousStep) {
    scrollSpeed = Math.min(1.0, scrollSpeed + 0.01);
    spacing = Math.max(5, 15 - timeElapsed * 0.08);
  }
  
  // Obter a posição atual do jogador para verificar colisões
  const playerPosition = getPlayerPosition();
  
  obstacles.forEach((obstacle) => {
    // Ignorar obstáculos invisíveis ou com escala zero
    if (!obstacle.visible || obstacle.scale.x === 0 || obstacle.scale.y === 0 || obstacle.scale.z === 0) return;
    obstacle.position.z += scrollSpeed;
    
    // Verificar colisão com o jogador
    checkCollision(obstacle, playerPosition);

    if (obstacle.position.z > 10) {
      // encontrar o mais afastado
      const farthestZ = Math.min(...obstacles.map(o => o.position.z));

      // evitar mesmo tipo seguido
      let newTemplateObj;
      do {
        newTemplateObj = getRandomTemplate();
      } while (newTemplateObj.type === lastObstacleType);

      const newClone = newTemplateObj.template.clone();
      const type = newTemplateObj.type;
      lastObstacleType = type;

      let y = 0.051;
      if (newClone.geometry?.type === 'CircleGeometry' || type.includes('tampa')) {
        y = type.includes('tampa') ? 0.09 : 0.07;
      } else if (type.includes('cone')) {
        y = 0.25;
      } else if (type.includes('cavalo')) {
        y = 0.15;
      } else if (type.includes('beercrate')) {
        y = 0.1;
      }

      newClone.position.set(getRandomLaneX(), y, farthestZ - spacing - Math.random() * variation);
      // --- ALTERAÇÃO AQUI ---
      // Remove o antigo da cena
      scene.remove(obstacle);
      // Adiciona o novo à cena
      scene.add(newClone);
      // Substitui o antigo pelo novo no array obstacles
      obstacles[obstacles.indexOf(obstacle)] = newClone;

    }
  });
}

/**
 * Verifica colisão entre o jogador e um obstáculo
 * @param {THREE.Object3D} obstacle - O obstáculo a verificar
 * @param {THREE.Vector3} playerPosition - A posição atual do jogador
 */
function checkCollision(obstacle, playerPosition) {
  // Se o jogador já estiver voando, não verifica colisão
  if (isVanFlying()) return;

  // Distância horizontal (X) entre o jogador e o obstáculo
  const distanceX = Math.abs(obstacle.position.x - playerPosition.x);
  // Distância vertical (Y) entre o jogador e o obstáculo
  const distanceY = Math.abs(obstacle.position.y - playerPosition.y);
  // Distância frontal (Z) entre o jogador e o obstáculo
  const distanceZ = Math.abs(obstacle.position.z - playerPosition.z);
  // Limites de colisão (ajustar conforme necessário)
  const collisionThresholdX = 1.5;
  const collisionThresholdY = 1.0;
  const collisionThresholdZ = 1.5;

  // Se for cavalo, verifica colisão apenas em X e Z (ignora altura)
  if (obstacle.userData.type === 'cavalo') {
    if (distanceX < collisionThresholdX && distanceZ < collisionThresholdZ) {
      // Sempre perde vida ao tocar no cavalo
      loseLife();
      const farthestZ = Math.min(...obstacles.map(o => o.position.z));
      obstacle.position.z = farthestZ - spacing - Math.random() * variation;
      obstacle.position.x = getRandomLaneX();
      obstacle.userData.type = obstacle.userData.type;
    }
    return;
  }

  // Para outros obstáculos, se está a saltar e suficientemente alto, ignora colisão
  if (isVanJumping() && playerPosition.y > 1.7) return;

  // Verifica colisão normal
  if (distanceX < collisionThresholdX && distanceY < collisionThresholdY && distanceZ < collisionThresholdZ) {
    if (obstacle.userData.type === 'beerCrate') {
      startFlying();
      const farthestZ = Math.min(...obstacles.map(o => o.position.z));
      obstacle.position.z = farthestZ - spacing - Math.random() * variation;
      obstacle.position.x = getRandomLaneX();
      obstacle.userData.type = 'beerCrate';
    } else {
      loseLife();
      const farthestZ = Math.min(...obstacles.map(o => o.position.z));
      obstacle.position.z = farthestZ - spacing - Math.random() * variation;
      obstacle.position.x = getRandomLaneX();
      obstacle.userData.type = obstacle.userData.type;
    }
  }
}

let obstacleHitboxHelpers = [];

window.drawObstaclesHitboxes = function(scene) {
  // Remove helpers antigos
  obstacleHitboxHelpers.forEach(helper => scene.remove(helper));
  obstacleHitboxHelpers = [];
  obstacles.forEach(obstacle => {
    if (!obstacle) return;
    const helper = new THREE.BoxHelper(obstacle, 0xff0000);
    scene.add(helper);
    obstacleHitboxHelpers.push(helper);
  });
};

window.clearHitboxes = window.clearHitboxes || function(scene) {};
window.clearHitboxes = (function(oldClear) {
  return function(scene) {
    obstacleHitboxHelpers.forEach(helper => scene.remove(helper));
    obstacleHitboxHelpers = [];
    if (typeof oldClear === 'function') oldClear(scene);
  };
})(window.clearHitboxes);
