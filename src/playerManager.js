import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';


const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('/assets/models/van/textures/van_03_a.png');

let targetX = 0;
let van;
let currentLaneIndex = 1; // começa no meio
const lanePositions = [-2.5, 0, 2.5];

export function createPlayer(scene) {
  const loader = new FBXLoader();

  loader.load('/assets/models/van/van.fbx', (fbx) => {
    van = fbx;
    van.scale.set(0.8, 0.8, 0.8);
    van.position.set(lanePositions[currentLaneIndex], 1, 4);
    van.rotation.y = Math.PI;

    van.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false; // sem sombra
        child.material = new THREE.MeshStandardMaterial({
          map: texture,
          metalness: 0.2,
          roughness: 0.7,
        });
      }
    });

    scene.add(van);
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
  });
}

function updateLanePosition() {
  targetX = lanePositions[currentLaneIndex];
}

export function updatePlayer() {
  if (!van) return;
  van.position.x += (targetX - van.position.x) * 0.1;
}


