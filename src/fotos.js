// =============================================================
// Las cámaras de Percy toman fotos REALES de Marte
// - 4 puntos que brillan sobre las cámaras del modelo de la NASA (nombre al pasar el mouse)
// - Clic: obturador + flash, y la foto se revela poco a poco
// - La foto se queda grande unos segundos y luego se hace pequeña en una esquina
// - Clic en la foto: ampliar · Esc: volver al juego · ← →: más fotos de esa cámara
// Las fotos fueron escogidas a mano de la API de imágenes crudas de la NASA
// (ver src/fotos-catalogo.json: id, sol, fecha UTC y enlace de cada una)
// =============================================================
import * as THREE from 'three';
import catalogo from './fotos-catalogo.json';

// Cámaras: pieza del modelo → nombre bonito + instrumento de la NASA
const CAMARAS = [
  { pieza: 'Mastcam_Z_cams', nombre: 'Mastcam-Z', instrumento: 'MCZ_LEFT', detalle: 'Los "ojos" a color con zoom, arriba del mástil' },
  { pieza: 'NavCams', nombre: 'NavCam', instrumento: 'NAVCAM_LEFT', detalle: 'Cámara de navegación: mira el camino' },
  { pieza: 'hazcams_front', nombre: 'Hazcam frontal', instrumento: 'FRONT_HAZCAM_LEFT_A', detalle: 'Ojo de pez que vigila peligros adelante' },
  { pieza: 'WATSON', nombre: 'WATSON', instrumento: 'SHERLOC_WATSON', detalle: 'Lupa en la punta del brazo: rocas muy de cerca' },
];

// ---------- 1. Estilos ----------
const css = document.createElement('style');
css.textContent = `
  #foto-etiqueta {
    position: fixed; pointer-events: none; transform: translate(-50%, -150%);
    padding: 4px 10px; border-radius: 6px; background: rgba(20,10,6,.8);
    color: #ffe2c8; font: 12px ui-monospace, Menlo, monospace; white-space: nowrap;
    border: 1px solid rgba(255,190,140,.35); opacity: 0; transition: opacity .15s;
  }
  #foto-etiqueta b { color: #ffb37c; }
  #obturador { position: fixed; inset: 0; pointer-events: none; z-index: 30; }
  #obturador::before, #obturador::after {
    content: ''; position: absolute; left: 0; right: 0; height: 50%; background: #000;
    transform: scaleY(0); transition: transform .09s ease-in;
  }
  #obturador::before { top: 0; transform-origin: top; }
  #obturador::after { bottom: 0; transform-origin: bottom; }
  #obturador.cerrado::before, #obturador.cerrado::after { transform: scaleY(1); }
  #flash { position: fixed; inset: 0; background: #fff; opacity: 0; pointer-events: none; z-index: 31; }
  #flash.disparo { animation: flash .6s ease-out; }
  @keyframes flash { 0% { opacity: .95 } 100% { opacity: 0 } }

  #foto {
    position: fixed; z-index: 20; display: none; cursor: zoom-in;
    background: #f2ebe3; padding: 12px 12px 10px; border-radius: 4px;
    box-shadow: 0 20px 60px rgba(0,0,0,.55);
    transition: all .7s cubic-bezier(.2,.8,.2,1);
    /* grande y centrada */
    left: 50%; top: 50%; width: min(64vw, 820px, calc((100vh - 170px) * 4 / 3)); transform: translate(-50%, -50%) rotate(-1deg);
  }
  #foto.esquina { left: 16px; top: auto; bottom: 64px; width: 230px; transform: none; padding: 6px 6px 4px; }
  #foto.esquina .pie .que, #foto.esquina .pie .ayuda { display: none; }
  #foto .marco { aspect-ratio: 4 / 3; background: #1b1310; overflow: hidden; display: grid; place-items: center; }
  #foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
  #foto img.revelando { animation: revelar 3.2s ease-out forwards; }
  @keyframes revelar {
    0%   { filter: brightness(2.6) contrast(.3) saturate(0) blur(10px); }
    40%  { filter: brightness(1.5) contrast(.6) saturate(.3) blur(4px); }
    100% { filter: none; }
  }
  #foto .pie { color: #2b1d16; font: 12px/1.45 system-ui, sans-serif; padding-top: 8px; display: grid; gap: 2px; }
  #foto .pie .cam { font: 600 13px ui-monospace, Menlo, monospace; color: #a3421c; }
  #foto .pie .que { font-size: 15px; }
  #foto .pie .ayuda { color: #7c6a60; font-size: 11px; }
  #foto .cargando { color: #ffe2c8; font: 13px ui-monospace, monospace; }

  #lupa {
    position: fixed; inset: 0; z-index: 40; display: none; cursor: zoom-out;
    background: rgba(8,4,2,.94); padding: 24px; box-sizing: border-box;
    grid-template-rows: 1fr auto; gap: 12px; justify-items: center;
  }
  #lupa.abierta { display: grid; }
  #lupa img { max-width: 100%; max-height: 100%; object-fit: contain; min-height: 0; }
  #lupa .pie { color: #ffe2c8; font: 13px ui-monospace, Menlo, monospace; text-align: center; }
  #lupa .pie b { color: #ffb37c; }
`;
document.head.appendChild(css);

