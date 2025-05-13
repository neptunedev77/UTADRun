import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';
import { getScrollSpeed } from './obstacleManager.js';

// Referência ao cavalo animado
let animatedHorse = null;
let horseGroup = null;
let horseModel = null;

// Parâmetros de animação
let animationTime = 0;
const ANIMATION_DURATION = 0.7; // Tempo ainda mais otimizado para um galope realista

// Sistema de pernas artificiais
let frontLeftLeg = null;
let frontRightLeg = null;
let hindLeftLeg = null;
let hindRightLeg = null;
let head = null;

// Array para armazenar os cavalos na cena
const horses = [];

// Constantes para posicionamento dos cavalos (similar às árvores, mas adaptado)
const roadTotalWidth = 28;
const grassWidth = 200;
const roadLength = 60;
const numBlocks = 3;
const minZ = -roadLength * numBlocks;
const maxZ = 0;

// Menor densidade de cavalos comparado às árvores
const maxHorses = 2; // Reduzido de 5 para apenas 2 cavalos no total

// Calcula uma posição X para o cavalo baseada no lado escolhido (similar às árvores)
function getHorseX(side) {
    const roadLeftEdge = -roadTotalWidth / 2;
    const roadRightEdge = roadTotalWidth / 2;
    
    if (side === 'left') {
        const grassStart = roadLeftEdge - grassWidth;
        const grassEnd = roadLeftEdge - 10; // Mantém uma pequena distância da estrada
        return getRandomBetween(grassStart, grassEnd);
    } else {
        const grassStart = roadRightEdge + 10; // Mantém uma pequena distância da estrada
        const grassEnd = roadRightEdge + grassWidth;
        return getRandomBetween(grassStart, grassEnd);
    }
}

// Função auxiliar para verificar se o cavalo sobrepõe a estrada
function doesHorseOverlapRoad(horse) {
    const roadLeftEdge = -roadTotalWidth / 2;
    const roadRightEdge = roadTotalWidth / 2;
    
    const box = new THREE.Box3().setFromObject(horse);
    
    return !(box.min.x > roadRightEdge || box.max.x < roadLeftEdge);
}

// Função auxiliar para gerar número aleatório entre dois valores
function getRandomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

// Criar o cavalo animado
export function createAnimatedHorse(scene) {
    const loader = new FBXLoader();
    const textureLoader = new THREE.TextureLoader();
    
    // Carrega texturas
    const diffuseMap = textureLoader.load('./assets/models/obstaculos/Horse_Tris_Diffuse.png');
    const roughnessMap = textureLoader.load('./assets/models/obstaculos/Horse_Tris_Roughness.png');
    
    // Carrega o modelo FBX do cavalo
    loader.load('./assets/models/obstaculos/cavalo.fbx', (horse) => {
        horse.scale.set(0.035, 0.035, 0.035);
        
        // Aplica texturas ao modelo
        horse.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                child.material = new THREE.MeshStandardMaterial({
                    map: diffuseMap,
                    roughnessMap: roughnessMap,
                    roughness: 0.7,
                    metalness: 0.2
                });
            }
        });
        
        // Cria os cavalos em posições aleatórias pelo mapa, similar às árvores
        generateHorses(scene, horse);
    });
}

// Função para gerar cavalos iniciais pelo mapa
function generateHorses(scene, horseTemplate) {
    let generatedCount = 0;
    let attempts = 0;
    const maxAttempts = maxHorses * 5; // Mais tentativas para encontrar posições válidas
    
    while (generatedCount < maxHorses && attempts < maxAttempts) {
        // Grupo para este cavalo específico
        const newHorseGroup = new THREE.Group();
        scene.add(newHorseGroup);
        
        // Clone do modelo de cavalo
        const newHorseModel = horseTemplate.clone();
        newHorseGroup.add(newHorseModel);
        
        // Cria pernas artificiais para este cavalo
        const legControllers = createLegsForHorse(newHorseGroup);
        
        // Escolhe um lado aleatoriamente
        const side = Math.random() > 0.5 ? 'left' : 'right';
        
        // Posição X baseada nas regras de posicionamento das árvores
        const xPos = getHorseX(side);
        
        // Posição Z aleatória no mapa (espaçados um do outro se houver mais de um)
        const zPos = getRandomBetween(minZ, maxZ);
        
        // Altura ajustada para ficar perfeitamente no terreno 
        // Valor menor para evitar flutuação
        const groundLevel = -0.2; // Ajustado para ficar mais "encaixado" no terreno
        newHorseGroup.position.set(xPos, groundLevel, zPos);
        
        // Rotação para o cavalo correr para o horizonte com uma pequena variação
        const rotationVariation = (Math.random() * 0.3) - 0.15; // ±15 graus em radianos
        newHorseGroup.rotation.y = rotationVariation;
        
        // Escala aleatória para variação de tamanho
        const randomScale = getRandomBetween(0.8, 1.2);
        newHorseGroup.scale.set(randomScale, randomScale, randomScale);
        
        // Verifica se não está na estrada
        newHorseGroup.updateMatrixWorld(true);
        if (!doesHorseOverlapRoad(newHorseGroup)) {
            // Adiciona o objeto às referências
            horses.push({
                group: newHorseGroup,
                model: newHorseModel,
                legs: legControllers,
                animationTime: Math.random() * ANIMATION_DURATION // Inicia em fases diferentes da animação
            });
            generatedCount++;
        } else {
            // Remove o grupo da cena se sobrepor a estrada
            scene.remove(newHorseGroup);
        }
        
        attempts++;
    }
    
    console.log(`Gerados ${generatedCount} cavalos em ${attempts} tentativas.`);
}

