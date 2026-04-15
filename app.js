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
let musicReady = false;         // true quando musicList já foi carregada
let userInteracted = false;     // true quando usuário já tocou/clicou

// VARIÁVEIS DE VÍDEO
let videoList = [];
let currentVideoIndex = 0;
let videoTouchStartX = 0;
let isVideoSwiping = false;

// FLAGS DE TOAST (uma vez por modo)
let toastClaraExibido = false;
let toastVideoExibido = false;
let toastCartazesExibido = false;

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

// Quando terminar, toca outra automaticamente
audio.addEventListener('ended', playRandomMusic);

// Botão apenas troca de música
const musicButton = document.getElementById('musicButton');
if (musicButton) {
musicButton.addEventListener('click', handleMusicButtonClick);
}

// Registra interação do usuário assim que ela acontecer
const onFirstInteraction = () => {
userInteracted = true;
// Se a lista já estava pronta, toca imediatamente
if (musicReady) {
playRandomMusic();
}
};
document.addEventListener('touchstart', onFirstInteraction, { once: true });
document.addEventListener('click',      onFirstInteraction, { once: true });

// Carrega a lista; se o usuário já interagiu enquanto carregava, toca agora
await loadMusicList();
musicReady = true;
if (userInteracted) {
playRandomMusic();
}
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
navigator.serviceWorker.register('./sw.js').then(reg => {
// Detecta quando um novo SW foi encontrado
reg.addEventListener('updatefound', () => {
const newWorker = reg.installing;
if (!newWorker) return;
newWorker.addEventListener('statechange', () => {
// Quando o novo SW ativar, recarrega a página para aplicar a atualização
if (newWorker.state === 'activated') {
window.location.reload();
}
});
});
}).catch(err => console.warn('[SW] Falha ao registrar:', err));

// Recarrega também se o controller mudar (ex: após skipWaiting)
navigator.serviceWorker.addEventListener('controllerchange', () => {
window.location.reload();
});
}

// 4. Inicialização dos anos (pode demorar, mas não bloqueia mais o texto)
await initializeYearsWithDetection();

// 5. Resto da inicialização
setupEventListeners();
await setupMusic();
loadVideoList(); // Detecta vídeos em background (não-blocking)
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
const anosSemFesta = [2020, 2021];
const edicao = currentYear - 1984 + 1 - anosSemFesta.filter(a => a <= currentYear).length;
claraText.innerHTML = `<strong>${edicao}ª edição</strong> da Oktoberfest Blumenau. <strong>1984</strong> a <strong>${currentYear}</strong>`;
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

// Detecta automaticamente todos os vídeos clara1.mp4, clara2.mp4, etc.
async function loadVideoList() {
videoList = [];
let index = 1;
const maxTentativas = 20;

function verificarVideo(url) {
return new Promise((resolve) => {
const vid = document.createElement('video');
vid.preload = 'metadata';
const timeout = setTimeout(() => { vid.src = ''; resolve(false); }, 5000);
vid.onloadedmetadata = () => { clearTimeout(timeout); vid.src = ''; resolve(true); };
vid.onerror = () => { clearTimeout(timeout); resolve(false); };
vid.src = url;
});
}

while (index <= maxTentativas) {
const url = `${GITHUB_BASE}/videos/clara${index}.mp4`;
const existe = await verificarVideo(url);
if (existe) {
videoList.push(url);
index++;
} else {
break;
}
}

console.log(`🎬 ${videoList.length} vídeo(s) encontrado(s)`);
}

function playVideo() {
const videoContainer = getElementSafe("video-container");
const video = getElementSafe("claraVideo");
const imageContainer = getElementSafe("image-container");
const audio = document.getElementById("backgroundMusic");

if (!videoContainer || !video || !imageContainer) return;

// Mutar a música de fundo enquanto o vídeo toca
if (audio) audio.muted = true;

if (loopFoto2007) {
clearTimeout(loopFoto2007);
loopFoto2007 = null;
}

// Sorteia aleatoriamente entre os vídeos disponíveis (ou usa clara1 como fallback)
if (videoList.length > 0) {
currentVideoIndex = Math.floor(Math.random() * videoList.length);
} else {
currentVideoIndex = 0;
}

carregarVideo(currentVideoIndex);

imageContainer.style.visibility = "hidden";
videoContainer.style.display = "flex";
updateVideoPositionAndSize();

// Configura swipe de vídeo
configurarSwipeVideo(video);

if (!toastVideoExibido && videoList.length > 1) {
toastVideoExibido = true;
showToast('👈 Arraste para navegar entre os vídeos 👉', 2500);
}

video.onended = function() {
// Avança automaticamente para o próximo vídeo ao terminar
if (videoList.length > 1) {
currentVideoIndex = (currentVideoIndex + 1) % videoList.length;
carregarVideo(currentVideoIndex);
} else {
stopVideo();
}
};
}

