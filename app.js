// ======== VARIÁVEIS GLOBAIS ========
let loopFoto2007 = null;
let backgroundMusic = null;
let musicHistory = [];
let availableSongs = [];
let touchStartX = 0;
let touchEndX = 0;
let currentYearIndex = 0;
let allYears = [];
let interval = null;
let isDrawing = false;
let isVideoPlaying = false; // NOVA VARIÁVEL PARA CONTROLAR ESTADO DO VÍDEO

// ======== CONFIGURAÇÃO DE CACHE OFFLINE ========
const CACHE_NAME = 'oktoberfest-cache-v1';

// ======== CONFIGURAÇÃO DE ANOS E FOTOS ========
const startYear = 2017;
const currentYear = new Date().getFullYear();
const photos = {};
for (let year = startYear; year <= currentYear; year++) {
    photos[year] = `fotos/oktoberfest${year}.jpg`;
}

// ======== SERVICE WORKER OFFLINE ========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registrado com sucesso: ', registration.scope);
            })
            .catch(function(error) {
                console.log('ServiceWorker registro falhou: ', error);
            });
    });
}

// ======== FUNÇÕES DE CACHE OFFLINE ========
async function cacheMedia(url) {
    try {
        if (isMediaUrl(url)) {
            const cache = await caches.open(CACHE_NAME);
            const response = await fetch(url);
            if (response.status === 200) {
                await cache.put(url, response);
                console.log('✅ Mídia em cache:', getFileName(url));
            }
        }
    } catch (error) {
        console.log('❌ Erro ao cachear:', getFileName(url), error);
    }
}

function isMediaUrl(url) {
    return url.includes('/fotos/') || 
           url.includes('/cartazes/') || 
           url.includes('/videos/') || 
           url.includes('.mp3') || 
           url.includes('clara.mp4');
}

function getFileName(url) {
    return url.split('/').pop();
}

function setupMediaCaching() {
    const originalImage = window.Image;
    window.Image = function() {
        const img = new originalImage();
        const originalSrc = Object.getOwnPropertyDescriptor(originalImage.prototype, 'src');
        
        Object.defineProperty(img, 'src', {
            get: function() { return originalSrc.get.call(this); },
            set: function(value) {
                if (value && isMediaUrl(value)) {
                    cacheMedia(value);
                }
                originalSrc.set.call(this, value);
            }
        });
        return img;
    };

    const originalAudio = window.Audio;
    window.Audio = function() {
        const audio = new originalAudio();
        const originalSrc = Object.getOwnPropertyDescriptor(originalAudio.prototype, 'src');
        
        Object.defineProperty(audio, 'src', {
            get: function() { return originalSrc.get.call(this); },
            set: function(value) {
                if (value && isMediaUrl(value)) {
                    cacheMedia(value);
                }
                originalSrc.set.call(this, value);
            }
        });
        return audio;
    };
}

async function preloadEssentialContent() {
    if (!navigator.onLine) return;
    
    try {
        console.log('🔄 Pré-carregando conteúdo essencial...');
        
        const yearsToPreload = [currentYear, currentYear - 1, startYear];
        for (const year of yearsToPreload) {
            if (photos[year]) {
                await cacheMedia(photos[year]);
            }
        }
        
        const songs = ["Anneliese.mp3", "Donnawedda.mp3", "Imogdiso.mp3", "Kanguru.mp3"];
        for (const song of songs) {
            await cacheMedia(song);
        }
        
        await cacheMedia(`cartazes/cartaz${currentYear}.jpg`);
        await cacheMedia('videos/clara.mp4');
        
        console.log('✅ Conteúdo essencial pré-carregado!');
    } catch (error) {
        console.log('❌ Erro no pré-carregamento:', error);
    }
}

