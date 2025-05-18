import { getScrollSpeed } from './obstacleManager.js';

let totalDistanceTraveled = 0;

// Function to update the distance based on the scroll speed and delta time
export function updateDistance(deltaTime) {
    // Convert scroll speed to meters per second (scroll speed is a multiplier)
    // Increased base speed from 10 to 20 meters per second to match sign distances
    const baseSpeed = 25; 
    const currentSpeed = baseSpeed * getScrollSpeed();
    
    // Increase the distance based on the current speed and time passed
    totalDistanceTraveled += currentSpeed * deltaTime;
    
    return totalDistanceTraveled;
}

// Function to get the current distance
export function getDistance() {
    return totalDistanceTraveled;
}

// Function to reset the distance counter
export function resetDistance() {
    totalDistanceTraveled = 0;
} 