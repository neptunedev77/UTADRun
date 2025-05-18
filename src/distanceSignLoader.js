import * as THREE from 'three';
import { getDistance } from './distanceTracker.js';
import { getScrollSpeed } from './obstacleManager.js';

let distanceSignTemplate;
let distanceSigns = [];
let scene;
let lastSignDistance = 0;
const signSpacing = 25; // Create a new sign every 25 meters
const xPositions = [12, 15]; // Only right side positions
const signDistance = 25; // Distance in game units from player position to sign creation point

// Create the distance sign template using Three.js
export function loadDistanceSign(gameScene) {
    scene = gameScene;
    const textureLoader = new THREE.TextureLoader();
    
    // Load the wood texture
    const woodTexture = textureLoader.load('./assets/textures/wood.jpg');
    
    // Create the sign template using Three.js
    distanceSignTemplate = createDistanceSignMesh(woodTexture);
    
    // Create the first sign at the first milestone
    createNewSignAtDistance(signSpacing);

    // Adjust the initial position of the first sign to ensure it appears at 25 meters
    if (distanceSigns.length > 0) {
        const firstSign = distanceSigns[0];
        firstSign.mesh.position.z = -signDistance + signSpacing;
    }
}

// Create a distance sign mesh using Three.js
function createDistanceSignMesh(woodTexture) {
    const signGroup = new THREE.Group();
    signGroup.name = "DistanceSign";
    
    // Create the sign board - increased size to 4x2
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
    
    // Create post for the sign - made thicker and longer
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
    
    // Create plane for the text area - increased to match new sign size
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

// Create a new sign at the specified distance
function createNewSignAtDistance(distance) {
    if (!distanceSignTemplate) return;
    
    // Clone the template
    const newSign = distanceSignTemplate.clone();
    
    // Choose a position on the right side of the road
    const xPos = xPositions[Math.floor(Math.random() * xPositions.length)];
    
    // Place the sign at a fixed distance ahead of the player (in game units)
    // This ensures it will reach the player exactly when the player reaches that distance
    const zOffset = -signDistance;
    
    // Position the sign
    newSign.scale.set(1.5, 1.5, 1.5);
    newSign.position.set(xPos, 2, zOffset);
    
    // Always face left since we're on the right side
    newSign.rotation.y = -Math.PI / 4;
    
    // Find the text area mesh and set up the distance display
    let distanceTextMesh;
    newSign.traverse((child) => {
        if (child.name === "TextArea") {
            distanceTextMesh = child;
            createTextDisplay(distanceTextMesh, distance);
        }
    });
    
    // Add to scene and store in our array
    scene.add(newSign);
    distanceSigns.push({
        mesh: newSign,
        distanceValue: distance,
        textMesh: distanceTextMesh,
        shouldPassAt: distance // Store when this sign should pass the player
    });
    
    // Update the last sign distance
    lastSignDistance = distance;
}

// Create a dynamic text display for the distance
function createTextDisplay(mesh, distance) {
    if (!mesh) return;
    
    // Create canvas for the text - increased resolution
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 1024;  // Doubled from 512
    canvas.height = 512;  // Doubled from 256
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create material with the canvas texture
    const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true
    });
    
    // Apply material to the text mesh
    mesh.material = textMaterial;
    
    // Initial update of the text
    updateDistanceText(mesh, distance);
}

// Update the text on a specific sign
function updateDistanceText(mesh, distance) {
    if (!mesh || !mesh.material || !mesh.material.map) return;
    
    // Update canvas with new text
    const canvas = mesh.material.map.image;
    const context = canvas.getContext('2d');
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add wood background with some transparency
    context.fillStyle = 'rgba(130, 82, 39, 0.3)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text - increased font sizes
    context.fillStyle = 'white';
    context.font = 'bold 100px Arial'; // Increased from 64px
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('DISTÂNCIA', canvas.width / 2, canvas.height / 3);
    
    context.font = 'bold 120px Arial'; // Increased from 72px
    context.fillText(distance + ' m', canvas.width / 2, canvas.height * 2/3);
    
    // Update the texture
    mesh.material.map.needsUpdate = true;
}

// Update the signs - move them and create new ones as needed
export function updateDistanceSign() {
    const currentDistance = Math.floor(getDistance());
    
    // Check if we need to create a new sign
    if (currentDistance - lastSignDistance >= signSpacing) {
        // Calculate the next milestone distance as exact multiple of signSpacing
        const nextSignDistance = Math.ceil(currentDistance / signSpacing) * signSpacing;
        if (nextSignDistance > lastSignDistance) {
            createNewSignAtDistance(nextSignDistance);
        }
    }
    
    // Update position of all signs
    for (let i = distanceSigns.length - 1; i >= 0; i--) {
        const sign = distanceSigns[i];
        
        // Move the sign towards the player
        sign.mesh.position.z += getScrollSpeed();
        
        // Remove signs that have passed the player
        if (sign.mesh.position.z > 10) {
            scene.remove(sign.mesh);
            distanceSigns.splice(i, 1);
        }
    }
}