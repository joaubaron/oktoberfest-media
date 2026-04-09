// ======== CONFIGURAÇÃO DE CAMINHOS ========
const GITHUB_BASE = 'https://joaubaron.github.io/oktoberfest-media';

// ======== VARIÁVEIS GLOBAIS ========
let loopFoto2007 = null;
let backgroundMusic = null;
let touchStartX = 0;
let touchEndX = 0;
let currentYearIndex = 0;
let allYears = [];
let interval = null;
let isDrawing = false;
let isSwiping = false; // NOVA VARIÁVEL: Previne swipes simultâneos

// VARIAVEIS DO CANVAS
let canvas = null;
let ctx = null;
let w = 0;
let h = 0;
let particles = [];
let animationId = null;

// VARIÁVEIS DE MÚSICA
let musicList = [];
let playedMusicIndices = new Set();

// VARIÁVEIS DE VÍDEO (NOVO)
let videoList = [];
let currentVideoIndex = 0;
let isVideoModeActive = false;

// ======== CONFIGURAÇÃO DE ANOS E FOTOS ========
const startYear = 2017;
const currentYear = new Date().getFullYear();
const photos = {};
for (let year = startYear; year <= currentYear; year++) {
photos[year] = `${GITHUB_BASE}/fotos/oktoberfest${year}.jpg`;
}

// ======== SISTEMA DE MÚSICA SIMPLIFICADO ========
async function loadMusicList() {
try {
const response = await fetch('https://joaubaron.github.io/oktoberfest-media/musicas/song_list.json');
const data = await response.json();

// Converter nomes de arquivos para URLs completas
musicList = data.songs.map(song => ({
nome: song.replace('.mp3', ''),
url: `https://joaubaron.github.io/oktoberfest-media/musicas/${song}`
}));

console.log(`🎵 ${musicList.length} músicas carregadas`);
} catch (error) {
console.error('Erro ao carregar lista de músicas:', error);
}
}

function playRandomMusic() {
if (musicList.length === 0) {
console.log('Lista de músicas vazia');
return;
}

// Se todas as músicas já foram tocadas, reinicia
if (playedMusicIndices.size >= musicList.length) {
playedMusicIndices.clear();
}

let randomIndex;
do {
randomIndex = Math.floor(Math.random() * musicList.length);
} while (playedMusicIndices.has(randomIndex));

playMusicByIndex(randomIndex);
}

function playMusicByIndex(index) {
const music = musicList[index];
const audio = document.getElementById('backgroundMusic');

console.log(`🎵 Tocando: ${music.nome}`);
audio.src = music.url;
audio.volume = 0.5;
audio.muted = false;
playedMusicIndices.add(index);

audio.play().catch(err => console.warn('Erro ao reproduzir música:', err));

// Mantém sempre o mesmo emoji 🎵🎶
const musicButton = document.getElementById('musicButton');
if (musicButton) {
musicButton.innerHTML = '🎵🎶';
musicButton.title = `Tocando: ${music.nome}`;
}
}

// Clique apenas troca para outra música
function handleMusicButtonClick() {
playRandomMusic();
}

async function setupMusic() {
const audio = document.getElementById('backgroundMusic');
if (!audio) return;

audio.volume = 0.5;
await loadMusicList();

// Quando terminar, toca outra automaticamente
audio.addEventListener('ended', playRandomMusic);

// Botão apenas troca de música
const musicButton = document.getElementById('musicButton');
if (musicButton) {
musicButton.addEventListener('click', handleMusicButtonClick);
}

// Toca no primeiro toque/clique do usuário na página
const playOnFirstInteraction = () => {
if (musicList.length > 0) {
playRandomMusic();
}
document.removeEventListener('touchstart', playOnFirstInteraction);
document.removeEventListener('click', playOnFirstInteraction);
};

document.addEventListener('touchstart', playOnFirstInteraction, { once: true });
document.addEventListener('click', playOnFirstInteraction, { once: true });
}

// ======== INICIALIZAÇÃO DA APLICAÇÃO ========
async function initializeApp() {
// 1. Atualizar UI IMEDIATAMENTE
setupUIElements(); // ← MOVER PARA CIMA

// 2. Detecção do Ambiente
const isRealLocalhost = (window.location.hostname === 'localhost' || 
window.location.hostname === '127.0.0.1') &&
!window.cordova;

// 3. Service Worker (não-blocking)
if ('serviceWorker' in navigator && !isRealLocalhost) {
// ... código do service worker
}

// 4. Inicialização dos anos (pode demorar, mas não bloqueia mais o texto)
await initializeYearsWithDetection();

// 5. Resto da inicialização
setupEventListeners();
await setupMusic();
setupCanvasAndFireworks();
setupLazyLoading();
}

// ======== DETECÇÃO AUTOMÁTICA DE ANOS ========
async function checkYearExists(year) {
return new Promise((resolve) => {
const img = new Image();
img.onload = () => resolve(true);
img.onerror = () => resolve(false);
img.src = `${GITHUB_BASE}/fotos/oktoberfest${year}.jpg`;
setTimeout(() => resolve(false), 3000);
});
}

async function initializeYearsWithDetection() {
allYears = [];

for (let year = startYear; year <= currentYear; year++) {
const exists = await checkYearExists(year);
if (exists) {
allYears.push(year.toString());
if (!photos[year]) {
photos[year] = `${GITHUB_BASE}/fotos/oktoberfest${year}.jpg`;
}
}
}

currentYearIndex = allYears.indexOf(currentYear.toString());
if (currentYearIndex === -1 && allYears.length > 0) {
currentYearIndex = allYears.length - 1;
}
}