// Cria pernas artificiais para um cavalo específico
function createLegsForHorse(horseGroup) {
    // Material para visualização das pernas (invisível em produção)
    const legMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false });
    
    // Geometria das pernas
    const legGeometry = new THREE.BoxGeometry(0.1, 1.2, 0.1);
    
    // Pernas dianteiras
    const frontLeft = new THREE.Mesh(legGeometry, legMaterial);
    frontLeft.position.set(-0.5, 0, 1);
    horseGroup.add(frontLeft);
    
    const frontRight = new THREE.Mesh(legGeometry, legMaterial);
    frontRight.position.set(0.5, 0, 1);
    horseGroup.add(frontRight);
    
    // Pernas traseiras
    const hindLeft = new THREE.Mesh(legGeometry, legMaterial);
    hindLeft.position.set(-0.5, 0, -1);
    horseGroup.add(hindLeft);
    
    const hindRight = new THREE.Mesh(legGeometry, legMaterial);
    hindRight.position.set(0.5, 0, -1);
    horseGroup.add(hindRight);
    
    // Cabeça para animação
    const headGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.5);
    const headMesh = new THREE.Mesh(headGeometry, legMaterial);
    headMesh.position.set(0, 1, 1.5);
    horseGroup.add(headMesh);
    
    return {
        frontLeft,
        frontRight,
        hindLeft,
        hindRight,
        head: headMesh
    };
}

// Atualiza a posição e animação de todos os cavalos
export function updateAnimatedHorse(deltaTime) {
    if (horses.length === 0) return;
    
    // Obtém a velocidade atual do jogo
    const scrollSpeed = getScrollSpeed();
    
    // Atualiza cada cavalo individualmente
    horses.forEach(horse => {
        // Atualiza o tempo de animação deste cavalo
        const animationSpeed = Math.max(2.0, scrollSpeed * 3);
        horse.animationTime = (horse.animationTime + deltaTime * animationSpeed) % ANIMATION_DURATION;
        
        // Posição normalizada no ciclo de animação (0-1)
        const cycle = horse.animationTime / ANIMATION_DURATION;
        
        // O cavalo se move para o horizonte
        horse.group.position.z += scrollSpeed * 2.0;
        
        // Anima o galope para este cavalo
        animateHorseGallop(horse, cycle, scrollSpeed);
        
        // Se o cavalo se afastou muito no horizonte, reposiciona-o
        if (horse.group.position.z > 20) {
            // Escolhe um novo lado aleatoriamente
            const side = Math.random() > 0.5 ? 'left' : 'right';
            
            // Nova posição X baseada no lado
            const xPos = getHorseX(side);
            
            // Encontra a posição Z mais distante entre todos os cavalos
            const farthestZ = Math.min(...horses.map(h => h.group.position.z));
            
            // Posiciona este cavalo ainda mais longe com alguma variação
            const zPos = farthestZ - 70 - Math.random() * 100; // Maior distância entre cavalos
            
            // Reposiciona o cavalo com altura ajustada para o terreno
            const groundLevel = -0.2; // Mesma altura ajustada
            horse.group.position.set(xPos, groundLevel, zPos);
            
            // Nova rotação aleatória
            const rotationVariation = (Math.random() * 0.3) - 0.15;
            horse.group.rotation.y = rotationVariation;
            
            // Redefine as rotações do modelo
            horse.model.rotation.x = 0;
            horse.model.rotation.z = 0;
            horse.model.position.z = 0;
        }
    });
}

