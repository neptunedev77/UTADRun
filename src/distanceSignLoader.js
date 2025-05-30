import * as THREE from 'three';
import { getDistance } from './distanceTracker.js';
import { getScrollSpeed } from './obstacleManager.js';

let distanceSignTemplate;
let distanceSigns = [];
let scene;
let lastSignDistance = 0;
const signSpacing = 100; // Cria um novo sinal a cada 100 metros
const xPositions = [12, 15]; // Lado direito
const signDistance = 25; // Distância em unidades do jogo da posição do jogador para a criação do sinal
const initialSignDistance = 10; // Distância para a placa inicial

// Cria o modelo de sinal de distância usando Three.js
export function loadDistanceSign(gameScene) {
    scene = gameScene;
    const textureLoader = new THREE.TextureLoader();
    
    // Carrega a textura de madeira
    const woodTexture = textureLoader.load('./assets/textures/wood.jpg');
    
    // Cria o modelo de sinal usando Three.js
    distanceSignTemplate = createDistanceSignMesh(woodTexture);
    
    // Cria o sinal inicial aos 10 metros (placa de boas-vindas)
    createWelcomeSign(initialSignDistance);

    // A próxima placa será aos 10 + 100 = 110 metros
    lastSignDistance = initialSignDistance - 10;
}

// Cria a placa de boas-vindas
function createWelcomeSign(distance) {
    if (!distanceSignTemplate) return;
    
    // Clona o modelo
    const welcomeSign = distanceSignTemplate.clone();
    
    // Escolhe uma posição na lateral direita da estrada
    const xPos = xPositions[Math.floor(Math.random() * xPositions.length)];
    
    // Coloca o sinal a uma distância fixa à frente do jogador (em unidades do jogo)
    const zOffset = -signDistance;
    
    // Posiciona o sinal
    welcomeSign.scale.set(0.01, 0.01, 0.01); // Começa pequeno para animar
    welcomeSign.position.set(xPos, 2, zOffset - 15); // Posiciona mais longe para ser visível mais cedo
    
    // Sempre olha para a esquerda já que estamos na lateral direita
    welcomeSign.rotation.y = -Math.PI / 4;
    
    // Encontra o mesh da área de texto e configura a exibição da mensagem de boas-vindas
    let textMesh;
    welcomeSign.traverse((child) => {
        if (child.name === "TextArea") {
            textMesh = child;
            createWelcomeDisplay(textMesh);
        }
    });
    
    // Adiciona ao scene e armazena no nosso array
    scene.add(welcomeSign);
    distanceSigns.push({
        mesh: welcomeSign,
        distanceValue: distance,
        textMesh: textMesh,
        shouldPassAt: distance,
        isWelcomeSign: true,
        animatingIn: true,
        animationTime: 0
    });
}

// Cria o texto de boas-vindas
function createWelcomeDisplay(mesh) {
    if (!mesh) return;

    // Cria canvas para o texto
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    
    // Cria textura do canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Cria material com a textura do canvas
    const textMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        roughness: 0.8,
        metalness: 0.2,
        transparent: true
    });
    
    // Aplica material ao mesh do texto
    mesh.material = textMaterial;
    
    // Atualiza o canvas com o texto de boas-vindas
    const canvasContext = canvas.getContext('2d');
    
    // Limpa o canvas
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    
    // Adiciona fundo de madeira com alguma transparência
    canvasContext.fillStyle = 'rgba(130, 82, 39, 0.3)';
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);
    
    // Adiciona texto com contorno preto
    canvasContext.font = 'bold 80px Arial';
    canvasContext.lineWidth = 8;
    canvasContext.strokeStyle = 'black';
    canvasContext.textAlign = 'center';
    canvasContext.textBaseline = 'middle';
    canvasContext.strokeText('Bem-vindo à', canvas.width / 2, canvas.height / 3);
    canvasContext.fillStyle = 'black';
    canvasContext.fillText('Bem-vindo à', canvas.width / 2, canvas.height / 3);
    
    canvasContext.font = 'bold 120px Arial';
    canvasContext.lineWidth = 10;
    canvasContext.strokeStyle = 'black';
    canvasContext.strokeText('UTAD!', canvas.width / 2, canvas.height * 2/3);
    canvasContext.fillStyle = 'black';
    canvasContext.fillText('UTAD!', canvas.width / 2, canvas.height * 2/3);
    
    // Atualiza a textura
    texture.needsUpdate = true;
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
    const textMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.8,
        metalness: 0.2,
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
    newSign.scale.set(0.01, 0.01, 0.01); // Começa pequeno para animar
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
        shouldPassAt: distance, // Guarda quando este sinal deve passar pelo jogador
        animatingIn: true,
        animationTime: 0
    });
    
    // Atualiza a última distância do sinal
    lastSignDistance = distance - 10;
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
    const textMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        roughness: 0.8,
        metalness: 0.2,
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
    
    // Adiciona texto com contorno preto
    context.font = 'bold 100px Arial';
    context.lineWidth = 8;
    context.strokeStyle = 'black';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.strokeText('PONTUAÇÃO', canvas.width / 2, canvas.height / 3);
    context.fillStyle = 'black';
    context.fillText('PONTUAÇÃO', canvas.width / 2, canvas.height / 3);
    
    context.font = 'bold 120px Arial';
    context.lineWidth = 10;
    context.strokeStyle = 'black';
    context.strokeText(distance - 10 + ' m', canvas.width / 2, canvas.height * 2/3);
    context.fillStyle = 'black';
    context.fillText(distance - 10 + ' m', canvas.width / 2, canvas.height * 2/3);
    
    // Atualiza a textura
    mesh.material.map.needsUpdate = true;
}

// Atualiza os sinais - move-os e cria novos quando necessário
export function updateDistanceSign() {
    const currentDistance = Math.floor(getDistance());
    
    // Verifica se precisamos criar um novo sinal
    if (currentDistance - lastSignDistance >= signSpacing) {
        // Calculate the next milestone distance as exact multiple of signSpacing + initialSignDistance
        const nextSignDistance = initialSignDistance + (Math.ceil((currentDistance - initialSignDistance) / signSpacing) * signSpacing);
        if (nextSignDistance > lastSignDistance) {
            createNewSignAtDistance(nextSignDistance);
        }
    }
    
    // Atualiza a posição de todos os sinais
    for (let i = distanceSigns.length - 1; i >= 0; i--) {
        const sign = distanceSigns[i];
        
        // Move o sinal para o jogador
        sign.mesh.position.z += getScrollSpeed();
        
        // Animação de entrada (escala)
        if (sign.animatingIn) {
            sign.animationTime += 0.08; // velocidade da animação
            const t = Math.min(1, sign.animationTime);
            // Ease out back para efeito "pop"
            const scale = 0.01 + (1.5 - 0.01) * easeOutBack(t);
            sign.mesh.scale.set(scale, scale, scale);
            if (t >= 1) {
                sign.mesh.scale.set(1.5, 1.5, 1.5);
                sign.animatingIn = false;
            }
        }
        
        // Remove sinais que passaram pelo jogador
        if (sign.mesh.position.z > 10) {
            scene.remove(sign.mesh);
            distanceSigns.splice(i, 1);
        }
    }
}

// Função de easing para animação pop
function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Atualiza o material do texto das placas quando a luz direcional é ligada/desligada
window.addEventListener('directionalLightToggled', function() {
    distanceSigns.forEach(signObj => {
        if (signObj.textMesh && signObj.textMesh.material) {
            // Força o material a atualizar (caso precise)
            signObj.textMesh.material.needsUpdate = true;
        }
    });
});