function initializeYears() {
allYears = Object.keys(photos).sort((a, b) => parseInt(a) - parseInt(b));
currentYearIndex = allYears.indexOf(currentYear.toString());

if (currentYearIndex === -1 && allYears.length > 0) {
currentYearIndex = allYears.length - 1;
}
}

function setupUIElements() {
const anoVigente = getElementSafe("anoVigente");
if (anoVigente) anoVigente.textContent = currentYear;

const modalYear = getElementSafe("modalYear");
if (modalYear) modalYear.textContent = currentYear;

// NOVO: Atualizar o texto completo do parágrafo
const claraText = getElementSafe("claraOktoberfestText");
if (claraText) {
const anosDeOktoberfest = currentYear - 1984;
claraText.innerHTML = `<strong>41ª edição</strong> da Oktoberfest Blumenau. <strong>1984</strong> a <strong>${currentYear}</strong>`;
}

const yearInput = getElementSafe("yearInput");
if (yearInput) yearInput.max = currentYear;

const cartazInput = getElementSafe("cartazInput");
if (cartazInput) cartazInput.max = currentYear;
}

function setupEventListeners() {
const drawButton = getElementSafe("drawButton");
if (drawButton) drawButton.addEventListener("click", startDraw);

const videoButton = getElementSafe("videoButton");
if (videoButton) videoButton.addEventListener("click", playVideo);

const resetButton = getElementSafe("resetButton");
if (resetButton) resetButton.addEventListener("click", resetApp);

const foto2007Button = getElementSafe("foto2007Button");
if (foto2007Button) foto2007Button.addEventListener("click", mostrarFoto2007);

const cartazesButton = getElementSafe("cartazes");
if (cartazesButton) cartazesButton.addEventListener("click", mostrarCartazes);

const cartazButton = getElementSafe("cartazButton");
if (cartazButton) cartazButton.addEventListener("click", mostrarCartazAno);

const yearInput = getElementSafe("yearInput");
if (yearInput) {
yearInput.addEventListener("keypress", (event) => {
if (event.key === 'Enter') startDraw();
});
}

const cartazInput = getElementSafe("cartazInput");
if (cartazInput) {
cartazInput.addEventListener("keypress", (event) => {
if (event.key === 'Enter') mostrarCartazAno();
});
}

const modalButton = document.querySelector("#alertModal button");
if (modalButton) modalButton.addEventListener("click", closeModal);

adicionarSwipes();
window.addEventListener('resize', updateVideoPositionAndSize);
}

// ======== FUNÇÕES AUXILIARES E DE MÍDIA ========
function preloadMedia() {
// Pré-carrega fotos do GitHub
Object.values(photos).forEach(src => {
const img = new Image();
img.src = src;
});

// Pré-carrega cartazes do GitHub
for (let y = 1984; y <= currentYear; y++) {
const img = new Image();
img.src = `${GITHUB_BASE}/cartazes/cartaz${y}.jpg`;
}
}

// ======== LAZY LOADING ========
function setupLazyLoading() {
// Observador para imagens fora da viewport inicial
if ('IntersectionObserver' in window) {
const lazyImageObserver = new IntersectionObserver((entries, observer) => {
entries.forEach(entry => {
if (entry.isIntersecting) {
const img = entry.target;
loadImage(img);
lazyImageObserver.unobserve(img);
}
});
});

// Aplica lazy loading para fotos de anos futuros e cartazes
preloadLazyImages(lazyImageObserver);
} else {
// Fallback para navegadores antigos - carrega tudo
loadAllImages();
}
}

function preloadLazyImages(observer) {
// Pré-carrega apenas as 2 próximas fotos (ano atual +1, +2)
const currentYearIndex = allYears.indexOf(currentYear.toString());
const yearsToPreload = allYears.slice(currentYearIndex, currentYearIndex + 3);

yearsToPreload.forEach(year => {
const img = new Image();
img.dataset.src = photos[year];
observer.observe(img);
});

// Pré-carrega cartazes recentes (últimos 3 anos)
for (let y = currentYear - 2; y <= currentYear; y++) {
const img = new Image();
img.dataset.src = `${GITHUB_BASE}/cartazes/cartaz${y}.jpg`;
observer.observe(img);
}
}

function loadImage(img) {
if (img.dataset.src) {
img.src = img.dataset.src;
img.classList.remove('lazy');
img.classList.add('lazy-loaded');
}
}

function loadAllImages() {
// Fallback: carrega todas as imagens de uma vez
Object.values(photos).forEach(src => {
const img = new Image();
img.src = src;
});

for (let y = 1984; y <= currentYear; y++) {
const img = new Image();
img.src = `${GITHUB_BASE}/cartazes/cartaz${y}.jpg`;
}
}

// ======== FUNÇÕES DE VÍDEO ========
// SISTEMA DE VÍDEOS DINÂMICOS (como fotos 2007 e cartazes)
let videoList = [];           // Lista de URLs dos vídeos disponíveis
let currentVideoIndex = 0;    // Índice do vídeo atual
let isVideoModeActive = false; // Se está no modo de navegação de vídeos

