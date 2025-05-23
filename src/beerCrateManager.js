import * as THREE from 'three';

/**
 * Creates a beer crate model with bottles inside
 * - Red crate with brown beer bottles
 * @returns {THREE.Group} The beer crate group object
 */
export function createBeerCrate() {
    const beerCrateGroup = new THREE.Group();
    beerCrateGroup.name = "beerCrate";
    beerCrateGroup.userData = { type: 'beerCrate' };
    
    // Create the crate (red box)
    const crateGeometry = new THREE.BoxGeometry(3, 1, 2);
    const crateTexture = createCrateTexture();
    const crateMaterial = new THREE.MeshStandardMaterial({
        map: crateTexture,
        roughness: 0.7,
        metalness: 0.1
    });
    
    const crate = new THREE.Mesh(crateGeometry, crateMaterial);
    crate.position.y = 0.5; // Half height to place bottom on ground
    crate.castShadow = true;
    crate.receiveShadow = true;
    beerCrateGroup.add(crate);
    
    // Create beer bottles (3x4 grid)
    const bottleRows = 3;
    const bottleCols = 4;
    const bottleSpacingX = 0.6;
    const bottleSpacingZ = 0.5;
    const bottleOffsetX = ((bottleCols - 1) * bottleSpacingX) / 2;
    const bottleOffsetZ = ((bottleRows - 1) * bottleSpacingZ) / 2;
    
    for (let row = 0; row < bottleRows; row++) {
        for (let col = 0; col < bottleCols; col++) {
            const bottle = createBeerBottle();
            bottle.position.set(
                col * bottleSpacingX - bottleOffsetX,
                1.2, // Position on top of the crate
                row * bottleSpacingZ - bottleOffsetZ
            );
            beerCrateGroup.add(bottle);
        }
    }
    
    return beerCrateGroup;
}

/**
 * Creates a beer bottle model
 * @returns {THREE.Group} The beer bottle group object
 */
function createBeerBottle() {
    const bottleGroup = new THREE.Group();
    
    // Create bottle body (cylinder with rounded top)
    const bottleGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 12);
    const bottleTexture = createBottleTexture();
    const bottleMaterial = new THREE.MeshStandardMaterial({
        map: bottleTexture,
        roughness: 0.2,
        metalness: 0.3
    });
    
    const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial);
    bottle.castShadow = true;
    bottleGroup.add(bottle);
    
    // Create bottle neck (thinner cylinder)
    const neckGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.3, 12);
    const neck = new THREE.Mesh(neckGeometry, bottleMaterial);
    neck.position.y = 0.55; // Position on top of the bottle body
    neck.castShadow = true;
    bottleGroup.add(neck);
    
    // Create bottle cap
    const capGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12);
    const capMaterial = new THREE.MeshStandardMaterial({
        color: 0x777777, // Metallic cap color
        roughness: 0.5,
        metalness: 0.8
    });
    
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.y = 0.725; // Position on top of the neck
    cap.castShadow = true;
    bottleGroup.add(cap);
    
    return bottleGroup;
}

/**
 * Creates a texture for the red beer crate
 * @returns {THREE.Texture} The crate texture
 */
function createCrateTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    // Fill with red color
    context.fillStyle = '#B22222'; // Dark red color
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some texture details
    context.fillStyle = '#8B0000'; // Darker red for details
    
    // Add grid pattern
    const gridSize = 64;
    for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
            context.fillRect(x, y, 2, gridSize);
            context.fillRect(x, y, gridSize, 2);
        }
    }
    
    // Add some wear and tear
    context.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 5 + Math.random() * 15;
        context.fillRect(x, y, size, size);
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return texture;
}

/**
 * Creates a texture for the brown beer bottles
 * @returns {THREE.Texture} The bottle texture
 */
function createBottleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Fill with brown color
    context.fillStyle = '#8B4513'; // Brown color
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some glass-like reflections
    context.fillStyle = 'rgba(255, 255, 255, 0.1)';
    context.fillRect(20, 20, 50, 200);
    
    // Add a simple label
    context.fillStyle = '#F5DEB3'; // Wheat color for label
    context.fillRect(50, 80, 150, 100);
    
    // Add some text to the label
    context.fillStyle = '#000000';
    context.font = '20px Arial';
    context.fillText('BEER', 100, 130);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return texture;
}

// Export the beer crate as an obstacle type
export function addBeerCrateToObstacles(obstacleTemplates) {
    const beerCrate = createBeerCrate();
    obstacleTemplates['beerCrate'] = beerCrate;
    return beerCrate;
}
