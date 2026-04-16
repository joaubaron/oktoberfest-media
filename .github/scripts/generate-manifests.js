#!/usr/bin/env node

/**
 * Script para gerar manifestos estáticos de assets
 * Executado durante o deploy no GitHub Actions
 * 
 * Detecta automaticamente:
 * - Anos com fotos da Clara (2017 até ano atual)
 * - Anos com cartazes (1984 até ano atual)
 * - Vídeos disponíveis (clara1.mp4, clara2.mp4, ...)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Configurações
const GITHUB_BASE = 'https://joaubaron.github.io/oktoberfest-media';
const CURRENT_YEAR = new Date().getFullYear();
const START_CLARA_YEAR = 2017;
const START_CARTAZ_YEAR = 1984;

// Pasta onde os manifestos serão salvos
const MANIFESTOS_DIR = path.join(process.cwd(), 'manifestos');

// Função para verificar se um arquivo existe no GitHub Pages
function checkFileExists(url) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log(`⏰ Timeout: ${url}`);
      resolve(false);
    }, 5000); // 5 segundos é suficiente para build

    const req = https.get(url, { method: 'HEAD' }, (res) => {
      clearTimeout(timeout);
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });

    req.end();
  });
}

// Função para detectar anos com fotos da Clara
async function detectClaraYears() {
  console.log('📸 Detectando anos com fotos da Clara...');
  const years = [];
  
  for (let year = START_CLARA_YEAR; year <= CURRENT_YEAR; year++) {
    const url = `${GITHUB_BASE}/fotos/oktoberfest${year}.jpg`;
    const exists = await checkFileExists(url);
    
    if (exists) {
      years.push(year);
      console.log(`  ✅ ${year} - OK`);
    } else {
      console.log(`  ❌ ${year} - Não encontrado`);
      // Para no primeiro ano não encontrado (anos são sequenciais)
      if (year > START_CLARA_YEAR && years.length > 0 && years[years.length - 1] === year - 1) {
        console.log(`  ⏹️  Parando detecção (${year} não encontrado)`);
        break;
      }
    }
  }
  
  console.log(`✅ Total: ${years.length} anos encontrados\n`);
  return years;
}

// Função para detectar anos com cartazes
async function detectCartazYears() {
  console.log('📆 Detectando anos com cartazes...');
  const years = [];
  
  for (let year = START_CARTAZ_YEAR; year <= CURRENT_YEAR; year++) {
    const url = `${GITHUB_BASE}/cartazes/cartaz${year}.jpg`;
    const exists = await checkFileExists(url);
    
    if (exists) {
      years.push(year);
      console.log(`  ✅ ${year} - OK`);
    } else {
      console.log(`  ⏭️  ${year} - Pular (não encontrado)`);
    }
  }
  
  console.log(`✅ Total: ${years.length} anos encontrados\n`);
  return years;
}

// Função para detectar vídeos disponíveis
async function detectVideos() {
  console.log('🎬 Detectando vídeos disponíveis...');
  const videos = [];
  let index = 1;
  const MAX_VIDEOS = 50; // Limite de segurança
  
  while (index <= MAX_VIDEOS) {
    const url = `${GITHUB_BASE}/videos/clara${index}.mp4`;
    const exists = await checkFileExists(url);
    
    if (exists) {
      videos.push(`clara${index}.mp4`);
      console.log(`  ✅ clara${index}.mp4 - OK`);
      index++;
    } else {
      if (index === 1) {
        console.log(`  ⚠️  Nenhum vídeo encontrado`);
      } else {
        console.log(`  ⏹️  Parando em clara${index}.mp4 (não encontrado)`);
      }
      break;
    }
  }
  
  console.log(`✅ Total: ${videos.length} vídeo(s) encontrado(s)\n`);
  return videos;
}

// Função para criar diretório se não existir
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Diretório criado: ${dir}`);
  }
}

// Função principal
async function main() {
  console.log('\n🚀 INICIANDO GERAÇÃO DE MANIFESTOS\n');
  console.log(`📅 Ano atual: ${CURRENT_YEAR}`);
  console.log(`🌐 Base URL: ${GITHUB_BASE}\n`);
  
  // Criar diretório de manifestos
  ensureDirectoryExists(MANIFESTOS_DIR);
  
  // Executar detecções em paralelo para maior velocidade
  console.log('⏳ Detectando assets em paralelo...\n');
  
  const [claraYears, cartazYears, videos] = await Promise.all([
    detectClaraYears(),
    detectCartazYears(),
    detectVideos()
  ]);
  
  // Criar objetos dos manifestos
  const manifests = {
    'clara-years.json': claraYears,
    'cartaz-years.json': cartazYears,
    'videos.json': videos
  };
  
  // Escrever arquivos
  console.log('💾 Escrevendo arquivos de manifesto...\n');
  
  for (const [filename, data] of Object.entries(manifests)) {
    const filepath = path.join(MANIFESTOS_DIR, filename);
    const content = JSON.stringify(data, null, 2);
    
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`  ✅ ${filename} - ${Buffer.byteLength(content, 'utf8')} bytes`);
  }
  
  // Criar arquivo de metadados (útil para debug)
  const metadata = {
    generated_at: new Date().toISOString(),
    current_year: CURRENT_YEAR,
    base_url: GITHUB_BASE,
    summary: {
      clara_photos: claraYears.length,
      cartazes: cartazYears.length,
      videos: videos.length
    }
  };
  
  fs.writeFileSync(
    path.join(MANIFESTOS_DIR, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf8'
  );
  
  console.log('\n📊 RESUMO FINAL:');
  console.log(`  📸 Fotos Clara: ${claraYears.length} anos`);
  console.log(`  📆 Cartazes: ${cartazYears.length} anos`);
  console.log(`  🎬 Vídeos: ${videos.length} arquivos`);
  console.log(`  📁 Pasta: ${MANIFESTOS_DIR}`);
  console.log('\n✅ GERAÇÃO DE MANIFESTOS CONCLUÍDA!\n');
}

// Executar script com tratamento de erros
main().catch(error => {
  console.error('\n❌ ERRO FATAL:', error.message);
  console.error(error.stack);
  process.exit(1);
});
