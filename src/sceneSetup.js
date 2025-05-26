import * as THREE from 'three';

let ambientLight;
let directionalLight;
let lightStates = {
  ambient: true,
  directional: true
};
let camera;
let orthographicCamera;
let cameraMode = 'default';
let clouds = [];
let cloudsEnabled = false;

// Referência à cena para adicionar novas nuvens
let sceneRef = null;

// Variável para controlar a geração de novas nuvens
let cloudGenerationTimer = 0;
let cloudGenerationInterval = 3; // Gerar nova nuvem a cada 3 segundos (mais frequente)
let cloudGenerationEnabled = false; // Desativado até que a cena seja configurada
let maxClouds = 15;

export function setupScene() {
  const scene = new THREE.Scene();
  sceneRef = scene;
  
  // Carregar a textura do céu
  const textureLoader = new THREE.TextureLoader();
  const skyTexture = textureLoader.load('assets/textures/sky.png');
  scene.background = skyTexture;
  
  // Câmera em perspectiva
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 10);
  camera.lookAt(0, 0, 0);

  // Câmera ortográfica
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 30;
  orthographicCamera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  orthographicCamera.position.set(0, 15, 0);
  orthographicCamera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Luz ambiente - ajustada para um dia ensolarado (azul leve para simular luz do céu)
  ambientLight = new THREE.AmbientLight(0xc4d1ff, 0.4);
  ambientLight.visible = lightStates.ambient;
  scene.add(ambientLight);

  // Luz direcional - ajustada para simular o sol (mais intensa e amarelada)
  directionalLight = new THREE.DirectionalLight(0xfffacd, 1.2);
  directionalLight.position.set(0, 20, 10);
  directionalLight.castShadow = true; // Ativa sombras
  
  // Aumentar a resolução das sombras para melhor qualidade
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  
  // Configurar a câmera de sombra para um alcance muito maior
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 800; // Aumentado de 200 para 800
  
  // Aumentar o tamanho da área de sombra para cobrir mais terreno
  directionalLight.shadow.camera.left = -150;
  directionalLight.shadow.camera.right = 150;
  directionalLight.shadow.camera.top = 150;
  directionalLight.shadow.camera.bottom = -150;
  
  // Ajustar bias para evitar artefatos de sombra
  directionalLight.shadow.bias = -0.0005;
  directionalLight.shadow.normalBias = 0.02;
  
  directionalLight.visible = lightStates.directional;
  scene.add(directionalLight);
  
  // Inicializar a variável global para o estado da luz direcional
  window.isDirectionalLightOn = lightStates.directional;
  
  // Disparar um evento inicial para notificar o estado da luz direcional
  const initialEvent = new CustomEvent('directionalLightToggled', {
    detail: { isOn: lightStates.directional }
  });
  window.dispatchEvent(initialEvent);

  // Ativar sombras no renderer com configurações de alta qualidade
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras mais suaves
  renderer.shadowMap.autoUpdate = true;
  renderer.physicallyCorrectLights = true;

  return { scene, camera, renderer };
}

