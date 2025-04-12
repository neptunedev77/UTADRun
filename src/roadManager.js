import * as THREE from 'three';
import { getScrollSpeed } from './obstacleManager.js';



const roadBlocks = [];
const roadLength = 60;
const numBlocks = 3;

export function createRoad() {
  const roadGroup = new THREE.Group();

  for (let i = 0; i < numBlocks; i++) {
    const road = createRoadSegment();
    road.position.z = -i * roadLength;
    roadGroup.add(road);
    roadBlocks.push(road);
  }

  return roadGroup;
}

function createRoadSegment() {
  const group = new THREE.Group();

  // Estrada
  const geometry = new THREE.BoxGeometry(10, 0.1, roadLength);
  const material = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const road = new THREE.Mesh(geometry, material);
  road.receiveShadow = true;
  group.add(road);

  // Linhas tracejadas
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lineGeometry = new THREE.PlaneGeometry(0.1, 1); // traço fino e curto

  for (let z = -roadLength / 2 + 1; z < roadLength / 2; z += 2) {
    [-1.66, 1.66].forEach((x) => {
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.051, z);
      group.add(line);
    });
  }

  return group;
}

// Função para mover e reciclar blocos da estrada
export function updateRoad() {
    roadBlocks.forEach((block) => {
        block.position.z += getScrollSpeed();
        // Verifica se o bloco saiu da tela
      if (block.position.z > roadLength) {
        block.position.z -= roadLength * numBlocks;
      }
    });
  }
  
