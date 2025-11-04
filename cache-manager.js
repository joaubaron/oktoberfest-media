// ======== GERENCIADOR DE CACHE OFFLINE ========
// Sistema robusto de cache para funcionamento 100% offline no APK

const CacheManager = {
    // Configurações
    CACHE_NAME: 'oktoberfest-cache-v1',
    GITHUB_BASE: 'https://joaubaron.github.io/oktoberfest-media',
    DB_NAME: 'OktoberfestDB',
    DB_VERSION: 1,
    
    db: null,
    isOnline: navigator.onLine,
    
    // ======== INICIALIZAÇÃO ========
    async init() {
        console.log('🚀 Inicializando CacheManager...');
        
        // Monitora status de conexão
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('✅ Conexão online detectada');
            this.syncInBackground();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('⚠️ Modo offline ativado');
        });
        
        // Inicializa IndexedDB
        await this.initDB();
        
        // Verifica cache inicial
        await this.checkInitialCache();
        
        return this;
    },
    
    // ======== INDEXEDDB ========
    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = () => {
                console.error('❌ Erro ao abrir IndexedDB');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB inicializado');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Store para mídia (fotos, cartazes, vídeos, músicas)
                if (!db.objectStoreNames.contains('media')) {
                    const mediaStore = db.createObjectStore('media', { keyPath: 'url' });
                    mediaStore.createIndex('type', 'type', { unique: false });
                    mediaStore.createIndex('year', 'year', { unique: false });
                    mediaStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
                }
                
                // Store para metadados
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
                
                console.log('✅ Estrutura do banco criada');
            };
        });
    },
    
    // ======== VERIFICAÇÃO INICIAL ========
    async checkInitialCache() {
        const cacheStatus = await this.getMetadata('cache_status');
        
        if (!cacheStatus || !cacheStatus.initialized) {
            console.log('📦 Primeiro uso - baixando arquivos essenciais...');
            await this.downloadEssentialFiles();
        } else {
            console.log('✅ Cache já inicializado');
            
            // Atualiza em background se estiver online
            if (this.isOnline) {
                this.syncInBackground();
            }
        }
    },
    
    // ======== DOWNLOAD DE ARQUIVOS ESSENCIAIS ========
    async downloadEssentialFiles() {
        const essentialFiles = [
            // Fallback
            { url: `${this.GITHUB_BASE}/fotos/oktoberfest.png`, type: 'photo', year: 'fallback' },
            
            // Fotos 2007
            { url: `${this.GITHUB_BASE}/fotos/oktoberfest2007.jpg`, type: 'photo', year: 2007 },
            { url: `${this.GITHUB_BASE}/fotos/oktoberfestkaka1.jpg`, type: 'photo', year: 2007 },
            { url: `${this.GITHUB_BASE}/fotos/oktoberfestkaka2.jpg`, type: 'photo', year: 2007 },
            
            // Vídeo
            { url: `${this.GITHUB_BASE}/videos/clara.mp4`, type: 'video', year: null },
            
            // Músicas
            { url: `${this.GITHUB_BASE}/musicas/Anneliese.mp3`, type: 'music', year: null },
            { url: `${this.GITHUB_BASE}/musicas/Donnawedda.mp3`, type: 'music', year: null },
            { url: `${this.GITHUB_BASE}/musicas/Imogdiso.mp3`, type: 'music', year: null },
            { url: `${this.GITHUB_BASE}/musicas/Kanguru.mp3`, type: 'music', year: null }
        ];
        
        console.log('📥 Baixando arquivos essenciais...');
        let downloaded = 0;
        
        for (const file of essentialFiles) {
            try {
                await this.cacheFile(file.url, file.type, file.year);
                downloaded++;
                console.log(`✅ ${downloaded}/${essentialFiles.length}: ${file.url.split('/').pop()}`);
            } catch (error) {
                console.warn(`⚠️ Erro ao baixar ${file.url}:`, error);
            }
        }
        
        // Marca como inicializado
        await this.setMetadata('cache_status', {
            initialized: true,
            lastSync: new Date().toISOString(),
            filesDownloaded: downloaded
        });
        
        console.log(`✅ Cache inicial completo: ${downloaded}/${essentialFiles.length} arquivos`);
    },
    
    // ======== CACHE DE ARQUIVO ========
    async cacheFile(url, type, year = null) {
        try {
            // Verifica se já existe no cache
            const cached = await this.getFromCache(url);
            if (cached && cached.blob) {
                return cached.blob;
            }
            
            // Se offline e não tem cache, retorna null
            if (!this.isOnline) {
                console.warn(`⚠️ Offline: ${url} não está em cache`);
                return null;
            }
            
            // Baixa o arquivo
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const blob = await response.blob();
            
            // Salva no IndexedDB
            await this.saveToCache(url, blob, type, year);
            
            return blob;
        } catch (error) {
            console.error(`❌ Erro ao cachear ${url}:`, error);
            return null;
        }
    },
    
    // ======== SALVAR NO CACHE ========
    async saveToCache(url, blob, type, year) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['media'], 'readwrite');
            const store = transaction.objectStore('media');
            
            const data = {
                url,
                blob,
                type,
                year,
                lastUpdated: new Date().toISOString(),
                size: blob.size
            };
            
            const request = store.put(data);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    // ======== OBTER DO CACHE ========
    async getFromCache(url) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['media'], 'readonly');
            const store = transaction.objectStore('media');
            const request = store.get(url);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    // ======== OBTER MÍDIA (ONLINE OU CACHE) ========
    async getMedia(url, type, year = null) {
        // Tenta cache primeiro
        const cached = await this.getFromCache(url);
        
        if (cached && cached.blob) {
            console.log(`💾 Cache hit: ${url.split('/').pop()}`);
            return URL.createObjectURL(cached.blob);
        }
        
        // Se offline, retorna fallback
        if (!this.isOnline) {
            console.warn(`⚠️ Offline e sem cache: ${url}`);
            return await this.getFallback(type);
        }
        
        // Baixa e cacheia
        console.log(`🌐 Baixando: ${url.split('/').pop()}`);
        const blob = await this.cacheFile(url, type, year);
        
        if (blob) {
            return URL.createObjectURL(blob);
        }
        
        // Fallback em caso de erro
        return await this.getFallback(type);
    },
    
    // ======== FALLBACK ========
    async getFallback(type) {
        if (type === 'photo' || type === 'poster') {
            const fallbackUrl = `${this.GITHUB_BASE}/fotos/oktoberfest.png`;
            const cached = await this.getFromCache(fallbackUrl);
            
            if (cached && cached.blob) {
                return URL.createObjectURL(cached.blob);
            }
            
            return fallbackUrl; // Última tentativa
        }
        
        return null;
    },
    
    // ======== SINCRONIZAÇÃO EM BACKGROUND ========
    async syncInBackground() {
        if (!this.isOnline) return;
        
        console.log('🔄 Sincronizando arquivos em background...');
        
        const currentYear = new Date().getFullYear();
        const startYear = 2017;
        
        // Fotos dos anos
        for (let year = startYear; year <= currentYear; year++) {
            const url = `${this.GITHUB_BASE}/fotos/oktoberfest${year}.jpg`;
            await this.cacheFile(url, 'photo', year);
        }
        
        // Cartazes
        for (let year = 1984; year <= currentYear; year++) {
            const url = `${this.GITHUB_BASE}/cartazes/cartaz${year}.jpg`;
            await this.cacheFile(url, 'poster', year);
        }
        
        // Atualiza metadados
        await this.setMetadata('last_sync', new Date().toISOString());
        
        console.log('✅ Sincronização completa!');
    },
    
    // ======== METADADOS ========
    async setMetadata(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            const request = store.put({ key, value });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    async getMetadata(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    },
    
    // ======== ESTATÍSTICAS ========
    async getCacheStats() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['media'], 'readonly');
            const store = transaction.objectStore('media');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const items = request.result;
                const stats = {
                    total: items.length,
                    photos: items.filter(i => i.type === 'photo').length,
                    posters: items.filter(i => i.type === 'poster').length,
                    videos: items.filter(i => i.type === 'video').length,
                    music: items.filter(i => i.type === 'music').length,
                    totalSize: items.reduce((sum, i) => sum + (i.size || 0), 0)
                };
                resolve(stats);
            };
            
            request.onerror = () => reject(request.error);
        });
    },
    
    // ======== LIMPAR CACHE ========
    async clearCache() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['media'], 'readwrite');
            const store = transaction.objectStore('media');
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('🗑️ Cache limpo');
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }
};

// Exporta para uso global
window.CacheManager = CacheManager;
