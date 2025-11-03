// app.js - SISTEMA OKTOBERFEST ATUALIZÁVEL
console.log('🎪 Oktoberfest App - Carregado!');

const CONFIG = {
    // ✅ ATUALIZE ESTA LISTA COM NOVOS ANOS
    ANOS_DISPONIVEIS: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    
    // ✅ ATUALIZE COM NOVOS CARTAZES
    CARTASES_DISPONIVEIS: [1984, 1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995, 
                          1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007,
                          2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019,
                          2020, 2021, 2022, 2023, 2024, 2025],
    
    // ✅ ATUALIZE COM NOVAS MÚSICAS
    MUSICAS: ['Anneliese.mp3', 'Donnawedda.mp3', 'Imogdiso.mp3', 'Kanguru.mp3'],
    
    URL_BASE: 'https://SEU-USUARIO.github.io/oktoberfest-media',
    
    // 🎯 DETECÇÃO AUTOMÁTICA DO ANO VIGENTE
    get ANO_VIGENTE() {
        const agora = new Date();
        return agora.getMonth() >= 9 ? agora.getFullYear() : agora.getFullYear() - 1;
    }
};

// 🚀 INICIALIZAÇÃO
function inicializarApp() {
    console.log(`📅 Iniciando App - Ano Vigente: ${CONFIG.ANO_VIGENTE}`);
    
    const input = document.getElementById('yearInput');
    const botao = document.getElementById('botaoClara');
    const container = document.getElementById('mediaContainer');
    
    // Configura interface
    const anoMaximo = Math.max(...CONFIG.ANOS_DISPONIVEIS);
    input.placeholder = `2017-${anoMaximo}`;
    input.min = 2017;
    input.max = anoMaximo;
    
    // Ação do botão
    botao.onclick = async function() {
        const ano = parseInt(input.value);
        
        if (!ano || ano < 2017 || ano > anoMaximo) {
            alert(`🎯 Digite um ano entre 2017 e ${anoMaximo}`);
            return;
        }
        
        if (!CONFIG.ANOS_DISPONIVEIS.includes(ano)) {
            alert(`📅 ${ano} ainda não disponível!`);
            return;
        }
        
        await carregarFoto(ano);
    };
}

// 🖼️ CARREGAR FOTO
async function carregarFoto(ano) {
    const container = document.getElementById('mediaContainer');
    const url = `${CONFIG.URL_BASE}/fotos/oktoberfest${ano}.jpg`;
    
    container.innerHTML = '<p>🍺 Carregando...</p>';
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            container.innerHTML = `<img src="${url}" alt="Oktoberfest ${ano}" style="max-width: 100%; border-radius: 8px;">`;
        } else {
            container.innerHTML = `<img src="fotos/oktoberfest${ano}.jpg" alt="Oktoberfest ${ano}">`;
        }
    } catch (error) {
        container.innerHTML = `<p>❌ Erro ao carregar ${ano}</p>`;
    }
}

// 🎵 SISTEMA DE MÚSICA
function tocarMusica(nomeMusica) {
    if (CONFIG.MUSICAS.includes(nomeMusica)) {
        const audio = new Audio(`${CONFIG.URL_BASE}/musicas/${nomeMusica}`);
        audio.play().catch(e => console.log('Clique para ativar áudio'));
    }
}

// ▶️ INICIALIZAR
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarApp);
} else {
    inicializarApp();
}