// Detectar todos os vídeos disponíveis (clara1.mp4, clara2.mp4, etc.)
async function detectarTodosVideos() {
const videos = [];
let index = 1;
const maxTentativas = 50;

return new Promise((resolve) => {
function verificarProximoVideo() {
if (index > maxTentativas) {
    resolve(videos);
    return;
}

const videoUrl = `${GITHUB_BASE}/videos/clara${index}.mp4`;

// Usa fetch com HEAD para verificar existência (mais rápido)
fetch(videoUrl, { method: 'HEAD' })
    .then(response => {
        if (response.ok) {
            console.log(`✅ Vídeo detectado: clara${index}.mp4`);
            videos.push({
                url: videoUrl,
                nome: `clara${index}`,
                index: index
            });
            index++;
            verificarProximoVideo();
        } else {
            console.log(`❌ Vídeo não encontrado: clara${index}.mp4`);
            resolve(videos);
        }
    })
    .catch(() => {
        resolve(videos);
    });
}

verificarProximoVideo();
});
}

// Tocar vídeo com suporte a múltiplos vídeos e swipe
// Tocar vídeo com suporte a múltiplos vídeos e swipe
async function playVideo() {
    console.log('🎬 playVideo() chamada');
    
    const videoContainer = getElementSafe("video-container");
    const video = getElementSafe("claraVideo");
    const imageContainer = getElementSafe("image-container");
    const audio = document.getElementById("backgroundMusic");
    
    if (!videoContainer || !video || !imageContainer) {
        console.error('Elementos de vídeo não encontrados');
        return;
    }
    
    // Mutar a música de fundo enquanto o vídeo toca
    if (audio) audio.muted = true;
    
    // Parar loop de fotos 2007 se estiver ativo
    if (loopFoto2007) {
        clearTimeout(loopFoto2007);
        loopFoto2007 = null;
    }
    
    // Primeira ativação ou reset: detectar vídeos
    if (videoList.length === 0) {
        console.log('🔍 Detectando vídeos...');
        videoList = await detectarTodosVideos();
        if (videoList.length === 0) {
            console.warn('Nenhum vídeo encontrado');
            if (audio) audio.muted = false;
            return;
        }
        console.log(`🎬 ${videoList.length} vídeo(s) detectado(s)`);
    }
    
    // Sempre começar do primeiro vídeo quando clicar no botão
    currentVideoIndex = 0;
    isVideoModeActive = true;
    
    // Esconder imagem e mostrar vídeo
    imageContainer.style.visibility = "hidden";
    videoContainer.style.display = "flex";
    updateVideoPositionAndSize();
    
    // Carregar e tocar o vídeo
    const videoUrl = videoList[0].url;
    const videoSource = video.querySelector('source');
    if (videoSource) {
        videoSource.src = videoUrl;
        video.load();
    }
    
    // Adicionar listeners de swipe
    video.removeEventListener("touchstart", handleVideoTouchStart);
    video.removeEventListener("touchend", handleVideoTouchEnd);
    
    if (videoList.length > 1) {
        video.addEventListener("touchstart", handleVideoTouchStart, { passive: false });
        video.addEventListener("touchend", handleVideoTouchEnd, { passive: false });
    }
    
    video.play().catch(error => {
        console.error("Erro ao reproduzir vídeo:", error);
    });
    
    video.onended = function() {
        if (videoList.length > 1 && currentVideoIndex + 1 < videoList.length) {
            currentVideoIndex++;
            const nextUrl = videoList[currentVideoIndex].url;
            videoSource.src = nextUrl;
            video.load();
            video.play();
            mostrarIndicadorVideo();
        } else if (videoList.length > 1 && currentVideoIndex + 1 >= videoList.length) {
            // Volta para o primeiro
            currentVideoIndex = 0;
            const firstUrl = videoList[0].url;
            videoSource.src = firstUrl;
            video.load();
            video.play();
            mostrarIndicadorVideo();
        } else {
            stopVideo();
        }
    };
    
    mostrarIndicadorVideo();
}

function mostrarIndicadorVideo() {
if (videoList.length <= 1) return;

let indicator = document.getElementById('videoIndicator');
if (!indicator) {
indicator = document.createElement('div');
indicator.id = 'videoIndicator';
indicator.style.cssText = `
position: fixed;
bottom: 80px;
left: 50%;
transform: translateX(-50%);
background: rgba(0,0,0,0.7);
color: white;
padding: 5px 12px;
border-radius: 20px;
font-size: 12px;
z-index: 1002;
pointer-events: none;
font-family: monospace;
`;
document.body.appendChild(indicator);
}
indicator.textContent = `📹 ${currentVideoIndex + 1}/${videoList.length}`;
indicator.style.display = 'block';

// Esconder após 2 segundos
clearTimeout(window.videoIndicatorTimeout);
window.videoIndicatorTimeout = setTimeout(() => {
if (indicator) indicator.style.display = 'none';
}, 2000);
}

// Swipe handlers para vídeo
let videoTouchStartX = 0;
let isVideoSwiping = false;

function handleVideoTouchStart(e) {
videoTouchStartX = e.changedTouches[0].screenX;
}

function handleVideoTouchEnd(e) {
if (isVideoSwiping || videoList.length <= 1) return;

const videoEndX = e.changedTouches[0].screenX;
const swipeDistance = videoEndX - videoTouchStartX;
const minSwipeDistance = 50;

if (Math.abs(swipeDistance) < minSwipeDistance) {
return;
}

isVideoSwiping = true;

// Swipe para DIREITA = próximo vídeo
if (swipeDistance > 0) {
nextVideo();
}
// Swipe para ESQUERDA = vídeo anterior
else {
previousVideo();
}

setTimeout(() => {
isVideoSwiping = false;
}, 500);
}

