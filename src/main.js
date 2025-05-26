import * as THREE from 'three';
import { setupScene, toggleLight, setCameraMode, getActiveCamera, toggleClouds, isCloudsEnabled } from './sceneSetup.js';
import { updateClouds } from './sceneSetup.js';
import { createRoad, updateRoad, toggleLights, getPostsLightsState } from './roadManager.js';
import { createPlayer, setupPlayerControls, updatePlayer, getHeadlightsState, triggerCollisionAnimation, setBlockPlayerInput, isVanFlying, getFlyingStartTime, getFlyingDuration, getPlayerPosition, isVanDescending, getFlyingTimeLeft } from './playerManager.js';
import { loadObstacles, updateObstacles, getScrollSpeed } from './obstacleManager.js';
import { loadTrees, updateTrees } from './treeManager.js';
import { createAnimatedHorse, updateAnimatedHorse } from './animatedHorse.js';
import { updateDistance, getDistance } from './distanceTracker.js';
import { loadDistanceSign, updateDistanceSign } from './distanceSignLoader.js';
import { createBeerCrate } from './beerCrateManager.js';
import './easterEggConfetti.js';

// Configuração do jogo
const GAME_CONFIG = {
    FPS: 60,
    FIXED_TIMESTEP: 1 / 60,
    MAX_FRAME_TIME: 0.2,
    UI_UPDATE_INTERVAL: 100,
    MAX_PHYSICS_STEPS: 10
};

// Estado do jogo
let scene, camera, renderer;
let gameTime = 0;
let lastTime = 0;
let accumulator = 0;
let lastUIUpdate = 0;
let fps = 0;
let frameCount = 0;
let lastFpsUpdate = 0;
let isGameActive = false; // Inicia como falso até o jogador pressionar uma tecla
let isPaused = false;     // Variável para controlar o estado de pausa do jogo
let showHitboxes = false;
let playerLives = 3;
let isGameOver = false;
let blockPlayerInput = false;
let lastFlightTimeLeft = null;

// Referência para o elemento da tela de carregamento
const loadingScreen = document.getElementById('loadingScreen');
const loginBtn = document.getElementById('loginBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');

const userInfoDiv = document.getElementById('userInfo');

function showUserLoggedIn(user) {
  if (loginBtn) {
    const parent = loginBtn.parentNode;
    let userDiv = document.getElementById('userLoggedIn');
    if (!userDiv) {
      userDiv = document.createElement('div');
      userDiv.id = 'userLoggedIn';
      userDiv.style.display = 'flex';
      userDiv.style.alignItems = 'center';
      userDiv.style.gap = '10px';
      userDiv.style.justifyContent = 'flex-end';
      userDiv.style.flex = '1';
      userDiv.style.fontSize = '1.1em';
      userDiv.style.color = '#222';
    }
    userDiv.innerHTML = `
      <span style="font-weight:bold; color: #fff;">${user.displayName}</span>
      <button id="logoutBtn" style="font-size: 1em; padding: 6px 18px; border-radius: 8px; border: none; background: #e53935; color: #fff; cursor: pointer; font-weight: bold; transition: background 0.2s;">Logout</button>
      <style>
        #logoutBtn:hover { background: #b71c1c !important; }
      </style>
    `;
    if (parent && parent.contains(loginBtn)) {
      parent.replaceChild(userDiv, loginBtn);
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        await window.firebaseAuth.signOut();
      };
    }
  }
}

function showUserLoggedOut() {
  if (loginBtn) {
    const parent = document.getElementById('userLoggedIn')?.parentNode || loginBtn.parentNode;
    const userDiv = document.getElementById('userLoggedIn');
    if (userDiv && parent) {
      parent.replaceChild(loginBtn, userDiv);
    }
    loginBtn.style.display = '';
  }
}

// Monitorar estado de autenticação
if (window.onAuthStateChanged && window.firebaseAuth) {
  console.log('[AUTH] Registrando onAuthStateChanged');
  window.onAuthStateChanged(window.firebaseAuth, (user) => {
    console.log('[AUTH] onAuthStateChanged', user);
    if (user) {
      showUserLoggedIn(user);
    } else {
      showUserLoggedOut();
    }
  });
} else {
  console.log('[AUTH] onAuthStateChanged ou firebaseAuth não disponível');
}

