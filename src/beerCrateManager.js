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
    
    // Create the crate (red box with open top and side holes)
    const crateWidth = 2.5;
    const crateHeight = 1.5;
    const crateDepth = 2.5;
    
    // Main crate body
    const createCrateBody = () => {
        // Create base and sides separately to allow for holes
        const parts = new THREE.Group();
        
        // Base (bottom)
        const baseGeometry = new THREE.BoxGeometry(crateWidth, 0.2, crateDepth);
        const baseMesh = new THREE.Mesh(baseGeometry, crateMaterial);
        baseMesh.position.y = -crateHeight/2 + 0.1;
        parts.add(baseMesh);
        
        // Side walls (with thickness)
        const wallThickness = 0.2;
        
        // Front wall (with holes for viewing bottles)
        const frontWallGroup = new THREE.Group();
        // Bottom part of front wall
        const frontBottomGeometry = new THREE.BoxGeometry(crateWidth, 0.5, wallThickness);
        const frontBottomMesh = new THREE.Mesh(frontBottomGeometry, crateMaterial);
        frontBottomMesh.position.set(0, -crateHeight/2 + 0.5/2 + 0.2, crateDepth/2 - wallThickness/2);
        frontWallGroup.add(frontBottomMesh);
        
        // Top part of front wall
        const frontTopGeometry = new THREE.BoxGeometry(crateWidth, 0.3, wallThickness);
        const frontTopMesh = new THREE.Mesh(frontTopGeometry, crateMaterial);
        frontTopMesh.position.set(0, crateHeight/2 - 0.3/2, crateDepth/2 - wallThickness/2);
        frontWallGroup.add(frontTopMesh);
        
        // Side supports for front wall
        const frontSideWidth = 0.4;
        const frontSideGeometry = new THREE.BoxGeometry(frontSideWidth, crateHeight - 0.8, wallThickness);
        const frontLeftMesh = new THREE.Mesh(frontSideGeometry, crateMaterial);
        frontLeftMesh.position.set(-crateWidth/2 + frontSideWidth/2, -0.15, crateDepth/2 - wallThickness/2);
        frontWallGroup.add(frontLeftMesh);
        
        const frontRightMesh = new THREE.Mesh(frontSideGeometry, crateMaterial);
        frontRightMesh.position.set(crateWidth/2 - frontSideWidth/2, -0.15, crateDepth/2 - wallThickness/2);
        frontWallGroup.add(frontRightMesh);
        
        // Middle support
        const frontMiddleMesh = new THREE.Mesh(frontSideGeometry, crateMaterial);
        frontMiddleMesh.position.set(0, -0.15, crateDepth/2 - wallThickness/2);
        frontWallGroup.add(frontMiddleMesh);
        
        parts.add(frontWallGroup);
        
        // Back wall (with holes like the front)
        const backWallGroup = new THREE.Group();
        // Bottom part of back wall
        const backBottomGeometry = new THREE.BoxGeometry(crateWidth, 0.5, wallThickness);
        const backBottomMesh = new THREE.Mesh(backBottomGeometry, crateMaterial);
        backBottomMesh.position.set(0, -crateHeight/2 + 0.5/2 + 0.2, -crateDepth/2 + wallThickness/2);
        backWallGroup.add(backBottomMesh);
        
        // Top part of back wall
        const backTopGeometry = new THREE.BoxGeometry(crateWidth, 0.3, wallThickness);
        const backTopMesh = new THREE.Mesh(backTopGeometry, crateMaterial);
        backTopMesh.position.set(0, crateHeight/2 - 0.3/2, -crateDepth/2 + wallThickness/2);
        backWallGroup.add(backTopMesh);
        
        // Side supports for back wall
        const backSideGeometry = new THREE.BoxGeometry(frontSideWidth, crateHeight - 0.8, wallThickness);
        const backLeftMesh = new THREE.Mesh(backSideGeometry, crateMaterial);
        backLeftMesh.position.set(-crateWidth/2 + frontSideWidth/2, -0.15, -crateDepth/2 + wallThickness/2);
        backWallGroup.add(backLeftMesh);
        
        const backRightMesh = new THREE.Mesh(backSideGeometry, crateMaterial);
        backRightMesh.position.set(crateWidth/2 - frontSideWidth/2, -0.15, -crateDepth/2 + wallThickness/2);
        backWallGroup.add(backRightMesh);
        
        // Middle support
        const backMiddleMesh = new THREE.Mesh(backSideGeometry, crateMaterial);
        backMiddleMesh.position.set(0, -0.15, -crateDepth/2 + wallThickness/2);
        backWallGroup.add(backMiddleMesh);
        
        parts.add(backWallGroup);
        
        // Left wall
        const leftWallGeometry = new THREE.BoxGeometry(wallThickness, crateHeight, crateDepth);
        const leftWallMesh = new THREE.Mesh(leftWallGeometry, crateMaterial);
        leftWallMesh.position.set(-crateWidth/2 + wallThickness/2, 0, 0);
        parts.add(leftWallMesh);
        
        // Right wall
        const rightWallGeometry = new THREE.BoxGeometry(wallThickness, crateHeight, crateDepth);
        const rightWallMesh = new THREE.Mesh(rightWallGeometry, crateMaterial);
        rightWallMesh.position.set(crateWidth/2 - wallThickness/2, 0, 0);
        parts.add(rightWallMesh);
        
        return parts;
    };
    
    // Create crate material with texture
    const crateTexture = createCrateTexture();
    const crateMaterial = new THREE.MeshStandardMaterial({
        map: crateTexture,
        roughness: 0.7,
        metalness: 0.1
    });
    
    // Create and add crate body
    const crateBody = createCrateBody();
    crateBody.position.y = crateHeight/2; // Position so bottom is at ground level
    crateBody.castShadow = true;
    crateBody.receiveShadow = true;
    beerCrateGroup.add(crateBody);
    
    // Create beer bottles (4x5 grid = 20 bottles)
    // We'll arrange them to appear like a real crate with multiple rows
    const bottleRows = 4;
    const bottleCols = 5;
    const bottleSpacingX = crateWidth / (bottleCols + 1);
    const bottleSpacingZ = crateDepth / (bottleRows + 1);
    
    for (let row = 0; row < bottleRows; row++) {
        for (let col = 0; col < bottleCols; col++) {
            const bottle = createBeerBottle();
            // Position bottles so they're half inside the crate
            bottle.position.set(
                (col + 0.5) * bottleSpacingX - crateWidth/2 + bottleSpacingX/2,
                0.8, // Position bottles higher so they're more visible
                (row + 0.5) * bottleSpacingZ - crateDepth/2 + bottleSpacingZ/2
            );
            bottle.scale.set(1.2, 1.2, 1.2); // Make bottles bigger
            beerCrateGroup.add(bottle);
        }
    }
    
    // Make the crate smaller
    beerCrateGroup.scale.set(0.75, 0.75, 0.75);
    
    return beerCrateGroup;
}