function carregarVideo(index) {
const video = getElementSafe("claraVideo");
if (!video) return;

const videoUrl = videoList.length > 0
? videoList[index]
: `${GITHUB_BASE}/videos/clara1.mp4`;

const videoSource = video.querySelector('source');
if (videoSource) {
videoSource.src = videoUrl;
video.load();
}

video.play().catch(error => {
console.error("Erro ao reproduzir vídeo:", error);
});

console.log(`🎬 Vídeo ${index + 1}/${videoList.length}: ${videoUrl}`);
}

function configurarSwipeVideo(video) {
// Remove listeners anteriores para não duplicar
video.removeEventListener('touchstart', videoTouchStart);
video.removeEventListener('touchend', videoTouchEnd);

video.addEventListener('touchstart', videoTouchStart, { passive: true });
video.addEventListener('touchend', videoTouchEnd, { passive: true });
}

function videoTouchStart(e) {
videoTouchStartX = e.changedTouches[0].screenX;
}

function videoTouchEnd(e) {
if (isVideoSwiping || videoList.length <= 1) return;

const videoTouchEndX = e.changedTouches[0].screenX;
const swipeDistance = videoTouchEndX - videoTouchStartX;
const minSwipeDistance = 50;

if (Math.abs(swipeDistance) < minSwipeDistance) return;

isVideoSwiping = true;

// 👉 direita = próximo (igual fotos e cartazes)
// 👈 esquerda = anterior
if (swipeDistance > 0) {
currentVideoIndex = (currentVideoIndex + 1) % videoList.length;
} else {
currentVideoIndex = (currentVideoIndex - 1 + videoList.length) % videoList.length;
}

carregarVideo(currentVideoIndex);

setTimeout(() => { isVideoSwiping = false; }, 600);
}

