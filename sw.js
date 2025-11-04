const CACHE_VERSION = 'v2-completo';
const CACHE_NAME = `oktoberfest-${CACHE_VERSION}`;

// TODOS os recursos que devem ser cacheados
const ESSENTIAL_URLS = [
    './',
    './index.html',
    './app.js',
    './sw.js',
    './medias.json'
];

// Função para extrair ano de URLs de cartazes/fotos
function extractYearFromUrl(url) {
    const match = url.match(/(cartaz|oktoberfest)(\d{4})/);
    return match ? match[2] : null;
}

self.addEventListener('install', event => {
    console.log('📦 SW instalando - cache completo');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ESSENTIAL_URLS)
                    .then(() => {
                        console.log('✅ Recursos base cacheados');
                        return self.skipWaiting();
                    });
            })
            .catch(error => {
                console.error('❌ Erro na instalação:', error);
            })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // 🔄 Estratégia: Stale-While-Revalidate
                const fetchPromise = fetch(event.request)
                    .then(networkResponse => {
                        if (networkResponse.status === 200) {
                            const clone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, clone));
                        }
                        return networkResponse;
                    })
                    .catch(() => null); // Silencia erros de rede

                // Retorna do cache imediatamente, atualiza em background
                return cachedResponse || fetchPromise;
            })
            .catch(error => {
                console.log('📴 Offline - fallback para:', event.request.url);
                
                // 🎯 FALLBACKS INTELIGENTES
                const url = event.request.url;
                
                // Fallback para cartazes
                if (url.includes('cartaz')) {
                    const year = extractYearFromUrl(url);
                    if (year) {
                        return caches.match(`./cartazes/cartaz${year}.jpg`)
                            .then(cached => cached || caches.match('./fotos/oktoberfest.png'));
                    }
                }
                
                // Fallback para fotos por ano
                if (url.includes('oktoberfest') && !url.includes('oktoberfest.png')) {
                    return caches.match('./fotos/oktoberfest.png');
                }
                
                // Fallback genérico para imagens
                if (event.request.destination === 'image') {
                    return caches.match('./fotos/oktoberfest.png');
                }
                
                return new Response('Recurso offline', { 
                    status: 503, 
                    headers: { 'Content-Type': 'text/plain' } 
                });
            })
    );
});

self.addEventListener('activate', event => {
    console.log('🎉 SW ativado - limpeza de caches antigos');
    
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
