const CACHE_VERSION = '2026'; // ATUALIZAR  TODO ANO
const CACHE_NAME = `oktoberfest-${CACHE_VERSION}`;

self.addEventListener('install', event => {
    console.log(`📦 Instalando cache ${CACHE_VERSION}...`);
    
    event.waitUntil(
        fetch('./medias.json')
            .then(response => response.json())
            .then(media => {
                const allUrls = [
                    './', './index.html', './app.js', './sw.js', './medias.json'
                ];
                
                Object.values(media).forEach(category => {
                    category.forEach(item => allUrls.push('./' + item));
                });
                
                return caches.open(CACHE_NAME)
                    .then(cache => cache.addAll(allUrls));
            })
    );
});

// Limpeza automática de versões antigas
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
