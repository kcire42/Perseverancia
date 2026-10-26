// =============================================================
// Control de misión de Percy (inspirado en Open MCT de la NASA)
// Igual que en Open MCT:
//   - cada DATO tiene metadatos: nombre, unidad, proveedor y qué significa
//   - cada PROVEEDOR sabe pedir el historial (request) y, si puede, avisar en vivo (subscribe)
// Tecla T: mostrar / ocultar el panel
// =============================================================

// ---------- 1. Registro de proveedores (como openmct.telemetry.addProvider) ----------
const proveedores = [];
function agregarProveedor(p) { proveedores.unshift(p); } // el último registrado tiene prioridad, como en Open MCT
const buscarProveedor = (dato) => proveedores.find((p) => p.soporta(dato));

// ---------- 2. Proveedor A: historial de manejos de la NASA ----------
const URL_WAYPOINTS = '/nasa/mmgis-maps/M20/Layers/json/M20_waypoints.json'; // pasa por el proxy de Vite
let waypoints = null; // se descarga una sola vez y lo comparten los 3 datos
function cargarWaypoints() {
  waypoints ??= fetch(URL_WAYPOINTS)
    .then((r) => { if (!r.ok) throw new Error(`NASA respondió ${r.status}`); return r.json(); })
    .then((j) => j.features.map((f) => f.properties));
  return waypoints;
}
agregarProveedor({
  nombre: 'NASA · MMGIS M20 waypoints',
  soporta: (dato) => ['distancia', 'altura', 'inclinacion'].includes(dato.key),
  async request(dato) {
    const campo = { distancia: 'dist_total_m', altura: 'elev_geoid', inclinacion: 'tilt' }[dato.key];
    const ws = await cargarWaypoints();
    const puntos = ws.map((w) => ({ x: w.sol, y: w[campo] }));
    // Algunos registros traen el total reiniciado: la distancia acumulada nunca puede bajar
    if (dato.key === 'distancia') puntos.forEach((p, i) => { if (i) p.y = Math.max(p.y, puntos[i - 1].y); });
    return puntos;
  },
});

// ---------- 3. Proveedor B: efemérides (posición de los planetas, calculada aquí) ----------
// Elementos orbitales aproximados de JPL (Standish), válidos de 1800 a 2050
const ORBITAS = {
  tierra: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0, 0],
  marte: [1.52371034, 0.00001847, 0.0933941, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
};
const RAD = Math.PI / 180;
function posicion(planeta, fecha) {
  const T = (fecha / 86400000 + 2440587.5 - 2451545) / 36525; // siglos desde el año 2000
  const k = ORBITAS[planeta];
  const a = k[0] + k[1] * T, e = k[2] + k[3] * T, I = (k[4] + k[5] * T) * RAD;
  const L = k[6] + k[7] * T, peri = k[8] + k[9] * T, nodo = (k[10] + k[11] * T) * RAD;
  const argPeri = peri * RAD - nodo;
  const M = (((L - peri) % 360) + 540) % 360 - 180; // anomalía media en grados
  let E = M * RAD;
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M * RAD) / (1 - e * Math.cos(E)); // ecuación de Kepler
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cArg = Math.cos(argPeri), sArg = Math.sin(argPeri), cNodo = Math.cos(nodo), sNodo = Math.sin(nodo), cI = Math.cos(I), sI = Math.sin(I);
  return [
    (cArg * cNodo - sArg * sNodo * cI) * xp + (-sArg * cNodo - cArg * sNodo * cI) * yp,
    (cArg * sNodo + sArg * cNodo * cI) * xp + (-sArg * sNodo + cArg * cNodo * cI) * yp,
    sArg * sI * xp + cArg * sI * yp,
  ];
}
const UA_KM = 149597870.7, LUZ_KM_S = 299792.458;
function minutosLuz(fecha) {
  const t = posicion('tierra', fecha), m = posicion('marte', fecha);
  return (Math.hypot(t[0] - m[0], t[1] - m[1], t[2] - m[2]) * UA_KM) / LUZ_KM_S / 60;
}
// Reloj marciano: sol 0 = aterrizaje (18 feb 2021); un sol dura 88 775 s
const ATERRIZAJE = Date.UTC(2021, 1, 18, 20, 55);
const SOL_MS = 88775244;
export const solDeFecha = (f) => (f - ATERRIZAJE) / SOL_MS;