// Função para criar nuvens mais volúmicas e realistas
function createClouds(scene, textureLoader) {
  if (!cloudsEnabled) return;
  // Criar textura de nuvem mais detalhada
  const cloudTexture = new THREE.CanvasTexture(generateCloudTexture());
  
  // Material base para as nuvens - mais denso e menos transparente
  const cloudBaseMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: cloudTexture,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.2,
    emissiveMap: cloudTexture,
    roughness: 0.15,
    metalness: 0.0,
    alphaTest: 0.05,
    depthWrite: false
  });
  
  // Material para as bordas das nuvens
  const cloudEdgeMaterial = cloudBaseMaterial.clone();
  cloudEdgeMaterial.opacity = 0.7;
  
  // Criar nuvens volúmicas em vez de planas
  for (let i = 0; i < 15; i++) {
    // Criar um grupo para cada nuvem
    const cloudGroup = new THREE.Group();
    
    // Tamanho base da nuvem
    const cloudBaseSize = 12 + Math.random() * 18; // Nuvens maiores
    
    // Criar o núcleo denso da nuvem
    const coreSize = cloudBaseSize * 0.6;
    const coreGeometry = new THREE.SphereGeometry(coreSize, 8, 8);
    const coreMesh = new THREE.Mesh(coreGeometry, cloudBaseMaterial.clone());
    cloudGroup.add(coreMesh);
    
    // Adicionar formas irregulares para criar nuvens mais realistas
    const numParts = 8 + Math.floor(Math.random() * 4); // 8-12 partes por nuvem
    
    for (let j = 0; j < numParts; j++) {
      const partSize = (0.3 + Math.random() * 0.7) * coreSize;
      const partGeometry = new THREE.SphereGeometry(partSize, 6, 6);
      const partMaterial = Math.random() > 0.4 ? cloudBaseMaterial.clone() : cloudEdgeMaterial.clone();
      
      // Variar a opacidade para criar mais profundidade
      partMaterial.opacity = 0.6 + Math.random() * 0.4;
      
      const partMesh = new THREE.Mesh(partGeometry, partMaterial);
      
      // Posicionar as partes ao redor do núcleo de forma irregular
      partMesh.position.set(
        (Math.random() - 0.5) * coreSize * 1.5,
        (Math.random() - 0.3) * coreSize * 1.2, // Mais concentrado no topo
        (Math.random() - 0.5) * coreSize * 1.5
      );
      
      cloudGroup.add(partMesh);
    }
    
    // Posicionar a nuvem aleatoriamente no céu - distribuição mais ampla
    cloudGroup.position.set(
      Math.random() * 600 - 300, // Distribuição horizontal mais ampla
      35 + Math.random() * 50,  // Maior variação de altura
      Math.random() * 800 - 700 // Distribuição em profundidade muito maior
    );
    
    // Rotação aleatória para maior naturalidade
    cloudGroup.rotation.y = Math.random() * Math.PI * 2;
    
    // Aplicar escala geral à nuvem para variar tamanhos
    const cloudScale = 0.7 + Math.random() * 0.6;
    cloudGroup.scale.set(cloudScale, cloudScale * 0.7, cloudScale);
    
    // Adicionar à cena e ao array de nuvens
    scene.add(cloudGroup);
    clouds.push({
      mesh: cloudGroup,
      speed: 0.05 + Math.random() * 0.1,
      direction: new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        0,
        1
      ).normalize()
    });
  }
}

// Função para gerar textura de nuvem mais realista
function generateCloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; // Dobro da resolução para mais detalhes
  canvas.height = 256;
  
  const context = canvas.getContext('2d');
  
  // Limpar o canvas
  context.fillStyle = 'rgba(255, 255, 255, 0)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Criar base irregular em vez de circular
  // Primeiro, criar uma forma base irregular
  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  
  // Desenhar formas irregulares para a base da nuvem
  for (let i = 0; i < 8; i++) {
    const centerX = canvas.width * (0.3 + Math.random() * 0.4); // Concentrar no meio
    const centerY = canvas.height * (0.3 + Math.random() * 0.4);
    const radiusX = canvas.width * (0.15 + Math.random() * 0.2);
    const radiusY = canvas.height * (0.2 + Math.random() * 0.3);
    
    context.save();
    context.translate(centerX, centerY);
    context.rotate(Math.random() * Math.PI);
    context.scale(1, 0.6 + Math.random() * 0.4); // Achatamento variável
    
    // Desenhar forma irregular
    context.beginPath();
    context.moveTo(0, 0);
    
    // Criar uma forma com 8-12 pontos para irregularidade
    const points = 8 + Math.floor(Math.random() * 4);
    for (let j = 0; j < points; j++) {
      const angle = (j / points) * Math.PI * 2;
      const distance = radiusX * (0.7 + Math.random() * 0.6);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      context.lineTo(x, y);
    }
    
    context.closePath();
    context.fill();
    context.restore();
  }
  
  // Adicionar textura de nuvem em camadas para criar profundidade
  // Camada 1: Grandes massas difusas
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 40 + Math.random() * 80; // Massas maiores
    
    const gradientDetail = context.createRadialGradient(
      x, y, 0,
      x, y, radius
    );
    
    gradientDetail.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    gradientDetail.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
    gradientDetail.addColorStop(0.6, 'rgba(255, 255, 255, 0.4)');
    gradientDetail.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    context.fillStyle = gradientDetail;
    
    // Usar formas elípticas em vez de círculos perfeitos
    context.save();
    context.translate(x, y);
    context.rotate(Math.random() * Math.PI);
    context.scale(1, 0.5 + Math.random() * 0.5); // Achatamento variável
    
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  
  // Camada 2: Detalhes menores para textura
  for (let i = 0; i < 80; i++) { // Aumentado para 80 detalhes
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 5 + Math.random() * 25; // Variação maior de tamanho
    
    const gradientDetail = context.createRadialGradient(
      x, y, 0,
      x, y, radius
    );
    
    gradientDetail.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradientDetail.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
    gradientDetail.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    context.fillStyle = gradientDetail;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  
  // Camada 3: Adicionar bordas difusas para suavizar a nuvem
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * canvas.width;
    const y = canvas.height * (Math.random() * 0.3 + 0.7); // Mais na parte inferior
    const radius = 20 + Math.random() * 40;
    
    const gradientDetail = context.createRadialGradient(
      x, y, 0,
      x, y, radius
    );
    
    gradientDetail.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradientDetail.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    context.fillStyle = gradientDetail;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  
  return canvas;
}

