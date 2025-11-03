// sw.js - VERSÃO QUE USA TODAS AS MÍDIAS DO MEDIAS.JSON
const CACHE_VERSION = '2025';
const CACHE_NAME = `oktoberfest-${CACHE_VERSION}`;

self.addEventListener('install', event => {
    console.log('📦 Service Worker instalando com TODAS as mídias...');
    
    event.waitUntil(
        // Busca a lista completa do medias.json
        fetch('./medias.json')
            .then(response => {
                if (!response.ok) throw new Error('medias.json não encontrado');
                return response.json();
            })
            .then(media => {
                // Array para todas as URLs
                const allUrls = [
                    './',
                    './index.html',
                    './app.js', 
                    './sw.js',
                    './medias.json'
                ];
                
                // Adiciona TODAS as mídias de todas as categorias
                Object.values(media).forEach(category => {
                    category.forEach(item => {
                        // Garante que o path está correto
                        if (!item.startsWith('./')) {
                            allUrls.push('./' + item);
                        } else {
                            allUrls.push(item);
                        }
                    });
                });
                
                console.log('🔄 Cacheando', allUrls.length, 'arquivos...');
                console.log('📸 Fotos:', media.fotos.length);
                console.log('🖼️ Cartazes:', media.cartazes.length);
                console.log('🎵 Músicas:', media.musicas.length);
                console.log('🎥 Vídeos:', media.videos.length);
                
                return caches.open(CACHE_NAME)
                    .then(cache => {
                        return cache.addAll(allUrls)
                            .then(() => {
                                console.log('✅ TODAS as mídias cacheadas com sucesso!');
                            })
                            .catch(cacheError => {
                                console.error('❌ Erro no cache individual:', cacheError);
                                // Continua mesmo com alguns erros
                            });
                    });
            })
            .catch(error => {
                console.error('❌ Erro ao carregar medias.json:', error);
                // Fallback básico se medias.json não estiver disponível
                return caches.open(CACHE_NAME)
                    .then(cache => cache.addAll([
                        './',
                        './index.html',
                        './app.js',
                        './fotos/oktoberfest.png'
                    ]));
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
                
                // Se não está no cache, busca da rede
                return fetch(event.request)
                    .then(networkResponse => {
                        // Cacheia novas respostas para conteúdo futuro
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
                        console.log('🌐 Offline - não foi possível buscar:', event.request.url);
                        
                        // Fallbacks específicos
                        if (event.request.destination === 'image') {
                            return caches.match('./fotos/oktoberfest.png');
                        }
                        
                        if (event.request.url.includes('.mp3')) {
                            return caches.match('./musicas/Anneliese.mp3');
                        }
                        
                        // Para outros tipos, retorna resposta de erro
                        return new Response('Conteúdo não disponível offline', { 
                            status: 503,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
});

// Limpeza de caches antigos
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