agregarProveedor({
  nombre: 'Efemérides JPL (calculado en vivo)',
  soporta: (dato) => dato.key === 'luz',
  async request() {
    const puntos = [];
    for (let f = ATERRIZAJE; f <= Date.now(); f += SOL_MS) puntos.push({ x: solDeFecha(f), y: minutosLuz(f) });
    return puntos;
  },
  subscribe(dato, callback) {
    const tic = () => callback({ x: solDeFecha(Date.now()), y: minutosLuz(Date.now()) });
    tic();
    const id = setInterval(tic, 1000);
    return () => clearInterval(id);
  },
});

// ---------- 4. Metadatos de cada dato (como telemetry.values en Open MCT) ----------
const DATOS = [
  { key: 'distancia', nombre: 'Distancia recorrida', unidad: 'km', escala: 0.001, decimales: 2,
    frase: (v) => `Percy ha manejado ${v.toFixed(1)} km por el cráter Jezero: ¡como ${Math.floor(v / 0.105)} canchas de fútbol puestas en fila!` },
  { key: 'altura', nombre: 'Altura del terreno', unidad: 'm', escala: 1, decimales: 0,
    frase: (v, d) => `Está ${Math.abs(v).toFixed(0)} m bajo el "nivel del mar" de Marte. Ya subió ${(v - d[0].y).toFixed(0)} m desde el fondo del cráter, trepando el borde.` },
  { key: 'inclinacion', nombre: 'Inclinación', unidad: '°', escala: 1, decimales: 1,
    frase: (v, d) => `En su última parada el suelo estaba inclinado ${v.toFixed(1)}°. Lo más empinado que ha pisado: ${Math.max(...d.map((p) => p.y)).toFixed(1)}°.` },
  { key: 'luz', nombre: 'Luz Tierra → Marte', unidad: 'min', escala: 1, decimales: 2, vivo: true,
    frase: (v) => `Una orden enviada ahora desde la Tierra tarda ${Math.floor(v)} min ${Math.round((v % 1) * 60)} s en llegar. Por eso Percy maneja solo: no se puede usar un control remoto.` },
];

// ---------- 5. Interfaz del panel ----------
const css = document.createElement('style');
css.textContent = `
  #mision {
    position: fixed; top: 16px; right: 16px; width: 316px; max-height: calc(100vh - 32px); overflow-y: auto;
    padding: 12px 14px; border-radius: 10px; display: grid; gap: 10px;
    background: rgba(20, 10, 6, 0.6); backdrop-filter: blur(6px);
    border: 1px solid rgba(255, 190, 140, 0.25);
    color: #ffe2c8; font: 12px/1.45 ui-monospace, Menlo, monospace;
    transition: opacity .25s, transform .25s;
  }
  #mision.oculto { opacity: 0; transform: translateX(20px); pointer-events: none; }
  #mision h1 { margin: 0; font-size: 12px; letter-spacing: 2px; color: #ff9a5c; display: flex; justify-content: space-between; }
  #mision h1 small { color: #c9a58c; letter-spacing: 0; font-weight: normal; }
  .dato { border-top: 1px solid rgba(255, 190, 140, 0.18); padding-top: 8px; display: grid; gap: 4px; }
  .dato .fila { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .dato .nombre { color: #ffcfae; white-space: nowrap; }
  .dato .valor { white-space: nowrap; color: #fff; font-size: 18px; font-weight: bold; font-variant-numeric: tabular-nums; }
  .dato .valor small { font-size: 11px; color: #ffcfae; font-weight: normal; }
  .dato canvas { width: 100%; height: 38px; display: block; }
  .dato .frase { color: #f3dccb; font-family: system-ui, sans-serif; font-size: 12px; }
  .dato .fuente { color: #a88a77; font-size: 10px; }
  .vivo { color: #7dff9a; animation: latido 1.2s infinite; }
  @keyframes latido { 50% { opacity: .35; } }
`;
document.head.appendChild(css);