// Função para atualizar as nuvens (original - desativada)
// Esta função foi substituída pela nova versão abaixo
function updateCloudsOriginal(deltaTime = 0.016) {
  if (!cloudsEnabled) return;
  clouds.forEach(cloud => {
    // Mover a nuvem na direção definida
    cloud.mesh.position.x += cloud.direction.x * cloud.speed;
    cloud.mesh.position.z += cloud.direction.z * cloud.speed;
    
    // Se a nuvem sair do campo de visão, reposicioná-la
    if (cloud.mesh.position.z > 50) {
      cloud.mesh.position.z = -250;
      cloud.mesh.position.x = Math.random() * 400 - 200;
    }
  });
}

export function getActiveCamera() {
  if (cameraMode === 'orthographic') {
    return orthographicCamera;
  } else {
    return camera;
  }
}

export function setCameraMode(mode) {
  cameraMode = mode;
  updateCameraHint();
}

// Função para ligar/desligar cada luz
export function toggleLight(type, value, justCheck = false) {
  if (justCheck) {
    return lightStates[type];
  }
  
  switch(type) {
    case 'ambient':
      lightStates.ambient = value !== undefined ? value : !lightStates.ambient;
      ambientLight.visible = lightStates.ambient;
      break;
    case 'directional':
      lightStates.directional = value !== undefined ? value : !lightStates.directional;
      directionalLight.visible = lightStates.directional;
      
      // Atualizar a variável global para o estado da luz direcional
      window.isDirectionalLightOn = lightStates.directional;
      
      // Disparar um evento para notificar a mudança da luz direcional
      const event = new CustomEvent('directionalLightToggled', {
        detail: { isOn: lightStates.directional }
      });
      window.dispatchEvent(event);
      break;
  }
  
  if (!justCheck) {
    updateLightingHint();
  }
  
  return lightStates[type];
}

// Função que controla o texto das luzes
function getLightStatusText() {
  const ambient = lightStates.ambient ? "ON" : "OFF";
  const directional = lightStates.directional ? "ON" : "OFF";
  
  // Para obter acesso ao estado dos postes, importamos a variável do main.js
  let streetLightsStatus = "OFF";
  try {
    // Tenta acessar a variável global definida em main.js 
    if (window.streetLightsOn !== undefined) {
      streetLightsStatus = window.streetLightsOn ? "ON" : "OFF";
    }
  } catch (e) {
    // Se falhar, mantém como OFF
  }
  
  return `Luzes: [1] Ambiente: ${ambient} | [2] Direcional: ${directional} | [3] Postes: ${streetLightsStatus}`;
}

