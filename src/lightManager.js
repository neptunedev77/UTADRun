import * as THREE from 'three';

// Variáveis para controlar os indicadores
let leftIndicator = false;
let rightIndicator = false;
let hazardLights = false;
let headlightsOn = false;

// Armazenar as luzes
let leftFrontIndicatorLight;
let rightFrontIndicatorLight;
let leftRearIndicatorLight;
let rightRearIndicatorLight;
let leftHeadlight, rightHeadlight;

// Posições dos faróis
const FRONT_LEFT_POSITION = new THREE.Vector3(-0.8, 0.7, 2.3);
const FRONT_RIGHT_POSITION = new THREE.Vector3(0.8, 0.7, 2.3);
const REAR_LEFT_POSITION = new THREE.Vector3(-0.8, 0.7, -2.3);
const REAR_RIGHT_POSITION = new THREE.Vector3(0.8, 0.7, -2.3);

// Referência ao van
let van;

// Configuração para piscar
let blinkInterval;
const BLINK_SPEED = 500; // milissegundos

export function setupLights(vanObject) {
  van = vanObject;
  
  if (!van) return;
  
  // Criar luzes indicadoras frontais (amarelas) - LADO ESQUERDO
  leftFrontIndicatorLight = new THREE.SpotLight(0xffcc00, 15, 20, Math.PI / 5, 0.6, 1);
  leftFrontIndicatorLight.position.set(-0.35, 0.85, 0.0); // posição ajustada para eliminar espaçamento
  leftFrontIndicatorLight.target.position.set(-1.5, 0, 5); // alvo ajustado
  leftFrontIndicatorLight.visible = false;
  van.add(leftFrontIndicatorLight);
  van.add(leftFrontIndicatorLight.target);
  
  // Criar luzes indicadoras traseiras - LADO ESQUERDO
  leftRearIndicatorLight = new THREE.SpotLight(0xffcc00, 15, 20, Math.PI / 5, 0.6, 1);
  leftRearIndicatorLight.position.set(-0.35, 0.85, 0.0); // posição ajustada para eliminar espaçamento
  leftRearIndicatorLight.target.position.set(-1.5, 0, -5); // alvo ajustado
  leftRearIndicatorLight.visible = false;
  van.add(leftRearIndicatorLight);
  van.add(leftRearIndicatorLight.target);
  
  // Criar luzes indicadoras frontais (amarelas) - LADO DIREITO
  rightFrontIndicatorLight = new THREE.SpotLight(0xffcc00, 15, 20, Math.PI / 5, 0.6, 1);
  rightFrontIndicatorLight.position.set(0.35, 0.85, 0.0); // posição ajustada para eliminar espaçamento
  rightFrontIndicatorLight.target.position.set(1.5, 0, 5); // alvo ajustado
  rightFrontIndicatorLight.visible = false;
  van.add(rightFrontIndicatorLight);
  van.add(rightFrontIndicatorLight.target);
  
  // Criar luzes indicadoras traseiras - LADO DIREITO
  rightRearIndicatorLight = new THREE.SpotLight(0xffcc00, 15, 20, Math.PI / 5, 0.6, 1);
  rightRearIndicatorLight.position.set(0.35, 0.85, 0.0); // posição ajustada para eliminar espaçamento
  rightRearIndicatorLight.target.position.set(1.5, 0, -5); // alvo ajustado
  rightRearIndicatorLight.visible = false;
  van.add(rightRearIndicatorLight);
  van.add(rightRearIndicatorLight.target);
  
  // Adicionar pequenas luzes pontuais para dar efeito de brilho nos indicadores - LADO ESQUERDO
  window.leftFrontIndicatorGlow = new THREE.PointLight(0xffcc00, 3, 1.5);
  window.leftFrontIndicatorGlow.position.set(-0.35, 0.85, 0.0);
  window.leftFrontIndicatorGlow.visible = false;
  van.add(window.leftFrontIndicatorGlow);
  
  window.leftRearIndicatorGlow = new THREE.PointLight(0xffcc00, 3, 1.5);
  window.leftRearIndicatorGlow.position.set(-0.35, 0.85, 0.0);
  window.leftRearIndicatorGlow.visible = false;
  van.add(window.leftRearIndicatorGlow);
  
  // Adicionar pequenas luzes pontuais para dar efeito de brilho nos indicadores - LADO DIREITO
  window.rightFrontIndicatorGlow = new THREE.PointLight(0xffcc00, 3, 1.5);
  window.rightFrontIndicatorGlow.position.set(0.35, 0.85, 0.0);
  window.rightFrontIndicatorGlow.visible = false;
  van.add(window.rightFrontIndicatorGlow);
  
  window.rightRearIndicatorGlow = new THREE.PointLight(0xffcc00, 3, 1.5);
  window.rightRearIndicatorGlow.position.set(0.35, 0.85, 0.0);
  window.rightRearIndicatorGlow.visible = false;
  van.add(window.rightRearIndicatorGlow);
  
  // Adiciona os faróis (SpotLight) - posicionados exatamente nos faróis da van
  leftHeadlight = new THREE.SpotLight(0xffffff, 40, 120, Math.PI / 4, 0.6, 1);
  leftHeadlight.position.set(-0.3, 0.85, 0.0); // posição ajustada para eliminar espaçamento
  leftHeadlight.target.position.set(-0.3, 0, 20); // alvo mais distante para melhor efeito
  leftHeadlight.visible = headlightsOn;
  leftHeadlight.castShadow = true;
  van.add(leftHeadlight);
  van.add(leftHeadlight.target);

  rightHeadlight = new THREE.SpotLight(0xffffff, 40, 120, Math.PI / 4, 0.6, 1);
  rightHeadlight.position.set(0.3, 0.85, 0.0); // posição ajustada para eliminar espaçamento
  rightHeadlight.target.position.set(0.3, 0, 20); // alvo mais distante para melhor efeito
  rightHeadlight.visible = headlightsOn;
  rightHeadlight.castShadow = true;
  van.add(rightHeadlight);
  van.add(rightHeadlight.target);
  
  // Adicionar pequenas luzes pontuais para dar efeito de brilho nos faróis
  const leftHeadlightGlow = new THREE.PointLight(0xffffff, 4, 2);
  leftHeadlightGlow.position.set(-0.3, 0.85, 0.0); // posição ajustada para eliminar espaçamento
  leftHeadlightGlow.visible = headlightsOn;
  van.add(leftHeadlightGlow);
  
  const rightHeadlightGlow = new THREE.PointLight(0xffffff, 4, 2);
  rightHeadlightGlow.position.set(0.3, 0.85, 0.0); // posição ajustada para eliminar espaçamento
  rightHeadlightGlow.visible = headlightsOn;
  van.add(rightHeadlightGlow);
  
  // Iniciar o intervalo de piscar
  startBlinking();
  
  console.log('Luzes configuradas');
}