function stopVideo() {
const videoContainer = getElementSafe("video-container");
const video = getElementSafe("claraVideo");
const imageContainer = getElementSafe("image-container");
const audio = document.getElementById("backgroundMusic");

if (!videoContainer || !video || !imageContainer) return;

// Remove swipe listeners do vídeo
video.removeEventListener('touchstart', videoTouchStart);
video.removeEventListener('touchend', videoTouchEnd);

video.pause();
video.currentTime = 0;
videoContainer.style.display = "none";
imageContainer.style.visibility = "visible";
videoContainer.style.top = '0';
videoContainer.style.left = '0';

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
const photo = document.getElementById("photo");

if (!videoContainer || !photo || videoContainer.style.display === "none") return;

const rect = photo.getBoundingClientRect();
videoContainer.style.position = "fixed";
videoContainer.style.top = rect.top + "px";
videoContainer.style.left = rect.left + "px";
videoContainer.style.width = rect.width + "px";
videoContainer.style.height = rect.height + "px";
videoContainer.style.alignItems = "flex-start";
videoContainer.style.justifyContent = "flex-start";

const video = document.getElementById("claraVideo");
if (video) {
video.style.width = "100%";
video.style.height = "100%";
video.style.margin = "0";
}
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

// ======== FOTOS KAKA (mesma lógica dos cartazes) ========
function mostrarFoto2007() {
stopVideo();
const img = limparListenersEClone();
if (!img) return;

removerSwipes();

const fadeDuration = 500;
let kakasDetectadas = [];
let index = 0;
let isKakaSwiping = false;

function detectarTodasImagensKaka(callback) {
const imagensExistentes = [];
let i = 1;
const maxTentativas = 50;

function verificarProximaImagem() {
if (i > maxTentativas) { callback(imagensExistentes); return; }
const urlImagem = `${GITHUB_BASE}/kaka/oktoberfestkaka${i}.jpg`;
const tempImg = new Image();
tempImg.onload = function() {
imagensExistentes.push(urlImagem);
i++;
verificarProximaImagem();
};
tempImg.onerror = function() { callback(imagensExistentes); };
tempImg.src = urlImagem;
}
verificarProximaImagem();
}

function carregarKakaComFallback(novoIndex) {
if (isKakaSwiping) return;
isKakaSwiping = true;

img.style.opacity = 0;
setTimeout(() => {
img.src = kakasDetectadas[novoIndex];
img.alt = `Cláudia & Augusto ${novoIndex + 1}`;

img.onerror = () => {
console.warn(`Kaka ${novoIndex + 1} não encontrada`);
img.src = `${GITHUB_BASE}/fotos/vilagermanica.jpg`;
img.alt = `Kaka ${novoIndex + 1} - Upload pendente`;
img.style.opacity = 1;
};

img.onload = () => { img.style.opacity = 1; };
index = novoIndex;

if (!toastClaraExibido) {
toastClaraExibido = true;
showToast('👈 Arraste para navegar entre as fotos 👉', 2500);
}

setTimeout(() => { isKakaSwiping = false; }, fadeDuration);
}, fadeDuration);
}

function iniciarComImagens(imagensCarregadas) {
if (imagensCarregadas.length === 0) {
console.warn("Nenhuma imagem encontrada na pasta kaka");
img.src = `${GITHUB_BASE}/fotos/oktoberfest.png`;
return;
}

kakasDetectadas = imagensCarregadas;
console.log(`🎯 ${kakasDetectadas.length} imagens kaka detectadas`);

carregarKakaComFallback(0);

let kakaStartX = 0;

const kakaTouchStart = (e) => {
kakaStartX = e.changedTouches[0].screenX;
};

const kakaTouchEnd = (e) => {
if (isKakaSwiping) return;
const kakaEndX = e.changedTouches[0].screenX;
const swipeDistance = kakaEndX - kakaStartX;
const minSwipeDistance = 50;
if (Math.abs(swipeDistance) < minSwipeDistance) {
console.log('[SWIPE KAKA] Movimento muito pequeno, ignorando');
return;
}
if (swipeDistance > 0) {
proximaKaka();
} else {
anteriorKaka();
}
};

img.addEventListener("touchstart", kakaTouchStart, { passive: true });
img.addEventListener("touchend", kakaTouchEnd, { passive: true });

let isDragging = false;
let dragStartX = 0;

const kakaMouseDown = (e) => {
e.preventDefault();
isDragging = true;
dragStartX = e.screenX;
img.addEventListener('mousemove', kakaMouseMove);
img.addEventListener('mouseup', kakaMouseUp, { once: true });
img.addEventListener('mouseleave', kakaMouseUp, { once: true });
};

const kakaMouseMove = (e) => {
if (!isDragging) return;
};

const kakaMouseUp = (e) => {
if (!isDragging) return;
isDragging = false;
img.removeEventListener('mousemove', kakaMouseMove);
if (isKakaSwiping) return;
const dragEndX = e.screenX;
const swipeDistance = dragEndX - dragStartX;
const minSwipeDistance = 50;
if (Math.abs(swipeDistance) < minSwipeDistance) {
console.log('[DRAG KAKA] Movimento muito pequeno, ignorando');
return;
}
if (swipeDistance > 0) {
proximaKaka();
} else {
anteriorKaka();
}
};

img.addEventListener("mousedown", kakaMouseDown, false);

function proximaKaka() {
const novoIndex = (index + 1) % kakasDetectadas.length;
carregarKakaComFallback(novoIndex);
}

function anteriorKaka() {
const novoIndex = (index - 1 + kakasDetectadas.length) % kakasDetectadas.length;
carregarKakaComFallback(novoIndex);
}
}

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

const exibirToastClara = () => {
img.style.opacity = 1;
};

img.onload = exibirToastClara;

if (img.complete && img.naturalWidth > 0) exibirToastClara();

img.onerror = () => {
console.warn(`Imagem de ${year} não encontrada — substituindo por vilagermanica.jpg`);
img.src = `${GITHUB_BASE}/fotos/vilagermanica.jpg`;
img.style.opacity = 1;
};

}, 400);
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
secondLine.innerHTML = `<strong>1984 e ${currentYear} <span style="font-size: 20px;">🥨</span></strong>`;
} else if (context === "oktoberfest") {
firstLine.innerText = "Clara foi à Oktoberfest entre";
secondLine.innerHTML = `<strong>2017 e ${currentYear} <span style="font-size: 20px;">🥨</span></strong>`;
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
adicionarSwipes();

if (isDrawing) return;

const yearInput = document.getElementById("yearInput");
const year = parseInt(yearInput.value);
const img = limparListenersEClone();
const button = getElementSafe("drawButton");

if (!img || !button) return;

// ✅ Permite anos acima do atual (ex: 2026) - apenas mostra fallback
if (isNaN(year) || year < startYear) {
showModal("oktoberfest");
yearInput.value = "";
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

if (!toastClaraExibido) {
toastClaraExibido = true;
showToast('👈 Arraste para navegar entre as fotos 👉', 2500);
}
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

// ======== TOAST MESSAGE ========
function showToast(message, duration = 3000) {
let toast = document.getElementById('toast-message');
if (!toast) {
toast = document.createElement('div');
toast.id = 'toast-message';
toast.style.cssText = `
position: fixed;
bottom: 30%;
left: 50%;
transform: translateX(-50%);
background: rgba(3, 104, 126, 0.95);
color: white;
padding: 12px 20px;
border-radius: 30px;
font-size: 14px;
font-weight: 500;
z-index: 2000;
opacity: 0;
transition: opacity 0.3s ease;
white-space: nowrap;
box-shadow: 0 4px 15px rgba(0,0,0,0.2);
pointer-events: none;
font-family: "Roboto", sans-serif;
`;
document.body.appendChild(toast);
}

toast.textContent = message;
toast.style.opacity = '1';

setTimeout(() => {
toast.style.opacity = '0';
}, duration);
}

function mostrarCartazAno() {
    stopVideo();
    const input = getElementSafe("cartazInput");
    const img = limparListenersEClone();
    if (!input || !img) return;

    const year = parseInt(input.value);

    if (isNaN(year) || year < 1984) {
        showModal("cartaz");
        input.value = "";
        return;
    }

    const anoValido = (year >= 1984 && year <= currentYear) ? year : currentYear;

    img.style.opacity = 0;
    setTimeout(() => {
        img.alt = `Cartaz ${anoValido}`;

        img.onerror = () => {
            console.warn(`Cartaz ${anoValido} não encontrado`);
            img.onerror = null;
            img.src = `${GITHUB_BASE}/fotos/vilagermanica.jpg`;
            img.alt = `Cartaz ${year} - Upload pendente`;
            img.style.opacity = 1;
        };

        img.onload = () => { img.style.opacity = 1; };
        img.src = `${GITHUB_BASE}/cartazes/cartaz${anoValido}.jpg`;
        input.value = "";

        if (!toastCartazesExibido) {
            toastCartazesExibido = true;
            showToast('👈 Arraste para navegar entre os cartazes 👉', 2500);
        }

        configurarSwipesCartazEspecifico(img, anoValido);
    }, 400);
}

// 🔥 FUNÇÃO CORRIGIDA: Configura swipes com LOOP INFINITO para cartazes
function configurarSwipesCartazEspecifico(img, yearInicial) {
  removerSwipes();

  const fadeDuration = 500;
  let isCartazSwiping = false;

  const cartazesDisponiveis = [];
  for (let ano = 1984; ano <= currentYear; ano++) {
    cartazesDisponiveis.push(ano);
  }

  let indexAtual = cartazesDisponiveis.indexOf(yearInicial);
  if (indexAtual === -1) {
    indexAtual = cartazesDisponiveis.length - 1;
  }

  function carregarCartazComFallback(ano) {
    if (isCartazSwiping) return;
    isCartazSwiping = true;

    img.style.opacity = 0;
    setTimeout(() => {
      img.src = `${GITHUB_BASE}/cartazes/cartaz${ano}.jpg`;
      img.alt = `Cartaz ${ano}`;

      img.onerror = () => {
        img.src = `${GITHUB_BASE}/fotos/vilagermanica.jpg`;
        img.style.opacity = 1;
      };

      img.onload = () => { img.style.opacity = 1; };
      img.style.opacity = 1;

      setTimeout(() => { isCartazSwiping = false; }, fadeDuration);
    }, fadeDuration);
  }

  function proximoCartaz() {
    indexAtual = (indexAtual + 1) % cartazesDisponiveis.length;
    carregarCartazComFallback(cartazesDisponiveis[indexAtual]);
  }

  function anteriorCartaz() {
    indexAtual = (indexAtual - 1 + cartazesDisponiveis.length) % cartazesDisponiveis.length;
    carregarCartazComFallback(cartazesDisponiveis[indexAtual]);
  }

  let cartazStartX = 0;

  const cartazesTouchStart = (e) => {
    cartazStartX = e.changedTouches[0].screenX;
  };

  const cartazesTouchEnd = (e) => {
    if (isCartazSwiping) return;
    const cartazEndX = e.changedTouches[0].screenX;
    const swipeDistance = cartazEndX - cartazStartX;
    if (Math.abs(swipeDistance) < 50) return;
    if (swipeDistance > 0) {
      proximoCartaz();
    } else {
      anteriorCartaz();
    }
  };

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
    const swipeDistance = e.screenX - dragStartX;
    if (Math.abs(swipeDistance) < 50) return;
    if (swipeDistance > 0) {
      proximoCartaz();
    } else {
      anteriorCartaz();
    }
  };

  img.addEventListener("touchstart", cartazesTouchStart, { passive: true });
  img.addEventListener("touchend", cartazesTouchEnd, { passive: true });
  img.addEventListener("mousedown", cartazesMouseDown, false);
  img.addEventListener("mouseup", cartazesMouseUp, false);
  img.addEventListener("mouseleave", cartazesMouseUp, false);
}

// 🚀 INICIALIZAR A APLICAÇÃO QUANDO O DOM ESTIVER PRONTO
document.addEventListener('DOMContentLoaded', initializeApp);
