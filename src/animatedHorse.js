import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';
import { getScrollSpeed } from './obstacleManager.js';

// Referência ao cavalo animado
let horseGroup = null;

// Parâmetros de animação
const ANIMATION_DURATION = 0.7;

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

// Cria os alvos de morph (morph targets) para o cavalo
function criarMorphTargets(mesh) {
    // Criação de morph targets básicos
    const position = mesh.geometry.attributes.position;
    const morphPositions = [];
    
    // Criar 3 poses diferentes para o ciclo de galope
    for (let i = 0; i < 3; i++) {
        const morphPosition = position.clone();
        morphPositions.push(morphPosition);
    }
    
    // Adiciona os morph targets à geometria
    for (let i = 0; i < morphPositions.length; i++) {
        mesh.geometry.morphAttributes.position = mesh.geometry.morphAttributes.position || [];
        mesh.geometry.morphAttributes.position[i] = morphPositions[i];
    }
    
    // Atualiza a contagem de morph targets
    mesh.morphTargetInfluences = [];
    mesh.morphTargetDictionary = {};
}

// Atualiza os pesos dos morph targets com base no ciclo de animação
function atualizarPesosMorph(cavalo, ciclo, intensidade) {
    cavalo.traverse((child) => {
        if (!child.isMesh || !child.morphTargetInfluences) return;
        
        // Ciclo de galope simplificado com 3 poses principais
        const pesos = [0, 0, 0];
        
        if (ciclo < 0.33) {
            // Primeira pose (pernas dianteiras estendidas)
            const t = ciclo / 0.33;
            pesos[0] = 1 - t;
            pesos[1] = t;
        } else if (ciclo < 0.66) {
            // Segunda pose (meio do galope)
            const t = (ciclo - 0.33) / 0.33;
            pesos[1] = 1 - t;
            pesos[2] = t;
        } else {
            // Terceira pose (pernas traseiras estendidas)
            const t = (ciclo - 0.66) / 0.34;
            pesos[2] = 1 - t;
            pesos[0] = t;
        }
        
        // Aplica os pesos com a intensidade
        for (let i = 0; i < pesos.length; i++) {
            if (child.morphTargetInfluences[i] !== undefined) {
                child.morphTargetInfluences[i] = pesos[i] * intensidade;
            }
        }
    });
}

// Carrega o cavalo com morph targets
export function createAnimatedHorse(scene) {
    const loader = new FBXLoader();
    const textureLoader = new THREE.TextureLoader();
    
    // Carrega texturas
    const diffuseMap = textureLoader.load('./assets/models/obstaculos/Horse_Tris_Diffuse.png');
    const roughnessMap = textureLoader.load('./assets/models/obstaculos/Horse_Tris_Roughness.png');
    
    // Carrega o modelo FBX do cavalo
    loader.load('./assets/models/obstaculos/cavalo.fbx', (horse) => {
        horse.scale.set(0.035, 0.035, 0.035);
        
        // Processa o modelo para usar morph targets
        horse.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Configura o material
                child.material = new THREE.MeshStandardMaterial({
                    map: diffuseMap,
                    roughnessMap: roughnessMap,
                    roughness: 0.7,
                    metalness: 0.2,
                    morphTargets: true // Habilita morph targets no material
                });
                
                // Configura os morph targets para esta malha
                if (child.geometry.morphAttributes.position) {
                    // Se o modelo já tiver morph targets, apenas inicializa os arrays
                    child.morphTargetInfluences = [];
                    child.morphTargetDictionary = {};
                    
                    // Preenche com zeros para cada morph target
                    for (let i = 0; i < child.geometry.morphAttributes.position.length; i++) {
                        child.morphTargetInfluences.push(0);
                    }
                } else {
                    // Se não houver morph targets, cria alguns básicos
                    criarMorphTargets(child);
                }
            }
        });
        
        // Adiciona o mixer de animação
        const mixer = new THREE.AnimationMixer(horse);
        horse.mixer = mixer;
        
        // Cria os cavalos em posições aleatórias pelo mapa
        generateHorses(scene, horse);
    });
    
    return {
        // Retorna uma função para atualizar a animação
        update: (deltaTime) => {
            if (horseGroup && horseGroup.mixer) {
                horseGroup.mixer.update(deltaTime);
            }
        }
    };
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
        
        // Anima o galope para este cavalo usando morph targets
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
            const zPos = farthestZ - 70 - Math.random() * 100;
            
            // Reposiciona o cavalo com altura ajustada para o terreno
            const groundLevel = -0.2;
            horse.group.position.set(xPos, groundLevel, zPos);
            
            // Nova rotação aleatória
            const rotationVariation = (Math.random() * 0.3) - 0.15;
            horse.group.rotation.y = rotationVariation;
            
            // Redefine as transformações do modelo
            horse.model.rotation.set(0, 0, 0);
            horse.model.position.set(0, 0, 0);
            
            // Reinicia os morph targets
            if (horse.model.morphTargetInfluences) {
                for (let i = 0; i < horse.model.morphTargetInfluences.length; i++) {
                    horse.model.morphTargetInfluences[i] = 0;
                }
            }
        }
    });
}

