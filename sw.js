// NO sw.js - MODIFICAR o evento fetch:
self.addEventListener('fetch', event => {
    // Ignora requisições não GET
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Retorna do cache se existir
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Se não está no cache, busca da rede e cache
                return fetch(event.request)
                    .then(networkResponse => {
                        // Só cachea se a resposta for válida
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Fallback para imagens
                        if (event.request.destination === 'image') {
                            return caches.match('/fotos/oktoberfest.png');
                        }
                        // Para outros tipos, retorna resposta vazia
                        return new Response('Offline', { 
                            status: 503, 
                            statusText: 'Service Unavailable' 
                        });
                    });
            })
    );
});