import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';
import { getScrollSpeed } from './obstacleManager.js';

// Estado global
const state = {
    horseGroup: null,
    horses: [],
    assets: {
        textures: {
            diffuse: null,
            roughness: null
        },
        model: null
    }
};

// Parâmetros de animação
const ANIMATION = {
    DURATION: 0.7,
    MAX_HORSES: 2,
    GALLOP_HEIGHT: 0.7,
    BODY_SWAY: 0.08,
    BREATH_FACTOR: 0.06,
    SCALE_BASE: 0.035
};

// Tamanho da estrada
const WORLD = {
    ROAD: {
        WIDTH: 28,
        LENGTH: 60,
        BLOCKS: 3
    },
    GRASS: {
        WIDTH: 200
    },
    get minZ() { return -this.ROAD.LENGTH * this.ROAD.BLOCKS; },
    get maxZ() { return 0; }
};

/**
 * Calcula uma posição X aleatória para o cavalo baseada na lateral escolhida
 * @param {'left'|'right'} side - Lateral da estrada
 * @returns {number} Posição X calculada
 */
function getHorseX(side) {
    const roadLeftEdge = -WORLD.ROAD.WIDTH / 2;
    const roadRightEdge = WORLD.ROAD.WIDTH / 2;
    
    if (side === 'left') {
        const grassStart = roadLeftEdge - WORLD.GRASS.WIDTH;
        const grassEnd = roadLeftEdge - 10;
        return getRandomBetween(grassStart, grassEnd);
    } else {
        const grassStart = roadRightEdge + 10;
        const grassEnd = roadRightEdge + WORLD.GRASS.WIDTH;
        return getRandomBetween(grassStart, grassEnd);
    }
}

/**
 * Verifica se um cavalo se sobrepõe à estrada
 * @param {THREE.Object3D} horse - O objeto do cavalo a verificar
 * @returns {boolean} True se o cavalo se sobrepõe à estrada, false caso contrário
 */
function doesHorseOverlapRoad(horse) {
    const roadLeftEdge = -WORLD.ROAD.WIDTH / 2;
    const roadRightEdge = WORLD.ROAD.WIDTH / 2;
    
    try {
        const box = new THREE.Box3().setFromObject(horse);
        return !(box.min.x > roadRightEdge || box.max.x < roadLeftEdge);
    } catch (error) {
        console.error('Error checking road overlap:', error);
        return false;
    }
}

/**
 * Gera um número aleatório entre min e max
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function getRandomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Atualiza pesos de alvos de morfologia com base no ciclo de animação
 * @param {THREE.Object3D} horse
 * @param {number} cycle
 * @param {number} intensity
 */
function atualizarPesosMorph(horse, cycle, intensity) {
    if (!horse) return;
    
    horse.traverse((child) => {
        if (!child.isMesh || !child.morphTargetInfluences) return;
        
        try {
            // Certificar-se de que temos um array válido
            if (!Array.isArray(child.morphTargetInfluences)) {
                child.morphTargetInfluences = [];
            }
            
            // Ignorar se não houver alvos de morfologia
            if (child.morphTargetInfluences.length === 0) return;
            
            // Ciclo de animação simplificado com 3 posturas principais
            const weights = [0, 0, 0];
            
            // Calcular pesos baseados no ciclo
            if (cycle < 0.33) {
                // Primeira postura (patas frontais estendidas)
                const t = cycle / 0.33;
                weights[0] = 1 - t;
                weights[1] = t;
            } else if (cycle < 0.66) {
                // Segunda postura (galope médio)
                const t = (cycle - 0.33) / 0.33;
                weights[1] = 1 - t;
                weights[2] = t;
            } else {
                // Terceira postura (patas traseiras estendidas)
                const t = (cycle - 0.66) / 0.34;
                weights[2] = 1 - t;
                weights[0] = t;
            }
            
            // Aplicar pesos com intensidade, garantindo que não ultrapassamos os limites do array
            const maxIndex = Math.min(weights.length, child.morphTargetInfluences.length);
            for (let i = 0; i < maxIndex; i++) {
                child.morphTargetInfluences[i] = weights[i] * intensity;
            }
            
            // Marcar para atualizar se necessário
            if (child.geometry?.morphAttributes?.position) {
                child.geometry.morphAttributes.position.needsUpdate = true;
            }
            
        } catch (error) {
            console.error('Erro ao atualizar alvos de morfologia:', error);
            // Resetar alvos de morfologia em caso de erro
            if (child.morphTargetInfluences) {
                for (let i = 0; i < child.morphTargetInfluences.length; i++) {
                    child.morphTargetInfluences[i] = 0;
                }
            }
        }
    });
}

