// ======== CONFIGURAÇÃO DE CAMINHOS ========
const GITHUB_BASE = 'https://joaubaron.github.io/oktoberfest-media';

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
let cacheManager = null; // Gerenciador de cache

// ======== CONFIGURAÇÃO DE ANOS E FOTOS ========
const startYear = 2017;
const currentYear = new Date().getFullYear();
const photos = {};
for (let year = startYear; year <= currentYear; year++) {
    photos[year] = `${GITHUB_BASE}/fotos/oktoberfest${year}.jpg`;
}

// ======== INICIALIZAÇÃO ========
document.addEventListener("DOMContentLoaded", function() {
    initializeApp();
});

async function initializeApp() {
    // Inicializa CacheManager
    if (window.CacheManager) {
        try {
            cacheManager = await window.CacheManager.init();
            console.log('✅ CacheManager inicializado');
            
            // Mostra estatísticas de cache
            const stats = await cacheManager.getCacheStats();
            console.log('📊 Cache Stats:', stats);
            console.log(`   Total: ${stats.total} arquivos (${formatBytes(stats.totalSize)})`);
            console.log(`   Fotos: ${stats.photos} | Cartazes: ${stats.posters}`);
            console.log(`   Vídeos: ${stats.videos} | Músicas: ${stats.music}`);
        } catch (error) {
            console.error('❌ Erro ao inicializar CacheManager:', error);
        }
    }
    
    // Service Worker
    const isRealLocalhost = (window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1') &&
                            !window.cordova;
    
    if ('serviceWorker' in navigator && !isRealLocalhost) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Nova versão do Service Worker encontrada!');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated') {
                        console.log('🎉 Nova versão do Service Worker ativada!');
                        showUpdateNotification();
                    }
                });
            });
            
            console.log('✅ Service Worker registrado com sucesso!');
            
        } catch (error) {
            console.log('❌ Erro no Service Worker:', error);
        }
    } else if (isRealLocalhost) {
        console.log('ℹ️ Service Worker não registrado (localhost desktop)');
    } else {
        console.log('ℹ️ Service Worker não suportado neste navegador');
    }
    
    await initializeYearsWithDetection();
    setupUIElements();
    setupEventListeners();
    setupMusic();
    preloadMedia();
}