// Mouse drag para vídeo
let videoDragStartX = 0;
let isVideoDragging = false;

function handleVideoMouseDown(e) {
if (videoList.length <= 1) return;
e.preventDefault();
isVideoDragging = true;
videoDragStartX = e.screenX;

const video = getElementSafe("claraVideo");
video.addEventListener('mousemove', handleVideoMouseMove);
video.addEventListener('mouseup', handleVideoMouseUp, { once: true });
video.addEventListener('mouseleave', handleVideoMouseUp, { once: true });
}

function handleVideoMouseMove(e) {
// Apenas para rastrear, sem ação durante o movimento
}

function handleVideoMouseUp(e) {
if (!isVideoDragging) return;
isVideoDragging = false;

const video = getElementSafe("claraVideo");
video.removeEventListener('mousemove', handleVideoMouseMove);

const dragEndX = e.screenX;
const swipeDistance = dragEndX - videoDragStartX;
const minSwipeDistance = 50;

if (Math.abs(swipeDistance) < minSwipeDistance) return;

if (swipeDistance > 0) {
nextVideo();
} else {
previousVideo();
}
}

function nextVideo() {
if (!isVideoModeActive || videoList.length === 0) return;

if (currentVideoIndex + 1 < videoList.length) {
currentVideoIndex++;
playVideoByIndex(currentVideoIndex);
}
}

function previousVideo() {
if (!isVideoModeActive || videoList.length === 0) return;

if (currentVideoIndex - 1 >= 0) {
currentVideoIndex--;
playVideoByIndex(currentVideoIndex);
}
}

function stopVideo() {
const videoContainer = getElementSafe("video-container");
const video = getElementSafe("claraVideo");
const imageContainer = getElementSafe("image-container");
const audio = document.getElementById("backgroundMusic");

if (!videoContainer || !video || !imageContainer) return;

video.pause();
video.currentTime = 0;
videoContainer.style.display = "none";
imageContainer.style.visibility = "visible";
videoContainer.style.top = '0';
videoContainer.style.left = '0';

// Limpar indicador
const indicator = document.getElementById('videoIndicator');
if (indicator) indicator.style.display = 'none';

// Resetar modo vídeo
isVideoModeActive = false;

// Desmutar e retomar a música de fundo
if (audio) {
audio.muted = false;
audio.play().catch(error => {
console.error("Erro ao retomar música:", error);
});
}
}

function updateVideoPositionAndSize() {
const videoContainer = getElementSafe("video-container");
const imageContainer = getElementSafe("image-container");

if (!videoContainer || !imageContainer || videoContainer.style.display === "none") return;

const imageRect = imageContainer.getBoundingClientRect();
videoContainer.style.top = (imageRect.top + window.scrollY - 5) + 'px';
videoContainer.style.left = (imageRect.left + window.scrollX) + 'px';
videoContainer.style.width = imageRect.width + 'px';
videoContainer.style.height = imageRect.height + 'px';
}

// ======== SETUP CANVAS FOGOS ========
function setupCanvasAndFireworks() {
canvas = getElementSafe("fireworks");
w = window.innerWidth;
h = window.innerHeight;

if (canvas) {
ctx = canvas.getContext("2d");
canvas.width = w;
canvas.height = h;
}
}

// ======== FUNÇÕES AUXILIARES ========
function getElementSafe(id) {
const element = document.getElementById(id);
if (!element) {
console.warn(`Elemento com ID '${id}' não encontrado`);
}
return element;
}

function limparListenersEClone() {
if (loopFoto2007) {
clearTimeout(loopFoto2007);
loopFoto2007 = null;
}

const oldImg = getElementSafe("photo");
if (!oldImg) return null;

// Remove listeners de swipe antigos antes de clonar
removerSwipes();
// IMPORTANTE: A função mostrarCartazes() e mostrarFoto2007() são responsáveis por adicionar seus próprios listeners
// Não adicionamos adicionarSwipes() aqui, pois é adicionado no initializeApp e no fim do sorteio

const newImg = oldImg.cloneNode(true);
newImg.style.transition = oldImg.style.transition;
oldImg.parentNode.replaceChild(newImg, oldImg);

return newImg;
}

function adicionarSwipes() {
const photo = getElementSafe("photo");
if (!photo) return;

photo.addEventListener("touchstart", handleTouchStart, { passive: false });
photo.addEventListener("touchend", handleTouchEnd, { passive: false });
photo.addEventListener("mousedown", handleMouseDown, false);
}

function removerSwipes() {
const photo = getElementSafe("photo");
if (!photo) return;

photo.removeEventListener("touchstart", handleTouchStart, { passive: false });
photo.removeEventListener("touchend", handleTouchEnd, { passive: false });
photo.removeEventListener("mousedown", handleMouseDown, false);
}