/**
 * Carrega e configura o modelo de cavalo animado
 * @param {THREE.Scene} scene
 * @returns {{update: Function}}
 */
function createAnimatedHorse(scene) {
    if (!scene) {
        console.error('Nenhuma cena fornecida para createAnimatedHorse');
        return { update: () => {} };
    }

    const loader = new FBXLoader();
    state.horseGroup = new THREE.Group();
    scene.add(state.horseGroup);
    
    // Carregar texturas com tratamento de erros e fallbacks
    const textureLoader = new THREE.TextureLoader();
    
    // Função auxiliar para carregar texturas com fallback
    const loadTexture = (path) => {
        return new Promise((resolve) => {
            textureLoader.load(
                path,
                (texture) => {
                    if ('colorSpace' in texture) {
                        texture.colorSpace = THREE.SRGBColorSpace;
                    } else {
                        texture.encoding = THREE.sRGBEncoding;
                    }
                    resolve(texture);
                },
                undefined,
                (err) => {
                    console.warn(`Erro ao carregar textura ${path}:`, err);
                }
            );
        });
    };
    
    // Carregar texturas em paralelo
    Promise.all([
        loadTexture('./assets/models/obstaculos/Horse_Tris_Diffuse.png'),
        loadTexture('./assets/models/obstaculos/Horse_Tris_Roughness.png')
    ]).then(([diffuse, roughness]) => {
        state.assets.textures.diffuse = diffuse;
        state.assets.textures.roughness = roughness;
        
        // Apply textures to existing materials if any
        if (state.assets.model) {
            state.assets.model.traverse((child) => {
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => applyMaterialSettings(mat));
                    } else {
                        applyMaterialSettings(child.material);
                    }
                }
            });
        }
    }).catch(error => {
        console.error('Erro ao carregar texturas:', error);
    });
    
    // Função auxiliar para aplicar configurações de material
    function applyMaterialSettings(material) {
        if (state.assets.textures.diffuse) {
            material.map = state.assets.textures.diffuse;
            material.needsUpdate = true;
        }
        if (state.assets.textures.roughness) {
            material.roughnessMap = state.assets.textures.roughness;
            material.needsUpdate = true;
        }
    }
    
    // Função para carregar o modelo FBX
    const loadHorseModel = () => {
        return new Promise((resolve, reject) => {
            // Tenta carregar o modelo
            loader.load(
                './assets/models/obstaculos/cavalo.fbx',
                (horse) => {
                    if (!horse) {
                        console.error('Falha ao carregar modelo de cavalo: Nenhum modelo retornado');
                        reject(new Error('Modelo de cavalo não carregado'));
                        return;
                    }
                    resolve(horse);
                },
                // Progress callback
                (xhr) => {
                    console.log((xhr.loaded / xhr.total * 100) + '% carregado');
                },
                // Error callback
                (error) => {
                    console.error('Erro ao carregar modelo de cavalo:', error);
                    reject(error);
                }
            );
        });
    };

    // Carregar o modelo FBX com tratamento de erros
    loadHorseModel()
        .then((horse) => {
            try {
                // Armazenar o modelo no estado
                state.assets.model = horse;
                
                // Definir escala inicial
                horse.scale.set(ANIMATION.SCALE_BASE, ANIMATION.SCALE_BASE, ANIMATION.SCALE_BASE);
                
                // Processar o modelo para alvos de morfologia
                processHorseModel(horse);
                
                // Adicionar mixer de animação
                const mixer = new THREE.AnimationMixer(horse);
                horse.mixer = mixer;
                
                // Aplicar materiais se as texturas já estiverem carregadas
                if (state.assets.textures.diffuse || state.assets.textures.roughness) {
                    horse.traverse((child) => {
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => applyMaterialSettings(mat));
                            } else {
                                applyMaterialSettings(child.material);
                            }
                        }
                    });
                }
                
                // Gerar cavalos iniciais na cena
                generateHorses(scene, horse);
                
            } catch (error) {
                console.error('Erro ao processar modelo de cavalo:', error);
            }
        })
        .catch((error) => {
            console.error('Falha ao carregar o modelo de cavalo:', error);
            // Aqui você pode adicionar um modelo de fallback ou mensagem de erro na cena
            console.warn('Usando modelo de cavalo simplificado como fallback');
            
            // Cria um cubo como fallback para testes
            const geometry = new THREE.BoxGeometry(2, 2, 4);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const fallbackHorse = new THREE.Mesh(geometry, material);
            state.assets.model = fallbackHorse;
            generateHorses(scene, fallbackHorse);
        });
    
    return {
        update: (deltaTime) => updateAnimatedHorse(deltaTime)
    };
}

