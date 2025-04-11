import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';

const obstacles = [];
const obstacleTemplates = {};
const lanePositions = [-1.7, 0, 1.7]; // reduzido de 2.5 para 1.7 para evitar que os obstáculos saiam do campo de visão
const maxObstacles = 6;
const spawnZStart = -80;

const loader = new FBXLoader();

const modelList = [
  { name: 'cone', file: '/assets/models/obstaculos/cone.fbx', scale: 0.01 },
  { name: 'tronco', file: '/assets/models/obstaculos/tronco.fbx', scale: 0.02 },
  { name: 'tampa', generator: createTampa } // Tampa manual com textura
];

// Gera a tampa de esgoto leve com CircleGeometry
function createTampa() {
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load('/assets/textures/tampa.png');

  const geometry = new THREE.CircleGeometry(1, 32);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    metalness: 0.3,
    roughness: 0.8,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.castShadow = false;
  mesh.receiveShadow = true;

  return mesh;
}

export function loadObstacles(scene) {
  let loaded = 0;

  modelList.forEach(({ name, file, scale, generator }) => {
    if (generator) {
      const mesh = generator();
      obstacleTemplates[name] = mesh;
      checkAllLoaded();
    } else {
      loader.load(file, (fbx) => {
        fbx.scale.set(scale, scale, scale);
        fbx.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
          }
        });
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
      generateObstacles(scene);
    }
  }
}

function generateObstacles(scene) {
  for (let i = 0; i < maxObstacles; i++) {
    const template = getRandomTemplate();
    if (!template) continue;

    const clone = template.clone();
    const isTampa = clone.geometry?.type === 'CircleGeometry';
    const y = isTampa ? 0.06 : 0.5; // altura ideal para tampas vs. outros

    clone.position.set(randomLane(), y, randomSpawnZ());

    scene.add(clone);
    obstacles.push(clone);
  }
}

function getRandomTemplate() {
  const keys = Object.keys(obstacleTemplates);
  const rand = keys[Math.floor(Math.random() * keys.length)];
  return obstacleTemplates[rand];
}

function randomLane() {
  const index = Math.floor(Math.random() * lanePositions.length);
  return lanePositions[index];
}

function randomSpawnZ() {
  return spawnZStart - Math.random() * 60;
}

export function updateObstacles() {
  obstacles.forEach((obstacle) => {
    obstacle.position.z += 0.5;

    if (obstacle.position.z > 10) {
      obstacle.position.z = randomSpawnZ();
      obstacle.position.x = randomLane();
    }
  });
}
