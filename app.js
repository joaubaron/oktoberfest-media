// ======== CARTAZES CORRIGIDOS ========
function mostrarCartazes() {
stopVideo();
const img = limparListenersEClone();
if (!img) return;

removerSwipes();

const fadeDuration = 500;
let cartazAtual = currentYear; // Começar pelo ano atual
const ultimoCartaz = currentYear;
const totalCartazes = ultimoCartaz - 1984 + 1;
const cartazes = Array.from({ length: totalCartazes }, (_, i) => 1984 + i);
let index = cartazes.indexOf(cartazAtual); // Inicializa o índice no ano atual
let isCartazSwiping = false; // VARIÁVEL LOCAL: Previne swipes simultâneos de cartaz
let toastExibido = false; // 🔥 NOVA FLAG: Garante que o toast seja exibido apenas uma vez

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
img.style.opacity = 1;
};

img.onload = () => { img.style.opacity = 1; };
cartazAtual = ano;
index = cartazes.indexOf(ano);

if (!toastCartazesExibido) {
toastCartazesExibido = true;
showToast('👈 Arraste para navegar entre os cartazes 👉', 2500);
}

setTimeout(() => { isCartazSwiping = false; }, fadeDuration);
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

const year = parseInt(input.value);

if (isNaN(year) || year < 1984) {
showModal("cartaz");
input.value = "";  // Limpa se inválido
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

}, 400);
}

pode corrigir pra mim?