function showUpdateNotification() {
    console.log('📱 Nova versão disponível! Recarregue a página.');
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

function setupUIElements() {
    const anoVigente = getElementSafe("anoVigente");
    if (anoVigente) anoVigente.textContent = currentYear;

    const textYear = getElementSafe("textYear");
    if (textYear) textYear.textContent = currentYear;

    const modalYear = getElementSafe("modalYear");
    if (modalYear) modalYear.textContent = currentYear;

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
    if (modalButton) modalButton.addEventListener("click", closeModal);

    adicionarSwipes();
    window.addEventListener('resize', updateVideoPositionAndSize);
}

function setupMusic() {
    backgroundMusic = getElementSafe("backgroundMusic");
    if (backgroundMusic) {
        backgroundMusic.volume = 0.5;
        changeMusic();
        backgroundMusic.addEventListener('ended', changeMusic);
    }
}

function preloadMedia() {
    // Pré-carrega fotos do GitHub (agora com cache)
    Object.values(photos).forEach(src => {
        loadImageWithCache(src, 'photo');
    });

    // Pré-carrega cartazes do GitHub
    for (let y = 1984; y <= currentYear; y++) {
        const src = `${GITHUB_BASE}/cartazes/cartaz${y}.jpg`;
        loadImageWithCache(src, 'poster', y);
    }
}

// ======== CARREGAMENTO COM CACHE ========
async function loadImageWithCache(src, type, year = null) {
    if (!cacheManager) {
        // Fallback sem cache
        const img = new Image();
        img.src = src;
        return;
    }
    
    try {
        await cacheManager.getMedia(src, type, year);
    } catch (error) {
        console.warn(`⚠️ Erro ao carregar ${src}:`, error);
    }
}

async function loadMediaWithCache(element, src, type, year = null) {
    if (!cacheManager) {
        element.src = src;
        return;
    }
    
    try {
        const cachedUrl = await cacheManager.getMedia(src, type, year);
        element.src = cachedUrl || src;
    } catch (error) {
        console.error(`❌ Erro ao carregar mídia:`, error);
        element.src = src; // Fallback
    }
}

// ======== FUNÇÕES DE MÚSICA ========
async function changeMusic() {
    const music = getElementSafe("backgroundMusic");
    if (!music) return;

    const songs = [
        `${GITHUB_BASE}/musicas/Anneliese.mp3`,
        `${GITHUB_BASE}/musicas/Donnawedda.mp3`, 
        `${GITHUB_BASE}/musicas/Imogdiso.mp3`,
        `${GITHUB_BASE}/musicas/Kanguru.mp3`
    ];

    if (availableSongs.length === 0) {
        availableSongs = [...songs];
    }

    const currentSong = music.src.split('/').pop();
    const currentIndex = availableSongs.findIndex(song => song.includes(currentSong));
    if (currentIndex > -1) {
        availableSongs.splice(currentIndex, 1);
    }
    
    if (currentSong && !musicHistory.includes(currentSong)) {
        musicHistory.push(currentSong);
    }

    if (availableSongs.length === 0) {
        availableSongs = [...songs];
        musicHistory = [];
        const newCurrentIndex = availableSongs.findIndex(song => song.includes(currentSong));
        if (newCurrentIndex > -1) {
            availableSongs.splice(newCurrentIndex, 1);
        }
    }

    if (availableSongs.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        const nextSong = availableSongs[randomIndex];
        availableSongs.splice(randomIndex, 1);
        
        // Carrega música com cache
        await loadMediaWithCache(music, nextSong, 'music');
        
        music.play().catch(error => {
            console.error("Erro ao trocar música:", error);
        });
    }
}

// ======== FUNÇÕES DE VÍDEO ========
async function playVideo() {
    const videoContainer = getElementSafe("video-container");
    const video = getElementSafe("claraVideo");
    const imageContainer = getElementSafe("image-container");

    if (!videoContainer || !video || !imageContainer) return;

    if (backgroundMusic) backgroundMusic.pause();

    if (loopFoto2007) {
        clearTimeout(loopFoto2007);
        loopFoto2007 = null;
    }

    const videoSource = video.querySelector('source');
    if (videoSource) {
        const videoUrl = `${GITHUB_BASE}/videos/clara.mp4`;
        
        // Carrega vídeo com cache
        if (cacheManager) {
            const cachedUrl = await cacheManager.getMedia(videoUrl, 'video');
            videoSource.src = cachedUrl || videoUrl;
        } else {
            videoSource.src = videoUrl;
        }
        
        video.load();
    }

    imageContainer.style.visibility = "hidden";
    videoContainer.style.display = "flex";
    updateVideoPositionAndSize();

    video.play().catch(error => {
        console.error("Erro ao reproduzir vídeo:", error);
    });

    video.onended = function() {
        stopVideo();
    };
}

function stopVideo() {
    const videoContainer = getElementSafe("video-container");
    const video = getElementSafe("claraVideo");
    const imageContainer = getElementSafe("image-container");

    if (!videoContainer || !video || !imageContainer) return;

    video.pause();
    video.currentTime = 0;
    videoContainer.style.display = "none";
    imageContainer.style.visibility = "visible";
    videoContainer.style.top = '0';
    videoContainer.style.left = '0';

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

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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

// ======== FOTOS 2007 ========
async function mostrarFoto2007() {
    stopVideo();
    const img = limparListenersEClone();
    if (!img) return;

    const fadeDuration = 500;
    const intervalo = 3000;
    const imagens = [
        { src: `${GITHUB_BASE}/fotos/oktoberfest2007.jpg`, alt: "Oktoberfest 2007" },
        { src: `${GITHUB_BASE}/fotos/oktoberfestkaka1.jpg`, alt: "Oktoberfest Kaka 1" },
        { src: `${GITHUB_BASE}/fotos/oktoberfestkaka2.jpg`, alt: "Oktoberfest Kaka 2" }
    ];

    let indice = 0;
    let paused = false;

    async function iniciarImagemInicial() {
        const primeiraImagem = imagens[0];
        img.style.transition = `opacity ${fadeDuration}ms ease-in-out`;
        img.style.opacity = 0;

        setTimeout(async () => {
            if (cacheManager) {
                const cachedUrl = await cacheManager.getMedia(primeiraImagem.src, 'photo', 2007);
                img.src = cachedUrl || primeiraImagem.src;
            } else {
                img.src = primeiraImagem.src;
            }
            
            img.alt = primeiraImagem.alt;
            img.onerror = () => {
                console.warn(`Foto 2007 não encontrada`);
                img.src = `${GITHUB_BASE}/fotos/oktoberfest.png`;
            };
            
            img.style.opacity = 1;
            indice = 1;
            iniciarLoop();
        }, fadeDuration / 2);
    }

    function iniciarLoop() {
        if (paused) return;

        async function trocarImagem() {
            if (paused) return;

            const proxima = imagens[indice];
            img.style.transition = `opacity ${fadeDuration}ms ease-in-out`;
            img.style.opacity = 0.3;

            setTimeout(async () => {
                if (cacheManager) {
                    const cachedUrl = await cacheManager.getMedia(proxima.src, 'photo', 2007);
                    img.src = cachedUrl || proxima.src;
                } else {
                    img.src = proxima.src;
                }
                
                img.alt = proxima.alt;
                img.onerror = () => {
                    console.warn(`Foto não encontrada: ${proxima.alt}`);
                    img.src = `${GITHUB_BASE}/fotos/oktoberfest.png`;
                };
                
                img.style.opacity = 1;
                indice = (indice + 1) % imagens.length;

                if (!paused) {
                    loopFoto2007 = setTimeout(trocarImagem, intervalo);
                }
            }, fadeDuration / 2);
        }

        if (!paused) {
            loopFoto2007 = setTimeout(trocarImagem, intervalo);
        }
    }

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

// ======== SWIPE E NAVEGAÇÃO ========
function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}

function handleMouseDown(e) {
    touchStartX = e.screenX;
    document.addEventListener('mouseup', handleMouseUp);
}

function handleMouseUp(e) {
    touchEndX = e.screenX;
    handleSwipe();
    document.removeEventListener('mouseup', handleMouseUp);
}

function handleSwipe() {
    const minSwipeDistance = 50;
    if (touchEndX < touchStartX - minSwipeDistance) {
        prevYear();
    }
    if (touchEndX > touchStartX + minSwipeDistance) {
        nextYear();
    }
}

async function navigateToYear(year) {
    stopVideo();
    if (loopFoto2007) {
        clearTimeout(loopFoto2007);
        loopFoto2007 = null;
    }

    const img = getElementSafe("photo");
    if (!img) return;

    const yearIndex = allYears.indexOf(year.toString());
    if (yearIndex !== -1) {
        currentYearIndex = yearIndex;
    }

    img.style.opacity = 0;
    setTimeout(async () => {
        const photoUrl = photos[year];
        
        if (cacheManager) {
            const cachedUrl = await cacheManager.getMedia(photoUrl, 'photo', year);
            img.src = cachedUrl || photoUrl;
        } else {
            img.src = photoUrl;
        }
        
        img.alt = `Oktoberfest ${year}`;
        img.onerror = () => {
            console.warn(`Imagem de ${year} não carregada, usando fallback`);
            img.src = `${GITHUB_BASE}/fotos/oktoberfest.png`;
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
            firstLine.innerText = "Digite um ano entre";
            secondLine.innerHTML = `<strong>1984 e ${currentYear}! <span style="font-size: 20px;">🍺</span></strong>`;
        } else if (context === "oktoberfest") {
            firstLine.innerText = "Digite um ano entre";
            secondLine.innerHTML = `<strong>2017 e ${currentYear}! <span style="font-size: 20px;">🍺</span></strong>`;
        } else if (context === "cartaz_nao_encontrado") {
            firstLine.innerText = "Cartaz não encontrado";
            secondLine.innerHTML = `<strong>Tente outro ano! <span style="font-size: 20px;">📋</span></strong>`;
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

// ======== SORTEIO ========
async function startDraw() {
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

    interval = setInterval(async () => {
        const randomYear = yearsArray[Math.floor(Math.random() * yearsArray.length)];
        img.style.opacity = 0;
        
        setTimeout(async () => {
            const photoUrl = photos[randomYear];
            
            if (cacheManager) {
                const cachedUrl = await cacheManager.getMedia(photoUrl, 'photo', randomYear);
                img.src = cachedUrl || photoUrl;
            } else {
                img.src = photoUrl;
            }
            
            img.alt = `Oktoberfest ${randomYear}`;
            img.style.opacity = 1;
        }, 100);

        iterations++;
        currentSpeed = Math.min(100 + (iterations * 25), 500);

        if (iterations >= maxIterations) {
            clearInterval(interval);
            setTimeout(async () => {
                img.style.opacity = 0;
                setTimeout(async () => {
                    const finalPhotoUrl = photos[year];
                    
                    if (cacheManager) {
                        const cachedUrl = await cacheManager.getMedia(finalPhotoUrl, 'photo', year);
                        img.src = cachedUrl || finalPhotoUrl;
                    } else {
                        img.src = finalPhotoUrl;
                    }
                    
                    img.alt = `Oktoberfest ${year} - Sorteado!`;
                    img.onerror = () => {
                        console.warn(`Imagem de ${year} não carregada, usando fallback`);
                        img.src = `${GITHUB_BASE}/fotos/oktoberfest.png`;
                        img.alt = "Foto da Oktoberfest - Fallback";
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
async function resetApp() {
    stopVideo();

    const currentImg = limparListenersEClone();
    if (currentImg) {
        currentImg.style.opacity = 0;
        setTimeout(async () => {
            const fallbackUrl = `${GITHUB_BASE}/fotos/oktoberfest.png`;
            
            if (cacheManager) {
                const cachedUrl = await cacheManager.getMedia(fallbackUrl, 'photo');
                currentImg.src = cachedUrl || fallbackUrl;
            } else {
                currentImg.src = fallbackUrl;
            }
            
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

    initializeYearsWithDetection();
}

// ======== CARTAZES ========
async function mostrarCartazes() {
    stopVideo();
    const img = limparListenersEClone();
    if (!img) return;

    const fadeDuration = 500;
    let cartazAtual = 1984;
    const ultimoCartaz = currentYear;
    const totalCartazes = ultimoCartaz - 1984 + 1;
    const cartazes = Array.from({ length: totalCartazes }, (_, i) => 1984 + i);
    let index = 0;

    async function carregarCartazComFallback(ano) {
        img.style.opacity = 0;
        setTimeout(async () => {
            const cartazUrl = `${GITHUB_BASE}/cartazes/cartaz${ano}.jpg`;
            
            if (cacheManager) {
                const cachedUrl = await cacheManager.getMedia(cartazUrl, 'poster', ano);
                img.src = cachedUrl || cartazUrl;
            } else {
                img.src = cartazUrl;
            }
            
            img.alt = `Cartaz ${ano}`;
            img.onerror = () => {
                console.warn(`Cartaz ${ano} não encontrado`);
                img.src = `${GITHUB_BASE}/fotos/oktoberfest.png`;
                img.alt = `Cartaz ${ano} - Não disponível`;
            };
            
            img.style.opacity = 1;
            cartazAtual = ano;
        }, fadeDuration);
    }

    carregarCartazComFallback(cartazAtual);

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

async function mostrarCartazAno() {
    stopVideo();
    const input = getElementSafe("cartazInput");
    const img = limparListenersEClone();
    if (!input || !img) return;

    const year = parseInt(input.value);

    if (isNaN(year) || year < 1984 || year > currentYear) {
        showModal("cartaz");
        return;
    }

    img.style.opacity = 0;
    setTimeout(async () => {
        const cartazUrl = `${GITHUB_BASE}/cartazes/cartaz${year}.jpg`;
        
        if (cacheManager) {
            const cachedUrl = await cacheManager.getMedia(cartazUrl, 'poster', year);
            img.src = cachedUrl || cartazUrl;
        } else {
            img.src = cartazUrl;
        }
        
        img.alt = `Cartaz ${year}`;
        img.onerror = () => {
            console.warn(`Cartaz ${year} não encontrado`);
            img.src = `${GITHUB_BASE}/fotos/oktoberfest.png`;
            img.alt = `Cartaz ${year} - Não disponível`;
            showModal("cartaz_nao_encontrado");
        };
        
        img.style.opacity = 1;
        input.value = "";
    }, 400);
}
