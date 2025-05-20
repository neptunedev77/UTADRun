import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';
import { getScrollSpeed } from './obstacleManager.js';

// Constantes para posicionamento das árvores
const roadTotalWidth = 28;
const grassWidth = 200;
const roadLength = 60;
const numBlocks = 3;
const treeSpacing = 30;
const maxTrees = 40;

// Define os limites do eixo Z com base no comprimento da estrada
const minZ = -roadLength * numBlocks;
const maxZ = 0;

// Object pool para armazenar árvores ativas e inativas
const treePool = {
    active: [],
    inactive: [],
    maxActive: 40
};

// Array para armazenar os diferentes modelos de árvores
let treeTemplates = [];

// Cache para o cálculo de Z mais distante
let cachedFarthestZ = 0;
let lastZUpdateTime = 0;
const Z_UPDATE_INTERVAL = 0.1; // Atualiza o cache a cada 100ms

// Calcula uma posição X para a árvore baseada no lado escolhido
function getTreeX(side) {
    const roadLeftEdge = -roadTotalWidth / 2;
    const roadRightEdge = roadTotalWidth / 2;
    
    if (side === 'left') {
        const grassStart = roadLeftEdge - grassWidth;
        const grassEnd = roadLeftEdge;
        return getRandomBetween(grassStart, grassEnd);
    } else {
        const grassStart = roadRightEdge;
        const grassEnd = roadRightEdge + grassWidth;
        return getRandomBetween(grassStart, grassEnd);
    }
}

// Função auxiliar para verificar se a árvore sobrepõe a estrada
function doesTreeOverlapRoad(tree) {
    const roadLeftEdge = -roadTotalWidth / 2;
    const roadRightEdge = roadTotalWidth / 2;

    const box = new THREE.Box3().setFromObject(tree);

    const overlaps = !(box.min.x > roadRightEdge || box.max.x < roadLeftEdge);

    if (overlaps) {
        console.warn(`Sobreposição detectada! Caixa da Árvore X: [${box.min.x.toFixed(2)}, ${box.max.x.toFixed(2)}], Limites da Estrada: [${roadLeftEdge}, ${roadRightEdge}]`);
    }
    return overlaps;
}

