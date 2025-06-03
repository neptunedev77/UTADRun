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
    const leftPost = lamppostPool.get();
    leftPost.visible = true;
    leftPost.position.set(-xOff - (sidewalkWidth/2) + 1.3, 0.3, -roadLength/2); // Y ajustado para 0.3
    bloco.add(leftPost);
    bloco.leftPost = leftPost; // Store reference for cleanup

    // Passeio direito
    const rightWalk = createSidewalkMesh();
    rightWalk.position.x = xOff;
    rightWalk.scale.x = -1;
    bloco.add(rightWalk);

    // Poste direito
    const rightPost = lamppostPool.get();
    rightPost.visible = true;
    rightPost.position.set(xOff + (sidewalkWidth/2) - 1.3, 0.3, -roadLength/2); // Y ajustado para 0.3
    bloco.add(rightPost);
    bloco.rightPost = rightPost; // Store reference for cleanup

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

// Geometria e material do poste e lâmpada
const lamppostGeometries = {
  pole: new THREE.CylinderGeometry(0.15, 0.15, 5, 16),
  lamp: new THREE.SphereGeometry(0.5, 16, 16),
  circle: new THREE.CylinderGeometry(0.3, 0.3, 0.1, 32)
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
  }),
  circle: new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.2,
    metalness: 0.8
  })
};

// Lamppost object pool
const lamppostPool = {
  available: [],
  active: [],
  
  // Initialize the pool with a number of lampposts
  init(count = 10) {
    for (let i = 0; i < count; i++) {
      this.available.push(this._createLamppost());
    }
    return this;
  },
  
  // Get a lamppost from the pool or create a new one if none available
  get() {
    let post;
    if (this.available.length > 0) {
      post = this.available.pop();
    } else {
      console.log('Creating new lamppost - pool exhausted');
      post = this._createLamppost();
    }
    this.active.push(post);
    return post;
  },
  
  // Release a lamppost back to the pool
  release(post) {
    const index = this.active.indexOf(post);
    if (index !== -1) {
      this.active.splice(index, 1);
      // Reset the lamppost state
      post.visible = false;
      post.position.set(0, 0, 0);
      this.available.push(post);
    }
  },
  
  // Create a new lamppost
  _createLamppost() {
    return createLightPostMesh();
  }
};


// Renamed to indicate it creates the mesh only
function createLightPostMesh() {
  const post = new THREE.Group();
  
  // Mastro vertical
  const pole = new THREE.Mesh(lamppostGeometries.pole, lamppostMaterials.pole);
  pole.position.y = 2.5;
  pole.castShadow = true;
  pole.receiveShadow = true;
  post.add(pole);

  // Disco inferior
  const bottomCircle = new THREE.Mesh(lamppostGeometries.circle, lamppostMaterials.circle);
  bottomCircle.position.set(0, 0.25, 0);
  bottomCircle.castShadow = true;
  bottomCircle.receiveShadow = true;
  post.add(bottomCircle);

  // Disco superior
  const topCircle = new THREE.Mesh(lamppostGeometries.circle, lamppostMaterials.circle);
  topCircle.position.set(0, 4.7, 0);
  topCircle.castShadow = true;
  topCircle.receiveShadow = true;
  post.add(topCircle);

  // Lâmpada
  const lampMaterial = lamppostMaterials.lamp.clone();
  const lamp = new THREE.Mesh(lamppostGeometries.lamp, lampMaterial);
  lamp.position.set(0, 5.15, 0);
  lamp.castShadow = true;
  lamp.receiveShadow = true;
  post.add(lamp);

  // Luz
  const light = new THREE.PointLight(0xffffaa, 20.0, 30);
  light.position.set(0, 5.15, 0);
  light.visible = postsLightsOn;
  light.castShadow = true; // Permitir que a luz projete sombras
  light.shadow.mapSize.width = 512; // Resolução da sombra
  light.shadow.mapSize.height = 512;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 30;
  post.add(light);
  
  // Armazena referências para controle
  post.light = light;
  post.lamp = lamp;
  post.visible = false; // Start invisible

  return post;
}

// Wrapper function for backward compatibility
function createLightPost() {
  return lamppostPool.get();
}

// Initialize the pool now that createLightPostMesh is defined
lamppostPool.init();

function createSidewalkMesh() {
  // Carrega e configura a textura
  const topoTex = new THREE.TextureLoader().load('/assets/textures/passeio.png');
  topoTex.wrapS = topoTex.wrapT = THREE.RepeatWrapping;
  topoTex.repeat.set(1, roadLength); // Repete só no Z
  topoTex.minFilter = THREE.LinearMipmapLinearFilter; // Better downscaling
  topoTex.magFilter = THREE.LinearFilter; // Better upscaling
  topoTex.anisotropy = 16; // Improves texture quality at oblique angles

  // Carrega e configura a textura lateral
  const sideTex = new THREE.TextureLoader().load('/assets/textures/passeio_lado.png');
  sideTex.wrapS = sideTex.wrapT = THREE.RepeatWrapping;
  sideTex.repeat.set(1, roadLength); // Repete só no Z
  sideTex.rotation = Math.PI/2; // Roda a textura para alinhar com o eixo Z
  sideTex.minFilter = THREE.LinearMipmapLinearFilter; // Better downscaling
  sideTex.magFilter = THREE.LinearFilter; // Better upscaling
  sideTex.anisotropy = 16; // Improves texture quality at oblique angles
  
  // Materiais
  const matSide = new THREE.MeshStandardMaterial({ 
    map: sideTex,
    roughness: 0.9, 
    metalness: 0.1
  });

  const matTop = new THREE.MeshStandardMaterial({
    map: topoTex,
    roughness: 0.9,
    metalness: 0.1
  });

  // Material para não renderizar os lados que não se vêem	
  const matHidden = new THREE.MeshStandardMaterial({
    side: THREE.BackSide
  });

  const materials = [
    matSide,    // +X (lado da estrada)
    matSide,  // -X (lado externo)
    matTop,     // +Y (topo)
    matHidden,  // -Y (baixo)
    matHidden,  // +Z (frente)
    matHidden   // -Z (trás)
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

export function updateRoad(deltaTime = 0.016) {
  roadBlocks.forEach(block => {
    block.position.z += getScrollSpeed();
    // Quando sair da vista, recicla para trás
    if (block.position.z > roadLength) {  
      block.position.z -= roadLength * numBlocks;
      
      // Atualiza o estado das luzes dos postes
      if (block.leftPost && block.rightPost) {
        // Atualiza a visibilidade das luzes dos postes
        block.leftPost.traverse(child => {
          if (child.isLight) {
            child.visible = postsLightsOn;
          }
        });
        
        block.rightPost.traverse(child => {
          if (child.isLight) {
            child.visible = postsLightsOn;
          }
        });
      }
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
        // Configurar a luz
        child.light.visible = enabled;
        child.light.castShadow = !enabled; // Desativa a sombra circular quando a luz está ligada
        
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

// Função para limpar todos os postes de luz e devolvê-los ao pool
export function cleanupLampposts() {
  // Chamada quando mudar de cena ou nível
  roadBlocks.forEach(block => {
    if (block.leftPost) {
      lamppostPool.release(block.leftPost);
      block.leftPost = null;
    }
    if (block.rightPost) {
      lamppostPool.release(block.rightPost);
      block.rightPost = null;
    }
  });
}