const etiqueta = Object.assign(document.createElement('div'), { id: 'foto-etiqueta' });
const obturador = Object.assign(document.createElement('div'), { id: 'obturador' });
const flash = Object.assign(document.createElement('div'), { id: 'flash' });
const tarjeta = Object.assign(document.createElement('div'), { id: 'foto' });
const lupa = Object.assign(document.createElement('div'), { id: 'lupa' });
tarjeta.innerHTML = `<div class="marco"></div><div class="pie"><span class="cam"></span><span class="que"></span><span class="credito"></span><span class="ayuda">Clic: ampliar · ← →: más fotos · Esc: volver al juego</span></div>`;
lupa.innerHTML = `<img alt=""><div class="pie"></div>`;
document.body.append(etiqueta, obturador, flash, tarjeta, lupa);

// ---------- 2. Puntos que brillan sobre las cámaras ----------
function texturaBrillo() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,214,120,0.95)');
  grad.addColorStop(0.6, 'rgba(255,140,40,0.35)');
  grad.addColorStop(1, 'rgba(255,120,30,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const puntos = []; // { sprite, cam }
let estado = null; // { cam, indice } de la foto abierta
let temporizador = null;

// Se llama cuando el modelo de la NASA terminó de cargar
export function crearCamarasFoto({ rover, modelo, escena }) {
  const textura = texturaBrillo();
  rover.updateMatrixWorld(true);
  for (const cam of CAMARAS) {
    const pieza = modelo.getObjectByName(cam.pieza);
    if (!pieza) { console.error('No encontré la cámara', cam.pieza); continue; }
    // Centro de la pieza, en coordenadas del rover (así el punto viaja con él)
    const centro = new THREE.Box3().setFromObject(pieza).getCenter(new THREE.Vector3());
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textura, depthTest: false, transparent: true, blending: THREE.AdditiveBlending,
    }));
    sprite.position.copy(rover.worldToLocal(centro));
    sprite.scale.setScalar(0.28);
    sprite.renderOrder = 10;
    sprite.userData.cam = cam;
    rover.add(sprite);
    puntos.push({ sprite, cam });
  }
  // Mastcam-Z y NavCam están juntas en la cabeza del mástil: las separamos un poco para poder elegirlas
  const [mcz, nav] = ['Mastcam-Z', 'NavCam'].map((n) => puntos.find((p) => p.cam.nombre === n)?.sprite);
  if (mcz && nav && mcz.position.distanceTo(nav.position) < 0.5) { mcz.position.y += 0.1; nav.position.y -= 0.1; }

  window.camarasFoto = { puntos, abrir: (i) => tomarFoto(puntos[i].cam), estado: () => estado };
  return puntos;
}

// Latido de los puntos (se llama en cada cuadro)
export function animarCamarasFoto(t) {
  puntos.forEach((p, i) => {
    const s = p.hover ? 0.3 : 0.2 + Math.sin(t * 3 + i) * 0.04;
    p.sprite.scale.setScalar(s);
  });
}

// ---------- 3. Mouse: nombre al pasar, foto al hacer clic ----------
// Elegimos el punto cuyo centro está más cerca del mouse EN LA PANTALLA
// (si dos puntos se tocan, gana el que apuntas, no el que está más adelante)
const pantalla = new THREE.Vector3();
function puntoBajoMouse(e, camara) {
  let mejor = null, mejorDist = 22; // radio de "acierto" en píxeles
  for (const p of puntos) {
    p.sprite.getWorldPosition(pantalla).project(camara);
    if (pantalla.z > 1) continue; // detrás de la cámara
    const x = ((pantalla.x + 1) / 2) * innerWidth, y = ((1 - pantalla.y) / 2) * innerHeight;
    const d = Math.hypot(e.clientX - x, e.clientY - y);
    if (d < mejorDist) { mejor = p; mejorDist = d; }
  }
  return mejor;
}