// Anima o galope de um cavalo específico usando morph targets
function animateHorseGallop(horse, cycle, scrollSpeed) {
    const horseModel = horse.model;
    if (!horseModel) return;
    
    // Intensidade baseada na velocidade do jogo
    const intensity = Math.min(1.5, 0.9 + scrollSpeed * 0.6);
    
    // Altura do galope proporcional à velocidade
    const height = Math.min(0.7, 0.4 + scrollSpeed * 0.3);
    
    // Atualiza os pesos dos morph targets para o ciclo de galope
    atualizarPesosMorph(horseModel, cycle, intensity);
    
    // Movimento vertical principal baseado no ciclo de galope
    const galopePhase = (cycle * Math.PI * 2) - Math.PI / 4;
    const verticalMovement = Math.sin(galopePhase) * 0.6 * height;
    
    // Ajusta a altura base do cavalo
    const baseY = -0.2 + Math.max(0.1, verticalMovement);
    horse.group.position.y = baseY;
    
    // Movimento horizontal sutil para frente/trás
    const horizontalSway = Math.sin(cycle * Math.PI * 4) * 0.08 * intensity;
    horseModel.position.z = horizontalSway;
    
    // Inclinação do corpo durante o galope
    const bodyPitchPhase = Math.sin(cycle * Math.PI * 2 - Math.PI/3);
    const bodyPitch = bodyPitchPhase * 0.25 * intensity;
    horseModel.rotation.x = bodyPitch;
    
    // Balanço lateral do corpo
    const bodySway = Math.sin(cycle * Math.PI * 4) * 0.08 * intensity;
    horseModel.rotation.z = bodySway;
    
    // Efeito de respiração e contração muscular
    const breathPhase = cycle * Math.PI * 4 + Math.PI/3;
    const breatheFactor = 1.0 + Math.sin(breathPhase) * 0.06 * intensity;
    
    // Aplica a escala com variação síncrona à animação
    const scaleBase = 0.035;
    const scaleX = 1.0 + Math.sin(cycle * Math.PI * 4) * 0.03 * intensity;
    const scaleY = breatheFactor;
    const scaleZ = 1.0 + Math.sin(cycle * Math.PI * 4 + Math.PI/2) * 0.02 * intensity;
    
    horseModel.scale.set(
        scaleBase * scaleX,
        scaleBase * scaleY,
        scaleBase * scaleZ
    );
    
    // Pequeno movimento vertical adicional para o modelo
    const liftPhase = Math.sin(cycle * Math.PI * 2);
    horseModel.position.y = Math.max(0, liftPhase * 0.05 * intensity);
}