// Atualiza o texto no canto inferior esquerdo com a vista ativa
function updateCameraHint() {
  const hintElement = document.getElementById('cameraHint');
  if (hintElement) {
    const lightText = getLightStatusText();
    
    // Texto baseado na câmara atual
    let cameraText = "";
    if (cameraMode === 'orthographic') {
      cameraText = "[C] Câmara Ortogonal";
    } else {
      cameraText = "[C] Câmara Perspetiva";
    }
    
    hintElement.textContent = cameraText + ' | ' + lightText;
  }
}

// Função para configurar a referência à cena
export function setupCloudGeneration(scene) {
  if (!cloudsEnabled) return;
  sceneRef = scene;
  cloudGenerationEnabled = true;
  console.log('Cloud generation system initialized');
}

// Função para atualizar as nuvens
export function updateClouds(deltaTime = 0.016) {
  if (!cloudsEnabled) return;
  // Se a geração de nuvens não estiver ativada ou não houver referência à cena, retornar
  if (!cloudGenerationEnabled || !sceneRef) {
    return;
  }
  
  // Verificar se já temos nuvens demais
  if (clouds.length >= maxClouds) {
    // Se temos muitas nuvens, não gerar novas até que algumas sejam removidas
    cloudGenerationTimer = 0;
  } else {
    // Atualizar o timer de geração de nuvens
    cloudGenerationTimer += deltaTime;
    
    // Verificar se é hora de gerar uma nova nuvem
    if (cloudGenerationTimer >= cloudGenerationInterval) {
      try {
        generateNewCloud();
        cloudGenerationTimer = 0;
        // Variar um pouco o intervalo para próxima nuvem
        cloudGenerationInterval = 4 + Math.random() * 3;
      } catch (error) {
        console.error('Error generating cloud:', error);
        // Desativar geração de nuvens em caso de erro persistente
        cloudGenerationEnabled = false;
      }
    }
  }
  
  // Atualizar posição e rotação de todas as nuvens
  clouds.forEach(cloud => {
    // Move a nuvem na direção definida
    cloud.mesh.position.x += cloud.direction.x * cloud.speed * deltaTime * 60;
    cloud.mesh.position.z += cloud.direction.z * cloud.speed * deltaTime * 60;
    
    // Pequena rotação para dar efeito de movimento
    if (cloud.rotationSpeed) {
      cloud.mesh.rotation.y += cloud.rotationSpeed * deltaTime * 0.5;
    }
    
    // Se a nuvem sair do campo de visão ou ficar muito longe, removê-la
    // Remover mais cedo (z > 50 em vez de 150) para evitar acumulação de nuvens
    if (cloud.mesh.position.z > 50 || 
        cloud.mesh.position.x > 250 || 
        cloud.mesh.position.x < -250) {
      try {
        // Remover a nuvem da cena com segurança
        if (cloud.mesh && cloud.mesh.parent) {
          cloud.mesh.parent.remove(cloud.mesh);
          
          // Liberar memória das geometrias e materiais
          if (cloud.mesh.children && cloud.mesh.children.length > 0) {
            cloud.mesh.children.forEach(child => {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => mat.dispose());
                } else {
                  child.material.dispose();
                }
              }
            });
          }
        }
      } catch (e) {
        console.warn('Error removing cloud:', e);
      }
      
      // Marcar para remoção do array
      cloud.toRemove = true;
    }
  });
  
  // Remover nuvens marcadas para remoção de forma segura
  const remainingClouds = [];
  for (let i = 0; i < clouds.length; i++) {
    if (!clouds[i].toRemove) {
      remainingClouds.push(clouds[i]);
    }
  }
  clouds = remainingClouds;
}