// ======== VERIFICAÇÃO DE STATUS OFFLINE ========
function setupOfflineStatus() {
    const updateStatus = () => {
        const statusElement = document.getElementById('offlineStatus');
        if (statusElement) {
            if (navigator.onLine) {
                statusElement.innerHTML = '🟢 Online';
                statusElement.style.color = '#00aa00';
            } else {
                statusElement.innerHTML = '🔴 Offline';
                statusElement.style.color = '#ff4444';
            }
        }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
}

// ======== INICIALIZAÇÃO ========
document.addEventListener("DOMContentLoaded", function() {
    initializeApp();
});

function initializeApp() {
    initializeYears();
    setupUIElements();
    setupEventListeners();
    setupMusic();
    setupMediaCaching();
    setupOfflineStatus();
    preloadMedia();
    setTimeout(preloadEssentialContent, 2000);
}

function initializeYears() {
    allYears = Object.keys(photos).sort((a, b) => parseInt(a) - parseInt(b));
    currentYearIndex = allYears.indexOf(currentYear.toString());
}

function setupUIElements() {
    const anoVigente = getElementSafe("anoVigente");
    if (anoVigente) {
        anoVigente.textContent = currentYear;
    }

    const textYear = getElementSafe("textYear");
    if (textYear) {
        textYear.textContent = currentYear;
    }

    const modalYear = getElementSafe("modalYear");
    if (modalYear) {
        modalYear.textContent = currentYear;
    }

    const yearInput = getElementSafe("yearInput");
    if (yearInput) {
        yearInput.max = currentYear;
    }

    const cartazInput = getElementSafe("cartazInput");
    if (cartazInput) {
        cartazInput.max = currentYear;
    }
    
    if (!document.getElementById('offlineStatus')) {
        const statusElement = document.createElement('div');
        statusElement.id = 'offlineStatus';
        statusElement.style.cssText = 'font-size:10px; margin-top:5px; color:#00aa00;';
        statusElement.innerHTML = '🟢 Online';
        document.body.appendChild(statusElement);
    }
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

    const musicButton = getElementSafe("musicButton");
    if (musicButton) musicButton.addEventListener("click", changeMusic);

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
    if (modalButton) {
        modalButton.addEventListener("click", closeModal);
    }

    adicionarSwipes();
    window.addEventListener('resize', updateVideoPositionAndSize);
}

function setupMusic() {
    backgroundMusic = getElementSafe("backgroundMusic");
    if (backgroundMusic) {
        backgroundMusic.volume = 0.5;
        changeMusic();
        backgroundMusic.addEventListener('ended', changeMusic);
        
        backgroundMusic.addEventListener('canplay', function() {
            cacheMedia(backgroundMusic.src);
        });
    }
}

function preloadMedia() {
    Object.values(photos).forEach(src => {
        const img = new Image();
        img.onload = function() {
            cacheMedia(src);
        };
        img.src = src;
    });

    for (let y = 1984; y <= currentYear; y++) {
        const img = new Image();
        img.onload = function() {
            cacheMedia(`cartazes/cartaz${y}.jpg`);
        };
        img.src = `cartazes/cartaz${y}.jpg`;
    }
}

// ======== FUNÇÕES DE MÚSICA ========
function changeMusic() {
    const music = getElementSafe("backgroundMusic");
    if (!music) return;

    const songs = [
        "Anneliese.mp3",
        "Donnawedda.mp3", 
        "Imogdiso.mp3",
        "Kanguru.mp3"
    ];

    if (availableSongs.length === 0) {
        availableSongs = [...songs];
    }

    const currentSong = music.src.split('/').pop();
    const currentIndex = availableSongs.indexOf(currentSong);
    if (currentIndex > -1) {
        availableSongs.splice(currentIndex, 1);
    }
    
    if (currentSong && !musicHistory.includes(currentSong)) {
        musicHistory.push(currentSong);
    }

    if (availableSongs.length === 0) {
        availableSongs = [...songs];
        musicHistory = [];
        const newCurrentIndex = availableSongs.indexOf(currentSong);
        if (newCurrentIndex > -1) {
            availableSongs.splice(newCurrentIndex, 1);
        }
    }

    if (availableSongs.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        const nextSong = availableSongs[randomIndex];
        availableSongs.splice(randomIndex, 1);
        
        if (!musicHistory.includes(nextSong)) {
            musicHistory.push(nextSong);
        }

        music.src = nextSong;
        music.play().catch(error => {
            console.error("Erro ao trocar música:", error);
        });
        
        cacheMedia(nextSong);
    }
}

// ======== FUNÇÕES DE VÍDEO - CORRIGIDAS ========
function playVideo() {
    const videoContainer = getElementSafe("video-container");
    const video = getElementSafe("claraVideo");
    const imageContainer = getElementSafe("image-container");

    if (!videoContainer || !video || !imageContainer) return;

    // Pausar música de fundo
    if (backgroundMusic) {
        backgroundMusic.pause();
    }

    // Parar qualquer animação em andamento
    if (loopFoto2007) {
        clearTimeout(loopFoto2007);
        loopFoto2007 = null;
    }

    // Mostrar container do vídeo e esconder imagem
    imageContainer.style.visibility = "hidden";
    videoContainer.style.display = "flex";
    updateVideoPositionAndSize();

    // Configurar o vídeo
    video.currentTime = 0; // Reiniciar para o início
    video.controls = true; // Garantir que os controles estejam visíveis
    
    // Tentar reproduzir o vídeo
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            // Vídeo começou a tocar com sucesso
            isVideoPlaying = true;
            console.log("✅ Vídeo começou a tocar");
        }).catch(error => {
            // Autoplay foi bloqueado - mostrar controles para usuário iniciar manualmente
            console.log("❌ Autoplay bloqueado, mostrando controles:", error);
            video.controls = true;
            isVideoPlaying = false;
            
            // Mostrar mensagem para o usuário
            showVideoHelpMessage();
        });
    }

    // Evento quando o vídeo termina
    video.onended = function() {
        stopVideo();
    };
    
    // Cache do vídeo quando carregado
    video.addEventListener('canplay', function() {
        cacheMedia('videos/clara.mp4');
    });
}

