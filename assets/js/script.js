/* ==========================================================
   Ramo de girasoles: arma el ramo y orquesta la secuencia.
   Todo lo editable está en CONFIG.
   ========================================================== */

const CONFIG = {
  titulo: "By Jacob Telmo",
  mensaje: "Con el 0,0002% de mi cariño",

  imgTallo: "assets/img/tallo_de_girasol.png",
  imgFlor: "assets/img/girasol.png",
  imgCorbata: "assets/img/corbata.png",

  audioSrc: "assets/audio/music.mp3",
  volumen: 0.55, // 0 a 1
  loopFadeMs: 550, // duración del fundido al volver a empezar la canción

  /* Cada girasol: dónde queda su cabeza (x, y) y su tamaño.
     x: 0 es el centro; negativo = izquierda, positivo = derecha.
     y: altura desde el borde inferior (100 = borde superior de la pantalla).
     size: ancho de la flor. orden: en qué turno florece (1 = primera).
     Se listan de atrás hacia adelante: los últimos quedan por delante.
     Agrega o quita filas y el ramo se recalcula solo. */
  girasoles: [
    { x:   0, y: 71, size: 26, orden: 7, giro:   6 },
    { x: -13, y: 63, size: 24, orden: 3, giro: -14 },
    { x:  13, y: 64, size: 24, orden: 4, giro:  12 },
    { x: -25, y: 52, size: 23, orden: 1, giro:  -8 },
    { x:  25, y: 53, size: 23, orden: 2, giro:  18 },
    { x:  -7, y: 50, size: 25, orden: 5, giro:  10 },
    { x:   8, y: 47, size: 25, orden: 6, giro: -10 }
  ],

  /* Tiempos (segundos) */
  inicio: 0.3,        // cuándo sale el primer tallo
  entreTallos: 0.15,  // desfase entre un tallo y el siguiente
  duracionTallo: 2.2, // lo que tarda cada tallo en subir
  entreFlores: 0.4,   // desfase entre una flor y la siguiente
  duracionFlor: 1.3
};

/* Geometría de la imagen del tallo (medida sobre el PNG) */
const BASE_X = 0.52;      // la base del tallo está al 52% del ancho
const PUNTA_X = 54.7;     // la yema superior está al 54.7% del ancho
const ALTO_PUNTA = 0.91;  // ...y a 91% de la altura, contada desde la base
const PIVOTE_Y = -4;      // la base queda 4u bajo el borde para ocultar el corte
const ASPECTO = 2 / 3;    // ancho / alto del PNG del tallo

const stage = document.getElementById("bouquet");
const message = document.getElementById("message");
const replayBtn = document.getElementById("replay");
const soundBtn = document.getElementById("soundToggle");
const cancion = document.getElementById("cancion");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.getElementById("title").textContent = CONFIG.titulo;
document.getElementById("text").textContent = CONFIG.mensaje;

/* ---------- Música ---------- */
let audioIniciado = false;

function fundirVolumen(destino, duracionMs) {
  const inicio = cancion.volume;
  const t0 = performance.now();
  function paso(t) {
    const p = Math.min(1, (t - t0) / duracionMs);
    cancion.volume = inicio + (destino - inicio) * p;
    if (p < 1) requestAnimationFrame(paso);
  }
  requestAnimationFrame(paso);
}

function iniciarMusica() {
  if (audioIniciado || !CONFIG.audioSrc) return;
  audioIniciado = true;
  if (!cancion.src) cancion.src = CONFIG.audioSrc;
  cancion.volume = 0;
  cancion.muted = false;
  cancion.play().then(() => {
    fundirVolumen(CONFIG.volumen, 1400);
    activarLoopConFundido();
  }).catch(() => {
    // el navegador lo bloqueó igual; queda a la espera de un toque en el botón
    audioIniciado = false;
  });
  soundBtn.classList.remove("is-muted");
}

let loopListo = false;
function activarLoopConFundido() {
  if (loopListo) return;
  loopListo = true;

  // En el último tramo de la canción, va bajando el volumen para que
  // el reinicio no se escuche como un corte
  cancion.addEventListener("timeupdate", () => {
    if (cancion.muted) return;
    const restante = cancion.duration - cancion.currentTime;
    const fundido = CONFIG.loopFadeMs / 1000;
    if (isFinite(restante) && restante < fundido) {
      cancion.volume = CONFIG.volumen * Math.max(0, restante / fundido);
    }
  });

  cancion.addEventListener("ended", () => {
    cancion.currentTime = 0;
    cancion.play().then(() => fundirVolumen(CONFIG.volumen, CONFIG.loopFadeMs));
  });
}

soundBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!audioIniciado) {
    iniciarMusica();
    return;
  }
  cancion.muted = !cancion.muted;
  soundBtn.classList.toggle("is-muted", cancion.muted);
});