export function setupLightControls() {
  // Adicionar event listeners para os botões do mouse
  window.addEventListener('mousedown', (event) => {
    if (!van) return;
    
    // Mouse botão 1 (botão esquerdo) - indicador direito
    if (event.button === 0) {
      toggleRightIndicator();
    }
    
    // Mouse botão 2 (botão direito) - indicador esquerdo
    if (event.button === 2) {
      toggleLeftIndicator();
      // Prevenir o menu de contexto do botão direito
      event.preventDefault();
    }
    
    // Mouse botão 3 (botão do meio) - luzes de emergência
    if (event.button === 1) {
      toggleHazardLights();
      // Prevenir o comportamento padrão do botão do meio (scroll)
      event.preventDefault();
    }
  });
  
  // Prevenir o menu de contexto do botão direito globalmente
  window.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
  
  // Adicionar event listener para tecla 4 (faróis)
  window.addEventListener('keydown', (event) => {
    if (!van) return;
    
    // Tecla 4 para ligar/desligar os faróis
    if (event.key === '4') {
      toggleHeadlights();
    }
  });
}

function toggleLeftIndicator() {
  // Se as luzes de emergência estiverem ligadas, desligue-as primeiro
  if (hazardLights) {
    hazardLights = false;
  }
  
  // Alternar o indicador esquerdo
  leftIndicator = !leftIndicator;
  
  // Desligar o indicador direito se estiver ligado
  if (leftIndicator && rightIndicator) {
    rightIndicator = false;
  }
    
  // Atualizar imediatamente a visibilidade das luzes
  updateLightsVisibility(true);
  
  // Disparar evento para notificar outros componentes
  window.dispatchEvent(new CustomEvent('indicatorsChanged'));
}