if (loginBtn) {
  loginBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const auth = window.firebaseAuth;
    const provider = new window.GoogleAuthProvider();
    try {
      console.log('[AUTH] Iniciando login Google');
      await window.signInWithPopup(auth, provider);
      window.location.reload(); // Forçar refresh após login
    } catch (error) {
      alert('Erro ao fazer login com Google.');
      console.error('[AUTH] Erro login Google', error);
    }
  });
} else {
  console.log('[AUTH] loginBtn não encontrado para adicionar listener');
}
if (leaderboardBtn) {
  leaderboardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showLeaderboardModal();
  });
}

// --- ÁUDIO DE FUNDO DO CARRO ---
let carEngineAudio = null;
function setupCarEngineAudio() {
  if (!carEngineAudio) {
    carEngineAudio = new Audio('assets/audio/car_engine_loop.mp3');
    carEngineAudio.loop = true;
    carEngineAudio.volume = 0.35;
    carEngineAudio.preload = 'auto';
  }
}
function playCarEngineAudio() {
  if (carEngineAudio && carEngineAudio.paused) {
    carEngineAudio.currentTime = 0;
    carEngineAudio.play().catch(() => {});
  }
}
function pauseCarEngineAudio() {
  if (carEngineAudio && !carEngineAudio.paused) {
    carEngineAudio.pause();
  }
}
// --- FIM ÁUDIO DE FUNDO ---

// Função para mostrar/esconder a tela de carregamento
function setLoadingScreen(visible) {
  loadingScreen.style.display = visible ? 'flex' : 'none';
  updateHeartsUI();
}

// Função para renderizar a tela de carregamento
function renderLoadingScreen() {
  // Não é mais necessário renderizar nada aqui, pois usamos HTML/CSS
}

// Função para iniciar o jogo quando uma tecla for pressionada
function startGame() {
  if (!isGameActive) {
    isGameActive = true;
    lastTime = performance.now() / 1000;
    gameTime = 0;
    setLoadingScreen(false); // Esconde a tela de carregamento
    setupCarEngineAudio();
    playCarEngineAudio();
    console.log('Game started!');
  }
}

// Adicionar listener para teclado
document.addEventListener('keydown', startGame);

function init() {
  // Mostrar a tela de carregamento
  setLoadingScreen(true);
  
  // Inicializar cena do jogo
  const setup = setupScene(); 
  scene = setup.scene;
  camera = setup.camera;
  renderer = setup.renderer;
  
  // Configurar cor de fundo
  renderer.setClearColor(0x000000);

  // Carregar recursos do jogo em segundo plano
  setTimeout(() => {
    // Configurar controles do jogador
    setupPlayerControlsWithBlock();
    
    // Carregar elementos do jogo
    const road = createRoad();
    scene.add(road);
    
    createPlayer(scene);
    loadObstacles(scene);
    loadTrees(scene);
    createAnimatedHorse(scene);
    loadDistanceSign(scene);
    
    console.log('Game resources loaded, waiting for key press...');
  }, 100);
  
  // Atalhos de teclado para mudar a câmara e iluminação
  window.addEventListener('keydown', (event) => {
    // Tecla P para pausar/resumir o jogo
    if (event.key.toLowerCase() === 'p') {
      togglePause();
    }
    
    if (event.key.toLowerCase() === 'c') {
      // Toggle entre câmaras
      const currentMode = getActiveCamera() === camera ? 'orthographic' : 'default';
      setCameraMode(currentMode);
    }

    // Controlo de iluminação individual usando números
    if (event.key === '1') {
      toggleLight('ambient');
      updateLightingHint();
    }
    if (event.key === '2') {
      toggleLight('directional');
      updateLightingHint();
    }
    if (event.key === '3') {
      toggleLights(!getPostsLightsState());
      updateLightingHint();
    }

    if (event.key.toLowerCase() === 'h') {
      showHitboxes = !showHitboxes;
      if (!showHitboxes && window.clearHitboxes && scene) {
        window.clearHitboxes(scene);
      }
    }

    if (event.key.toLowerCase() === 'n') {
      toggleClouds();
      console.log('Nuvens ' + (isCloudsEnabled() ? 'ativadas' : 'desativadas'));
      updateLightingHint();
    }
  });

    window.addEventListener('headlightsToggled', () => {
    updateLightingHint();
  });

  // Já carregado no setTimeout
  updateLightingHint();
}

