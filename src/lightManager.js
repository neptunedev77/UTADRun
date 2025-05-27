import * as THREE from 'three';

// Variable to track if game is active
let isGameActive = false;

// Function to set game active state
export function setLightManagerGameActive(active) {
  isGameActive = active;
}

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

// Posições dos faróis (ajustadas para a nova altura da van Y=0.5)
const FRONT_LEFT_POSITION = new THREE.Vector3(-0.8, 1.0, 2.3);
const FRONT_RIGHT_POSITION = new THREE.Vector3(0.8, 1.0, 2.3);
const REAR_LEFT_POSITION = new THREE.Vector3(-0.8, 1.0, -2.3);
const REAR_RIGHT_POSITION = new THREE.Vector3(0.8, 1.0, -2.3);

// Referência ao van
let van;

// Configuração para piscar
let blinkInterval;
const BLINK_SPEED = 500; // milissegundos

export function setupLights(vanObject) {
  van = vanObject;
  
  if (!van) return;
  
  // Inicializar variáveis para referência (sem criar as luzes grandes)
  leftFrontIndicatorLight = null;
  leftRearIndicatorLight = null;
  rightFrontIndicatorLight = null;
  rightRearIndicatorLight = null;
  
  // Adicionar pequenas luzes pontuais para dar efeito de brilho nos indicadores - LADO ESQUERDO
  window.leftFrontIndicatorGlow = new THREE.PointLight(0xffcc00, 3, 1.5);
  window.leftFrontIndicatorGlow.position.set(-0.8, 0.75, 2.3); // posição ajustada para a frente da van
  window.leftFrontIndicatorGlow.visible = false;
  van.add(window.leftFrontIndicatorGlow);
  
  window.leftRearIndicatorGlow = new THREE.PointLight(0xffcc00, 3, 1.5);
  window.leftRearIndicatorGlow.position.set(-0.8, 0.75, -2.3); // posição ajustada para a traseira da van
  window.leftRearIndicatorGlow.visible = false;
  van.add(window.leftRearIndicatorGlow);
  
  // Adicionar pequenas luzes pontuais para dar efeito de brilho nos indicadores - LADO DIREITO
  window.rightFrontIndicatorGlow = new THREE.PointLight(0xffcc00, 3, 1.5);
  window.rightFrontIndicatorGlow.position.set(0.8, 0.75, 2.3); // posição ajustada para a frente da van
  window.rightFrontIndicatorGlow.visible = false;
  van.add(window.rightFrontIndicatorGlow);
  
  window.rightRearIndicatorGlow = new THREE.PointLight(0xffcc00, 3, 1.5);
  window.rightRearIndicatorGlow.position.set(0.8, 0.75, -2.3); // posição ajustada para a traseira da van
  window.rightRearIndicatorGlow.visible = false;
  van.add(window.rightRearIndicatorGlow);
  
  // Adiciona os faróis (SpotLight) - posicionados exatamente nos faróis da van
  leftHeadlight = new THREE.SpotLight(0xffffff, 40, 50, Math.PI / 4, 0.8, 1);
  leftHeadlight.position.set(-0.3, 0.75, 2.3); // posição ajustada para a frente da van
  leftHeadlight.target.position.set(-0.3, 0, 10); // alvo mais próximo para luz mais concentrada
  leftHeadlight.visible = headlightsOn;
  leftHeadlight.castShadow = true;
  van.add(leftHeadlight);
  van.add(leftHeadlight.target);

  rightHeadlight = new THREE.SpotLight(0xffffff, 40, 50, Math.PI / 4, 0.8, 1);
  rightHeadlight.position.set(0.3, 0.75, 2.3); // posição ajustada para a frente da van
  rightHeadlight.target.position.set(0.3, 0, 10); // alvo mais próximo para luz mais concentrada
  rightHeadlight.visible = headlightsOn;
  rightHeadlight.castShadow = true;
  van.add(rightHeadlight);
  van.add(rightHeadlight.target);
  
  // Adicionar pequenas luzes pontuais para dar efeito de brilho nos faróis frontais
  const leftHeadlightGlow = new THREE.PointLight(0xffffff, 4, 2);
  leftHeadlightGlow.position.set(-0.3, 0.75, 2.3); // posição ajustada para a frente da van
  leftHeadlightGlow.visible = headlightsOn;
  van.add(leftHeadlightGlow);
  
  const rightHeadlightGlow = new THREE.PointLight(0xffffff, 4, 2);
  rightHeadlightGlow.position.set(0.3, 0.75, 2.3); // posição ajustada para a frente da van
  rightHeadlightGlow.visible = headlightsOn;
  van.add(rightHeadlightGlow);
  
  // Adicionar pequenas luzes pontuais para os faróis traseiros
  window.leftRearLightGlow = new THREE.PointLight(0xff0000, 2, 1.5);
  window.leftRearLightGlow.position.set(-0.3, 0.75, -2.3); // posição ajustada para a traseira da van
  window.leftRearLightGlow.visible = false; // Forçar desligado inicialmente
  van.add(window.leftRearLightGlow);
  
  window.rightRearLightGlow = new THREE.PointLight(0xff0000, 2, 1.5);
  window.rightRearLightGlow.position.set(0.3, 0.75, -2.3); // posição ajustada para a traseira da van
  window.rightRearLightGlow.visible = false; // Forçar desligado inicialmente
  van.add(window.rightRearLightGlow);
  
  // Adicionar listener para atualizar as luzes traseiras quando a luz direcional mudar
  window.addEventListener('directionalLightToggled', function() {
    if (window.leftRearLightGlow && window.rightRearLightGlow) {
      window.leftRearLightGlow.visible = !window.isDirectionalLightOn;
      window.rightRearLightGlow.visible = !window.isDirectionalLightOn;
    }
  });
  
  // Iniciar o intervalo de piscar
  startBlinking();
  
  console.log('Luzes configuradas');
}

