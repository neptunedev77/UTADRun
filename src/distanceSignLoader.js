import * as THREE from 'three';
import { getDistance } from './distanceTracker.js';
import { getScrollSpeed } from './obstacleManager.js';

let distanceSignTemplate;
let distanceSigns = [];
let scene;
let lastSignDistance = 0;
const signSpacing = 25; // Cria um novo sinal a cada 25 metros
const xPositions = [12, 15]; // Posições apenas na lateral direita
const signDistance = 25; // Distância em unidades do jogo da posição do jogador para a criação do sinal

// Cria o modelo de sinal de distância usando Three.js
export function loadDistanceSign(gameScene) {
    scene = gameScene;
    const textureLoader = new THREE.TextureLoader();
    
    // Carrega a textura de madeira
    const woodTexture = textureLoader.load('./assets/textures/wood.jpg');
    
    // Cria o modelo de sinal usando Three.js
    distanceSignTemplate = createDistanceSignMesh(woodTexture);
    
    // Cria o primeiro sinal na primeira marcação
    createNewSignAtDistance(signSpacing);

    // Ajusta a posição inicial do primeiro sinal para garantir que ele apareça a 25 metros
    if (distanceSigns.length > 0) {
        const firstSign = distanceSigns[0];
        firstSign.mesh.position.z = -signDistance + signSpacing;
    }
}

// Cria um modelo de sinal de distância usando Three.js
function createDistanceSignMesh(woodTexture) {
    const signGroup = new THREE.Group();
    signGroup.name = "DistanceSign";
    
    // Cria a placa do sinal - aumentada para 4x2
    const signGeometry = new THREE.BoxGeometry(4, 2, 0.15);
    const signMaterial = new THREE.MeshStandardMaterial({
        map: woodTexture,
        roughness: 0.8,
        metalness: 0.2
    });
    
    const signMesh = new THREE.Mesh(signGeometry, signMaterial);
    signMesh.name = "SignBoard";
    signMesh.position.set(0, 0, 0);
    signMesh.castShadow = true;
    signMesh.receiveShadow = true;
    
    // Cria a haste do sinal - feita mais grossa e mais longa
    const postGeometry = new THREE.BoxGeometry(0.25, 2, 0.25);
    const postMaterial = new THREE.MeshStandardMaterial({
        map: woodTexture,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.name = "SignPost";
    post.position.set(0, -1.75, 0);
    post.castShadow = true;
    post.receiveShadow = true;
    
    // Cria o plano para a área de texto - aumentado para corresponder ao novo tamanho do sinal
    const textGeometry = new THREE.PlaneGeometry(3.7, 1.7);
    const textMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.9
    });
    
    const textPlane = new THREE.Mesh(textGeometry, textMaterial);
    textPlane.name = "TextArea";
    textPlane.position.set(0, 0, 0.08);
    
    // Add components to group
    signGroup.add(signMesh);
    signGroup.add(post);
    signGroup.add(textPlane);
    
    return signGroup;
}

// Cria um novo sinal na distância especificada
function createNewSignAtDistance(distance) {
    if (!distanceSignTemplate) return;
    
    // Clona o modelo
    const newSign = distanceSignTemplate.clone();
    
    // Escolhe uma posição na lateral direita da estrada
    const xPos = xPositions[Math.floor(Math.random() * xPositions.length)];
    
    // Coloca o sinal a uma distância fixa à frente do jogador (em unidades do jogo)
    const zOffset = -signDistance;
    
    // Posiciona o sinal
    newSign.scale.set(1.5, 1.5, 1.5);
    newSign.position.set(xPos, 2, zOffset);
    
    // Sempre olha para a esquerda já que estamos na lateral direita
    newSign.rotation.y = -Math.PI / 4;
    
    // Encontra o mesh da área de texto e configura a exibição da distância
    let distanceTextMesh;
    newSign.traverse((child) => {
        if (child.name === "TextArea") {
            distanceTextMesh = child;
            createTextDisplay(distanceTextMesh, distance);
        }
    });
    
    // Adiciona ao scene e armazena no nosso array
    scene.add(newSign);
    distanceSigns.push({
        mesh: newSign,
        distanceValue: distance,
        textMesh: distanceTextMesh,
        shouldPassAt: distance // Guarda quando este sinal deve passar pelo jogador
    });
    
    // Atualiza a última distância do sinal
    lastSignDistance = distance;
}

// Cria um texto dinâmico para a distância
function createTextDisplay(mesh, distance) {
    if (!mesh) return;
    
    // Cria canvas para o texto
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 512;
    
    // Cria textura do canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Cria material com a textura do canvas
    const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true
    });
    
    // Aplica material ao mesh do texto
    mesh.material = textMaterial;
    
    // Atualiza o texto inicial
    updateDistanceText(mesh, distance);
}

// Atualiza o texto em um sinal específico
function updateDistanceText(mesh, distance) {
    if (!mesh || !mesh.material || !mesh.material.map) return;
    
    // Atualiza o canvas com o novo texto
    const canvas = mesh.material.map.image;
    const context = canvas.getContext('2d');
    
    // Limpa o canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Adiciona fundo de madeira com alguma transparência
    context.fillStyle = 'rgba(130, 82, 39, 0.3)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Adiciona texto
    context.fillStyle = 'white';
    context.font = 'bold 100px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('DISTÂNCIA', canvas.width / 2, canvas.height / 3);
    
    context.font = 'bold 120px Arial';
    context.fillText(distance + ' m', canvas.width / 2, canvas.height * 2/3);
    
    // Atualiza a textura
    mesh.material.map.needsUpdate = true;
}

// Atualiza os sinais - move-os e cria novos quando necessário
export function updateDistanceSign() {
    const currentDistance = Math.floor(getDistance());
    
    // Verifica se precisamos criar um novo sinal
    if (currentDistance - lastSignDistance >= signSpacing) {
        // Calculate the next milestone distance as exact multiple of signSpacing
        const nextSignDistance = Math.ceil(currentDistance / signSpacing) * signSpacing;
        if (nextSignDistance > lastSignDistance) {
            createNewSignAtDistance(nextSignDistance);
        }
    }
    
    // Atualiza a posição de todos os sinais
    for (let i = distanceSigns.length - 1; i >= 0; i--) {
        const sign = distanceSigns[i];
        
        // Move o sinal para o jogador
        sign.mesh.position.z += getScrollSpeed();
        
        // Remove sinais que passaram pelo jogador
        if (sign.mesh.position.z > 10) {
            scene.remove(sign.mesh);
            distanceSigns.splice(i, 1);
        }
    }
}