// ======== CONFIGURAÇÃO DE LINKS DIRETOS ========
const baseURL = "https://joaubaron.github.io/oktoberfest-media/";

const fotosURL = baseURL + "fotos/";
const musicasURL = baseURL + "musicas/";
const videosURL = baseURL + "videos/";
const cartazesURL = baseURL + "cartazes/";

// ======== VARIÁVEIS ========
const photo = document.getElementById("photo");
const backgroundMusic = document.getElementById("backgroundMusic");
let loopFoto2007 = null;

// ======== ANO ATUAL ========
document.getElementById("textYear").textContent = new Date().getFullYear();

// ======== MÚSICAS ========
const songs = ["Anneliese.mp3","Donnawedda.mp3","Imogdiso.mp3","Kanguru.mp3"];
let lastSong = null;

function changeMusic() {
  let next = songs.filter(s => s !== lastSong);
  const pick = next[Math.floor(Math.random() * next.length)];
  backgroundMusic.src = musicasURL + pick;
  backgroundMusic.play();
  lastSong = pick;
}
changeMusic();
backgroundMusic.onended = changeMusic;

// ======== FOTOS CLARA ========
function startDraw() {
  const year = parseInt(document.getElementById("yearInput").value);
  if (isNaN(year) || year < 2017 || year > new Date().getFullYear()) {
    alert("Digite um ano válido entre 2017 e o atual 🍺");
    return;
  }
  photo.src = fotosURL + "oktoberfest" + year + ".jpg";
}

// ======== FOTO 2007 ========
function mostrarFoto2007() {
  if (loopFoto2007) clearInterval(loopFoto2007);
  const imagens = [
    "oktoberfest2007.jpg",
    "oktoberfestkaka1.jpg",
    "oktoberfestkaka2.jpg"
  ];
  let i = 0;
  photo.src = fotosURL + imagens[i];
  loopFoto2007 = setInterval(() => {
    i = (i + 1) % imagens.length;
    photo.src = fotosURL + imagens[i];
  }, 3000);
}

// ======== CARTAZES ========
function mostrarCartazes() {
  let ano = 1984;
  const atual = new Date().getFullYear();
  photo.src = cartazesURL + "cartaz" + ano + ".jpg";
  const loop = setInterval(() => {
    ano++;
    if (ano > atual) ano = 1984;
    photo.src = cartazesURL + "cartaz" + ano + ".jpg";
  }, 2500);
}

function mostrarCartazAno() {
  const year = parseInt(document.getElementById("cartazInput").value);
  const atual = new Date().getFullYear();
  if (isNaN(year) || year < 1984 || year > atual) {
    alert("Digite um ano entre 1984 e " + atual + " 🍺");
    return;
  }
  photo.src = cartazesURL + "cartaz" + year + ".jpg";
}

// ======== VÍDEO ========
function playVideo() {
  const videoURL = videosURL + "clara.mp4";
  window.open(videoURL, "_blank");
}

// ======== RESET ========
function resetApp() {
  if (loopFoto2007) clearInterval(loopFoto2007);
  photo.src = fotosURL + "oktoberfest.png";
}
