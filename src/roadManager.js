import * as THREE from 'three';
import { getScrollSpeed } from './obstacleManager.js';

const roadBlocks = [];
const roadLength = 60;
const numBlocks = 3;
const roadWidth = 10;
const sidewalkWidth = 4;
const sidewalkHeight = 1;
const grassWidth = 200;

export function createRoad() {
  const group = new THREE.Group();

  for (let i = 0; i < numBlocks; i++) {
    const bloco = new THREE.Group();

    // Estrada
    bloco.add( createRoadSegment() );

    // Passeio
    const passeio = createSidewalkMesh();
    const xOff = (roadWidth/2) + (sidewalkWidth/2);

    const leftWalk = passeio.clone();
    leftWalk.position.x = -xOff;
    bloco.add(leftWalk);

    const rightWalk = createSidewalkMesh();
    rightWalk.position.x = xOff;

    // garante que tens geometria própria (não partilhada)
    rightWalk.geometry = rightWalk.geometry.clone();

    // inverte cada coordenada U
    const uvs = rightWalk.geometry.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
      uvs.setX(i, 1 - uvs.getX(i));
    }
    uvs.needsUpdate = true;

    bloco.add(rightWalk);

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