function updateLightingHint() {
  const hintElement = document.getElementById('cameraHint');
  if (hintElement) {
    const cameraText = getActiveCamera() === camera ? 
                       "[C] Câmara Perspetiva" : 
                       "[C] Câmara Ortográfica";
    const ambient = toggleLight('ambient', null, true) ? "ON" : "OFF";
    const directional = toggleLight('directional', null, true) ? "ON" : "OFF";
    const streetLights = getPostsLightsState() ? "ON" : "OFF";
    const headlights = getHeadlightsState() ? "ON" : "OFF";
    const clouds = isCloudsEnabled() ? "ON" : "OFF";
    hintElement.textContent = 
      `${cameraText} | [P] Pausar | [H] Hitboxes | [N] Nuvens: ${clouds} | Luzes: [1] Ambiente: ${ambient}` +
      ` | [2] Direcional: ${directional}` +
      ` | [3] Postes: ${streetLights}` +
      ` | [4] Faróis: ${headlights}`;
  }
}

// Função para pausar o jogo
function togglePause() {
  if (isGameActive) {
    isPaused = !isPaused;
    updatePauseScreen();
    if (isPaused) {
      pauseCarEngineAudio();
    } else {
      playCarEngineAudio();
    }
    console.log(isPaused ? 'Game paused' : 'Game resumed');
  }
}

// Função para mostrar/esconder a tela de pausa
function updatePauseScreen() {
  let pauseScreen = document.getElementById('pauseScreen');
  
  if (!pauseScreen && isPaused) {
    // Criar a tela de pausa se não existir
    pauseScreen = document.createElement('div');
    pauseScreen.id = 'pauseScreen';
    pauseScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      font-family: Arial, sans-serif;
      z-index: 999;
    `;
    
    const pauseText = document.createElement('h2');
    pauseText.textContent = 'JOGO PAUSADO';
    pauseText.style.cssText = `
      font-size: 3em;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    `;
    
    pauseScreen.appendChild(pauseText);
    document.body.appendChild(pauseScreen);
  } else if (pauseScreen && !isPaused) {
    // Remover a tela de pausa
    pauseScreen.remove();
  }
}

function createHeartsUI() {
  let hearts = document.getElementById('heartsUI');
  if (!hearts) {
    hearts = document.createElement('div');
    hearts.id = 'heartsUI';
    hearts.style.cssText = `
      position: fixed;
      top: 24px;
      left: 24px;
      z-index: 1500;
      display: flex;
      gap: 16px;
      pointer-events: none;
      user-select: none;
    `;
    document.body.appendChild(hearts);
  }
}

function updateHeartsUI() {
  let hearts = document.getElementById('heartsUI');
  if (!hearts) return;
  // Limpa
  hearts.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const heart = document.createElement('span');
    heart.innerHTML = i < playerLives ? '❤️' : '🤍';
    heart.style.fontSize = '3em';
    heart.style.filter = i < playerLives ? '' : 'grayscale(1) opacity(0.5)';
    heart.style.transition = 'filter 0.2s';
    hearts.appendChild(heart);
  }
  // Esconde se game over ou loading
  hearts.style.display = (isGameOver || loadingScreen.style.display === 'flex') ? 'none' : 'flex';
}

// Chamar na inicialização e sempre que vidas mudam
createHeartsUI();
updateHeartsUI();

// Salva/atualiza o melhor score do usuário no Firestore
async function saveBestScore(user, score) {
  if (!window.firestore || !user) {
    console.log('[LEADERBOARD] Firestore não disponível ou usuário não autenticado');
    return;
  }
  const { db, doc, getDoc, setDoc } = window.firestore;
  const userId = user.uid;
  const leaderboardRef = doc(db, 'leaderboard', userId);
  try {
    const snap = await getDoc(leaderboardRef);
    if (!snap.exists()) {
      console.log('[LEADERBOARD] A criar novo score para', userId, score);
      await setDoc(leaderboardRef, {
        bestscore: score,
        created_at: new Date().toISOString(),
        name: user.displayName || '',
        email: user.email || ''
      });
    } else {
      const data = snap.data();
      if (typeof data.bestscore !== 'number' || score > data.bestscore) {
        console.log('[LEADERBOARD] Atualizando score para', userId, score);
        await setDoc(leaderboardRef, {
          bestscore: score,
          created_at: new Date().toISOString(),
          name: user.displayName || '',
          email: user.email || ''
        });
      } else {
        console.log('[LEADERBOARD] Score não atualizado, score antigo é maior ou igual', userId, data.bestscore, score);
      }
    }
  } catch (e) {
    console.error('[LEADERBOARD] Erro ao salvar score', e);
  }
}

function showGameOverScreen() {
  isGameOver = true;
  isGameActive = false;
  setLoadingScreen(false);
  updatePauseScreen();
  updateHeartsUI();
  pauseCarEngineAudio();
  // Salvar bestscore se autenticado
  if (window.firebaseAuth && window.firebaseAuth.currentUser) {
    const score = Math.floor(getDistance());
    saveBestScore(window.firebaseAuth.currentUser, score);
  }
  // Cria tela de Game Over
  let gameOverScreen = document.getElementById('gameOverScreen');
  if (!gameOverScreen) {
    gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'gameOverScreen';
    gameOverScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.85);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      font-family: Arial, sans-serif;
      z-index: 2000;
    `;
    const title = document.createElement('h1');
    title.textContent = 'GAME OVER';
    title.style.cssText = 'font-size: 4em; margin-bottom: 20px;';
    const score = document.createElement('p');
    score.id = 'finalScore';
    score.style.cssText = 'font-size: 2em; margin-bottom: 30px;';
    const restartBtn = document.createElement('button');
    restartBtn.textContent = 'Recomeçar';
    restartBtn.style.cssText = 'font-size: 1.5em; padding: 10px 30px; border-radius: 10px; border: none; background: #fff; color: #222; cursor: pointer;';
    restartBtn.onclick = restartGame;
    gameOverScreen.appendChild(title);
    gameOverScreen.appendChild(score);
    gameOverScreen.appendChild(restartBtn);
    document.body.appendChild(gameOverScreen);
  }
  // Atualiza a pontuação final
  document.getElementById('finalScore').textContent = `Pontuação: ${Math.floor(getDistance())}m`;
}