// ======== FOTOS 2007 ========
function mostrarFoto2007() {
stopVideo();
const img = limparListenersEClone();
if (!img) return;

// Remove listeners padrão de swipe de ano
removerSwipes();

const transitionDuration = 600; 
const intervalo = 3000;

let imagens = [];
let indice = 0;
let paused = false;

img.style.transition = `transform ${transitionDuration}ms ease-in-out`;
img.style.opacity = 1;

// Função para detectar dinamicamente TODAS as imagens da pasta kaka
function detectarTodasImagensKaka(callback) {
const imagensExistentes = [];
let index = 1;
const maxTentativas = 50; // Número máximo de imagens para verificar

function verificarProximaImagem() {
if (index > maxTentativas) {
// Todas as imagens foram verificadas, chamar callback
callback(imagensExistentes);
return;
}

const nomeArquivo = `oktoberfestkaka${index}.jpg`;
const urlImagem = `${GITHUB_BASE}/kaka/${nomeArquivo}`;

const tempImg = new Image();
tempImg.onload = function() {
// Imagem existe, adicionar à lista
imagensExistentes.push({
src: urlImagem,
alt: `Oktoberfest Kaka ${index}`
});
console.log(`✅ Imagem detectada: ${nomeArquivo}`);
index++;
verificarProximaImagem();
};

tempImg.onerror = function() {
// Imagem não existe, parar a verificação
console.log(`❌ Imagem não encontrada: ${nomeArquivo}. Parando busca.`);
callback(imagensExistentes);
};

tempImg.src = urlImagem;
}

verificarProximaImagem();
}

function iniciarComImagens(imagensCarregadas) {
if (imagensCarregadas.length === 0) {
console.warn("Nenhuma imagem encontrada na pasta kaka");
img.src = `${GITHUB_BASE}/fotos/oktoberfest.webp`;
img.alt = "Imagem padrão";
return;
}

imagens = imagensCarregadas;
console.log(`🎯 ${imagens.length} imagens detectadas automaticamente`);

function iniciarImagemInicial() {
const primeiraImagem = imagens[0];

img.src = primeiraImagem.src;
img.alt = primeiraImagem.alt;

img.onerror = () => {
console.warn(`Erro ao carregar imagem: ${primeiraImagem.alt}`);
img.src = `${GITHUB_BASE}/fotos/oktoberfest.webp`;
};

img.classList.remove("push-left", "push-right");
indice = 1;
iniciarLoop();
}

function iniciarLoop() {
if (paused) return;

function trocarImagem() {
if (paused) return;

const proxima = imagens[indice];

img.classList.add("push-left");

setTimeout(() => {
img.classList.remove("push-left");
img.classList.add("push-right");
void img.offsetWidth;

img.src = proxima.src;
img.alt = proxima.alt;

img.onerror = () => {
console.warn(`Erro ao carregar: ${proxima.alt}`);
img.src = `${GITHUB_BASE}/fotos/oktoberfest.webp`;
};

img.classList.remove("push-right");
indice = (indice + 1) % imagens.length;

if (!paused) {
loopFoto2007 = setTimeout(trocarImagem, intervalo);
}
}, transitionDuration);
}

if (!paused) {
loopFoto2007 = setTimeout(trocarImagem, intervalo);
}
}

// Funções de Pausa e Resume
const pauseLoop = () => {
paused = true;
if (loopFoto2007) {
clearTimeout(loopFoto2007);
loopFoto2007 = null;
}
};

const resumeLoop = () => {
if (paused) {
paused = false;
iniciarLoop();
}
};

// Event Listeners
img.addEventListener("mousedown", (e) => {
e.preventDefault();
pauseLoop();
});
img.addEventListener("mouseup", (e) => {
e.preventDefault();
resumeLoop();
});
img.addEventListener("mouseleave", resumeLoop);
img.addEventListener("touchstart", (e) => {
e.preventDefault();
pauseLoop();
}, { passive: false });
img.addEventListener("touchend", (e) => {
e.preventDefault();
resumeLoop();
}, { passive: false });
img.addEventListener("touchcancel", (e) => {
e.preventDefault();
resumeLoop();
}, { passive: false });

iniciarImagemInicial();
}

// Iniciar a detecção dinâmica das imagens
detectarTodasImagensKaka(iniciarComImagens);
}

// ======== SWIPE E NAVEGAÇÃO CORRIGIDOS (Fotos/Ano) ========
function handleTouchStart(e) {
//e.preventDefault(); // Comentar: pode interferir na rolagem se a foto for pequena
touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
//e.preventDefault(); // Comentar: pode interferir na rolagem se a foto for pequena
touchEndX = e.changedTouches[0].screenX;
handleSwipe();
}

function handleMouseDown(e) {
e.preventDefault();
touchStartX = e.screenX;
document.addEventListener('mouseup', handleMouseUp, { once: true });
}

function handleMouseUp(e) {
// e.preventDefault(); // Não é necessário aqui, já que o mousedown tinha preventDefault
touchEndX = e.screenX;
handleSwipe();
document.removeEventListener('mouseup', handleMouseUp);
}

// Prevenir múltiplos swipes simultâneos (CORRIGIDO)
function handleSwipe() {
if (isSwiping) return; // Já está processando um swipe

const minSwipeDistance = 50;
const swipeDistance = touchEndX - touchStartX;

// Swipe muito pequeno - ignorar
if (Math.abs(swipeDistance) < minSwipeDistance) {
console.log('[SWIPE] Movimento muito pequeno, ignorando');
return;
}

isSwiping = true;

// Swipe para DIREITA (swipeDistance > 0) = próximo ano (crescente)
if (swipeDistance > 0) {
nextYear(); // 2024 → 2025
}
// Swipe para ESQUERDA (swipeDistance < 0) = ano anterior (decrescente)  
else {
prevYear(); // 2025 → 2024
}

// Reset após um tempo para permitir novo swipe
setTimeout(() => {
isSwiping = false;
}, 500);
}