function showVideoHelpMessage() {
    // Criar uma mensagem de ajuda temporária
    const helpMessage = document.createElement('div');
    helpMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 1002;
        font-size: 14px;
        text-align: center;
    `;
    helpMessage.innerHTML = 'Clique no botão play para iniciar o vídeo';
    document.body.appendChild(helpMessage);
    
    // Remover a mensagem após 3 segundos
    setTimeout(() => {
        if (document.body.contains(helpMessage)) {
            document.body.removeChild(helpMessage);
        }
    }, 3000);
}

function stopVideo() {
    const videoContainer = getElementSafe("video-container");
    const video = getElementSafe("claraVideo");
    const imageContainer = getElementSafe("image-container");

    if (!videoContainer || !video || !imageContainer) return;

    // Parar vídeo
    video.pause();
    video.currentTime = 0;
    isVideoPlaying = false;
    
    // Esconder container do vídeo e mostrar imagem
    videoContainer.style.display = "none";
    imageContainer.style.visibility = "visible";
    videoContainer.style.top = '0';
    videoContainer.style.left = '0';

    // Retomar música de fundo
    if (backgroundMusic) {
        backgroundMusic.play().catch(error => {
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

    photo.removeEventListener("touchstart", handleTouchStart, false);
    photo.removeEventListener("touchend", handleTouchEnd, false);
    photo.removeEventListener("mousedown", handleMouseDown, false);
}

// ... (o restante das funções permanece igual - mostrarFoto2007, handleTouchStart, handleTouchEnd, etc.)

// ======== SORTEIO ========
function startDraw() {
    stopVideo();
    if (loopFoto2007) {
        clearTimeout(loopFoto2007);
        loopFoto2007 = null;
    }

    if (isDrawing) return;

    const year = parseInt(document.getElementById("yearInput").value);
    const img = limparListenersEClone();
    const button = getElementSafe("drawButton");

    if (!img || !button) return;

    if (isNaN(year) || year < startYear || year > currentYear) {
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
                    img.src = photos[year];
                    img.alt = `Oktoberfest ${year} - Sorteado!`;
                    img.onerror = () => { img.src = "fotos/oktoberfest.png"; };

                    img.style.opacity = 1;
                    img.onerror = null;
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
const canvas = getElementSafe("fireworks");
let ctx = null;
let w = window.innerWidth;
let h = window.innerHeight;

if (canvas) {
    ctx = canvas.getContext("2d");
    canvas.width = w;
    canvas.height = h;
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

let particles = [];
let animationId = null;

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

// ======== RESET ========
function resetApp() {
    stopVideo();

    const currentImg = limparListenersEClone();
    if (currentImg) {
        currentImg.style.opacity = 0;
        setTimeout(() => {
            currentImg.src = "fotos/oktoberfest.png";
            currentImg.alt = "Foto da Oktoberfest";
            currentImg.style.opacity = 1;
        }, 100);
    }

    clearInterval(interval);
    interval = null;
    isDrawing = false;

    const drawButton = getElementSafe("drawButton");
    if (drawButton) {
        drawButton.disabled = false;
    }

    particles = [];
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
        if (ctx) {
            ctx.clearRect(0, 0, w, h);
        }
    }

    initializeYears();
}

// ======== CARTAZES ========
function mostrarCartazes() {
    stopVideo();
    const img = limparListenersEClone();
    if (!img) return;

    const fadeDuration = 500;
    let cartazAtual = 1984;
    const ultimoCartaz = currentYear;
    const totalCartazes = ultimoCartaz - 1984 + 1;
    const cartazes = Array.from({ length: totalCartazes }, (_, i) => 1984 + i);
    let index = 0;

    img.style.opacity = 0;
    setTimeout(() => {
        img.src = `cartazes/cartaz${cartazAtual}.jpg`;
        img.alt = `Cartaz ${cartazAtual}`;
        img.style.opacity = 1;
    }, fadeDuration);

    let startX = 0;

    const cartazesTouchStart = (e) => (startX = e.changedTouches[0].screenX);
    const cartazesTouchEnd = (e) => {
        const endX = e.changedTouches[0].screenX;
        if (endX < startX - 50) anteriorCartaz();
        if (endX > startX + 50) proximoCartaz();
    };

    img.addEventListener("touchstart", cartazesTouchStart, { passive: true });
    img.addEventListener("touchend", cartazesTouchEnd, { passive: true });

    function proximoCartaz() {
        img.style.opacity = 0;
        setTimeout(() => {
            index = (index + 1) % cartazes.length;
            cartazAtual = cartazes[index];
            img.src = `cartazes/cartaz${cartazAtual}.jpg`;
            img.alt = `Cartaz ${cartazAtual}`;
            img.style.opacity = 1;
        }, fadeDuration);
    }

    function anteriorCartaz() {
        img.style.opacity = 0;
        setTimeout(() => {
            index = (index - 1 + cartazes.length) % cartazes.length;
            cartazAtual = cartazes[index];
            img.src = `cartazes/cartaz${cartazAtual}.jpg`;
            img.alt = `Cartaz ${cartazAtual}`;
            img.style.opacity = 1;
        }, fadeDuration);
    }
}

function mostrarCartazAno() {
    stopVideo();
    const input = getElementSafe("cartazInput");
    const img = limparListenersEClone();
    if (!input || !img) return;

    const year = parseInt(input.value);

    if (isNaN(year) || year < 1984 || year > currentYear) {
        showModal("cartaz");
        return;
    }

    const fadeDuration = 400;
    img.style.opacity = 0;

    setTimeout(() => {
        img.src = `cartazes/cartaz${year}.jpg`;
        img.alt = `Cartaz ${year}`;
        img.style.opacity = 1;
        input.value = "";
    }, fadeDuration);
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
            firstLine.innerText = "Digite um ano entre";
            secondLine.innerHTML = `<strong>1984 e ${currentYear}! <span style="font-size: 20px;">🍺</span></strong>`;
        } else if (context === "oktoberfest") {
            firstLine.innerText = "Digite um ano entre";
            secondLine.innerHTML = `<strong>2017 e ${currentYear}! <span style="font-size: 20px;">🍺</span></strong>`;
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
