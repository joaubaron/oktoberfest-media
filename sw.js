// VERSÃO CORRIGIDA - CACHE DE CARTAZES
const CACHE_VERSION = '2025';
const CACHE_NAME = `oktoberfest-${CACHE_VERSION}`;

// RECURSOS ESSENCIAIS - INCLUINDO ALGUNS CARTAZES
const ESSENTIAL_URLS = [
    './',
    './index.html', 
    './app.js',
    './sw.js',
    './medias.json',
    './fotos/oktoberfest.png',
    './videos/clara.mp4',
    './musicas/Anneliese.mp3',
    // Adiciona alguns cartazes essenciais
    './cartazes/cartaz2024.jpg',
    './cartazes/cartaz2023.jpg',
    './cartazes/cartaz2022.jpg'
];

self.addEventListener('install', event => {
    console.log('📦 Service Worker instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ESSENTIAL_URLS)
                    .then(() => {
                        console.log('✅ Recursos essenciais cacheados');
                        return self.skipWaiting();
                    });
            })
            .catch(error => {
                console.error('❌ Falha na instalação:', error);
            })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    // ESTRATÉGIA: CACHE FIRST COM FALLBACK PARA REDE
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Se está no cache, retorna do cache
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Se não está no cache, busca da rede
                return fetch(event.request)
                    .then(networkResponse => {
                        // Se a requisição foi bem sucedida, adiciona ao cache
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(error => {
                        console.log('🌐 Offline - recurso não disponível:', event.request.url);
                        
                        // FALLBACKS ESPECÍFICOS PARA CARTAZES
                        if (event.request.url.includes('cartaz')) {
                            return caches.match('./cartazes/cartaz2024.jpg')
                                .then(fallback => {
                                    if (fallback) return fallback;
                                    return new Response('Cartaz não disponível offline', {
                                        status: 503,
                                        headers: { 'Content-Type': 'text/plain' }
                                    });
                                });
                        }
                        
                        if (event.request.destination === 'image') {
                            return caches.match('./fotos/oktoberfest.png');
                        }
                        
                        return new Response('Recurso offline', {
                            status: 503,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('oktoberfest-')) {
                        console.log('🗑️ Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