function navigateToYear(year) {
stopVideo();
if (loopFoto2007) {
clearTimeout(loopFoto2007);
loopFoto2007 = null;
}

const img = getElementSafe("photo");
if (!img) return;

// Importante: Re-adicionar swipes caso a navegação tenha sido disparada por outra função (ex: sorteio)
adicionarSwipes();

const yearIndex = allYears.indexOf(year.toString());
if (yearIndex !== -1) {
currentYearIndex = yearIndex;
}

img.style.opacity = 0;
setTimeout(() => {
img.src = photos[year];
img.alt = `Oktoberfest ${year}`;

img.onerror = () => {
console.warn(`Imagem de ${year} não encontrada — substituindo por vilagermanica.jpg`);
img.src = `${GITHUB_BASE}/fotos/vilagermanica.jpg`;
};

img.style.opacity = 1;
}, 200);
}

function nextYear() {
if (currentYearIndex < allYears.length - 1) {
currentYearIndex++;
} else {
currentYearIndex = 0;
}
navigateToYear(parseInt(allYears[currentYearIndex]));
}

function prevYear() {
if (currentYearIndex > 0) {
currentYearIndex--;
} else {
currentYearIndex = allYears.length - 1;
}
navigateToYear(parseInt(allYears[currentYearIndex]));
}

// ======== MODAL ========
function showModal(context = "oktoberfest") {
const modal = getElementSafe("alertModal");
if (!modal) return;

const modalYearSpan = document.getElementById("modalYear");
if (modalYearSpan) modalYearSpan.textContent = currentYear;

const firstLine = modal.querySelector(".modal-content div:first-child");
const secondLine = modal.querySelector(".modal-content div:nth-child(2)");

if (firstLine && secondLine) {
if (context === "cartaz") {
firstLine.innerText = "Cartazes da Oktoberfest entre";
secondLine.innerHTML = `<strong>1984 a ${currentYear} <span style="font-size: 20px;">🥨</span></strong>`;
} else if (context === "oktoberfest") {
firstLine.innerText = "Clara foi na Oktoberfest de";
secondLine.innerHTML = `<strong>2017 a ${currentYear} <span style="font-size: 20px;">🥨</span></strong>`;
}
// REMOVA o caso "cartaz_nao_encontrado" - não é mais usado
}

modal.style.display = "flex";
setTimeout(() => modal.classList.add("show"), 10);
}

function closeModal() {
const modal = getElementSafe("alertModal");
if (!modal) return;

modal.classList.remove("show");
setTimeout(() => (modal.style.display = "none"), 300);
}

// ======== SORTEIO ========
function startDraw() {
stopVideo();
if (loopFoto2007) {
clearTimeout(loopFoto2007);
loopFoto2007 = null;
}
// Garante que o swipe de fotos esteja ativo
adicionarSwipes();

if (isDrawing) return;

const year = parseInt(document.getElementById("yearInput").value);
const img = limparListenersEClone();
const button = getElementSafe("drawButton");

if (!img || !button) return;

// ✅ Permite anos acima do atual (ex: 2026) sem travar
if (isNaN(year) || year < startYear) {
showModal("oktoberfest");
return;
}

clearInterval(interval);
isDrawing = true;
button.disabled = true;

const yearsArray = Object.keys(photos).sort((a, b) => parseInt(a) - parseInt(b));
let iterations = 0;
const maxIterations = 15;
let currentSpeed = 100;

interval = setInterval(() => {
const randomYear = yearsArray[Math.floor(Math.random() * yearsArray.length)];
img.style.opacity = 0;
setTimeout(() => {
img.src = photos[randomYear];
img.alt = `Oktoberfest ${randomYear}`;
img.style.opacity = 1;
}, 100);

iterations++;
currentSpeed = Math.min(100 + (iterations * 25), 500);

if (iterations >= maxIterations) {
clearInterval(interval);
setTimeout(() => {
img.style.opacity = 0;
setTimeout(() => {
img.src = `${GITHUB_BASE}/fotos/oktoberfest${year}.jpg`;
img.alt = `Oktoberfest ${year} - Sorteado!`;

// ✅ Fallback automático se a imagem não existir
img.onerror = () => {
console.warn(`Foto Clara ${year} não encontrada`);
img.src = `${GITHUB_BASE}/fotos/vilagermanica.jpg`;
img.alt = `Oktoberfest ${year} - Upload pendente`;
// Nenhum modal — deixa a imagem visível
};

img.style.opacity = 1;
button.disabled = false;
isDrawing = false;
document.getElementById("yearInput").value = "";
startFireworks();

const yearIndex = yearsArray.indexOf(year.toString());
if (yearIndex !== -1) {
currentYearIndex = yearIndex;
}

adicionarSwipes();
}, 200);
}, 200);
}
}, currentSpeed);
}

// ======== FOGOS DE ARTIFÍCIO ========
window.addEventListener("resize", () => {
w = window.innerWidth;
h = window.innerHeight;
if (canvas) {
canvas.width = w;
canvas.height = h;
}
updateVideoPositionAndSize();
});

function random(min, max) { return Math.random() * (max - min) + min; }

function createFirework(x, y) {
const count = 80;
for (let i = 0; i < count; i++) {
const angle = (Math.PI * 2 * i) / count;
const speed = random(2, 6);
particles.push({
x, y,
vx: Math.cos(angle) * speed,
vy: Math.sin(angle) * speed,
alpha: 1,
color: `hsl(${random(0, 360)}, 100%, 60%)`,
});
}
}