// Anima o galope de um cavalo específico
function animateHorseGallop(horse, cycle, scrollSpeed) {
    const legs = horse.legs;
    const horseModel = horse.model;
    
    if (!horseModel || !legs.frontLeft || !legs.frontRight || !legs.hindLeft || !legs.hindRight) return;
    
    // Intensidade baseada na velocidade do jogo - mais suave em velocidades mais baixas
    const intensity = Math.min(1.5, 0.9 + scrollSpeed * 0.6);
    
    // Altura do galope proporcional à velocidade - reduzida para evitar que pernas atravessem o chão
    const height = Math.min(0.7, 0.4 + scrollSpeed * 0.3); // Reduzida a altura máxima do galope
    
    // Movimento vertical do cavalo durante o galope - trajetória mais natural
    // Usa uma curva senoidal ajustada para simular o arco de salto no galope
    const verticalPhase = (cycle * Math.PI * 2) - Math.PI / 4;
    const verticalMovement = Math.sin(verticalPhase) * 0.6 * height; // Reduzida a amplitude vertical
    
    // Altura base ajustada para evitar que as pernas atravessem o chão ou que pareça flutuar
    // O valor base é menor e a altura máxima do movimento vertical também é menor
    horse.group.position.y = -0.2 + Math.max(0.1, verticalMovement); 
    
    // Movimento horizontal sutil para simular o balanço para frente e para trás
    const horizontalSway = Math.sin(cycle * Math.PI * 4) * 0.08 * intensity;
    // Usa a posição local Z para movimento frente/trás relativo ao cavalo
    horseModel.position.z = horizontalSway;
    
    // Inclinação do corpo durante o galope - curva mais natural
    // Usa uma diferença de fase para que o corpo incline antes de subir (física mais realista)
    const bodyPitchPhase = Math.sin(cycle * Math.PI * 2 - Math.PI/3);
    const bodyPitch = bodyPitchPhase * 0.25 * intensity; // Reduzido para movimento mais realista
    horseModel.rotation.x = bodyPitch;
    
    // ===== CICLO COORDENADO DE GALOPE APRIMORADO =====
    
    // Pernas traseiras - movimento limitado para evitar atravessar o chão
    if (cycle < 0.25) {
        // Fase 1: Impulso poderoso - pernas traseiras empurram o solo
        const t = cycle / 0.25;
        // Ângulo reduzido para evitar atravessar o chão
        const angle = lerp(0, -0.9, easeInQuad(t)) * intensity;
        legs.hindLeft.rotation.x = angle;
        legs.hindRight.rotation.x = angle - 0.15; // Mais defasada para naturalidade
        
        // Abertura lateral para realismo - aumenta com a força do impulso
        legs.hindLeft.rotation.z = lerp(0.05, 0.15, t) * intensity;
        legs.hindRight.rotation.z = lerp(-0.05, -0.15, t) * intensity;
    } else if (cycle < 0.5) {
        // Fase 2: Voo - pernas traseiras recolhidas com aceleração natural
        const t = (cycle - 0.25) / 0.25;
        // Ângulos ajustados para movimento mais realista
        const angle = lerp(-0.9, 0.6, easeOutQuad(t)) * intensity;
        legs.hindLeft.rotation.x = angle;
        legs.hindRight.rotation.x = angle + 0.12; // Ligeiramente defasada
        
        // Abertura aumenta durante o voo - movimento mais fluido
        legs.hindLeft.rotation.z = lerp(0.15, 0.25, t) * intensity;
        legs.hindRight.rotation.z = lerp(-0.15, -0.25, t) * intensity;
    } else if (cycle < 0.75) {
        // Fase 3: Aterrissagem - movimento de preparação para o próximo passo
        const t = (cycle - 0.5) / 0.25;
        // Ângulos ajustados para movimento mais realista
        const angle = lerp(0.6, 0.3, easeInOutQuad(t)) * intensity;
        legs.hindLeft.rotation.x = angle;
        legs.hindRight.rotation.x = angle - 0.15; // Defasada
        
        // Abertura diminui de forma suave
        legs.hindLeft.rotation.z = lerp(0.25, 0.15, t) * intensity;
        legs.hindRight.rotation.z = lerp(-0.25, -0.15, t) * intensity;
    } else {
        // Fase 4: Recuperação - preparando para novo impulso com aceleração natural
        const t = (cycle - 0.75) / 0.25;
        const angle = lerp(0.3, 0, easeInOutQuad(t)) * intensity;
        legs.hindLeft.rotation.x = angle;
        legs.hindRight.rotation.x = angle + 0.12; // Defasada
        
        // Retorno à posição inicial com movimento suave
        legs.hindLeft.rotation.z = lerp(0.15, 0.05, t) * intensity;
        legs.hindRight.rotation.z = lerp(-0.15, -0.05, t) * intensity;
    }
    
    // Pernas dianteiras - movimento limitado para evitar atravessar o chão
    if (cycle < 0.25) {
        // Fase 1: Enquanto traseiras impulsionam, dianteiras se recolhem
        const t = cycle / 0.25;
        // Ângulo ajustado para movimento mais realista
        const angle = lerp(0.3, 0.7, easeInOutQuad(t)) * intensity;
        legs.frontLeft.rotation.x = angle;
        legs.frontRight.rotation.x = angle + 0.15; // Mais defasada para naturalidade
        
        // Abertura lateral com variação suave
        legs.frontLeft.rotation.z = lerp(0.05, 0.2, t) * intensity;
        legs.frontRight.rotation.z = lerp(-0.05, -0.2, t) * intensity;
    } else if (cycle < 0.5) {
        // Fase 2: Pernas dianteiras estendendo para frente com aceleração natural
        const t = (cycle - 0.25) / 0.25;
        // Ângulo reduzido para evitar atravessar o chão
        const angle = lerp(0.7, -0.5, easeInOutQuad(t)) * intensity;
        legs.frontLeft.rotation.x = angle;
        legs.frontRight.rotation.x = angle - 0.15; // Defasada
        
        // Abertura mantida durante extensão, variando suavemente
        legs.frontLeft.rotation.z = lerp(0.2, 0.15, t) * intensity;
        legs.frontRight.rotation.z = lerp(-0.2, -0.15, t) * intensity;
    } else if (cycle < 0.75) {
        // Fase 3: Pernas dianteiras tocam o chão/absorvem impacto
        const t = (cycle - 0.5) / 0.25;
        // Ângulo reduzido para evitar atravessar o chão
        const angle = lerp(-0.5, -0.7, easeOutQuad(t)) * intensity;
        legs.frontLeft.rotation.x = angle;
        legs.frontRight.rotation.x = angle + 0.15; // Defasada
        
        // Abertura diminui ao tocar o solo
        legs.frontLeft.rotation.z = lerp(0.15, 0.1, t) * intensity;
        legs.frontRight.rotation.z = lerp(-0.15, -0.1, t) * intensity;
    } else {
        // Fase 4: Pernas dianteiras impulsionam para trás com aceleração natural
        const t = (cycle - 0.75) / 0.25;
        const angle = lerp(-0.7, 0.3, easeInQuad(t)) * intensity;
        legs.frontLeft.rotation.x = angle;
        legs.frontRight.rotation.x = angle - 0.15; // Defasada
        
        // Retorno à posição inicial
        legs.frontLeft.rotation.z = lerp(0.1, 0.05, t) * intensity;
        legs.frontRight.rotation.z = lerp(-0.1, -0.05, t) * intensity;
    }
    
    // Animação realista da cabeça com movimento mais natural
    const headBobPhase = (cycle * Math.PI * 2) + Math.PI/4; // Fase ajustada para seguir o corpo
    legs.head.rotation.x = Math.sin(headBobPhase) * 0.35 * intensity;
    // Movimento lateral sutilmente sincronizado com o ciclo de galope
    legs.head.rotation.z = Math.sin(cycle * Math.PI * 4 + Math.PI/6) * 0.15 * intensity;
    
    // Balanço lateral do corpo para simular o movimento muscular
    horseModel.rotation.z = Math.sin(cycle * Math.PI * 4) * 0.08 * intensity;
    
    // Efeito de respiração e contração muscular durante o galope
    // Contração mais pronunciada durante o impulso
    const breathPhase = cycle * Math.PI * 4 + Math.PI/3;
    const breatheFactor = 1.0 + Math.sin(breathPhase) * 0.12 * intensity;
    horseModel.scale.y = 0.035 * breatheFactor;
    
    // Variação da largura simulando contração muscular sincronizada com o ciclo
    const widthPhase = cycle * Math.PI * 2 + Math.PI/6;
    const widthFactor = 1.0 + Math.sin(widthPhase) * 0.05 * intensity;
    horseModel.scale.x = 0.035 * widthFactor;
    
    // Contração sutil de comprimento para simular a força muscular
    const lengthPhase = cycle * Math.PI * 2;
    const lengthFactor = 1.0 + Math.sin(lengthPhase) * 0.04 * intensity;
    horseModel.scale.z = 0.035 * lengthFactor;
}

// Funções de easing para movimentos mais naturais
function easeInQuad(t) {
    return t * t;
}

function easeOutQuad(t) {
    return t * (2 - t);
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Função de interpolação linear
function lerp(a, b, t) {
    return a + (b - a) * t;
} 