function toggleRightIndicator() {
  // Se as luzes de emergência estiverem ligadas, desligue-as primeiro
  if (hazardLights) {
    hazardLights = false;
  }
  
  // Alternar o indicador direito
  rightIndicator = !rightIndicator;
  
  // Desligar o indicador esquerdo se estiver ligado
  if (rightIndicator && leftIndicator) {
    leftIndicator = false;
  }
  
  // Atualizar imediatamente a visibilidade das luzes
  updateLightsVisibility(true);
  
  // Disparar evento para notificar outros componentes
  window.dispatchEvent(new CustomEvent('indicatorsChanged'));
}

function toggleHazardLights() {
  // Alternar as luzes de emergência
  hazardLights = !hazardLights;
  
  // Se ligar as luzes de emergência, desligar os indicadores individuais
  if (hazardLights) {
    leftIndicator = false;
    rightIndicator = false;
  }
  
  // Atualizar imediatamente a visibilidade das luzes
  updateLightsVisibility(true);
  
  // Disparar evento para notificar outros componentes
  window.dispatchEvent(new CustomEvent('indicatorsChanged'));
}

function startBlinking() {
  // Limpar intervalo existente, se houver
  if (blinkInterval) {
    clearInterval(blinkInterval);
  }
  
  // Variável para controlar o estado de piscar
  let blinkState = false;
  
  // Configurar novo intervalo
  blinkInterval = setInterval(() => {
    blinkState = !blinkState;
    
    // Atualizar visibilidade das luzes com base no estado atual
    updateLightsVisibility(blinkState);
  }, BLINK_SPEED);
}

function updateLightsVisibility(blinkState) {
  if (!van) return;
  
  // Atualizar luzes do indicador esquerdo
  if (leftIndicator || hazardLights) {
    // Luzes principais
    leftFrontIndicatorLight.visible = blinkState;
    leftRearIndicatorLight.visible = blinkState;
    
    // Luzes de brilho
    if (window.leftFrontIndicatorGlow) window.leftFrontIndicatorGlow.visible = blinkState;
    if (window.leftRearIndicatorGlow) window.leftRearIndicatorGlow.visible = blinkState;
  } else {
    // Luzes principais
    leftFrontIndicatorLight.visible = false;
    leftRearIndicatorLight.visible = false;
    
    // Luzes de brilho
    if (window.leftFrontIndicatorGlow) window.leftFrontIndicatorGlow.visible = false;
    if (window.leftRearIndicatorGlow) window.leftRearIndicatorGlow.visible = false;
  }
  
  // Atualizar luzes do indicador direito
  if (rightIndicator || hazardLights) {
    // Luzes principais
    rightFrontIndicatorLight.visible = blinkState;
    rightRearIndicatorLight.visible = blinkState;
    
    // Luzes de brilho
    if (window.rightFrontIndicatorGlow) window.rightFrontIndicatorGlow.visible = blinkState;
    if (window.rightRearIndicatorGlow) window.rightRearIndicatorGlow.visible = blinkState;
  } else {
    // Luzes principais
    rightFrontIndicatorLight.visible = false;
    rightRearIndicatorLight.visible = false;
    
    // Luzes de brilho
    if (window.rightFrontIndicatorGlow) window.rightFrontIndicatorGlow.visible = false;
    if (window.rightRearIndicatorGlow) window.rightRearIndicatorGlow.visible = false;
  }
}

export function updateLights() {
  // Esta função pode ser chamada no loop de renderização para atualizações adicionais
  // Atualmente, a lógica de piscar é tratada pelo intervalo
}

export function cleanupLights() {
  // Limpar o intervalo quando não for mais necessário
  if (blinkInterval) {
    clearInterval(blinkInterval);
    blinkInterval = null;
  }
}

export function getLightState() {
  return {
    left: leftIndicator,
    right: rightIndicator,
    hazard: hazardLights,
    headlights: headlightsOn
  };
}

function toggleHeadlights() {
  headlightsOn = !headlightsOn;
  if (leftHeadlight) leftHeadlight.visible = headlightsOn;
  if (rightHeadlight) rightHeadlight.visible = headlightsOn;
  
  // Atualizar também as luzes de brilho
  van.children.forEach(child => {
    if (child.isPointLight && 
        (child.position.x === -0.3 || child.position.x === 0.3) && 
        child.position.z === 0.0 && 
        child.position.y === 0.85) {
      child.visible = headlightsOn;
    }
  });
  
  window.dispatchEvent(new CustomEvent('headlightsToggled'));
}
