import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';

const obstacles = [];
const obstacleTemplates = {};
const lanePositions = [-3.2, 0, 3.2];
const maxObstacles = 8;
const spawnZStart = -80;

const loader = new FBXLoader();
const textureLoader = new THREE.TextureLoader();

const modelList = [
  { name: 'cone', file: './assets/models/obstaculos/cone.fbx', texture: '/assets/textures/cone.png', scale: 0.35 },
  { name: 'cavalo', file: './assets/models/obstaculos/cavalo.fbx', scale: 0.02 },
  { name: 'tampa', generator: createTampa }
];

// Tampa de esgoto gerada por geometria simples + textura
function createTampa() {
  const texture = textureLoader.load('/assets/textures/tampa.png');

  const geometry = new THREE.CircleGeometry(0.9, 32);
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

  modelList.forEach(({ name, file, texture, scale, generator }) => {
    if (generator) {
      const mesh = generator();
      obstacleTemplates[name] = mesh;
      checkAllLoaded();
    } else {
      loader.load(file, (fbx) => {
        fbx.scale.set(scale, scale, scale);

        const tex = texture ? textureLoader.load(texture) : null;

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
    const name = clone.name.toLowerCase();

    let y = 0.051; // altura padrão para encaixar com a estrada

    if (clone.geometry?.type === 'CircleGeometry') {
      // tampa de esgoto (geometria manual)
      y = 0.051;
    } else if (name.includes('cone')) {
      y = 0.25; // ajusta até tocar a estrada (testado)
    } else if (name.includes('cavalo')) {
      y = 0.15; // cavalo parecia flutuar — reduzido
    }

    clone.position.set(getRandomLaneX(), y, randomSpawnZ());
    scene.add(clone);
    obstacles.push(clone);
  }
}


function getRandomTemplate() {
  const keys = Object.keys(obstacleTemplates);
  const rand = keys[Math.floor(Math.random() * keys.length)];
  return obstacleTemplates[rand];
}

function getRandomLaneX() {
  const index = Math.floor(Math.random() * lanePositions.length);
  return lanePositions[index];
}

function randomSpawnZ() {
  return spawnZStart - Math.random() * 80; // spawn entre -80 e -20
}

export function updateObstacles() {
  obstacles.forEach((obstacle) => {
    obstacle.position.z += 0.35;


    if (obstacle.position.z > 10) {
      obstacle.position.z = randomSpawnZ();
      obstacle.position.x = getRandomLaneX();
    }
  });
}
