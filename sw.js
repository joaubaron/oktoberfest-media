// Service Worker (ETERNAL APK EDITION - OTIMIZADO)

// ✅ VERSÃO ATUALIZADA AUTOMATICAMENTE PELO GITHUB ACTIONS
const CACHE_VERSION = '15.04.2026-1323';
const CACHE_NAME = `oktoberfest-blumenau-${CACHE_VERSION}`;

// ✅ BASE DO GITHUB
const GITHUB_BASE = 'https://joaubaron.github.io/oktoberfest-media';

// ✅ Lista de assets essenciais
let essentialAssets = [
'./',
'./index.html', 
'./app.js',
'./sw.js',
'./titulo.png',
'./azulbavaro.webp',
'./fotos/oktoberfest.png',
'./rodape.png',

// Fotos de fallback
`${GITHUB_BASE}/fotos/oktoberfest.png`,
`${GITHUB_BASE}/fotos/oktoberfest2007.jpg`,
`${GITHUB_BASE}/fotos/oktoberfestkaka1.jpg`, 
`${GITHUB_BASE}/fotos/oktoberfestkaka2.jpg`,

// JSON de músicas
`${GITHUB_BASE}/musicas/song_list.json`,
];

// ============== INSTALAÇÃO (Pré-Cache) ==============
self.addEventListener('install', (event) => {
console.log('[SW] Instalando e pré-cacheando assets fixos...');
event.waitUntil(
caches.open(CACHE_NAME)
.then((cache) => cache.addAll(essentialAssets))
.then(() => console.log('[SW] Pré-cache concluído.'))
.catch((error) => console.error('[SW] Pré-cache falhou:', error))
.then(() => self.skipWaiting())
);
});

// ============== ATIVAÇÃO (Limpeza de versões antigas) ==============
self.addEventListener('activate', (event) => {
console.log('[SW] Ativado! Limpando caches antigos...');
event.waitUntil(
caches.keys().then((cacheNames) => {
return Promise.all(
cacheNames.filter((cache) => cache !== CACHE_NAME)
.map((cache) => caches.delete(cache))
);
}).then(() => self.clients.claim())
);
});

// ============== FETCH OTIMIZADO (Sem Delay) ==============
self.addEventListener('fetch', (event) => {
const url = new URL(event.request.url);
const isGithubAsset = url.origin === 'https://joaubaron.github.io';

if (isGithubAsset) {
// 🎯 ESTRATÉGIA OTIMIZADA: Network-First para conteúdo dinâmico
if (url.pathname.includes('/fotos/') || url.pathname.includes('/cartazes/') || url.pathname.includes('/videos/')) {
event.respondWith(
fetch(event.request) // 🔥 TENTA REDE PRIMEIRO
.then(networkResponse => {
if (networkResponse.ok) {
// ✅ Atualiza cache COM prioridade
caches.open(CACHE_NAME).then(cache => {
cache.put(event.request, networkResponse.clone());
});
return networkResponse; // 🚀 Retorna versão NOVA imediatamente
}
throw new Error('Network failed');
})
.catch(() => {
// 🔄 Fallback para cache se rede falhar
return caches.match(event.request)
.then(cached => {
if (cached) {
console.log('[SW] Usando cache (offline/fallback)');
return cached;
}
// 🆘 Fallback final
return caches.match(`${GITHUB_BASE}/fotos/oktoberfest.png`)
.then(fallback => fallback || new Response('Imagem offline', { status: 503 }));
});
})
);
return; // ⚠️ Importante: sair da função aqui
}

// 🎯 Estratégia original para outros recursos (músicas, JSON, etc)
event.respondWith(
caches.match(event.request).then((cachedResponse) => {
if (cachedResponse) {
// Atualização em background (menos crítico)
fetch(event.request).then((networkResponse) => {
if (networkResponse.ok && event.request.method === 'GET') {
caches.open(CACHE_NAME).then((cache) => {
cache.put(event.request, networkResponse.clone());
});
}
}).catch(err => console.log('[SW] Falha na revalidação:', err));

return cachedResponse;
}

return fetch(event.request).then((networkResponse) => {
if (networkResponse.ok && event.request.method === 'GET') {
caches.open(CACHE_NAME).then((cache) => {
cache.put(event.request, networkResponse.clone());
});
}
return networkResponse;
}).catch(() => {
return new Response('Recurso não disponível offline', {
status: 503,
statusText: 'Service Unavailable (Offline)'
});
});
})
);
} else {
// Estratégia: Cache-Only (para arquivos locais do APK)
event.respondWith(
caches.match(event.request)
.then((response) => response || fetch(event.request))
.catch(() => {
if (event.request.mode === 'navigate') {
return caches.match('./index.html');
}
})
);
}
});
