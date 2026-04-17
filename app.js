// ======== CONFIGURAÇÃO DE CAMINHOS ========
const GITHUB_BASE = 'https://joaubaron.github.io/oktoberfest-media';
let manifestsLoaded = false;

// ======== VARIÁVEIS GLOBAIS ========
let loopFoto2007 = null;
let backgroundMusic = null;
let touchStartX = 0;
let touchEndX = 0;
let currentYearIndex = 0;
let allYears = [];
let interval = null;
let isDrawing = false;
let isSwiping = false;

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
let musicReady = false;
let userInteracted = false;

// VARIÁVEIS DE VÍDEO
let videoList = [];
let currentVideoIndex = 0;
let videoTouchStartX = 0;
let isVideoSwiping = false;

// VARIÁVEIS KAKA (Cláudia & Augusto)
let kakaPhotoList = [];  // ← ADICIONAR ESTA LINHA

// FLAGS DE TOAST
let toastClaraExibido = false;
let toastVideoExibido = false;
let toastCartazesExibido = false;
let cartazYearsList = [];

// ======== CONFIGURAÇÃO DE ANOS E FOTOS ========
const startYear = 2017;
const currentYear = new Date().getFullYear();
const photos = {};
for (let year = startYear; year <= currentYear; year++) {
photos[year] = `${GITHUB_BASE}/fotos/oktoberfest${year}.jpg`;
}

// ======== DETECÇÃO AUTOMÁTICA DE ANOS (FOTOS CLARA) ========
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
const years = [];
for (let year = startYear; year <= currentYear; year++) {
years.push(year);
}
const results = await Promise.all(years.map(async (year) => {
const exists = await checkYearExists(year);
return { year, exists };
}));
results.forEach(({ year, exists }) => {
if (exists) {
allYears.push(year.toString());
if (!photos[year]) {
photos[year] = `${GITHUB_BASE}/fotos/oktoberfest${year}.jpg`;
}
}
});
allYears.sort((a, b) => parseInt(a) - parseInt(b));
currentYearIndex = allYears.indexOf(currentYear.toString());
if (currentYearIndex === -1 && allYears.length > 0) {
currentYearIndex = allYears.length - 1;
}
console.log(`📸 ${allYears.length} anos com fotos detectados`);
}

// ======== DETECÇÃO DE ANOS COM CARTAZ ========
async function detectCartazYearExists(year) {
return new Promise((resolve) => {
const img = new Image();
img.onload = () => resolve(true);
img.onerror = () => resolve(false);
img.src = `${GITHUB_BASE}/cartazes/cartaz${year}.jpg`;
setTimeout(() => resolve(false), 3000);
});
}

async function loadCartazYears() {
cartazYearsList = [];
const years = [];
for (let year = 1984; year <= currentYear; year++) {
years.push(year);
}
const results = await Promise.all(years.map(async (year) => {
const exists = await detectCartazYearExists(year);
return { year, exists };
}));
results.forEach(({ year, exists }) => {
if (exists) cartazYearsList.push(year);
});
cartazYearsList.sort((a, b) => a - b);
console.log(`📆 ${cartazYearsList.length} anos com cartaz detectados`);
}

