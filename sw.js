const CACHE_NAME = 'oktoberfest-cache-v1';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll([
                '/',
                '/index.html'
            ]))
    );
});

self.addEventListener('fetch', event => {
    // Ignora requisições que não são GET
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Retorna do cache se encontrou
                if (response) {
                    return response;
                }
                
                // Se não encontrou no cache, busca na rede
                return fetch(event.request).then(response => {
                    // Não cacheamos respostas inválidas
                    if (!response || response.status !== 200) {
                        return response;
                    }
                    
                    // Clona a resposta para cachear
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(() => {
                // Fallback offline melhorado
                if (event.request.url.includes('/fotos/')) {
                    return caches.match('/fotos/oktoberfest.png');
                }
                // Pode adicionar mais fallbacks se necessário
            })
    );
});