// Função para gerar uma nova nuvem
function generateNewCloud() {
  if (!cloudsEnabled) return;
  // Criar textura de nuvem
  const cloudTexture = new THREE.CanvasTexture(generateCloudTexture());
  
  // Material base para as nuvens - mais denso e menos transparente
  const cloudBaseMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: cloudTexture,
    transparent: true,
    opacity: 0.95, // Aumentado para 0.95 para maior densidade
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.2, // Aumentado para 0.2 para maior brilho
    emissiveMap: cloudTexture,
    roughness: 0.15, // Reduzido para 0.15 para superfície mais suave
    metalness: 0.0,
    alphaTest: 0.05,
    depthWrite: false // Melhora a renderização de objetos transparentes sobrepostos
  });
  
  // Material para as bordas das nuvens - mais transparente
  const cloudEdgeMaterial = cloudBaseMaterial.clone();
  cloudEdgeMaterial.opacity = 0.7; // Aumentado para 0.7 para maior densidade
  
  // Criar um grupo para a nova nuvem
  const cloudGroup = new THREE.Group();
  
  // Posicionar a nova nuvem no horizonte com maior distribuição
  cloudGroup.position.set(
    Math.random() * 500 - 250,
    35 + Math.random() * 40,
    -400 // Sempre começar mais longe no horizonte
  );
  
  // Rotação aleatória
  cloudGroup.rotation.y = Math.random() * Math.PI * 2;
  
  // Tamanho base da nuvem
  const cloudBaseSize = 12 + Math.random() * 16; // Nuvens maiores
  
  // Criar o núcleo denso da nuvem
  const coreSize = cloudBaseSize * 0.6;
  const coreGeometry = new THREE.SphereGeometry(coreSize, 8, 8);
  const coreMesh = new THREE.Mesh(coreGeometry, cloudBaseMaterial);
  cloudGroup.add(coreMesh);
  
  // Adicionar formas irregulares ao redor do núcleo para dar volume
  const numParts = 8 + Math.floor(Math.random() * 4); // 8-12 partes
  
  for (let i = 0; i < numParts; i++) {
    const partSize = (0.4 + Math.random() * 0.6) * coreSize;
    const partGeometry = new THREE.SphereGeometry(partSize, 6, 6);
    const partMesh = new THREE.Mesh(
      partGeometry, 
      Math.random() > 0.5 ? cloudBaseMaterial : cloudEdgeMaterial
    );
    
    // Posicionar as partes ao redor do núcleo, mais concentradas no topo
    partMesh.position.set(
      (Math.random() - 0.5) * coreSize * 1.2,
      (Math.random() * 0.8) * coreSize * 0.8, // Mais para cima
      (Math.random() - 0.5) * coreSize * 1.2
    );
    
    cloudGroup.add(partMesh);
  }
  
  // Aplicar escala geral à nuvem
  const cloudScale = 0.7 + Math.random() * 0.4;
  cloudGroup.scale.set(cloudScale, cloudScale * 0.6, cloudScale);
  
  // Adicionar o grupo da nuvem à cena usando a referência global
  if (sceneRef) {
    sceneRef.add(cloudGroup);
  } else {
    console.warn('Cannot add cloud - scene reference is missing');
    return; // Sair da função se não houver cena
  }
  
  // Adicionar ao array de nuvens para animação
  clouds.push({
    mesh: cloudGroup,
    speed: 0.05 + Math.random() * 0.05,
    direction: new THREE.Vector3(
      (Math.random() - 0.5) * 0.2, // Pequena variação horizontal
      0,
      1 // Principalmente para frente
    ),
    rotationSpeed: (Math.random() - 0.5) * 0.02,
    toRemove: false
  });
}

// Função que atualiza o texto das luzes na UI
function updateLightingHint() {
  updateCameraHint();
}

// Função para atualizar a câmera ortográfica
function updateOrthographicCamera(car) {
  if (cameraMode === 'orthographic' && car) {
    orthographicCamera.position.x = car.position.x;
    orthographicCamera.position.z = car.position.z;
    orthographicCamera.lookAt(car.position.x, 0, car.position.z);
  }
}

export function enableClouds() {
  if (!cloudsEnabled) {
    cloudsEnabled = true;
    if (sceneRef) {
      createClouds(sceneRef, new THREE.TextureLoader());
    }
  }
}

export function disableClouds() {
  if (cloudsEnabled) {
    cloudsEnabled = false;
    // Remove todas as nuvens da cena
    if (sceneRef) {
      clouds.forEach(cloud => {
        if (cloud.mesh && cloud.mesh.parent) {
          cloud.mesh.parent.remove(cloud.mesh);
        }
      });
    }
    clouds = [];
  }
}

export function toggleClouds() {
  if (cloudsEnabled) {
    disableClouds();
  } else {
    enableClouds();
  }
}

export function isCloudsEnabled() {
  return cloudsEnabled;
}