/**
 * Processa o modelo de cavalo para alvos de morfologia e materiais
 * @param {THREE.Object3D} horse
 */
function processHorseModel(horse) {
    if (!horse) return;
    
    horse.traverse((child) => {
        if (!child.isMesh) return;
        
        try {
            child.castShadow = true;
            child.receiveShadow = true;
            
            const material = new THREE.MeshStandardMaterial({
                map: state.assets.textures.diffuse || null,
                roughnessMap: state.assets.textures.roughness || null,
                roughness: 0.7,
                metalness: 0.2
            });
            
            // Configuração de alvos de morfologia
            if (child.geometry?.morphAttributes?.position?.length > 0) {
                material.morphTargets = true;
                
                // Inicialização de influências de alvos de morfologia
                if (!Array.isArray(child.morphTargetInfluences)) {
                    child.morphTargetInfluences = [];
                }
                
                // Garantia de número certo de influências
                const numTargets = child.geometry.morphAttributes.position.length;
                while (child.morphTargetInfluences.length < numTargets) {
                    child.morphTargetInfluences.push(0);
                }
                
                // Garantia de dicionário
                child.morphTargetDictionary = child.morphTargetDictionary || {};
            }
            
            // Aplicação do material
            child.material = material;
            
        } catch (error) {
            console.error('Erro ao processar malha do cavalo:', error);
        }
    });
}

/**
 * Gera cavalos iniciais na cena
 * @param {THREE.Scene} scene
 * @param {THREE.Object3D} horseTemplate
 */