function hideGameOverScreen() {
  let gameOverScreen = document.getElementById('gameOverScreen');
  if (gameOverScreen) gameOverScreen.remove();
  updateHeartsUI();
}

function restartGame() {
  hideGameOverScreen();
  playerLives = 3;
  isGameOver = false;
  isGameActive = false;
  setLoadingScreen(true);
  updateHeartsUI();
  pauseCarEngineAudio();
  window.location.reload();
}

function loseLife() {
  if (isGameOver) return;
  playerLives--;
  updateHeartsUI();
  if (playerLives <= 0) {
    setBlockPlayerInput(true);
    triggerCollisionAnimation(0.7); // animação de colisão longa na última vida
    setTimeout(() => {
      showGameOverScreen();
      setBlockPlayerInput(false);
    }, 400); // atraso reduzido
  } else {
    triggerCollisionAnimation(0.35); // animação de colisão curta nas outras colisões
  }
}

/**
 * Atualiza a lógica do jogo com passo de tempo fixo
 * @param {number} deltaTime - Tempo desde a última atualização em segundos
 */
function updateGame(deltaTime) {
    if (!isGameActive || isPaused || isGameOver) return;

    // Atualiza o tempo total de jogo
    gameTime += deltaTime;
    
    // Atualiza a física do jogo com passo de tempo fixo
    let steps = 0;
    while (accumulator >= GAME_CONFIG.FIXED_TIMESTEP && steps < GAME_CONFIG.MAX_PHYSICS_STEPS) {
        // Atualiza a lógica do jogo com passo de tempo fixo
        updatePlayer(GAME_CONFIG.FIXED_TIMESTEP);
        updateRoad(GAME_CONFIG.FIXED_TIMESTEP);
        updateObstacles(GAME_CONFIG.FIXED_TIMESTEP, scene);
        updateAnimatedHorse(GAME_CONFIG.FIXED_TIMESTEP);
        updateDistance(GAME_CONFIG.FIXED_TIMESTEP);
        
        // Atualiza as árvores e o letreiro
        updateTrees(scene);
        updateDistanceSign();
        
        accumulator -= GAME_CONFIG.FIXED_TIMESTEP;
        steps++;
    }
    
    // Se estivermos atrasados, pula alguns frames para recuperar
    if (accumulator > GAME_CONFIG.FIXED_TIMESTEP * 2) {
        console.warn('Atraso na física do jogo, pulando frames...');
        accumulator = 0;
    }
    
    // Atualiza a UI com throttling
    updateUI();
}

/**
 * Atualiza a interface do utilizador
 */
