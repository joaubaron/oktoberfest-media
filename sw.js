// Service Worker (ETERNAL APK EDITION - OTIMIZADO)

// ✅ VERSÃO ATUALIZADA AUTOMATICAMENTE PELO GITHUB ACTIONS
const CACHE_VERSION = '16.04.2026-0830';
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

// ============== FETCH SIMPLIFICADO E CORRIGIDO ==============
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 🔥 MANIFESTOS: Cache First (prioridade máxima)
  if (url.pathname.includes('/manifestos/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
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

  // Para assets do GitHub (fotos, cartazes, vídeos, músicas)
  if (url.origin === GITHUB_BASE) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch((error) => {
          console.log('[SW] Fetch falhou, usando cache:', error);
          return cachedResponse;
        });

        return fetchPromise;
      })
    );
    return;
  }

  // Para arquivos locais (index.html, app.js, etc)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Atualiza o cache em segundo plano
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