// Adiciona uma árvore à cena garantindo posição segura
function addTree(scene, x, z) {
    if (treeTemplates.length === 0) return null;
    
    let tree;
    
    // Tenta reutilizar uma árvore inativa
    if (treePool.inactive.length > 0) {
        tree = treePool.inactive.pop();
        tree.visible = true;
    } 
    // Se não houver árvores inativas e ainda não atingimos o máximo, cria uma nova
    else if (treePool.active.length < treePool.maxActive) {
        const templateIndex = Math.floor(Math.random() * treeTemplates.length);
        const treeTemplate = treeTemplates[templateIndex];
        tree = treeTemplate.clone();
        scene.add(tree);
    } else {
        // Todas as árvores estão em uso
        return null;
    }
    
    // Configura a árvore
    const randomScale = getRandomBetween(0.5, 1.0);
    tree.scale.set(randomScale, randomScale, randomScale);
    tree.position.set(x, -0.5, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.updateMatrixWorld(true);
    
    // Verifica sobreposição
    if (!doesTreeOverlapRoad(tree)) {
        if (treePool.active.indexOf(tree) === -1) {
            treePool.active.push(tree);
        }
        return tree;
    } else {
        console.warn(`Falha na geração da árvore devido à sobreposição em X=${x.toFixed(2)}.`);
        // Se não for possível posicionar, retorna a árvore ao pool inativo
        tree.visible = false;
        if (treePool.active.indexOf(tree) !== -1) {
            treePool.active = treePool.active.filter(t => t !== tree);
        }
        treePool.inactive.push(tree);
        return null;
    }
}

// Atualiza a posição das árvores com base na velocidade de rolagem
export function updateTrees(scene) {
    const speed = getScrollSpeed();
    const now = performance.now() / 1000; // Tempo atual em segundos
    
    // Atualiza o cache do Z mais distante apenas de vez em quando
    if (now - lastZUpdateTime > Z_UPDATE_INTERVAL) {
        cachedFarthestZ = treePool.active.length > 0 ? 
            Math.min(...treePool.active.map(t => t.position.z)) : 0;
        lastZUpdateTime = now;
    }
    
    // Processa árvores ativas
    for (let i = treePool.active.length - 1; i >= 0; i--) {
        const tree = treePool.active[i];
        tree.position.z += speed;
        
        // Se a árvore saiu da tela, recicla
        if (tree.position.z > 20) {
            let newX, newZ;
            let overlaps = true;
            let attempts = 0;
            
            // Tenta encontrar uma posição válida
            while (overlaps && attempts < 5) {
                const side = Math.random() > 0.5 ? 'left' : 'right';
                newX = getTreeX(side);
                
                // Usa o valor em cache para o Z mais distante
                newZ = Math.max(minZ, cachedFarthestZ - treeSpacing - Math.random() * 10);
                
                tree.position.set(newX, -0.5, newZ);
                tree.scale.setScalar(getRandomBetween(0.5, 1.0));
                tree.rotation.y = Math.random() * Math.PI * 2;
                tree.updateMatrixWorld(true);
                
                overlaps = doesTreeOverlapRoad(tree);
                attempts++;
            }
            
            // Se não encontrou uma posição válida, remove a árvore
            if (overlaps) {
                tree.visible = false;
                treePool.active.splice(i, 1);
                treePool.inactive.push(tree);
            } else {
                // Atualiza o Z mais distante se necessário
                if (newZ < cachedFarthestZ) {
                    cachedFarthestZ = newZ;
                }
            }
        }
    }
    
    // Tenta adicionar novas árvores se necessário
    while (treePool.active.length < treePool.maxActive) {
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const x = getTreeX(side);
        const z = getRandomBetween(cachedFarthestZ - treeSpacing * 2, cachedFarthestZ - treeSpacing);
        
        const tree = addTree(scene, x, z);
        if (!tree) break; // Não foi possível adicionar mais árvores
        
        // Atualiza o Z mais distante se necessário
        if (z < cachedFarthestZ) {
            cachedFarthestZ = z;
        }
    }
}

// Função para carregar os modelos das árvores
export function loadTrees(scene) {
    const loader = new FBXLoader();
    const textureLoader = new THREE.TextureLoader();

    const treeTexture = textureLoader.load('./assets/textures/arvores.png');

    loader.load('./assets/models/tree.fbx', (fbx) => {
        fbx.traverse((child) => {
            if (child.isMesh) {
                const isMainTrunk = child.name && (child.name.includes('trunk') || child.name.includes('branch'));
                child.castShadow = isMainTrunk;
                child.receiveShadow = true;
            
                if (child.material) {
                    child.material = new THREE.MeshStandardMaterial({
                        map: treeTexture
                    });
                    child.material.needsUpdate = true;
                }
            }
        });
        
        treeTemplates.push(fbx);
        
        loader.load('./assets/models/tree2.fbx', (fbx2) => {
            fbx2.traverse((child) => {
                if (child.isMesh) {
                    const isMainTrunk = child.name && (child.name.includes('trunk') || child.name.includes('branch'));
                    child.castShadow = isMainTrunk;
                    child.receiveShadow = true;
                    
                    if (child.material) {
                        child.material = new THREE.MeshStandardMaterial({
                            map: treeTexture
                        });
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            treeTemplates.push(fbx2);
            
            generateTrees(scene);
        }, undefined, (error) => {
            console.error('Erro ao carregar modelo da árvore 2:', error);
        });
    }, undefined, (error) => {
        console.error('Erro ao carregar modelo da árvore 1:', error);
    });
}

// Função auxiliar para gerar número aleatório entre dois valores
function getRandomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

// Gera árvores iniciais para a cena
function generateTrees(scene) {
    if (treeTemplates.length === 0) {
        console.error("Modelos de árvores não carregados antes de chamar generateTrees!");
        return;
    }
    
    let generatedCount = 0;
    let attempts = 0;
    const maxAttempts = treePool.maxActive * 3;
    
    // Limpa quaisquer árvores existentes
    treePool.active.forEach(tree => {
        tree.visible = false;
        treePool.inactive.push(tree);
    });
    treePool.active = [];
    
    // Gera novas árvores
    while (generatedCount < treePool.maxActive && attempts < maxAttempts) {
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const x = getTreeX(side);
        const z = getRandomBetween(minZ, maxZ);
        
        const tree = addTree(scene, x, z);
        if (tree) {
            generatedCount++;
            // Atualiza o Z mais distante
            if (z < cachedFarthestZ) {
                cachedFarthestZ = z;
            }
        }
        
        attempts++;
    }
    
    if (generatedCount < treePool.maxActive) {
        console.warn(`Apenas foi possível gerar ${generatedCount}/${treePool.maxActive} árvores sem sobreposição após ${attempts} tentativas.`);
    }
}