function updateUI() {
    const currentTime = performance.now();
    
    // Atualiza a UI apenas a cada UI_UPDATE_INTERVAL ms
    if (currentTime - lastUIUpdate > GAME_CONFIG.UI_UPDATE_INTERVAL) {
        const speedElement = document.getElementById('speed');
        if (speedElement) {
            speedElement.textContent = 
                `Velocidade: ${getScrollSpeed().toFixed(2)}x | ` +
                `Pontuação: ${Math.floor(getDistance())}m | ` +
                `FPS: ${Math.round(fps)}`;
        }
        updateHeartsUI();
        updateFlightTimerUI();
        lastUIUpdate = currentTime;
    }
}

/**
 * Loop principal de renderização
 * @param {number} currentTime - Timestamp atual
 */
let lastFrameTime = performance.now();

function animate(currentTime) {
  // Garante que currentTime está definido
  currentTime = currentTime || performance.now();
  
  // Calcula o delta time em segundos e limita para evitar saltos grandes
  let deltaTime = (currentTime - lastFrameTime) / 1000;
  deltaTime = Math.min(deltaTime, GAME_CONFIG.MAX_FRAME_TIME);
  
  // Se o jogo estiver pausado, apenas atualiza o lastFrameTime para evitar saltos grandes
  // quando o jogo for resumido, mas continua renderizando a cena congelada
  if (isPaused) {
    requestAnimationFrame(animate);
    return;
  }
  
  // Atualiza o acumulador para a física
  accumulator += deltaTime;
  
  // Se o jogo não estiver ativo, mostra a tela de carregamento
  if (!isGameActive) {
    renderLoadingScreen();
  } else {
    // Se o jogo estiver ativo, atualiza a lógica e renderiza a cena
    updateFpsCounter(currentTime);
    
    // Atualiza a física do jogo
    updateGame(deltaTime);
    
    // Atualiza as nuvens
    updateClouds(deltaTime);
    
    // Renderiza a cena
    if (scene && camera) {
      renderer.render(scene, getActiveCamera());
      drawHitboxes();
    }
  }
  
  lastFrameTime = currentTime;
  // Agenda o próximo frame
  requestAnimationFrame(animate);
}

/**
 * Atualiza o contador de FPS
 * @param {number} currentTime - Timestamp atual
 */
function updateFpsCounter(currentTime) {
    frameCount++;
    
    // Atualiza o FPS a cada segundo
    if (currentTime - lastFpsUpdate >= 1000) {
        fps = frameCount * 1000 / (currentTime - lastFpsUpdate);
        frameCount = 0;
        lastFpsUpdate = currentTime;
    }
}

function drawHitboxes() {
  if (!showHitboxes || !scene) return;
  // Funções utilitárias para desenhar hitboxes
  if (window.drawVanHitbox) window.drawVanHitbox(scene);
  if (window.drawObstaclesHitboxes) window.drawObstaclesHitboxes(scene);
}