/**
 * Creates a beer bottle model
 * @returns {THREE.Group} The beer bottle group object
 */
function createBeerBottle() {
    const bottleGroup = new THREE.Group();
    
    // Create bottle body with more realistic shape based on reference image
    // European beer bottles are typically more cylindrical
    const bottleGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 16);
    const bottleTexture = createBottleTexture();
    const bottleMaterial = new THREE.MeshPhysicalMaterial({
        map: bottleTexture,
        roughness: 0.1,
        metalness: 0.2,
        clearcoat: 0.5,  // Add glass-like coating
        clearcoatRoughness: 0.1,
        transmission: 0.3, // Slight transparency for glass effect
        color: 0x3A2410  // Darker brown color like in reference
    });
    
    const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial);
    bottle.castShadow = true;
    bottleGroup.add(bottle);
    
    // Create bottle shoulder (transition to neck)
    const shoulderGeometry = new THREE.CylinderGeometry(0.06, 0.12, 0.12, 16);
    const shoulder = new THREE.Mesh(shoulderGeometry, bottleMaterial);
    shoulder.position.y = 0.51; // Position on top of the bottle body
    shoulder.castShadow = true;
    bottleGroup.add(shoulder);
    
    // Create bottle neck (thinner cylinder)
    const neckGeometry = new THREE.CylinderGeometry(0.045, 0.06, 0.2, 16);
    const neck = new THREE.Mesh(neckGeometry, bottleMaterial);
    neck.position.y = 0.67; // Position on top of the shoulder
    neck.castShadow = true;
    bottleGroup.add(neck);
    
    // Create bottle cap
    const capGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16);
    const capMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700, // Gold cap color like in reference
        roughness: 0.2,
        metalness: 1.0
    });
    
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.position.y = 0.79; // Position on top of the neck
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
    canvas.width = 1024; // Higher resolution
    canvas.height = 1024; // Higher resolution
    const context = canvas.getContext('2d');
    
    // Fill with red color similar to Paulaner crate
    context.fillStyle = '#E62E2E'; // Bright red color like in the reference image
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some texture details
    context.fillStyle = '#C41E1E'; // Slightly darker red for details
    
    // Add subtle plastic texture pattern
    const gridSize = 32;
    for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
            if ((x + y) % (gridSize * 2) === 0) {
                context.fillRect(x, y, gridSize, gridSize);
            }
        }
    }
    
    // Add some wear and tear
    context.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let i = 0; i < 60; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 3 + Math.random() * 10;
        context.fillRect(x, y, size, size);
    }
    
    // Add highlights
    context.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 2 + Math.random() * 8;
        context.fillRect(x, y, size, size);
    }
    
    // Add a single large logo to the sides of the crate
    // Create a large white background for the logo that spans most of the side
    context.fillStyle = '#FFFFFF';
    context.fillRect(canvas.width/2 - 400, canvas.height/2 - 200, 800, 400);
    
    // Add border
    context.strokeStyle = '#FFD700'; // Gold border
    context.lineWidth = 8;
    context.strokeRect(canvas.width/2 - 390, canvas.height/2 - 190, 780, 380);
    
    // Add large logo text
    context.fillStyle = '#E62E2E'; // Red text on white background
    context.font = 'bold 250px Arial';
    context.textAlign = 'center';
    context.fillText('UTAD', canvas.width/2, canvas.height/2 + 30);
    
    // Add smaller text below
    context.fillStyle = '#000000';
    context.font = '80px Arial';
    context.fillText('PREMIUM BEER', canvas.width/2, canvas.height/2 + 150);
    
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
    canvas.width = 512; // Higher resolution
    canvas.height = 512; // Higher resolution
    const context = canvas.getContext('2d');
    
    // Fill with dark amber beer color (like in reference)
    context.fillStyle = '#3A2410'; // Dark amber color
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add glass-like reflections and highlights
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.0)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(0.9, 'rgba(255, 255, 255, 0.0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add a more realistic label (similar to Paulaner in reference)
    // Main label (cream colored like in reference)
    context.fillStyle = '#F5F5DC'; // Cream color
    context.fillRect(80, 150, 352, 220);
    
    // Add border to label
    context.strokeStyle = '#D4AF37'; // Gold border
    context.lineWidth = 3;
    context.strokeRect(85, 155, 342, 210);
    
    // Add circular logo at top of label (like in reference)
    context.fillStyle = '#E62E2E'; // Red circle
    context.beginPath();
    context.arc(canvas.width/2, 190, 40, 0, Math.PI * 2);
    context.fill();
    
    context.fillStyle = '#FFFFFF'; // White text in circle
    context.font = 'bold 30px Arial';
    context.textAlign = 'center';
    context.fillText('UTAD', canvas.width/2, 200);
    
    // Add brand name to the label
    context.fillStyle = '#000000'; // Black text
    context.font = 'bold 50px Arial';
    context.fillText('UTAD', canvas.width/2, 270);
    
    // Add tagline
    context.fillStyle = '#000000';
    context.font = '18px Arial';
    context.fillText('Premium Bavarian Beer', canvas.width/2, 310);
    
    // Add decorative line
    context.strokeStyle = '#D4AF37'; // Gold line
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(120, 330);
    context.lineTo(canvas.width - 120, 330);
    context.stroke();
    
    // Add alcohol content
    context.font = '16px Arial';
    context.fillText('5.5% ALC/VOL · 500ml', canvas.width/2, 350);
    
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