function generateHorses(scene, horseTemplate) {
    if (!scene || !horseTemplate) {
        console.error('Invalid scene or horse template');
        return;
    }

    let generatedCount = 0;
    let attempts = 0;
    const maxAttempts = ANIMATION.MAX_HORSES * 5; // Mais tentativas para encontrar posições válidas
    
    while (generatedCount < ANIMATION.MAX_HORSES && attempts < maxAttempts) {
        try {
            // Criação de um grupo para este cavalo específico
            const newHorseGroup = new THREE.Group();
            
            // Clonagem do modelo do cavalo
            const newHorseModel = horseTemplate.clone();
            newHorseGroup.add(newHorseModel);
            
            // Criação de pernas artificiais para este cavalo
            const legControllers = createLegsForHorse(newHorseGroup);
            
            // Escolha de um lado aleatório (esquerda ou direita da estrada)
            const side = Math.random() > 0.5 ? 'left' : 'right';
            
            // Cálculo de posição baseado nas regras da estrada
            const xPos = getHorseX(side);
            const zPos = getRandomBetween(WORLD.minZ, WORLD.maxZ);
            const groundLevel = -0.2;
            
            // Definição de posição e rotação
            newHorseGroup.position.set(xPos, groundLevel, zPos);
            
            // Variação aleatória de rotação (±15 graus em radianos)
            const rotationVariation = (Math.random() * 0.3) - 0.15;
            newHorseGroup.rotation.y = rotationVariation;
            
            // Escala aleatória para variação
            const randomScale = getRandomBetween(0.8, 1.2);
            newHorseGroup.scale.set(randomScale, randomScale, randomScale);
            
            // Verificação se não sobrepõe a estrada
            newHorseGroup.updateMatrixWorld(true);
            if (!doesHorseOverlapRoad(newHorseGroup)) {
                // Adicionar à cena se a posição for válida
                scene.add(newHorseGroup);
                
                // Adicionar ao nosso array de cavalos
                state.horses.push({
                    group: newHorseGroup,
                    model: newHorseModel,
                    legs: legControllers,
                    animationTime: Math.random() * ANIMATION.DURATION
                });
                generatedCount++;
            } else {
                // Limpar se a posição for inválida
                newHorseGroup.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao gerar cavalo:', error);
        } finally {
            attempts++;
        }
    }
    
    if (generatedCount > 0) {
        console.log(`Gerados ${generatedCount} cavalos em ${attempts} tentativas.`);
    }
}

/**
 * Cria marcadores de posição para as pernas do cavalo (usado como referência para animação)
 * @param {THREE.Group} horseGroup
 * @returns {Object}
 */
function createLegsForHorse(horseGroup) {
    if (!horseGroup) {
        console.error('Grupo de cavalo inválido');
        return {
            frontLeft: null,
            frontRight: null,
            hindLeft: null,
            hindRight: null,
            head: null
        };
    }

    try {
        // Material para pernas
        const legMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            visible: false, 
            transparent: true,
            opacity: 0.0
        });
        
        // Geometria das pernas
        const legGeometry = new THREE.BoxGeometry(0.1, 1.2, 0.1);
        
        // Pernas frontais
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
        
    } catch (error) {
        console.error('Error creating horse legs:', error);
        return {
            frontLeft: null,
            frontRight: null,
            hindLeft: null,
            hindRight: null,
            head: null
        };
    }
}

/**
 * Atualiza a posição e animação de todos os cavalos
 * @param {number} deltaTime - Tempo desde o último frame em segundos
 */
function updateAnimatedHorse(deltaTime) {
    // Garantia de deltaTime válido e não muito grande
    if (!deltaTime || deltaTime <= 0) {
        deltaTime = 1/60; // Padrão para 60 FPS se inválido
    } else if (deltaTime > 1) {
        deltaTime = 1/30; // Limita a 30 FPS mínimo se muito grande
    }

    if (state.horses.length === 0) return;
    
    try {
        // Velocidade atual do jogo
        const scrollSpeed = getScrollSpeed();
        
        // Atualização individual de cada cavalo
        for (const horse of state.horses) {
            if (!horse || !horse.group || !horse.model) continue;
            
            try {
                // Atualização do tempo de animação para este cavalo
                const animationSpeed = Math.max(2.0, scrollSpeed * 3);
                horse.animationTime = (horse.animationTime + deltaTime * animationSpeed) % ANIMATION.DURATION;
                
                // Ciclo de animação normalizado (0-1)
                const cycle = horse.animationTime / ANIMATION.DURATION;
                
                // Mover para o horizonte
                horse.group.position.z += scrollSpeed * 2.0;
                
                // Animação do galope do cavalo
                animateHorseGallop(horse, cycle, scrollSpeed);
                
                // Se o cavalo se afastou muito, reposiciona
                if (horse.group.position.z > 20) {
                    repositionHorse(horse);
                }
                
            } catch (error) {
                console.error('Erro ao atualizar animação do cavalo:', error);
            }
        }
    } catch (error) {
        console.error('Erro em updateAnimatedHorse:', error);
    }
}

/**
 * Reposiciona um cavalo que se afastou muito
 * @param {Object} horse
 */
