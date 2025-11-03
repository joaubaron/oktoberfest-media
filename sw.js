// VERSÃO OTIMIZADA - CACHE INTELIGENTE
const CACHE_VERSION = '2025'; // ← ATUALIZAR TODO ANO
const CACHE_NAME = `oktoberfest-${CACHE_VERSION}`;

// RECURSOS ESSENCIAIS (sempre em cache)
const ESSENTIAL_URLS = [
    './',
    './index.html', 
    './app.js',
    './medias.json',
    './fotos/oktoberfest.png',
    './videos/clara.mp4',  // ← VÍDEO PRIORITÁRIO
    './musicas/Anneliese.mp3'
];

self.addEventListener('install', event => {
    console.log('📦 Service Worker instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Primeiro cacheia os ESSENCIAIS
                return cache.addAll(ESSENTIAL_URLS)
                    .then(() => {
                        console.log('✅ Recursos essenciais cacheados');
                        
                        // DEPOIS tenta carregar o medias.json para cache adicional
                        return fetch('./medias.json')
                            .then(response => {
                                if (!response.ok) throw new Error('medias.json não carregado');
                                return response.json();
                            })
                            .then(media => {
                                console.log('🔄 Carregando mídias adicionais...');
                                
                                // Seleciona apenas alguns recursos adicionais
                                const additionalUrls = [];
                                
                                // Apenas fotos mais recentes (últimos 3 anos)
                                const recentPhotos = media.fotos.slice(-3);
                                recentPhotos.forEach(photo => {
                                    additionalUrls.push('./' + photo);
                                });
                                
                                // Apenas cartazes recentes (últimos 3 anos)  
                                const recentPosters = media.cartazes.slice(-3);
                                recentPosters.forEach(poster => {
                                    additionalUrls.push('./' + poster);
                                });
                                
                                // Apenas 2 músicas adicionais
                                const someSongs = media.musicas.slice(0, 2);
                                someSongs.forEach(song => {
                                    additionalUrls.push('./' + song);
                                });
                                
                                console.log('📸 Fotos adicionais:', recentPhotos.length);
                                console.log('🖼️ Cartazes adicionais:', recentPosters.length);
                                console.log('🎵 Músicas adicionais:', someSongs.length);
                                
                                // Cacheia recursos adicionais (não bloqueante)
                                return cache.addAll(additionalUrls)
                                    .then(() => {
                                        console.log('✅ Recursos adicionais cacheados');
                                    })
                                    .catch(err => {
                                        console.warn('⚠️ Alguns recursos adicionais falharam:', err);
                                        // Não falha a instalação por isso
                                    });
                            })
                            .catch(error => {
                                console.warn('⚠️ medias.json não disponível, usando cache básico');
                                // Continua com cache básico
                            });
                    });
            })
            .catch(error => {
                console.error('❌ Falha crítica na instalação:', error);
            })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Retorna do cache se existir
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Busca da rede
                return fetch(event.request)
                    .then(networkResponse => {
                        // Cache dinâmico para sucesso
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
                        
                        // Fallbacks inteligentes
                        if (event.request.destination === 'image') {
                            return caches.match('./fotos/oktoberfest.png');
                        }
                        
                        if (event.request.url.includes('.mp3')) {
                            return caches.match('./musicas/Anneliese.mp3');
                        }
                        
                        if (event.request.url.includes('.mp4')) {
                            return caches.match('./videos/clara.mp4');
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
        })
    );
});
