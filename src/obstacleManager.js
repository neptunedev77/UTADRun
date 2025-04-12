import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';

const obstacles = [];
const obstacleTemplates = {};
const lanePositions = [-3.2, 0, 3.2];
const maxObstacles = 10;
const spawnZStart = -80;

const loader = new FBXLoader();
const textureLoader = new THREE.TextureLoader();

const modelList = [
  { name: 'cone', file: './assets/models/obstaculos/cone.fbx', texture: '/assets/textures/cone.png', scale: 0.35 },
  { name: 'cavalo', file: './assets/models/obstaculos/cavalo.fbx', scale: 0.02 },
  { name: 'buraco', generator: createBuraco }
];

// Gerador de buraco
function createBuraco() {
  const texture = textureLoader.load('/assets/textures/buraco.jpg');

  const geometry = new THREE.CircleGeometry(1.2, 32); // um pouco maior que a tampa
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    metalness: 0.2,
    roughness: 0.8,
    side: THREE.DoubleSide // garante visibilidade de ambos os lados
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.userData.type = 'buraco';

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
      
        fbx.userData = { type: name }; // <== mover aqui
        obstacleTemplates[name] = fbx; // <== mover aqui
        checkAllLoaded();              // <== manter aqui
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
  const baseZ = spawnZStart;
  const spacing = 15; // distância média entre obstáculos
  const variation = 5; // aleatoriedade permitida

  for (let i = 0; i < maxObstacles; i++) {
    const template = getRandomTemplate();
    if (!template) continue;

    const clone = template.clone();
    const name = clone.name.toLowerCase(); // define o nome primeiro
    clone.userData.type = template.userData?.type || name; // depois atribuis
    

    let y = 0.051;
    if (clone.geometry?.type === 'CircleGeometry') {
      y = 0.07;
    } else if (name.includes('cone')) {
      y = 0.25;
    } else if (name.includes('cavalo')) {
      y = 0.15;
    }

    // espaçamento controlado com aleatoriedade leve
    const z = baseZ - i * spacing - Math.random() * variation;

    clone.position.set(getRandomLaneX(), y, z);
    scene.add(clone);
    obstacles.push(clone);
  }
}


function getRandomTemplate() {
  const weightedList = [
    'cone', 'cone', 'cone', // 🎯 cones com mais peso
    'cavalo',               // 🐴 menos frequente
    'buraco', 'buraco'      // buracos com chance média
  ];

  let chosenName;
  let attempts = 0;
  
  do {
    const randIndex = Math.floor(Math.random() * weightedList.length);
    chosenName = weightedList[randIndex];
    attempts++;
  } while (
    obstacleTemplates[chosenName]?.userData?.type === lastObstacleType &&
    attempts < 10
  );
  

  return obstacleTemplates[chosenName];
}


function getRandomLaneX() {
  const index = Math.floor(Math.random() * lanePositions.length);
  return lanePositions[index];
}

function randomSpawnZ() {
  return spawnZStart - Math.random() * 80; // spawn entre -80 e -20
}

let scrollSpeed = 0.35;
export function getScrollSpeed() {
  return scrollSpeed;
}

let spacing = 15;
let variation = 5;
let lastObstacleType = null;
let timeElapsed = 0;

export function updateObstacles(deltaTime = 0.016) {
  timeElapsed += deltaTime;

  // Aumentar dificuldade
  const previousStep = Math.floor((timeElapsed - deltaTime) / 2);
  const currentStep = Math.floor(timeElapsed / 2);
  
  if (currentStep > previousStep) {
    scrollSpeed = Math.min(1.5, scrollSpeed + 0.02);
    spacing = Math.max(4, 15 - timeElapsed * 0.1); // diminui com o tempo
  }
  

  obstacles.forEach((obstacle) => {
    obstacle.position.z += scrollSpeed;

    if (obstacle.position.z > 10) {
      // encontrar o mais afastado
      const farthestZ = Math.min(...obstacles.map(o => o.position.z));

      // evitar mesmo tipo seguido
      let newTemplate;
      do {
        newTemplate = getRandomTemplate();
      } while (newTemplate.userData?.type === lastObstacleType);

      const newClone = newTemplate.clone();
      const name = newClone.name?.toLowerCase() || 'obstaculo';
      
      lastObstacleType = newTemplate.userData?.type || name;
      

      let y = 0.051;
      if (newClone.geometry?.type === 'CircleGeometry') {
        y = 0.07;
      } else if (name.includes('cone')) {
        y = 0.25;
      } else if (name.includes('cavalo')) {
        y = 0.15;
      }

      newClone.position.set(getRandomLaneX(), y, farthestZ - spacing - Math.random() * variation);
      obstacle.position.copy(newClone.position);
      obstacle.userData.type = newTemplate.userData?.type || name;
    }
  });
}
