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
  
    // Estrada com textura
    const texture = new THREE.TextureLoader().load('/assets/textures/asfalto.jpg');
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, roadLength / 5);

  
    const geometry = new THREE.BoxGeometry(10, 0.1, roadLength);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.1
    });
  
    const road = new THREE.Mesh(geometry, material);
    road.receiveShadow = true;
    group.add(road);
  
    // Linhas tracejadas centrais
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lineGeometry = new THREE.PlaneGeometry(0.15, 1.5); // mais largas e compridas
  
    for (let z = -roadLength / 2 + 1; z < roadLength / 2; z += 3) {
      [-1.66, 1.66].forEach((x) => {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        // Ligeiramente acima da estrada para não colidir
        line.position.set(x, 0.07, z);
        group.add(line);
      });
    }
  
    // Linhas contínuas laterais (bermas)
    const sideLineMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const sideLineGeometry = new THREE.PlaneGeometry(0.15, roadLength);
  
    [-4.9, 4.9].forEach((x) => {
      const sideLine = new THREE.Mesh(sideLineGeometry, sideLineMaterial);
      sideLine.rotation.x = -Math.PI / 2;
      // Ligeiramente acima da estrada para não colidir
      sideLine.position.set(x, 0.07, 0);
      group.add(sideLine);
    });
  
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
  
