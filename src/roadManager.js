import * as THREE from 'three';
import { getScrollSpeed } from './obstacleManager.js';

const roadBlocks = [];
const roadLength = 60;
const numBlocks = 3;
const roadWidth = 10;
const sidewalkWidth = 4;
const sidewalkHeight = 1;
const grassWidth = 200;

// Controlo do estado das luzes dos postes
let postsLightsOn = false;
window.streetLightsOn = postsLightsOn;

// Geometria e material do poste e lâmpada
const lamppostGeometries = {
  pole: new THREE.CylinderGeometry(0.15, 0.15, 5, 16),
  lamp: new THREE.SphereGeometry(0.5, 16, 16)
};

const lamppostMaterials = {
  pole: new THREE.MeshStandardMaterial({ 
    color: 0x444444,
    roughness: 0.2,
    metalness: 0.8
  }),
  lamp: new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.1
  })
};

export function createRoad() {
  const group = new THREE.Group();

  for (let i = 0; i < numBlocks; i++) {
    const bloco = new THREE.Group();

    // Estrada
    bloco.add( createRoadSegment() );

    // Passeio
    const passeio = createSidewalkMesh();
    const xOff = (roadWidth/2) + (sidewalkWidth/2);

    // Passeio esquerdo
    const leftWalk = passeio.clone();
    leftWalk.position.x = -xOff;
    bloco.add(leftWalk);

    // Poste esquerdo
    const leftPost = createLightPost();
    leftPost.position.set(-xOff - (sidewalkWidth/2) + 1.3, sidewalkHeight, -roadLength/2);
    bloco.add(leftPost);

    // Passeio direito
    const rightWalk = createSidewalkMesh();
    rightWalk.position.x = xOff;
    bloco.add(rightWalk);

    // Poste direito
    const rightPost = createLightPost();
    rightPost.position.set(xOff + (sidewalkWidth/2) - 1.3, sidewalkHeight, -roadLength/2);
    bloco.add(rightPost);

    // Relva de cada lado do passeio
    const grassXOff = (roadWidth / 2) + sidewalkWidth + (grassWidth / 2);
    const grass = createGrassMesh();

    const leftGrass = grass.clone();
    leftGrass.position.set(-grassXOff, 0, 0);
    bloco.add(leftGrass);

    const rightGrass = grass.clone();
    rightGrass.position.set(grassXOff, 0, 0);
    bloco.add(rightGrass);

    // Posiciona o bloco ao longo do eixo Z
    bloco.position.z = -i * roadLength;
    group.add(bloco);
    roadBlocks.push(bloco);
  }

  return group;
}

function createLightPost() {
  const post = new THREE.Group();
  
  // Mastro vertical
  const pole = new THREE.Mesh(lamppostGeometries.pole, lamppostMaterials.pole);
  pole.position.y = 2.5;
  pole.receiveShadow = true;
  post.add(pole);

  // Lâmpada
  const lampMaterial = lamppostMaterials.lamp.clone();
  const lamp = new THREE.Mesh(lamppostGeometries.lamp, lampMaterial);
  lamp.position.set(0, 5.15, 0);
  post.add(lamp);

  // Luz
  const light = new THREE.PointLight(0xffffaa, 20.0, 30);
  light.position.set(0, 5.15, 0);
  light.visible = postsLightsOn;
  post.add(light);
  
  // Armazena referências para controle
  post.light = light;
  post.lamp = lamp;

  return post;
}

function createSidewalkMesh() {
  // Carrega e configura a textura
  const topoTex = new THREE.TextureLoader().load('/assets/textures/passeio.png');
  topoTex.wrapS = topoTex.wrapT = THREE.RepeatWrapping;
  topoTex.repeat.set(1, roadLength); // Repete só no Z

  // Materiais
  const matSide = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9, metalness: 0.1 });
  const matTop = new THREE.MeshStandardMaterial({
    map: topoTex,
    roughness: 0.9,
    metalness: 0.1
  });

  const materials = [
    matSide, // +X
    matSide, // -X
    matTop,  // +Y
    matSide, // -Y
    matSide, // +Z
    matSide  // -Z
  ];

  const geo = new THREE.BoxGeometry(sidewalkWidth, sidewalkHeight, roadLength);
  const mesh = new THREE.Mesh(geo, materials);
  mesh.receiveShadow = true;
  return mesh;
}

function createGrassMesh() {
  const grassWidth = 200;
  const grassLength = roadLength;

  const grassTex = new THREE.TextureLoader().load('/assets/textures/erva.png');
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  
  const tileSize = 2;
  grassTex.repeat.set(
    grassWidth  / tileSize, 
    grassLength / tileSize
  );

  const mat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.9,
    metalness: 0.1
  });

  const geo = new THREE.PlaneGeometry(grassWidth, grassLength);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI/2;
  mesh.receiveShadow = true;
  return mesh;
}

function createRoadSegment() {
  const group = new THREE.Group();

  // Textura da estrada
  const texture = new THREE.TextureLoader().load('/assets/textures/asfalto.jpg');
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, roadLength / 5);

  const geometry = new THREE.BoxGeometry(roadWidth, 0.1, roadLength);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
    metalness: 0.1
  });

  const road = new THREE.Mesh(geometry, material);
  road.receiveShadow = true;
  group.add(road);

  // Linhas tracejadas centrais
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lineGeo = new THREE.PlaneGeometry(0.15, 1.5);
  for (let z = -roadLength/2 + 1; z < roadLength/2; z += 3) {
    [-1.66, 1.66].forEach(x => {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI/2;
      line.position.set(x, 0.07, z);
      group.add(line);
    });
  }

  // Linhas laterais contínuas
  const sideLineMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
  const sideLineGeo = new THREE.PlaneGeometry(0.15, roadLength);
  [-roadWidth/2 + 0.1, roadWidth/2 - 0.1].forEach(x => {
    const sideLine = new THREE.Mesh(sideLineGeo, sideLineMat);
    sideLine.rotation.x = -Math.PI/2;
    sideLine.position.set(x, 0.07, 0);
    group.add(sideLine);
  });

  return group;
}

export function updateRoad() {
  roadBlocks.forEach(block => {
    block.position.z += getScrollSpeed();
    // Quando sair da vista, recicla para trás
    if (block.position.z > roadLength) {
      block.position.z -= roadLength * numBlocks;
    }
  });
}

// Adicionar esta função para alternar as luzes
export function toggleLights(enabled) {
  postsLightsOn = enabled;
  window.streetLightsOn = postsLightsOn;
  
  roadBlocks.forEach(block => {
    block.traverse(child => {
      if (child.isGroup && child.light) {
        child.light.visible = enabled;
        
        if (child.lamp) {
          const lampMaterial = child.lamp.material;
          lampMaterial.emissive = enabled ? new THREE.Color(0xffffaa) : new THREE.Color(0x000000);
          lampMaterial.emissiveIntensity = enabled ? 0.8 : 0;
        }
      }
    });
  });
}

// Função para verificar o estado atual das luzes
export function getPostsLightsState() {
  return postsLightsOn;
}