function repositionHorse(horse) {
    if (!horse || !horse.group || !horse.model) return;
    
    try {
        // Escolha um novo lado aleatório
        const side = Math.random() > 0.5 ? 'left' : 'right';
        
        // Cálculo de nova posição
        const xPos = getHorseX(side);
        
        // Encontrar a posição Z mais distante entre todos os cavalos
        let farthestZ = 0;
        if (state.horses.length > 0) {
            farthestZ = Math.min(...state.horses
                .filter(h => h && h.group)
                .map(h => h.group.position.z)
            );
        }
        
        // Posicionar este cavalo mais para trás com alguma variação
        const zPos = farthestZ - 70 - Math.random() * 100;
        
        // Reposicionar o cavalo com ajuste de nível do solo
        const groundLevel = -0.2;
        horse.group.position.set(xPos, groundLevel, zPos);
        
        // Nova rotação aleatória
        const rotationVariation = (Math.random() * 0.3) - 0.15;
        horse.group.rotation.y = rotationVariation;
        
        horse.model.rotation.set(0, 0, 0);
        horse.model.position.set(0, 0, 0);
        
        if (horse.model.morphTargetInfluences) {
            for (let i = 0; i < horse.model.morphTargetInfluences.length; i++) {
                horse.model.morphTargetInfluences[i] = 0;
            }
        }
        
    } catch (error) {
        console.error('Erro ao repositionar cavalo:', error);
    }
}

/**
 * Anima o galope de um cavalo usando morph targets e transformações
 * @param {Object} horse
 * @param {number} cycle
 * @param {number} scrollSpeed
 */
function animateHorseGallop(horse, cycle, scrollSpeed) {
    if (!horse || !horse.model || !horse.group) {
        console.warn('Objeto de cavalo inválido em animateHorseGallop');
        console.warn('Objeto de cavalo inválido em animateHorseGallop');
        return;
    }

    try {
        const horseModel = horse.model;
        
        // Intensidade baseada na velocidade do jogo
        const intensity = Math.min(1.5, 0.9 + scrollSpeed * 0.6);
        
        // Altura do galope baseada na velocidade
        const height = Math.min(ANIMATION.GALLOP_HEIGHT, 0.4 + scrollSpeed * 0.3);
        
        // Atualização dos pesos dos morph targets para o ciclo de galope
        atualizarPesosMorph(horseModel, cycle, intensity);
        
        // Movimento vertical principal baseado no ciclo de galope
        const gallopPhase = (cycle * Math.PI * 2) - Math.PI / 4;
        const verticalMovement = Math.sin(gallopPhase) * 0.6 * height;
        
        // Ajuste da altura base do cavalo
        const baseY = -0.2 + Math.max(0.1, verticalMovement);
        horse.group.position.y = baseY;
        
        // Movimento horizontal subtil (para frente/para trás)
        const horizontalSway = Math.sin(cycle * Math.PI * 4) * ANIMATION.BODY_SWAY * intensity;
        horseModel.position.z = horizontalSway;
        
        // Inclinamento do corpo durante o galope
        const bodyPitchPhase = Math.sin(cycle * Math.PI * 2 - Math.PI/3);
        const bodyPitch = bodyPitchPhase * 0.25 * intensity;
        horseModel.rotation.x = bodyPitch;
        
        // Inclinamento lateral do corpo
        const bodySway = Math.sin(cycle * Math.PI * 4) * ANIMATION.BODY_SWAY * intensity;
        horseModel.rotation.z = bodySway;
        
        // Efeito de respiração e contracção muscular
        const breathPhase = cycle * Math.PI * 4 + Math.PI/3;
        const breatheFactor = 1.0 + Math.sin(breathPhase) * ANIMATION.BREATH_FACTOR * intensity;
        
        // Aplicação da escala com variação sincronizada com a animação
        const scaleX = 1.0 + Math.sin(cycle * Math.PI * 4) * 0.03 * intensity;
        const scaleY = breatheFactor;
        const scaleZ = 1.0 + Math.sin(cycle * Math.PI * 4 + Math.PI/2) * 0.02 * intensity;
        
        // Aplicação da escala
        horseModel.scale.set(
            ANIMATION.SCALE_BASE * scaleX,
            ANIMATION.SCALE_BASE * scaleY,
            ANIMATION.SCALE_BASE * scaleZ
        );
        
        // Movimento vertical subtil para o modelo
        const liftPhase = Math.sin(cycle * Math.PI * 2);
        horseModel.position.y = Math.max(0, liftPhase * 0.05 * intensity);
        
    } catch (error) {
        console.error('Erro em animateHorseGallop:', error);
    }
}

// Exporta as funções públicas
export { createAnimatedHorse, updateAnimatedHorse };