function animateFireworks() {
if (!ctx || !canvas) return;

ctx.clearRect(0, 0, w, h);

for (let i = particles.length - 1; i >= 0; i--) {
const p = particles[i];
p.x += p.vx;
p.y += p.vy;
p.vy += 0.05;
p.alpha -= 0.015;

if (p.alpha <= 0) { particles.splice(i, 1); continue; }

ctx.globalAlpha = p.alpha;
ctx.fillStyle = p.color;
ctx.beginPath();
ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
ctx.fill();
}

if (particles.length > 0) {
animationId = requestAnimationFrame(animateFireworks);
} else {
ctx.clearRect(0, 0, w, h);
animationId = null;
}
}

function startFireworks() {
if (!ctx) return;

if (animationId) { cancelAnimationFrame(animationId); particles = []; }
for (let i = 0; i < 5; i++) {
setTimeout(() => {
createFirework(random(w * 0.2, w * 0.8), random(h * 0.2, h * 0.6));
if (i === 0) animateFireworks();
}, i * 400);
}
}

// ======== RESET COM RELOAD ========
function resetApp() {
console.log('[APP] Resetando e recarregando para atualizar conteúdo...');

// Limpa todos os processos em andamento
stopVideo();
if (loopFoto2007) {
clearTimeout(loopFoto2007);
loopFoto2007 = null;
}
clearInterval(interval);
interval = null;
isDrawing = false;
isSwiping = false;

// Limpa fogos
particles = [];
if (animationId) {
cancelAnimationFrame(animationId);
animationId = null;
if (ctx) {
ctx.clearRect(0, 0, w, h);
}
}

// Feedback visual
const resetButton = getElementSafe("resetButton");
if (resetButton) {
resetButton.innerHTML = 'Atualizando';
resetButton.style.background = '#D8B115';
resetButton.disabled = true;
}

// Recarrega para buscar conteúdo NOVO do GitHub
setTimeout(() => {
window.location.reload(true);
}, 400);
}

// ======== CARTAZES CORRIGIDOS ========
function mostrarCartazes() {
stopVideo();
const img = limparListenersEClone();
if (!img) return;

// Remove listeners padrão de swipe de ano
removerSwipes();

const fadeDuration = 500;
let cartazAtual = currentYear; // Começar pelo ano atual
const ultimoCartaz = currentYear;
const totalCartazes = ultimoCartaz - 1984 + 1;
const cartazes = Array.from({ length: totalCartazes }, (_, i) => 1984 + i);
let index = cartazes.indexOf(cartazAtual); // Inicializa o índice no ano atual
let isCartazSwiping = false; // VARIÁVEL LOCAL: Previne swipes simultâneos de cartaz

function carregarCartazComFallback(ano) {
if (isCartazSwiping) return;
isCartazSwiping = true;

img.style.opacity = 0;
setTimeout(() => {
img.src = `${GITHUB_BASE}/cartazes/cartaz${ano}.jpg`;
img.alt = `Cartaz ${ano}`;

img.onerror = () => {
console.warn(`Cartaz ${ano} não encontrado`);
img.src = `${GITHUB_BASE}/fotos/vilagermanica.jpg`;
img.alt = `Cartaz ${ano} - Upload pendente`;
};

img.style.opacity = 1;
cartazAtual = ano;
index = cartazes.indexOf(ano);
setTimeout(() => { isCartazSwiping = false; }, fadeDuration); // Resetar após a transição
}, fadeDuration);
}

carregarCartazComFallback(cartazAtual);

let cartazStartX = 0;

const cartazesTouchStart = (e) => {
// e.preventDefault(); // Comentar: pode interferir na rolagem
cartazStartX = e.changedTouches[0].screenX;
};

const cartazesTouchEnd = (e) => {
// e.preventDefault(); // Comentar: pode interferir na rolagem
if (isCartazSwiping) return;

const cartazEndX = e.changedTouches[0].screenX;
const swipeDistance = cartazEndX - cartazStartX;
const minSwipeDistance = 50;

if (Math.abs(swipeDistance) < minSwipeDistance) {
console.log('[SWIPE CARTAZ] Movimento muito pequeno, ignorando');
return;
}

// Swipe para DIREITA (swipeDistance > 0) = próximo cartaz (crescente)
if (swipeDistance > 0) {
proximoCartaz();
}
// Swipe para ESQUERDA (swipeDistance < 0) = cartaz anterior (decrescente)  
else {
anteriorCartaz();
}
};

img.addEventListener("touchstart", cartazesTouchStart, { passive: true });
img.addEventListener("touchend", cartazesTouchEnd, { passive: true });

// Adicionar suporte a mouse drag (opcional)
let isDragging = false;
let dragStartX = 0;

const cartazesMouseDown = (e) => {
e.preventDefault();
isDragging = true;
dragStartX = e.screenX;
img.addEventListener('mousemove', cartazesMouseMove);
img.addEventListener('mouseup', cartazesMouseUp, { once: true });
img.addEventListener('mouseleave', cartazesMouseUp, { once: true });
};

const cartazesMouseMove = (e) => {
if (!isDragging) return;
// Previne seleção de texto durante o drag
};

const cartazesMouseUp = (e) => {
if (!isDragging) return;
isDragging = false;
img.removeEventListener('mousemove', cartazesMouseMove);

if (isCartazSwiping) return;

const dragEndX = e.screenX;
const swipeDistance = dragEndX - dragStartX;
const minSwipeDistance = 50;

if (Math.abs(swipeDistance) < minSwipeDistance) {
console.log('[DRAG CARTAZ] Movimento muito pequeno, ignorando');
return;
}

// Swipe para DIREITA (swipeDistance > 0) = próximo cartaz (crescente)
if (swipeDistance > 0) {
proximoCartaz();
}
// Swipe para ESQUERDA (swipeDistance < 0) = cartaz anterior (decrescente)  
else {
anteriorCartaz();
}
};

img.addEventListener("mousedown", cartazesMouseDown, false);

function proximoCartaz() {
index = (index + 1) % cartazes.length;
const proximoAno = cartazes[index];
carregarCartazComFallback(proximoAno);
}

function anteriorCartaz() {
index = (index - 1 + cartazes.length) % cartazes.length;
const anoAnterior = cartazes[index];
carregarCartazComFallback(anoAnterior);
}
}