const panel = document.createElement('div');
panel.id = 'mision';
panel.innerHTML = `<h1>CONTROL DE MISIÓN · M2020 <small>[T] ocultar</small></h1>` + DATOS.map((d) => `
  <div class="dato" id="d-${d.key}">
    <div class="fila"><span class="nombre">${d.nombre}${d.vivo ? ' <span class="vivo">● vivo</span>' : ''}</span>
      <span class="valor">…</span></div>
    <canvas width="576" height="88"></canvas>
    <div class="frase">Cargando…</div>
    <div class="fuente"></div>
  </div>`).join('');
document.body.appendChild(panel);

addEventListener('keydown', (e) => {
  if (e.code === 'KeyT') panel.classList.toggle('oculto');
});

// Gráfica de toda la misión: área suave, línea y punto final resaltado
function graficar(canvas, puntos) {
  const c = canvas.getContext('2d'), W = canvas.width, H = canvas.height, m = 6;
  const xs = puntos.map((p) => p.x), ys = puntos.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const X = (x) => m + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * m);
  const Y = (y) => H - m - ((y - y0) / (y1 - y0 || 1)) * (H - 2 * m);
  c.clearRect(0, 0, W, H);
  c.strokeStyle = 'rgba(255,190,140,0.12)'; c.lineWidth = 1;
  for (const f of [0.25, 0.5, 0.75]) { c.beginPath(); c.moveTo(m, m + f * (H - 2 * m)); c.lineTo(W - m, m + f * (H - 2 * m)); c.stroke(); }
  c.beginPath();
  puntos.forEach((p, i) => (i ? c.lineTo(X(p.x), Y(p.y)) : c.moveTo(X(p.x), Y(p.y))));
  c.lineTo(X(x1), H - m); c.lineTo(X(x0), H - m); c.closePath();
  c.fillStyle = 'rgba(255,140,80,0.18)'; c.fill();
  c.beginPath();
  puntos.forEach((p, i) => (i ? c.lineTo(X(p.x), Y(p.y)) : c.moveTo(X(p.x), Y(p.y))));
  c.strokeStyle = '#ff9a5c'; c.lineWidth = 2.5; c.stroke();
  const u = puntos[puntos.length - 1];
  c.beginPath(); c.arc(X(u.x), Y(u.y), 5, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
}

// ---------- 6. Conectar cada dato con su proveedor ----------
// Estado público: npm run check lo lee para confirmar que los 4 datos cargaron
export const estado = {};
window.controlMision = { estado, panel };

for (const dato of DATOS) {
  const caja = document.getElementById('d-' + dato.key);
  const proveedor = buscarProveedor(dato);
  estado[dato.key] = { nombre: dato.nombre, unidad: dato.unidad, proveedor: proveedor.nombre, valor: null, puntos: 0 };

  const mostrar = (puntos) => {
    const v = puntos[puntos.length - 1].y * dato.escala;
    caja.querySelector('.valor').innerHTML = `${v.toLocaleString('es', { minimumFractionDigits: dato.decimales, maximumFractionDigits: dato.decimales })} <small>${dato.unidad}</small>`;
    caja.querySelector('.frase').textContent = dato.frase(v, puntos.map((p) => ({ x: p.x, y: p.y * dato.escala })));
    caja.querySelector('.fuente').textContent = `${proveedor.nombre} · sol ${Math.floor(puntos[puntos.length - 1].x)} · ${puntos.length} puntos`;
    graficar(caja.querySelector('canvas'), puntos);
    Object.assign(estado[dato.key], { valor: v, puntos: puntos.length });
  };

  proveedor.request(dato)
    .then((historial) => {
      mostrar(historial);
      // Si el proveedor sabe dar datos en vivo, nos suscribimos (como telemetry.subscribe)
      proveedor.subscribe?.(dato, (p) => { historial.push(p); mostrar(historial); historial.pop(); });
    })
    .catch((e) => {
      caja.querySelector('.frase').textContent = 'No se pudo cargar: ' + e.message;
      console.error(`Control de misión: ${dato.nombre} no cargó`, e);
    });
}
