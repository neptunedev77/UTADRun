import * as THREE from 'three';

/**
 * Crate de cerveja
 * @returns {THREE.Group}
 */
export function createBeerCrate() {
    const beerCrateGroup = new THREE.Group();
    beerCrateGroup.name = "beerCrate";
    beerCrateGroup.userData = { type: 'beerCrate' };
    
    // Cria a grade (caixa vermelha com abertura superior e furos laterais)
    const crateWidth = 2.5;
    const crateHeight = 1.5;
    const crateDepth = 2.5;
    
    // Grade
    const createCrateBody = () => {
        // Cria base e lados separadamente para permitir furos
        const parts = new THREE.Group();
        
        // Base (baixo)
        const baseGeometry = new THREE.BoxGeometry(crateWidth, 0.2, crateDepth);
        const baseMesh = new THREE.Mesh(baseGeometry, crateMaterial);
        baseMesh.position.y = -crateHeight/2 + 0.1;
        parts.add(baseMesh);
        
        // Lados (com espessura)
        const wallThickness = 0.2;
        
        // Frente (com furos para ver garrafas)
        const frontWallGroup = new THREE.Group();
        // Base da frente
        const frontBottomGeometry = new THREE.BoxGeometry(crateWidth, 0.5, wallThickness);
        const frontBottomMesh = new THREE.Mesh(frontBottomGeometry, crateMaterial);
        frontBottomMesh.position.set(0, -crateHeight/2 + 0.5/2 + 0.2, crateDepth/2 - wallThickness/2);
        frontWallGroup.add(frontBottomMesh);
        
        // Topo da frente
        const frontTopGeometry = new THREE.BoxGeometry(crateWidth, 0.3, wallThickness);
        const frontTopMesh = new THREE.Mesh(frontTopGeometry, crateMaterial);
        frontTopMesh.position.set(0, crateHeight/2 - 0.3/2, crateDepth/2 - wallThickness/2);
        frontWallGroup.add(frontTopMesh);
        
        // Suporte lateral da frente
        const frontSideWidth = 0.4;
        const frontSideGeometry = new THREE.BoxGeometry(frontSideWidth, crateHeight - 0.8, wallThickness);
        const frontLeftMesh = new THREE.Mesh(frontSideGeometry, crateMaterial);
        frontLeftMesh.position.set(-crateWidth/2 + frontSideWidth/2, -0.15, crateDepth/2 - wallThickness/2);
        frontWallGroup.add(frontLeftMesh);
        
        const frontRightMesh = new THREE.Mesh(frontSideGeometry, crateMaterial);
        frontRightMesh.position.set(crateWidth/2 - frontSideWidth/2, -0.15, crateDepth/2 - wallThickness/2);
        frontWallGroup.add(frontRightMesh);
        
        // Suporte central da frente
        const frontMiddleMesh = new THREE.Mesh(frontSideGeometry, crateMaterial);
        frontMiddleMesh.position.set(0, -0.15, crateDepth/2 - wallThickness/2);
        frontWallGroup.add(frontMiddleMesh);
        
        parts.add(frontWallGroup);
        
        // Parte de trás (com furos como a frente)
        const backWallGroup = new THREE.Group();
        // Base da parte de trás
        const backBottomGeometry = new THREE.BoxGeometry(crateWidth, 0.5, wallThickness);
        const backBottomMesh = new THREE.Mesh(backBottomGeometry, crateMaterial);
        backBottomMesh.position.set(0, -crateHeight/2 + 0.5/2 + 0.2, -crateDepth/2 + wallThickness/2);
        backWallGroup.add(backBottomMesh);
        
        // Topo da parte de trás
        const backTopGeometry = new THREE.BoxGeometry(crateWidth, 0.3, wallThickness);
        const backTopMesh = new THREE.Mesh(backTopGeometry, crateMaterial);
        backTopMesh.position.set(0, crateHeight/2 - 0.3/2, -crateDepth/2 + wallThickness/2);
        backWallGroup.add(backTopMesh);
        
        // Suporte lateral da parte de trás
        const backSideGeometry = new THREE.BoxGeometry(frontSideWidth, crateHeight - 0.8, wallThickness);
        const backLeftMesh = new THREE.Mesh(backSideGeometry, crateMaterial);
        backLeftMesh.position.set(-crateWidth/2 + frontSideWidth/2, -0.15, -crateDepth/2 + wallThickness/2);
        backWallGroup.add(backLeftMesh);
        
        const backRightMesh = new THREE.Mesh(backSideGeometry, crateMaterial);
        backRightMesh.position.set(crateWidth/2 - frontSideWidth/2, -0.15, -crateDepth/2 + wallThickness/2);
        backWallGroup.add(backRightMesh);
        
        // Suporte central da parte de trás
        const backMiddleMesh = new THREE.Mesh(backSideGeometry, crateMaterial);
        backMiddleMesh.position.set(0, -0.15, -crateDepth/2 + wallThickness/2);
        backWallGroup.add(backMiddleMesh);
        
        parts.add(backWallGroup);
        
        // Lado esquerdo
        const leftWallGeometry = new THREE.BoxGeometry(wallThickness, crateHeight, crateDepth);
        const leftWallMesh = new THREE.Mesh(leftWallGeometry, crateMaterial);
        leftWallMesh.position.set(-crateWidth/2 + wallThickness/2, 0, 0);
        parts.add(leftWallMesh);
        
        // Lado direito
        const rightWallGeometry = new THREE.BoxGeometry(wallThickness, crateHeight, crateDepth);
        const rightWallMesh = new THREE.Mesh(rightWallGeometry, crateMaterial);
        rightWallMesh.position.set(crateWidth/2 - wallThickness/2, 0, 0);
        parts.add(rightWallMesh);
        
        return parts;
    };
    
    // Cria material da grade com textura
    const crateTexture = createCrateTexture();
    const crateMaterial = new THREE.MeshStandardMaterial({
        map: crateTexture,
        roughness: 0.7,
        metalness: 0.1
    });
    
    // Adiciona a grade ao grupo
    const crateBody = createCrateBody();
    crateBody.position.y = crateHeight/2;
    crateBody.castShadow = true;
    crateBody.receiveShadow = true;
    beerCrateGroup.add(crateBody);
    
    // Cria garrafas
    const bottleRows = 4;
    const bottleCols = 5;
    const bottleSpacingX = crateWidth / (bottleCols + 1);
    const bottleSpacingZ = crateDepth / (bottleRows + 1);
    
    for (let row = 0; row < bottleRows; row++) {
        for (let col = 0; col < bottleCols; col++) {
            const bottle = createBeerBottle();
            bottle.position.set(
                (col + 0.5) * bottleSpacingX - crateWidth/2 + bottleSpacingX/2,
                0.8,
                (row + 0.5) * bottleSpacingZ - crateDepth/2 + bottleSpacingZ/2
            );
            bottle.scale.set(1.2, 1.2, 1.2);
            beerCrateGroup.add(bottle);
        }
    }
    
    beerCrateGroup.scale.set(0.75, 0.75, 0.75);
    
    return beerCrateGroup;
}