// Inicializa o jogo quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Inicializa a cena e o renderer primeiro
        init();
        
        // Configura o tempo inicial
        lastTime = performance.now();
        lastFpsUpdate = lastTime;
        
        // Inicia a animação
        requestAnimationFrame(animate);
        console.log('Jogo inicializado com sucesso! Pressione qualquer tecla para começar.');
    } catch (error) {
        console.error('Erro ao inicializar o jogo:', error);
        const errorElement = document.createElement('div');
        errorElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            padding: 20px;
            background: #ffebee;
            color: #c62828;
            font-family: Arial, sans-serif;
            z-index: 10000;
        `;
        errorElement.textContent = `Erro ao carregar o jogo: ${error.message}`;
        document.body.prepend(errorElement);
    }
});

export function setupPlayerControlsWithBlock() {
  window.addEventListener('keydown', (event) => {
    if (blockPlayerInput) {
      event.preventDefault();
      return;
    }
  }, true);
  setupPlayerControls();
}

export { loseLife };

function createFlightTimerUI() {
  let flightTimer = document.getElementById('flightTimerUI');
  if (!flightTimer) {
    flightTimer = document.createElement('div');
    flightTimer.id = 'flightTimerUI';
    flightTimer.style.cssText = `
      position: fixed;
      top: 32px;
      right: 48px;
      z-index: 2000;
      background: rgba(30, 30, 30, 0.85);
      color: #ffe066;
      font-family: Arial, sans-serif;
      font-size: 2.2em;
      font-weight: bold;
      padding: 10px 32px;
      border-radius: 16px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.25);
      pointer-events: none;
      user-select: none;
      text-align: center;
      display: none;
    `;
    document.body.appendChild(flightTimer);
  }
}

createFlightTimerUI();

function updateFlightTimerUI() {
  const flightTimer = document.getElementById('flightTimerUI');
  if (!flightTimer) return;
  if (isVanFlying()) {
    let timeLeft;
    if (isVanDescending()) {
      timeLeft = 0.0;
    } else {
      timeLeft = getFlyingTimeLeft();
    }
    flightTimer.textContent = `VOO: ${timeLeft.toFixed(1)}s`;
    flightTimer.style.display = 'block';
  } else {
    flightTimer.style.display = 'none';
  }
}

// Função para criar e mostrar o modal da leaderboard
async function showLeaderboardModal() {
  // Se já existe, não cria outro
  if (document.getElementById('leaderboardModal')) return;
  // Cria overlay
  const overlay = document.createElement('div');
  overlay.id = 'leaderboardModal';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.85)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '3000';

  // Modal box
  const modal = document.createElement('div');
  modal.style.background = 'linear-gradient(135deg, #222 60%, #444 100%)';
  modal.style.borderRadius = '18px';
  modal.style.boxShadow = '0 8px 32px rgba(0,0,0,0.7)';
  modal.style.padding = '36px 32px 28px 32px';
  modal.style.minWidth = '340px';
  modal.style.maxWidth = '90vw';
  modal.style.color = '#ffe066';
  modal.style.fontFamily = 'Arial, sans-serif';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.alignItems = 'center';

  // Título
  const title = document.createElement('h2');
  title.textContent = 'Leaderboard';
  title.style.margin = '0 0 18px 0';
  title.style.fontSize = '2.2em';
  title.style.letterSpacing = '1px';
  title.style.color = '#ffe066';
  title.style.textShadow = '0 2px 12px #000';
  modal.appendChild(title);

  // Tabela
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.marginBottom = '18px';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr style="color:#fff;font-size:1.1em;"><th style='text-align:left;padding:6px 12px;'>Nome</th><th style='text-align:right;padding:6px 12px;'>Score</th></tr>`;
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  tbody.innerHTML = `<tr><td colspan='2' style='text-align:center;color:#bbb;'>A carregar...</td></tr>`;
  table.appendChild(tbody);
  modal.appendChild(table);

  // Botão fechar
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Fechar';
  closeBtn.style.background = '#e53935';
  closeBtn.style.color = '#fff';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.fontSize = '1.1em';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '8px';
  closeBtn.style.padding = '10px 32px';
  closeBtn.style.marginTop = '10px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onmouseenter = () => closeBtn.style.background = '#b71c1c';
  closeBtn.onmouseleave = () => closeBtn.style.background = '#e53935';
  closeBtn.onclick = () => overlay.remove();
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Buscar leaderboard do Firestore
  if (window.firestore) {
    const { db } = window.firestore;
    // Importar query, collection, orderBy, limit, getDocs dinamicamente
    const { collection, query, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js');
    try {
      const q = query(collection(db, 'leaderboard'), orderBy('bestscore', 'desc'), limit(10));
      const snap = await getDocs(q);
      let html = '';
      let pos = 1;
      const currentUid = (window.firebaseAuth && window.firebaseAuth.currentUser) ? window.firebaseAuth.currentUser.uid : null;
      snap.forEach(doc => {
        const data = doc.data();
        const isCurrentUser = currentUid && doc.id === currentUid;
        html += `<tr style='background:${isCurrentUser ? '#ffe06655' : ''}'>`+
          `<td style='padding:6px 12px;color:#fff;'>${data.name ? data.name : '<i>Desconhecido</i>'}</td>`+
          `<td style='padding:6px 12px;text-align:right;font-weight:bold;color:#ffe066;'>${data.bestscore}</td>`+
        `</tr>`;
        pos++;
      });
      if (!html) html = `<tr><td colspan='2' style='text-align:center;color:#bbb;'>Sem scores ainda.</td></tr>`;
      tbody.innerHTML = html;
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan='2' style='text-align:center;color:#f88;'>Erro ao carregar leaderboard.</td></tr>`;
    }
  } else {
    tbody.innerHTML = `<tr><td colspan='2' style='text-align:center;color:#f88;'>Firestore não disponível.</td></tr>`;
  }
}