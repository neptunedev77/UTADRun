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

// Armazena todas as árvores na cena
const trees = [];

// Array para armazenar os diferentes modelos de árvores
let treeTemplates = [];

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
    if (treeTemplates.length === 0) return;
    
    const templateIndex = Math.floor(Math.random() * treeTemplates.length);
    const treeTemplate = treeTemplates[templateIndex];
    const tree = treeTemplate.clone();
    
    const randomScale = getRandomBetween(0.5, 1.0);
    tree.scale.set(randomScale, randomScale, randomScale);
    
    tree.position.set(x, -0.5, z); 
    tree.rotation.y = Math.random() * Math.PI * 2;

    tree.updateMatrixWorld(true); 

    if (!doesTreeOverlapRoad(tree)) {
        scene.add(tree);
        trees.push(tree);
    } else {
        console.error(`Falha na geração da árvore devido à sobreposição, apesar de X=${x.toFixed(2)}. Árvore descartada.`);
    }
}

// Atualiza a posição das árvores com base na velocidade de rolagem
export function updateTrees(deltaTime = 0.016) {
    if (trees.length === 0) return;
    
    const speed = getScrollSpeed();
    
    trees.forEach(tree => {
        tree.position.z += speed;
        
        if (tree.position.z > 20) {
            let attempts = 0;
            let newX, newZ;
            let overlaps = true;

            while (overlaps && attempts < 10) { 
                const side = Math.random() > 0.5 ? 'left' : 'right';
                newX = getTreeX(side);

                const farthestZ = Math.min(...trees.map(t => t.position.z));
                newZ = Math.max(minZ, farthestZ - treeSpacing - Math.random() * 10);

                tree.position.set(newX, -0.5, newZ);
                const randomScale = getRandomBetween(0.5, 1.0);
                tree.scale.set(randomScale, randomScale, randomScale);
                tree.rotation.y = Math.random() * Math.PI * 2;
                
                tree.updateMatrixWorld(true); 

                overlaps = doesTreeOverlapRoad(tree);
                attempts++;

                if (overlaps) {
                     console.warn(`Tentativa de reciclagem ${attempts} falhou na verificação de sobreposição (X=${newX.toFixed(2)}). Recalculando.`);
                }
            }

            if (overlaps) {
                console.error(`Falha ao reciclar árvore sem sobreposição após ${attempts} tentativas. Colocando-a muito atrás.`);
                tree.position.z = minZ - 100;
            }
        }
    });
}

// Função para carregar os modelos das árvores
export function loadTrees(scene) {
    const loader = new FBXLoader();
    const textureLoader = new THREE.TextureLoader();

    const treeTexture = textureLoader.load('./assets/textures/arvores.png');

    loader.load('./assets/models/tree.fbx', (fbx) => {
        fbx.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.map = treeTexture;
                child.material.needsUpdate = true;
            }
        });
        
        treeTemplates.push(fbx);
        
        loader.load('./assets/models/tree2.fbx', (fbx2) => {
            fbx2.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material.map = treeTexture;
                    child.material.needsUpdate = true;
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
    const maxAttempts = maxTrees * 3;

    while(generatedCount < maxTrees && attempts < maxAttempts) {
        const side = Math.random() > 0.5 ? 'left' : 'right';
        const x = getTreeX(side);
        const z = getRandomBetween(minZ, maxZ);
        
        const countBeforeAdd = trees.length; 
        addTree(scene, x, z);
        
        if (trees.length > countBeforeAdd) {
            generatedCount++;
        }
        attempts++;
    }
    if (generatedCount < maxTrees) {
        console.warn(`Apenas foi possível gerar ${generatedCount}/${maxTrees} árvores sem sobreposição após ${attempts} tentativas.`);
    }
}