/**
 * Garrafas de cerveja
 * @returns {THREE.Group}
 */
function createBeerBottle() {
    const bottleGroup = new THREE.Group();
    
    const bottleGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 16);
    const bottleTexture = createBottleTexture();
    const bottleMaterial = new THREE.MeshPhysicalMaterial({
        map: bottleTexture,
        roughness: 0.1,
        metalness: 0.2,
        clearcoat: 0.5,
        clearcoatRoughness: 0.1,
        transmission: 0.3,
        color: 0x3A2410
    });
    
    const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial);
    bottle.castShadow = true;
    bottleGroup.add(bottle);
    
    // Cria curva da garrafa (junto ao gargalo)
    const shoulderGeometry = new THREE.CylinderGeometry(0.06, 0.12, 0.12, 16);
    const shoulder = new THREE.Mesh(shoulderGeometry, bottleMaterial);
    shoulder.position.y = 0.51;
    shoulder.castShadow = true;
    bottleGroup.add(shoulder);
    
    // Cria gargalo da garrafa
    const neckGeometry = new THREE.CylinderGeometry(0.045, 0.06, 0.2, 16);
    const neck = new THREE.Mesh(neckGeometry, bottleMaterial);
    neck.position.y = 0.67;
    neck.castShadow = true;
    bottleGroup.add(neck);
    
    // Cria tampa da garrafa
    const capGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16);
    const capMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        roughness: 0.2,
        metalness: 1.0
    });
    
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.y = 0.79;
    cap.castShadow = true;
    bottleGroup.add(cap);
    
    return bottleGroup;
}

/**
 * Textura da grade
 * @returns {THREE.Texture}
 */
function createCrateTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext('2d');
    
    context.fillStyle = '#E62E2E';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = '#C41E1E';
    
    const gridSize = 32;
    for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
            if ((x + y) % (gridSize * 2) === 0) {
                context.fillRect(x, y, gridSize, gridSize);
            }
        }
    }
    
    context.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let i = 0; i < 60; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 3 + Math.random() * 10;
        context.fillRect(x, y, size, size);
    }
    
    context.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 2 + Math.random() * 8;
        context.fillRect(x, y, size, size);
    }
    
    context.fillStyle = '#FFFFFF';
    context.fillRect(canvas.width/2 - 400, canvas.height/2 - 200, 800, 400);
    
    context.strokeStyle = '#FFD700';
    context.lineWidth = 8;
    context.strokeRect(canvas.width/2 - 390, canvas.height/2 - 190, 780, 380);
    
    context.fillStyle = '#E62E2E';
    context.font = 'bold 250px Arial';
    context.textAlign = 'center';
    context.fillText('UTAD', canvas.width/2, canvas.height/2 + 30);
    
    context.fillStyle = '#000000';
    context.font = '80px Arial';
    context.fillText('PREMIUM BEER', canvas.width/2, canvas.height/2 + 150);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return texture;
}

/**
 * Texture das garrafas
 * @returns {THREE.Texture}
 */
function createBottleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    context.fillStyle = '#3A2410';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.0)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(0.9, 'rgba(255, 255, 255, 0.0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = '#F5F5DC';
    context.fillRect(80, 150, 352, 220);
    
    context.strokeStyle = '#D4AF37';
    context.lineWidth = 3;
    context.strokeRect(85, 155, 342, 210);
    
    context.fillStyle = '#E62E2E';
    context.beginPath();
    context.arc(canvas.width/2, 190, 40, 0, Math.PI * 2);
    context.fill();
    
    context.fillStyle = '#FFFFFF';  
    context.font = 'bold 30px Arial';
    context.textAlign = 'center';
    context.fillText('UTAD', canvas.width/2, 200);
    
    context.fillStyle = '#000000';
    context.font = 'bold 50px Arial';
    context.fillText('UTAD', canvas.width/2, 270);
    
    context.fillStyle = '#000000';
    context.font = '18px Arial';
    context.fillText('Premium Beer', canvas.width/2, 310);
    
    context.strokeStyle = '#D4AF37';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(120, 330);
    context.lineTo(canvas.width - 120, 330);
    context.stroke();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return texture;
}

// Exporta a crate de cerveja
export function addBeerCrateToObstacles(obstacleTemplates) {
    const beerCrate = createBeerCrate();
    obstacleTemplates['beerCrate'] = beerCrate;
    return beerCrate;
}