function mostrarCartazAno() {
stopVideo();
const input = getElementSafe("cartazInput");
const img = limparListenersEClone();
if (!input || !img) return;

// NÃO configurar swipes - usuário quer ver APENAS o cartaz digitado
// Também NÃO chamar adicionarSwipes() - manter sem navegação por swipe

const year = parseInt(input.value);

if (isNaN(year) || year < 1984) {
showModal("cartaz");
return;
}

img.style.opacity = 0;
setTimeout(() => {
img.src = `${GITHUB_BASE}/cartazes/cartaz${year}.jpg`;
img.alt = `Cartaz ${year}`;

img.onerror = () => {
console.warn(`Cartaz ${year} não encontrado`);
img.src = `${GITHUB_BASE}/fotos/vilagermanica.jpg`;
img.alt = `Cartaz ${year} - Upload pendente`;
};

img.style.opacity = 1;
input.value = "";

// ⚠️ SEM SWIPES - usuário quis ver APENAS este cartaz específico
}, 400);
}

// 🔥 NOVA FUNÇÃO: Configura swipes específicos para o cartaz mostrado
function configurarSwipesCartazEspecifico(img, yearInicial) {
// Remove qualquer listener anterior
removerSwipes();

const fadeDuration = 500;
let cartazAtual = yearInicial;
let isCartazSwiping = false;

function carregarCartazComFallback(ano) {
if (isCartazSwiping) return;
isCartazSwiping = true;

img.style.opacity = 0;
setTimeout(() => {
img.src = `${GITHUB_BASE}/cartazes/cartaz${ano}.jpg`;
img.alt = `Cartaz ${ano}`;

img.onerror = () => {
console.warn(`Cartaz ${ano} não encontrado`);
img.src = `${GITHUB_BASE}/fotos/vilagermanica.jpg`;
img.alt = `Cartaz ${ano} - Upload pendente`;
};

img.style.opacity = 1;
cartazAtual = ano;
setTimeout(() => { isCartazSwiping = false; }, fadeDuration);
}, fadeDuration);
}

let cartazStartX = 0;

const cartazesTouchStart = (e) => {
cartazStartX = e.changedTouches[0].screenX;
};

const cartazesTouchEnd = (e) => {
if (isCartazSwiping) return;

const cartazEndX = e.changedTouches[0].screenX;
const swipeDistance = cartazEndX - cartazStartX;
const minSwipeDistance = 50;

if (Math.abs(swipeDistance) < minSwipeDistance) {
console.log('[SWIPE CARTAZ ESPECÍFICO] Movimento muito pequeno, ignorando');
return;
}

// Swipe para DIREITA = próximo cartaz (crescente)
if (swipeDistance > 0) {
const proximoAno = Math.min(cartazAtual + 1, currentYear);
if (proximoAno !== cartazAtual) {
carregarCartazComFallback(proximoAno);
}
}
// Swipe para ESQUERDA = cartaz anterior (decrescente)  
else {
const anoAnterior = Math.max(cartazAtual - 1, 1984);
if (anoAnterior !== cartazAtual) {
carregarCartazComFallback(anoAnterior);
}
}
};

// Mouse events
let isDragging = false;
let dragStartX = 0;

const cartazesMouseDown = (e) => {
e.preventDefault();
isDragging = true;
dragStartX = e.screenX;
};

const cartazesMouseUp = (e) => {
if (!isDragging) return;
isDragging = false;

if (isCartazSwiping) return;

const dragEndX = e.screenX;
const swipeDistance = dragEndX - dragStartX;
const minSwipeDistance = 50;

if (Math.abs(swipeDistance) < minSwipeDistance) {
return;
}

// Swipe para DIREITA = próximo cartaz (crescente)
if (swipeDistance > 0) {
const proximoAno = Math.min(cartazAtual + 1, currentYear);
if (proximoAno !== cartazAtual) {
carregarCartazComFallback(proximoAno);
}
}
// Swipe para ESQUERDA = cartaz anterior (decrescente)  
else {
const anoAnterior = Math.max(cartazAtual - 1, 1984);
if (anoAnterior !== cartazAtual) {
carregarCartazComFallback(anoAnterior);
}
}
};

// Adicionar listeners específicos para cartaz
img.addEventListener("touchstart", cartazesTouchStart, { passive: true });
img.addEventListener("touchend", cartazesTouchEnd, { passive: true });
img.addEventListener("mousedown", cartazesMouseDown, false);
img.addEventListener("mouseup", cartazesMouseUp, false);
img.addEventListener("mouseleave", cartazesMouseUp, false);
}

// 🚀 INICIALIZAR A APLICAÇÃO QUANDO O DOM ESTIVER PRONTO
document.addEventListener('DOMContentLoaded', initializeApp);
