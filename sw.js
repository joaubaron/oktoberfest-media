// Service Worker (ETERNAL APK EDITION - OTIMIZADO)

// ✅ VERSÃO ATUALIZADA AUTOMATICAMENTE PELO GITHUB ACTIONS
const CACHE_VERSION = '16.04.2026-0911';
const CACHE_NAME = `oktoberfest-blumenau-${CACHE_VERSION}`;

// ✅ BASE DO GITHUB
const GITHUB_BASE = 'https://joaubaron.github.io/oktoberfest-media';

// ✅ Lista de assets essenciais
let essentialAssets = [
  './',
  './index.html', 
  './app.js',
  './titulo.png',
  './azulbavaro.webp',
  './fotos/oktoberfest.png',
  './rodape.png',
  './manifestos/clara-years.json',
  './manifestos/cartaz-years.json',
  './manifestos/videos.json',

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
      .finally(() => self.skipWaiting())
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

// ============== FUNÇÃO AUXILIAR PARA CLONAR RESPONSE COM SEGURANÇA ==============
async function safeClone(response) {
  if (!response || !response.ok) return null;
  try {
    return response.clone();
  } catch (e) {
    console.warn('[SW] Não foi possível clonar response:', e);
    return null;
  }
}

// ============== FETCH OTIMIZADO (Sem Delay) ==============
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isGithubAsset = url.origin === 'https://joaubaron.github.io';

  // 🔥 MANIFESTOS: Cache First (prioridade máxima)
  if (url.pathname.includes('/manifestos/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
    return;
  }

  if (isGithubAsset) {
    // 🎯 ESTRATÉGIA OTIMIZADA: Network-First para conteúdo dinâmico
    if (url.pathname.includes('/fotos/') || url.pathname.includes('/cartazes/') || url.pathname.includes('/videos/')) {
      event.respondWith(
        fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.ok) {
              // Usa a função segura para clonar
              caches.open(CACHE_NAME).then(cache => {
                safeClone(networkResponse).then(cloned => {
                  if (cloned) cache.put(event.request, cloned);
                });
              });
              return networkResponse;
            }
            throw new Error('Network failed');
          })
          .catch(() => {
            return caches.match(event.request)
              .then(cached => {
                if (cached) {
                  console.log('[SW] Usando cache (offline/fallback)');
                  return cached;
                }
                return caches.match(`${GITHUB_BASE}/fotos/oktoberfest.png`)
                  .then(fallback => fallback || new Response('Imagem offline', { status: 503 }));
              });
          })
      );
      return;
    }

    // 🎯 Estratégia para outros recursos (músicas, JSON, etc)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Atualização em background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.ok && event.request.method === 'GET') {
              caches.open(CACHE_NAME).then((cache) => {
                safeClone(networkResponse).then(cloned => {
                  if (cloned) cache.put(event.request, cloned);
                });
              });
            }
          }).catch(err => console.log('[SW] Falha na revalidação:', err));
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok && event.request.method === 'GET') {
            caches.open(CACHE_NAME).then((cache) => {
              safeClone(networkResponse).then(cloned => {
                if (cloned) cache.put(event.request, cloned);
              });
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
    // Arquivos locais
    const criticalFiles = ['app.js', 'index.html', 'sw.js'];
    const isCritical = criticalFiles.some(f => url.pathname.endsWith(f) || url.pathname === '/');

    if (isCritical) {
      event.respondWith(
        fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.ok) {
              caches.open(CACHE_NAME).then(cache => {
                safeClone(networkResponse).then(cloned => {
                  if (cloned) cache.put(event.request, cloned);
                });
              });
            }
            return networkResponse;
          })
          .catch(() => caches.match(event.request)
            .then(cached => cached || (event.request.mode === 'navigate'
              ? caches.match('./index.html')
              : new Response('Offline', { status: 503 })))
          )
      );
    } else {
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
  }
});
