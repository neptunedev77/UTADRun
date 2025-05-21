import { getScrollSpeed } from './obstacleManager.js';

let totalDistanceTraveled = 0;

// Função para atualizar a distância baseada na velocidade de rolagem e delta time
export function updateDistance(deltaTime) {
    // Converte a velocidade de rolagem para metros por segundo
    const baseSpeed = 25; 
    const currentSpeed = baseSpeed * getScrollSpeed();
    
    // Aumenta a distância baseada na velocidade atual e no tempo passado
    totalDistanceTraveled += currentSpeed * deltaTime;
    
    return totalDistanceTraveled;
}

// Função para obter a distância atual
export function getDistance() {
    return totalDistanceTraveled;
}

// Função para resetar o contador de distância
export function resetDistance() {
    totalDistanceTraveled = 0;
} 