// ======== SISTEMA DE MÚSICA ========
async function loadMusicList() {
try {
const response = await fetch('https://joaubaron.github.io/oktoberfest-media/musicas/song_list.json');
const data = await response.json();
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
if (musicList.length === 0) return;
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
const musicButton = document.getElementById('musicButton');
if (musicButton) {
musicButton.innerHTML = '🎵🎶';
musicButton.title = `Tocando: ${music.nome}`;
}
}

function handleMusicButtonClick() {
playRandomMusic();
}

async function setupMusic() {
const audio = document.getElementById('backgroundMusic');
if (!audio) return;
audio.volume = 0.5;
audio.addEventListener('ended', playRandomMusic);
const musicButton = document.getElementById('musicButton');
if (musicButton) {
musicButton.addEventListener('click', handleMusicButtonClick);
}
const onFirstInteraction = () => {
userInteracted = true;
if (musicReady) {
playRandomMusic();
}
};
document.addEventListener('touchstart', onFirstInteraction, { once: true });
document.addEventListener('click', onFirstInteraction, { once: true });
await loadMusicList();
musicReady = true;
if (userInteracted) {
playRandomMusic();
}
}

// ======== FUNÇÕES DE VÍDEO ========
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
if (audio) audio.muted = true;
if (loopFoto2007) {
clearTimeout(loopFoto2007);
loopFoto2007 = null;
}
if (videoList.length > 0) {
currentVideoIndex = Math.floor(Math.random() * videoList.length);
} else {
currentVideoIndex = 0;
}
carregarVideo(currentVideoIndex);
imageContainer.style.visibility = "hidden";
videoContainer.style.display = "flex";
updateVideoPositionAndSize();
configurarSwipeVideo(video);
if (!toastVideoExibido && videoList.length > 1) {
toastVideoExibido = true;
showToast('👈 Arraste para navegar entre os vídeos 👉', 2500);
}
video.onended = function() {
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
const videoUrl = videoList.length > 0 ? videoList[index] : `${GITHUB_BASE}/videos/clara1.mp4`;
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
video.removeEventListener('touchstart', videoTouchStart);
video.removeEventListener('touchend', videoTouchEnd);
video.pause();
video.currentTime = 0;
videoContainer.style.display = "none";
imageContainer.style.visibility = "visible";
videoContainer.style.top = '0';
videoContainer.style.left = '0';
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
video.style.objectFit = "cover";
}
}