export function setupLightControls() {
  // Adicionar event listeners para os botões do mouse
  window.addEventListener('mousedown', (event) => {
    // Check if game is active before processing mouse inputs
    if (!isGameActive || !van) return;
    
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
  
  // Adicionar event listener para mudanças na luz direcional
  window.addEventListener('directionalLightChanged', (event) => {
    updateRearLights(event.detail.isOn);
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
    // Apenas atualizar as luzes de brilho pequenas
    window.leftFrontIndicatorGlow.visible = blinkState;
    window.leftRearIndicatorGlow.visible = blinkState;
  } else {
    window.leftFrontIndicatorGlow.visible = false;
    window.leftRearIndicatorGlow.visible = false;
  }
  
  if (rightIndicator || hazardLights) {
    // Apenas atualizar as luzes de brilho pequenas
    window.rightFrontIndicatorGlow.visible = blinkState;
    window.rightRearIndicatorGlow.visible = blinkState;
  } else {
    window.rightFrontIndicatorGlow.visible = false;
    window.rightRearIndicatorGlow.visible = false;
  }
}

export function updateLights() {
  // Esta função pode ser chamada no loop de renderização para atualizações adicionais
  // Atualmente, a lógica de piscar é tratada pelo intervalo
  
  // Atualiza as luzes traseiras com base no estado da luz direcional
  if (window.leftRearLightGlow && window.rightRearLightGlow) {
    // Força as luzes traseiras a ficarem desligadas quando a luz direcional está ligada
    if (window.isDirectionalLightOn === true) {
      window.leftRearLightGlow.visible = false;
      window.rightRearLightGlow.visible = false;
    } else {
      window.leftRearLightGlow.visible = true;
      window.rightRearLightGlow.visible = true;
    }
  }
  
  // Chama a função específica para atualizar as luzes traseiras
  updateRearLights(window.isDirectionalLightOn);
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
        child.position.z === 2.3 && 
        child.position.y === 0.75) {
      child.visible = headlightsOn;
    }
  });
  
  window.dispatchEvent(new CustomEvent('headlightsToggled'));
}

// Função para atualizar as luzes traseiras com base no estado da luz direcional
function updateRearLights(isDirectionalLightOn) {
  if (!van) return;
  
  // Luzes traseiras só ficam visíveis quando a luz direcional está desligada (noite)
  if (window.leftRearLightGlow) {
    // Forçar desligado quando a luz direcional está ligada
    window.leftRearLightGlow.visible = isDirectionalLightOn ? false : true;
  }
  
  if (window.rightRearLightGlow) {
    // Forçar desligado quando a luz direcional está ligada
    window.rightRearLightGlow.visible = isDirectionalLightOn ? false : true;
  }
}
