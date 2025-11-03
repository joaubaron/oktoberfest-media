const CACHE_NAME = 'oktoberfest-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/videos/clara.mp4',
    '/fotos/oktoberfest.png',
    // Adicione outras fotos ou mídias essenciais aqui
];

// Instalação do SW e pré-cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting(); // ativa imediatamente
});

// Ativação do SW
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Intercepta requisições
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) return response;

            return fetch(event.request).then(networkResponse => {
                // Cache apenas respostas válidas
                if (!networkResponse || networkResponse.status !== 200) return networkResponse;

                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });

                return networkResponse;
            }).catch(() => {
                // Fallback para fotos se offline
                if (event.request.url.includes('/fotos/')) {
                    return caches.match('/fotos/oktoberfest.png');
                }
            });
        })
    );
});