// ======== FUNÇÃO COMPLETA: CARREGAR MANIFESTOS (RÁPIDO) ========
async function loadManifests() {
  console.log('📦 Carregando manifestos de assets...');
  
  try {
    // Carregar todos os manifestos em paralelo (incluindo datas da Oktoberfest)
    const [claraYearsRes, cartazYearsRes, videosRes, kakaRes, oktoberfestDatasRes] = await Promise.all([
      fetch('./manifestos/clara-years.json').catch(() => null),
      fetch('./manifestos/cartaz-years.json').catch(() => null),
      fetch('./manifestos/videos.json').catch(() => null),
      fetch('./manifestos/kaka-photos.json').catch(() => null),
      fetch('./manifestos/oktoberfest-datas.json').catch(() => null)  // ← NOVO: datas oficiais
    ]);
    
    // Verificar se os manifestos essenciais foram carregados
    if (!claraYearsRes || !cartazYearsRes || !videosRes) {
      throw new Error('Falha ao carregar manifestos essenciais');
    }
    
    // Parse dos JSONs
    const claraYears = await claraYearsRes.json();
    const cartazYears = await cartazYearsRes.json();
    const videos = await videosRes.json();
    const kakaPhotos = kakaRes ? await kakaRes.json() : [];
    
    // Parse do manifesto de datas (se disponível)
    let oktoberfestDatas = {};
    if (oktoberfestDatasRes && oktoberfestDatasRes.ok) {
      oktoberfestDatas = await oktoberfestDatasRes.json();
      console.log(`📅 Datas oficiais da Oktoberfest carregadas para ${Object.keys(oktoberfestDatas).length} anos`);
    } else {
      console.warn('⚠️ Manifesto de datas não encontrado. Usando fallback sem data exata.');
    }
    
    // Atualizar variáveis globais
    allYears = claraYears.map(String);
    cartazYearsList = cartazYears;
    videoList = videos.map(video => `${GITHUB_BASE}/videos/${video}`);
    kakaPhotoList = kakaPhotos.map(photo => `${GITHUB_BASE}/kaka/${photo}`);
    
    manifestsLoaded = true;
    
    console.log(`✅ Manifestos carregados com sucesso!`);
    console.log(`  📸 ${allYears.length} anos com fotos da Clara`);
    console.log(`  📆 ${cartazYearsList.length} anos com cartazes`);
    console.log(`  🎬 ${videoList.length} vídeos disponíveis`);
    console.log(`  👫 ${kakaPhotoList.length} fotos de Cláudia & Augusto`);
    
    // Atualizar placeholders dos inputs
    if (allYears.length > 0) {
      const yearInput = document.getElementById('yearInput');
      if (yearInput) {
        yearInput.min = Math.min(...allYears);
        yearInput.max = Math.max(...allYears);
        yearInput.placeholder = `💞 Clara entre ${Math.min(...allYears)} e ${Math.max(...allYears)}`;
      }
    }
    
    if (cartazYearsList.length > 0) {
      const cartazInput = document.getElementById('cartazInput');
      if (cartazInput) {
        cartazInput.min = Math.min(...cartazYearsList);
        cartazInput.max = Math.max(...cartazYearsList);
        cartazInput.placeholder = `🥨 Cartazes entre ${Math.min(...cartazYearsList)} e ${Math.max(...cartazYearsList)}`;
      }
    }
    
    // ← NOVO: Criar o contador flutuante com as datas oficiais
    criarContadorFlutuante(oktoberfestDatas);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao carregar manifestos:', error);
    console.log('⚠️ Usando modo de detecção gradual (fallback)');
    
    // FALLBACK: Usar as funções originais lentas
    await Promise.all([
      initializeYearsWithDetection(),
      loadCartazYears(),
      loadVideoList()
    ]);
    
    // Fallback para o contador (sem data exata)
    criarContadorFlutuante(null);
    
    return false;
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
removerSwipes();
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

// ======== SWIPE E NAVEGAÇÃO ========
function handleTouchStart(e) {
touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
touchEndX = e.changedTouches[0].screenX;
handleSwipe();
}

function handleMouseDown(e) {
e.preventDefault();
touchStartX = e.screenX;
document.addEventListener('mouseup', handleMouseUp, { once: true });
}

function handleMouseUp(e) {
touchEndX = e.screenX;
handleSwipe();
document.removeEventListener('mouseup', handleMouseUp);
}

function handleSwipe() {
if (isSwiping) return;
const minSwipeDistance = 50;
const swipeDistance = touchEndX - touchStartX;
if (Math.abs(swipeDistance) < minSwipeDistance) return;
isSwiping = true;
if (swipeDistance > 0) {
nextYear();
} else {
prevYear();
}
setTimeout(() => { isSwiping = false; }, 500);
}

function navigateToYear(year) {
stopVideo();
if (loopFoto2007) {
clearTimeout(loopFoto2007);
loopFoto2007 = null;
}
const img = getElementSafe("photo");
if (!img) return;
adicionarSwipes();
const yearIndex = allYears.indexOf(year.toString());
if (yearIndex !== -1) {
currentYearIndex = yearIndex;
}
img.style.opacity = 0;
setTimeout(() => {
img.src = photos[year];
img.alt = `Oktoberfest ${year}`;
const exibirToastClara = () => { img.style.opacity = 1; };
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

// ======== FOTOS KAKA (Cláudia & Augusto) - VERSÃO RÁPIDA COM MANIFESTO ========
function mostrarFoto2007() {
  stopVideo();
  const img = limparListenersEClone();
  if (!img) return;
  removerSwipes();
  
  const fadeDuration = 500;
  let index = 0;
  let isKakaSwiping = false;
  
  // Usar o manifesto se disponível
  let kakasDetectadas = [];
  
  if (kakaPhotoList.length > 0) {
    // Usa o manifesto (RÁPIDO)
    kakasDetectadas = kakaPhotoList;
    console.log(`🎯 ${kakasDetectadas.length} imagens kaka detectadas (via manifesto)`);
    iniciarComImagens(kakasDetectadas);
  } else {
    // Fallback: detecção lenta original
    console.log('⚠️ Manifesto kaka não disponível, usando detecção lenta...');
    detectarTodasImagensKaka(iniciarComImagens);
  }
  
  function carregarKakaComFallback(novoIndex) {
    if (isKakaSwiping) return;
    if (novoIndex < 0 || novoIndex >= kakasDetectadas.length) return;
    
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
      
      if (!toastClaraExibido && kakasDetectadas.length > 1) {
        toastClaraExibido = true;
        showToast('👈 Arraste para navegar entre as fotos 👉', 2500);
      }
      
      setTimeout(() => { isKakaSwiping = false; }, fadeDuration);
    }, fadeDuration);
  }
  
  function proximaKaka() {
    const novoIndex = (index + 1) % kakasDetectadas.length;
    carregarKakaComFallback(novoIndex);
  }
  
  function anteriorKaka() {
    const novoIndex = (index - 1 + kakasDetectadas.length) % kakasDetectadas.length;
    carregarKakaComFallback(novoIndex);
  }
  
  function configurarSwipesKaka() {
    let kakaStartX = 0;
    
    const kakaTouchStart = (e) => { kakaStartX = e.changedTouches[0].screenX; };
    const kakaTouchEnd = (e) => {
      if (isKakaSwiping) return;
      const kakaEndX = e.changedTouches[0].screenX;
      const swipeDistance = kakaEndX - kakaStartX;
      if (Math.abs(swipeDistance) < 50) return;
      if (swipeDistance > 0) { proximaKaka(); } else { anteriorKaka(); }
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
    
    const kakaMouseMove = (e) => { if (!isDragging) return; };
    
    const kakaMouseUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      img.removeEventListener('mousemove', kakaMouseMove);
      if (isKakaSwiping) return;
      const dragEndX = e.screenX;
      const swipeDistance = dragEndX - dragStartX;
      if (Math.abs(swipeDistance) < 50) return;
      if (swipeDistance > 0) { proximaKaka(); } else { anteriorKaka(); }
    };
    
    img.addEventListener("mousedown", kakaMouseDown, false);
    img.addEventListener("mouseup", kakaMouseUp, false);
    img.addEventListener("mouseleave", kakaMouseUp, false);
  }
  
  function iniciarComImagens(imagensCarregadas) {
    if (imagensCarregadas.length === 0) {
      console.warn("Nenhuma imagem encontrada na pasta kaka");
      img.src = `${GITHUB_BASE}/fotos/oktoberfest.png`;
      return;
    }
    kakasDetectadas = imagensCarregadas;
    carregarKakaComFallback(0);
    configurarSwipesKaka();
  }
  
  // Função de fallback (detecção lenta)
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
img.onerror = () => {
console.warn(`Foto Clara ${year} não encontrada`);
img.src = `${GITHUB_BASE}/fotos/vilagermanica.jpg`;
img.alt = `Oktoberfest ${year} - Upload pendente`;
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

// ======== FUNÇÕES CARTAZES (CORRIGIDAS) ========
async function mostrarCartazAno() {
stopVideo();
const input = getElementSafe("cartazInput");
const img = limparListenersEClone();
if (!input || !img) return;
const year = parseInt(input.value);
input.value = "";

if (isNaN(year) || year < 1984) {
showModal("cartaz");
return;
}

if (cartazYearsList.length === 0) {
await loadCartazYears();
}

// Verifica se o ano digitado existe
const yearExists = cartazYearsList.includes(year);

img.style.opacity = 0;

if (yearExists) {
// Ano existe: carrega o cartaz
img.onerror = () => {
console.warn(`Cartaz ${year} não encontrado – usando fallback`);
img.src = `${GITHUB_BASE}/fotos/vilagermanica.jpg`;
img.alt = `Cartaz ${year} (fallback)`;
img.style.opacity = 1;
};
img.onload = () => { img.style.opacity = 1; };
img.src = `${GITHUB_BASE}/cartazes/cartaz${year}.jpg`;
img.alt = `Cartaz ${year}`;
if (img.complete && img.naturalWidth > 0) {
img.style.opacity = 1;
}
} else {
// Ano NÃO existe: mostra fallback fixo (sem pular)
img.onerror = null;
img.onload = () => { img.style.opacity = 1; };
img.src = `${GITHUB_BASE}/fotos/vilagermanica.jpg`;
img.alt = `Cartaz ${year} (não disponível)`;
img.style.opacity = 1;
}

if (!toastCartazesExibido) {
toastCartazesExibido = true;
showToast('👈 Arraste para navegar entre os cartazes 👉', 2500);
}

// Chama a função original (com nome mantido) passando o ano e se é fallback
configurarSwipesCartazExistente(img, year, !cartazYearsList.includes(year));
}

function configurarSwipesCartazExistente(img, startYear, isFallbackMode) {
removerSwipes();
const fadeDuration = 500;
let isCartazSwiping = false;

// Se for fallback, índice inicial = -1 (modo neutro)
let currentIndex = isFallbackMode ? -1 : cartazYearsList.indexOf(startYear);

// Garante índice válido se não for fallback mas algo deu errado
if (currentIndex === -1 && !isFallbackMode && cartazYearsList.length > 0) {
currentIndex = cartazYearsList.length - 1;
}

function carregarCartazPorIndice(idx) {
if (isCartazSwiping) return;
if (idx < 0 || idx >= cartazYearsList.length) return;

isCartazSwiping = true;
const ano = cartazYearsList[idx];

img.style.opacity = 0;
setTimeout(() => {
img.onerror = () => {
img.src = `${GITHUB_BASE}/fotos/vilagermanica.jpg`;
img.alt = `Cartaz ${ano} (fallback)`;
img.style.opacity = 1;
};
img.onload = () => { img.style.opacity = 1; };
img.src = `${GITHUB_BASE}/cartazes/cartaz${ano}.jpg`;
img.alt = `Cartaz ${ano}`;
setTimeout(() => { isCartazSwiping = false; }, fadeDuration);
}, fadeDuration);
}

function proximoCartaz() {
if (cartazYearsList.length === 0) return;
if (currentIndex === -1) {
currentIndex = 0;  // Fallback → primeiro cartaz real
} else {
currentIndex = (currentIndex + 1) % cartazYearsList.length;
}
carregarCartazPorIndice(currentIndex);
}

function anteriorCartaz() {
if (cartazYearsList.length === 0) return;
if (currentIndex === -1) {
currentIndex = cartazYearsList.length - 1;  // Fallback → último cartaz real
} else {
currentIndex = (currentIndex - 1 + cartazYearsList.length) % cartazYearsList.length;
}
carregarCartazPorIndice(currentIndex);
}

let startX = 0;
const touchStart = (e) => { startX = e.changedTouches[0].screenX; };
const touchEnd = (e) => {
if (isCartazSwiping) return;
const delta = e.changedTouches[0].screenX - startX;
if (Math.abs(delta) < 50) return;
if (delta > 0) proximoCartaz();
else anteriorCartaz();
};

let isDragging = false;
let dragStartX = 0;
const mouseDown = (e) => {
e.preventDefault();
isDragging = true;
dragStartX = e.screenX;
};
const mouseUp = (e) => {
if (!isDragging) return;
isDragging = false;
if (isCartazSwiping) return;
const delta = e.screenX - dragStartX;
if (Math.abs(delta) < 50) return;
if (delta > 0) proximoCartaz();
else anteriorCartaz();
};

img.removeEventListener("touchstart", touchStart);
img.removeEventListener("touchend", touchEnd);
img.removeEventListener("mousedown", mouseDown);
img.removeEventListener("mouseup", mouseUp);
img.removeEventListener("mouseleave", mouseUp);

img.addEventListener("touchstart", touchStart, { passive: true });
img.addEventListener("touchend", touchEnd, { passive: true });
img.addEventListener("mousedown", mouseDown, false);
img.addEventListener("mouseup", mouseUp, false);
img.addEventListener("mouseleave", mouseUp, false);

// Se não for fallback, carrega o cartaz do ano inicial
if (!isFallbackMode && currentIndex !== -1) {
carregarCartazPorIndice(currentIndex);
}
}

// ======== FOGOS DE ARTIFÍCIO ========
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
// Fade out do canvas ao terminar
if (canvas) {
canvas.style.transition = 'opacity 0.8s ease';
canvas.style.opacity = '0';
setTimeout(() => { ctx.clearRect(0, 0, w, h); }, 800);
} else {
ctx.clearRect(0, 0, w, h);
}
animationId = null;
}
}

function startFireworks() {
    if (!ctx) return;
    if (animationId) { cancelAnimationFrame(animationId); particles = []; }

    // Fade in do canvas
    if (canvas) {
        canvas.style.transition = 'opacity 0.6s ease';
        canvas.style.opacity = '0';
        requestAnimationFrame(() => { canvas.style.opacity = '1'; });
    }

    // 8 explosões a cada 250ms = 2 segundos exatos
    for (let i = 0; i < 8; i++) {  // ← MUDOU DE 12 PARA 8
        setTimeout(() => {
            createFirework(random(w * 0.2, w * 0.8), random(h * 0.2, h * 0.6));
            if (i === 0) animateFireworks();
        }, i * 250);  // ← MANTEVE 250ms
    }
}

// ======== RESET ========
function resetApp() {
console.log('[APP] Resetando com fogos...');
stopVideo();
if (loopFoto2007) {
clearTimeout(loopFoto2007);
loopFoto2007 = null;
}
clearInterval(interval);
interval = null;
isDrawing = false;
isSwiping = false;

// Remover qualquer swipe ativo
removerSwipes();

// CARREGAR IMAGEM INICIAL ANTES DOS FOGOS
const img = getElementSafe("photo");
if (img) {
img.style.opacity = 0;
setTimeout(() => {
img.src = "fotos/oktoberfest.png";
img.alt = "Foto da Oktoberfest";
img.style.opacity = 1;
}, 100);
}

// Fogos (3 segundos) - agora sobre a imagem oktoberfest.png
startFireworks();

// Resetar variáveis
particles = [];
if (animationId) {
cancelAnimationFrame(animationId);
animationId = null;
if (ctx) {
ctx.clearRect(0, 0, w, h);
}
}

const resetButton = getElementSafe("resetButton");
if (resetButton) {
resetButton.innerHTML = 'Atualizando';
resetButton.style.background = '#D8B115';
resetButton.disabled = true;
}

// Fade out do áudio antes do reload
const audioEl = document.getElementById('backgroundMusic');
if (audioEl && !audioEl.paused) {
const fadeAudio = setInterval(() => {
if (audioEl.volume > 0.05) {
audioEl.volume = Math.max(0, audioEl.volume - 0.05);
} else {
audioEl.volume = 0;
audioEl.pause();
clearInterval(fadeAudio);
}
}, 100);
}

// RELOAD após 3 segundos
setTimeout(() => { window.location.reload(true); }, 3000);
}

// ======== TOAST ========
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
setTimeout(() => { toast.style.opacity = '0'; }, duration);
}

// ======== UI ELEMENTOS ========
function setupUIElements() {
const anoVigente = getElementSafe("anoVigente");
if (anoVigente) anoVigente.textContent = currentYear;
const modalYear = getElementSafe("modalYear");
if (modalYear) modalYear.textContent = currentYear;
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
window.addEventListener('resize', updateVideoPositionAndSize);
}

function setupLazyLoading() {
if ('IntersectionObserver' in window) {
const lazyImageObserver = new IntersectionObserver((entries, observer) => {
entries.forEach(entry => {
if (entry.isIntersecting) {
const img = entry.target;
if (img.dataset.src) {
img.src = img.dataset.src;
img.classList.remove('lazy');
img.classList.add('lazy-loaded');
}
lazyImageObserver.unobserve(img);
}
});
});
const currentYearIdx = allYears.indexOf(currentYear.toString());
const yearsToPreload = allYears.slice(currentYearIdx, currentYearIdx + 3);
yearsToPreload.forEach(year => {
const img = new Image();
img.dataset.src = photos[year];
lazyImageObserver.observe(img);
});
for (let y = currentYear - 2; y <= currentYear; y++) {
const img = new Image();
img.dataset.src = `${GITHUB_BASE}/cartazes/cartaz${y}.jpg`;
lazyImageObserver.observe(img);
}
}
}

// ======== INICIALIZAÇÃO PRINCIPAL ========
async function initializeApp() {
  console.log('🚀 Inicializando aplicação...');
  
  setupUIElements();
  
  const isRealLocalhost = (window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1') && !window.cordova;
  
  if ('serviceWorker' in navigator && !isRealLocalhost) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('[SW] Falha ao registrar:', err));
    navigator.serviceWorker.addEventListener('controllerchange', () => { window.location.reload(); });
  }
  
  setupEventListeners();
  setupCanvasAndFireworks();
  setupLazyLoading();
  
  await loadManifests();  // ← Carrega tudo rapidamente
  await setupMusic();
  
  console.log('✅ Aplicação inicializada com sucesso!');
}

window.addEventListener("resize", () => {
w = window.innerWidth;
h = window.innerHeight;
if (canvas) {
canvas.width = w;
canvas.height = h;
}
updateVideoPositionAndSize();
});

document.addEventListener('DOMContentLoaded', initializeApp);

// ======== NOVA FUNÇÃO: CONTADOR FLUTUANTE ARRASTÁVEL ========
function criarContadorFlutuante(datasManifesto) {
  // 1. Remove um contador antigo, se existir
  const contadorExistente = document.getElementById('floating-counter');
  if (contadorExistente) contadorExistente.remove();

  // 2. Cria o elemento HTML do contador
  const counterDiv = document.createElement('div');
  counterDiv.id = 'floating-counter';
  counterDiv.innerHTML = `
    <div class="counter-content">
      <span class="counter-label">🍺 Oktoberfest 2026</span>
      <span class="counter-days">--</span>
      <span class="counter-label">dias</span>
    </div>
    <div class="drag-handle">⋮⋮</div>
  `;
  document.body.appendChild(counterDiv);

  // 3. Função para atualizar o texto do contador
  const atualizarTexto = (texto, isDias = false) => {
    const daysSpan = counterDiv.querySelector('.counter-days');
    if (daysSpan) {
      daysSpan.innerHTML = texto;
      if (isDias) daysSpan.style.fontSize = '1.4rem';
      else daysSpan.style.fontSize = '0.8rem';
    }
  };

  // 4. Lógica de cálculo dos dias (usando o manifesto ou fallback)
  const anoAlvo = 2026;
  let dataInicio = null;

  if (datasManifesto && datasManifesto[anoAlvo] && datasManifesto[anoAlvo].inicio) {
    dataInicio = new Date(datasManifesto[anoAlvo].inicio + 'T00:00:00');
    if (isNaN(dataInicio)) dataInicio = null;
  }

  if (dataInicio) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diffTime = dataInicio - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      atualizarTexto(diffDays, true);
      counterDiv.querySelector('.counter-label').innerHTML = `🍺 Faltam para a Oktoberfest ${anoAlvo}`;
    } else if (diffDays === 0) {
      atualizarTexto("É HOJE!", true);
      counterDiv.style.background = "#c19e10";
    } else {
      atualizarTexto("JÁ ACABOU", true);
      counterDiv.style.background = "#555";
    }
  } else {
    // Fallback elegante: mostra o mês
    atualizarTexto("em outubro", false);
    counterDiv.querySelector('.counter-label').innerHTML = `🍺 Oktoberfest ${anoAlvo}`;
    counterDiv.style.background = "#03687e";
    console.log("📅 Usando fallback: data exata não disponível no manifesto.");
  }

  // 5. Tornar o elemento arrastável com toque e mouse
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const dragHandle = counterDiv.querySelector('.drag-handle');
  
  const dragMouseDown = (e) => {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  };

  const dragTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    pos3 = touch.clientX;
    pos4 = touch.clientY;
    document.ontouchend = closeDragElement;
    document.ontouchmove = elementDragTouch;
  };

  const elementDrag = (e) => {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    const newTop = (counterDiv.offsetTop - pos2);
    const newLeft = (counterDiv.offsetLeft - pos1);
    if (newTop >= 0 && newTop <= window.innerHeight - counterDiv.offsetHeight) counterDiv.style.top = newTop + "px";
    if (newLeft >= 0 && newLeft <= window.innerWidth - counterDiv.offsetWidth) counterDiv.style.left = newLeft + "px";
  };

  const elementDragTouch = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    pos1 = pos3 - touch.clientX;
    pos2 = pos4 - touch.clientY;
    pos3 = touch.clientX;
    pos4 = touch.clientY;
    const newTop = (counterDiv.offsetTop - pos2);
    const newLeft = (counterDiv.offsetLeft - pos1);
    if (newTop >= 0 && newTop <= window.innerHeight - counterDiv.offsetHeight) counterDiv.style.top = newTop + "px";
    if (newLeft >= 0 && newLeft <= window.innerWidth - counterDiv.offsetWidth) counterDiv.style.left = newLeft + "px";
  };

  const closeDragElement = () => {
    document.onmouseup = null;
    document.onmousemove = null;
    document.ontouchend = null;
    document.ontouchmove = null;
  };

  dragHandle.onmousedown = dragMouseDown;
  dragHandle.ontouchstart = dragTouchStart;
  
  // Evita que o contador atrapalhe os swipes nas fotos
  counterDiv.addEventListener('touchstart', (e) => e.stopPropagation());
  counterDiv.addEventListener('touchend', (e) => e.stopPropagation());
}