function construir() {
  stage.innerHTML = "";
  replayBtn.classList.remove("is-ready");

  const flores = CONFIG.girasoles;
  const n = flores.length;

  // En pantallas angostas (celular vertical) el ramo se junta para que quepa a lo ancho
  const proporcion = window.innerWidth / window.innerHeight;
  const compresion = Math.max(0.58, Math.min(1, proporcion / 0.8));

  // Los tallos terminan de salir antes de que empiece la primera flor
  const finTallos = CONFIG.inicio + (n - 1) * CONFIG.entreTallos + CONFIG.duracionTallo;
  const inicioFlores = finTallos + 0.1;
  const finFlores = inicioFlores + (n - 1) * CONFIG.entreFlores + CONFIG.duracionFlor;
  // La corbata ata el ramo recién cuando todas las flores ya brotaron
  const inicioCorbata = finFlores + 0.2;
  const finCorbata = inicioCorbata + 0.9; // coincide con la duración de "anudar"
  const inicioMensaje = finCorbata + 0.3;

  flores.forEach((f, i) => {
    // Distancia y ángulo desde la base del tallo hasta donde debe quedar la flor
    const dx = f.x * compresion;
    const dy = f.y - PIVOTE_Y;
    const angulo = Math.atan2(dx, dy) * 180 / Math.PI;
    const alto = Math.hypot(dx, dy) / ALTO_PUNTA;

    // Alternar el espejo da variedad a las hojas sin repetir el mismo tallo
    const espejo = i % 2 === 0 ? 1 : -1;
    const puntaX = espejo === 1 ? PUNTA_X : 2 * BASE_X * 100 - PUNTA_X;

    const stem = document.createElement("div");
    stem.className = "stem";
    stem.style.setProperty("--h", alto.toFixed(2));
    stem.style.setProperty("--a", angulo.toFixed(2) + "deg");
    stem.style.setProperty("--flip", espejo);
    stem.style.setProperty("--grow-dur", CONFIG.duracionTallo + "s");
    stem.style.setProperty("--grow-delay", (CONFIG.inicio + i * CONFIG.entreTallos).toFixed(2) + "s");
    stem.style.setProperty("--sway-delay", (finFlores + 0.5).toFixed(2) + "s");
    stem.style.setProperty("--sway-dur", (5 + (i % 3) * 1.3).toFixed(1) + "s");

    const tallo = new Image();
    tallo.className = "stem__img";
    tallo.alt = "";
    tallo.src = CONFIG.imgTallo;
    // el retraso se aplica al <img>, que es quien anima el crecimiento
    tallo.style.setProperty("--grow-delay", (CONFIG.inicio + i * CONFIG.entreTallos).toFixed(2) + "s");
    tallo.style.setProperty("--grow-dur", CONFIG.duracionTallo + "s");

    const flor = new Image();
    flor.className = "flower";
    flor.alt = "";
    flor.src = CONFIG.imgFlor;
    flor.style.setProperty("--tip-x", puntaX + "%");
    flor.style.setProperty("--fs", f.size);
    flor.style.setProperty("--fr", (f.giro - angulo).toFixed(1) + "deg"); // compensa la inclinación del tallo
    flor.style.setProperty("--bloom-delay", (inicioFlores + (f.orden - 1) * CONFIG.entreFlores).toFixed(2) + "s");

    stem.append(tallo, flor);
    stage.append(stem);
  });

  // Listón: aparece cuando ya hay tallos que sujetar
  const corbata = new Image();
  corbata.className = "ribbon";
  corbata.alt = "";
  corbata.src = CONFIG.imgCorbata;
  corbata.style.setProperty("--ribbon-delay", inicioCorbata.toFixed(2) + "s");
  stage.append(corbata);

  // Mensaje y botón al final
  message.style.setProperty("--msg-delay", inicioMensaje.toFixed(2) + "s");
  message.style.animation = "none";
  void message.offsetWidth;          // reinicia la animación
  message.style.animation = "";

  const espera = reducedMotion ? 0 : (inicioMensaje + 1.8) * 1000;
  clearTimeout(construir.timer);
  construir.timer = setTimeout(() => replayBtn.classList.add("is-ready"), espera);
}

replayBtn.addEventListener("click", construir);

// Esperamos a que carguen las imágenes (y la corbata también, para el botón
// de inicio) antes de habilitar el botón para arrancar
const startOverlay = document.getElementById("startOverlay");
const startBtn = document.getElementById("startBtn");
const startLabel = document.getElementById("startLabel");

const precarga = [CONFIG.imgTallo, CONFIG.imgFlor, CONFIG.imgCorbata].map(src => new Promise(ok => {
  const im = new Image();
  im.onload = im.onerror = ok;
  im.src = src;
}));

Promise.all(precarga).then(() => {
  startBtn.disabled = false;
  startLabel.textContent = "Toca para comenzar";
});

startBtn.addEventListener("click", () => {
  startOverlay.classList.add("is-hidden");
  setTimeout(() => startOverlay.remove(), 800);
  construir();
  iniciarMusica(); // el toque al botón es el gesto que desbloquea el audio
});