export function conectarMouse(canvas, camara) {
  let abajo = null;
  canvas.addEventListener('pointermove', (e) => {
    const p = puntoBajoMouse(e, camara);
    puntos.forEach((q) => (q.hover = q === p));
    canvas.style.cursor = p ? 'pointer' : '';
    if (p) {
      etiqueta.innerHTML = `<b>📷 ${p.cam.nombre}</b> · ${p.cam.detalle}`;
      etiqueta.style.left = e.clientX + 'px';
      etiqueta.style.top = e.clientY + 'px';
      etiqueta.style.opacity = 1;
    } else etiqueta.style.opacity = 0;
  });
  // Clic (sin arrastrar, para no confundirlo con girar la cámara)
  canvas.addEventListener('pointerdown', (e) => { abajo = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!abajo || Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y) > 5) return;
    const p = puntoBajoMouse(e, camara);
    if (p) tomarFoto(p.cam);
  });
}

// ---------- 4. Tomar la foto: obturador, flash y revelado ----------
let audio;
function sonidoObturador() {
  try {
    audio ??= new AudioContext();
    const n = audio.sampleRate * 0.08, buf = audio.createBuffer(1, n, audio.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); // "clic" de ruido
    const src = audio.createBufferSource(); src.buffer = buf;
    const g = audio.createGain(); g.gain.value = 0.4;
    src.connect(g).connect(audio.destination); src.start();
  } catch { /* sin sonido no pasa nada */ }
}

function haceCuanto(utc) {
  const dias = Math.floor((Date.now() - Date.parse(utc + 'Z')) / 86400000);
  return dias <= 0 ? 'hoy' : dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
}

function tomarFoto(cam) {
  sonidoObturador();
  obturador.classList.add('cerrado');
  setTimeout(() => {
    obturador.classList.remove('cerrado');
    flash.classList.remove('disparo'); void flash.offsetWidth; flash.classList.add('disparo');
    mostrar(cam, 0, true);
  }, 140);
}

function mostrar(cam, indice, revelar) {
  const fotos = catalogo[cam.instrumento];
  indice = (indice + fotos.length) % fotos.length;
  const f = fotos[indice];
  estado = { cam, indice, foto: f, cargada: false };
  clearTimeout(temporizador);

  tarjeta.classList.remove('esquina');
  tarjeta.style.display = 'block';
  const marco = tarjeta.querySelector('.marco');
  marco.innerHTML = '<span class="cargando">Recibiendo imagen desde Marte…</span>';
  const img = new Image();
  img.alt = f.que;
  img.onload = () => {
    if (estado?.foto !== f) return; // ya se pidió otra
    marco.replaceChildren(img);
    if (revelar) img.classList.add('revelando');
    estado.cargada = true;
    // Grande unos segundos y luego a la esquina, para seguir jugando
    temporizador = setTimeout(() => tarjeta.classList.add('esquina'), revelar ? 9000 : 6000);
  };
  img.onerror = () => { marco.innerHTML = '<span class="cargando">No llegó la imagen. Prueba ← →</span>'; };
  img.src = f.url;

  const texto = `${cam.nombre} · Sol ${f.sol} · ${haceCuanto(f.utc)}`;
  tarjeta.querySelector('.cam').textContent = `📷 ${texto} · ${indice + 1}/${fotos.length}`;
  tarjeta.querySelector('.que').textContent = f.que;
  tarjeta.querySelector('.credito').textContent = 'Foto real: NASA/JPL-Caltech';
  if (lupa.classList.contains('abierta')) abrirLupa();
}

function abrirLupa() {
  if (!estado) return;
  const f = estado.foto;
  lupa.querySelector('img').src = f.url;
  lupa.querySelector('.pie').innerHTML = `<b>${estado.cam.nombre}</b> · Sol ${f.sol} · ${haceCuanto(f.utc)} — ${f.que}<br>← → más fotos · Esc volver al juego · NASA/JPL-Caltech`;
  lupa.classList.add('abierta');
  clearTimeout(temporizador);
}

function cerrarTodo() {
  lupa.classList.remove('abierta');
  tarjeta.style.display = 'none';
  clearTimeout(temporizador);
  estado = null;
}

tarjeta.addEventListener('click', abrirLupa);
lupa.addEventListener('click', () => lupa.classList.remove('abierta'));

// Teclado: mientras hay una foto, las flechas cambian de foto (y no mueven al rover)
addEventListener('keydown', (e) => {
  if (!estado) return;
  if (e.code === 'Escape') { cerrarTodo(); e.stopImmediatePropagation(); return; }
  if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
    e.preventDefault();
    e.stopImmediatePropagation();
    mostrar(estado.cam, estado.indice + (e.code === 'ArrowRight' ? 1 : -1), false);
  }
}, true);
