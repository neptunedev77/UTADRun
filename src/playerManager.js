import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';

const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('/assets/models/van/textures/van_03_a.png');
let van;
let currentLane = 0;
const laneSpacing = 2.5; // Espaçamento entre as lanes

export function createPlayer(scene) { 
    const loader = new FBXLoader();
    // Carregar o modelo FBX da van da AAUTAD
    loader.load('/assets/models/van/van.fbx', (fbx) => {
      van = fbx; 
      // Dá escala e posição à van
      van.scale.set(.8, .8, .8);
      // Dá set à posição inicial da van
      van.position.set(0, 1, 4);
      // Roda a van para que fique na posição correta
      van.rotation.y = Math.PI;
      // Aplica textura e controla o aspeto do material e sombra
      van.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.material = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.2,
            roughness: 0.7
          });
        }
      });
      // Adiciona a van à cena
      scene.add(van);
    }, undefined, (error) => {
      console.error("Erro ao carregar .fbx:", error);
    });
  }
  

export function setupPlayerControls() {
  window.addEventListener('keydown', (event) => {
    if (!van) return;
    // Define as tecla 'a' ou 'ArrowLeft' para mover para a esquerda
    
    if (event.key === 'a' || event.key === 'ArrowLeft') {
      if (currentLane > -1) {
        currentLane--;
        updateLanePosition();
      }
    }
    // Define as tecla 'd' ou 'ArrowRight' para mover para a direita
    if (event.key === 'd' || event.key === 'ArrowRight') {
      if (currentLane < 1) {
        currentLane++;
        updateLanePosition();
      }
    }
  });
}
// Atualiza a posição da van com base na lane atual
function updateLanePosition() {
  const targetX = currentLane * laneSpacing;
  van.position.x = targetX;
}
