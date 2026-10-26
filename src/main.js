// =============================================================
// Paisaje de Marte — Vite + Three.js
// Dunas, rocas, cielo marciano, sombras suaves, Fobos y Deimos
// =============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { crearRover, cargarRoverNASA } from './rover.js';
import { actualizarTelemetria } from './telemetria.js';
import './mision.js';
import { crearCamarasFoto, animarCamarasFoto, conectarMouse } from './fotos.js'; // fotos reales de Marte // control de misión con datos reales de la NASA (tecla T)

// ---------- 1. Renderizador ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // sombras filtradas; el radio las suaviza
renderer.toneMapping = THREE.ACESFilmicToneMapping; // look de cine
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG = new THREE.Color(0xc98a5e);
scene.fog = new THREE.FogExp2(FOG, 0.0055); // polvo en el aire

// ---------- 2. Cámara y controles ----------
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 3000);
camera.position.set(-6, 3.2, 9); // cerca del rover
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.4, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;

// ---------- 3. Ruido (para dunas y rocas) ----------
// Ruido de valor simple + fBm (suma de varias capas de ruido)
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, oct = 5) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += amp * noise(x * f, y * f); f *= 2; amp *= 0.5; }
  return v;
}

// Altura del terreno: colinas suaves + crestas de dunas asimétricas
function altura(x, z) {
  const colinas = (fbm(x * 0.006, z * 0.006, 4) - 0.5) * 30;
  const w = (fbm(x * 0.02 + 10, z * 0.02) - 0.5) * 18; // deforma las crestas
  const fase = (x * 0.09 + z * 0.04 + w) % (Math.PI * 2);
  const duna = Math.pow(Math.abs(Math.sin(fase * 0.5)), 1.6) * 4.5; // perfil con cresta
  const detalle = (fbm(x * 0.15, z * 0.15, 3) - 0.5) * 0.8;
  // Zona central más plana para mirar el paisaje
  const plano = THREE.MathUtils.smoothstep(Math.hypot(x, z), 10, 60);
  return (colinas + duna) * (0.35 + 0.65 * plano) + detalle;
}

// ---------- 4. Terreno (dunas) ----------
const SIZE = 1400, SEG = 400;
const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
geo.rotateX(-Math.PI / 2);
const pos = geo.attributes.position;
for (let i = 0; i < pos.count; i++) pos.setY(i, altura(pos.getX(i), pos.getZ(i)));
geo.computeVertexNormals();

// Color por altura y pendiente: arena ocre en crestas, óxido oscuro en valles y laderas
const colores = new Float32Array(pos.count * 3);
const nrm = geo.attributes.normal;
const cArena = new THREE.Color(0xd08a55), cOxido = new THREE.Color(0x8a3a1c), cOscuro = new THREE.Color(0x5a2614);
const tmp = new THREE.Color();
for (let i = 0; i < pos.count; i++) {
  const h = pos.getY(i), pend = 1 - nrm.getY(i);
  const n = fbm(pos.getX(i) * 0.05, pos.getZ(i) * 0.05, 3);
  tmp.copy(cOxido).lerp(cArena, THREE.MathUtils.clamp(0.5 + h * 0.05 + (n - 0.5), 0, 1));
  tmp.lerp(cOscuro, THREE.MathUtils.clamp(pend * 3, 0, 0.7));
  colores.set([tmp.r, tmp.g, tmp.b], i * 3);
}
geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
const terreno = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
terreno.receiveShadow = true;
terreno.castShadow = true;
scene.add(terreno);

// ---------- 5. Cielo marciano (shader) ----------
const sunDir = new THREE.Vector3(-0.75, 0.16, -0.55).normalize(); // sol bajo: atardecer
const cielo = new THREE.Mesh(
  new THREE.SphereGeometry(2000, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: sunDir } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 sunDir; varying vec3 vDir;
      void main(){
        float h = clamp(vDir.y, -0.1, 1.0);
        vec3 horizonte = vec3(0.86, 0.58, 0.40);
        vec3 cenit = vec3(0.36, 0.20, 0.15);
        vec3 col = mix(horizonte, cenit, pow(max(h,0.0), 0.55));
        float s = max(dot(normalize(vDir), sunDir), 0.0);
        col = mix(col, vec3(0.55, 0.68, 0.85), pow(s, 12.0) * 0.8); // halo azul (atardecer marciano)
        col += vec3(1.0, 0.95, 0.9) * pow(s, 900.0) * 3.0;           // disco del sol
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
);
scene.add(cielo);

// ---------- 6. Luces y sombras suaves ----------
scene.add(new THREE.HemisphereLight(0xe8b48a, 0x4a2010, 0.9));
const sol = new THREE.DirectionalLight(0xffd6b0, 3.2);
sol.position.copy(sunDir).multiplyScalar(150);
sol.castShadow = true;
sol.shadow.mapSize.set(4096, 4096);
const sc = sol.shadow.camera;
sc.left = -120; sc.right = 120; sc.top = 120; sc.bottom = -120; sc.near = 1; sc.far = 400;
sol.shadow.radius = 6;
sol.shadow.bias = -0.0005;
sol.shadow.normalBias = 0.05;
scene.add(sol);

// ---------- 7. Rocas (InstancedMesh) ----------
function geoRoca(seed) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 0.7 + fbm(v.x * 1.5 + seed, v.y * 1.5 + v.z, 3) * 0.7;
    v.multiplyScalar(k); v.y *= 0.6; // rocas achatadas
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
const matRoca = new THREE.MeshStandardMaterial({ color: 0x5e3020, roughness: 0.9, flatShading: true });
const dummy = new THREE.Object3D();
const obstaculos = []; // rocas grandes con las que el rover choca
let rnd = 1;
const azar = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
for (let t = 0; t < 4; t++) {
  const N = 220;
  const rocas = new THREE.InstancedMesh(geoRoca(t * 7.3), matRoca, N);
  rocas.castShadow = rocas.receiveShadow = true;
  for (let i = 0; i < N; i++) {
    const r = 12 + Math.pow(azar(), 0.9) * 170, a = azar() * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const s = 0.15 + Math.pow(azar(), 5) * 2.2; // muchas piedritas, pocas grandes
    dummy.position.set(x, altura(x, z) + s * 0.15, z);
    dummy.rotation.set(azar() * 0.5, azar() * 6.28, azar() * 0.5);
    dummy.scale.set(s * (0.8 + azar() * 0.6), s, s * (0.8 + azar() * 0.6));
    if (s > 0.45) obstaculos.push({ x, z, r: Math.max(dummy.scale.x, dummy.scale.z) });
    dummy.updateMatrix();
    rocas.setMatrixAt(i, dummy.matrix);
  }
  scene.add(rocas);
}

// ---------- 8. Fobos y Deimos ----------
function luna(radio, color, seed) {
  const g = geoRoca(seed);
  g.scale(radio, radio * 1.4, radio); // forma de papa
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    color, roughness: 1, flatShading: true, emissive: 0x2a1a14, fog: false,
  }));
  return m;
}
const fobos = luna(22, 0x9a8778, 3.1);

const deimos = luna(11, 0xb0a090, 9.4);
// Colocamos las lunas en el cielo según la vista inicial de la cámara
function enCielo(obj, lado, alto, dist) {
  const adelante = controls.target.clone().sub(camera.position).setY(0).normalize();
  const derecha = new THREE.Vector3(-adelante.z, 0, adelante.x);
  obj.position.copy(camera.position).addScaledVector(adelante, dist).addScaledVector(derecha, lado).setY(alto);
}
enCielo(fobos, 260, 230, 900);   // Fobos: derecha, más grande
enCielo(deimos, -300, 230, 950); // Deimos: izquierda, más pequeña
scene.add(fobos, deimos);
// Luz propia para que las lunas se vean iluminadas por el sol
const luzLunas = new THREE.DirectionalLight(0xffe2c8, 1.5);
luzLunas.position.set(-1, 0.3, 0.2);
scene.add(luzLunas);

// ---------- 8b. Rover Perseverance (ver src/rover.js) ----------
const creado = crearRover(); // rover de figuras: se ve mientras carga el modelo de la NASA
const rover = creado.rover;
let ruedas = creado.ruedas;   // puntos de las ruedas (para el polvo y las huellas)
let ruedasNASA = [];         // ruedas del modelo de la NASA, con dirección y giro
rover.rotation.order = 'YXZ'; // primero giro (Y), luego inclinación (X) y ladeo (Z)
rover.position.set(0, altura(0, 0), 0);
rover.rotation.y = 0.5; // ligeramente girado hacia la cámara
scene.add(rover);
// La cámara mira al rover, sin importar la altura del suelo
const hRover = rover.position.y;
controls.target.set(0, hRover + 1.1, 0);
camera.position.set(-5.5, hRover + 2.6, 7);

// ---------- 8c. Modelo 3D oficial de la NASA ----------
let camarasRover = []; // piezas que son cámaras: las usaremos al final
cargarRoverNASA(rover)
  .then((r) => {
    ruedasNASA = r.ruedas;
    ruedas = r.ruedas.map((w) => w.pivote);
    window.ruedasRover = ruedasNASA; // para que npm run check revise la física de las ruedas
    camarasRover = r.camaras;
    window.camarasRover = camarasRover; // para explorarlas desde la consola del navegador
    console.log(`🚙 Rover NASA cargado: ${r.medidas.x.toFixed(2)} × ${r.medidas.y.toFixed(2)} × ${r.medidas.z.toFixed(2)} m (ancho × alto × largo)`);
    console.log('📷 Piezas que son cámaras:', camarasRover.map((c) => c.name));
    crearCamarasFoto({ rover, modelo: r.modelo }); // puntos que brillan: clic = foto real
  })
  .catch((e) => console.error('No se pudo cargar el modelo de la NASA:', e));

// ---------- 9. Polvo flotante ----------
const NP = 1500;
const pp = new Float32Array(NP * 3);
for (let i = 0; i < NP; i++) pp.set([(azar() - 0.5) * 200, azar() * 25, (azar() - 0.5) * 200], i * 3);
const gPolvo = new THREE.BufferGeometry();
gPolvo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
const polvo = new THREE.Points(gPolvo, new THREE.PointsMaterial({
  color: 0xe8b890, size: 0.12, transparent: true, opacity: 0.5, depthWrite: false,
}));
scene.add(polvo);

// ---------- 10. Controles del rover (W A S D / flechas) ----------
const teclas = {};
addEventListener('keydown', (e) => { teclas[e.code] = true; });
addEventListener('keyup', (e) => { teclas[e.code] = false; });

const VEL_MAX = 4;    // m/s (el real va a ~0.04 m/s, ¡aquí aceleramos!)
const GIRO = 0.9;     // rad/s
const RADIO_RUEDA = 0.26;
let velocidad = 0;
let rumbo = rover.rotation.y;
const sombraOffset = sol.position.clone(); // la luz del sol sigue al rover
scene.add(sol.target);

function conducir(dt) {
  // Acelerar / frenar con inercia suave
  const adelante = (teclas.KeyW || teclas.ArrowUp ? 1 : 0) - (teclas.KeyS || teclas.ArrowDown ? 1 : 0);
  const giro = (teclas.KeyA || teclas.ArrowLeft ? 1 : 0) - (teclas.KeyD || teclas.ArrowRight ? 1 : 0);
  velocidad = THREE.MathUtils.lerp(velocidad, adelante * VEL_MAX, 1 - Math.exp(-dt * 2));
  rumbo += giro * GIRO * dt * (adelante < 0 ? -1 : 1);

  // Mover en la dirección del rumbo (el frente del rover es +Z)
  const antes = rover.position.clone();
  rover.position.x += Math.sin(rumbo) * velocidad * dt;
  rover.position.z += Math.cos(rumbo) * velocidad * dt;
  // ¿Chocamos con una roca grande? Entonces volvemos atrás y frenamos
  // Si toca una roca grande, lo empujamos hasta su borde: así se desliza alrededor en vez de atascarse
  for (const o of obstaculos) {
    const dx = rover.position.x - o.x, dz = rover.position.z - o.z;
    const d = Math.hypot(dx, dz), minimo = o.r + 1.9;
    if (d < minimo && d > 0.001) {
      rover.position.x = o.x + (dx / d) * minimo;
      rover.position.z = o.z + (dz / d) * minimo;
      velocidad *= 0.9; // el roce lo frena un poco
    }
  }

  // Adaptarse al terreno: medimos la altura en 4 puntos alrededor del rover
  const { x, z } = rover.position;
  const fx = Math.sin(rumbo), fz = Math.cos(rumbo);  // hacia adelante
  const rx = fz, rz = -fx;                            // hacia el costado +X
  const hF = altura(x + fx * 1.4, z + fz * 1.4), hB = altura(x - fx * 1.4, z - fz * 1.4);
  const hR = altura(x + rx * 1.2, z + rz * 1.2), hL = altura(x - rx * 1.2, z - rz * 1.2);
  const hCentro = (hF + hB + hR + hL) / 4;
  rover.position.y = THREE.MathUtils.lerp(rover.position.y, hCentro, 0.2);
  rover.rotation.y = rumbo;
  rover.rotation.x = THREE.MathUtils.lerp(rover.rotation.x, Math.atan2(hB - hF, 2.8), 0.15); // cabeceo
  rover.rotation.z = THREE.MathUtils.lerp(rover.rotation.z, Math.atan2(hR - hL, 2.4), 0.15); // ladeo

  // Ruedas con física real (ver moverRuedas)
  moverRuedas(dt, velocidad, (giro * GIRO * (adelante < 0 ? -1 : 1)));

  // La cámara orbital acompaña al rover (se mueve lo mismo que él)
  const delta = rover.position.clone().sub(antes);
  camera.position.add(delta);
  controls.target.add(delta);

  // El sol y su sombra siguen al rover, para que siempre tenga sombra nítida
  sol.position.copy(rover.position).add(sombraOffset);
  sol.target.position.copy(rover.position);
}

// ---------- 10b. Física de las ruedas ----------
// El rover avanza a velocidad v y gira a velocidad angular w. Cada rueda, según dónde está,
// se mueve a  v_rueda = v·(adelante) + w × (posición de la rueda)
//  - DIRECCIÓN: la rueda apunta hacia donde se mueve (solo las 4 de las esquinas, como el real)
//  - GIRO: rueda tanto como avanza:  ángulo = distancia / radio
function moverRuedas(dt, v, w) {
  if (!ruedasNASA.length) { // rover de figuras (mientras carga): giro simple
    for (const r of ruedas) r.rotation.x += (v * dt) / RADIO_RUEDA;
    return;
  }
  for (const r of ruedasNASA) {
    const { x, z } = r.local;
    const vx = w * z, vz = v - w * x;               // velocidad de esta rueda (coordenadas del rover)
    const rapidez = Math.hypot(vx, vz);
    if (r.orientable && rapidez > 0.05) {
      let angulo = Math.atan2(vx, vz);
      if (angulo > Math.PI / 2) angulo -= Math.PI;  // en reversa la rueda no da media vuelta:
      if (angulo < -Math.PI / 2) angulo += Math.PI; // apunta igual y rueda hacia atrás
      r.pivote.rotation.y = THREE.MathUtils.lerp(r.pivote.rotation.y, angulo, 1 - Math.exp(-dt * 8));
    }
    // Lo que avanza la rueda en la dirección en que apunta
    const a = r.pivote.rotation.y;
    const avance = vx * Math.sin(a) + vz * Math.cos(a);
    r.giro.rotation.x += (avance * dt) / r.radio;
  }
}

conectarMouse(renderer.domElement, camera);
window.percy = { camera, controls, rover }; // para que npm run check pueda mirar desde un buen ángulo

// ---------- 11. Polvo que levantan las ruedas ----------
// Un "estanque" de partículas que se reciclan: nacen en las ruedas, suben, crecen y se desvanecen
const NPOLVO = 600;
const gRastro = new THREE.BufferGeometry();
const pPos = new Float32Array(NPOLVO * 3);
const pVida = new Float32Array(NPOLVO);   // 1 = recién nacida, 0 = muerta
const pVel = new Float32Array(NPOLVO * 3);
gRastro.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
gRastro.setAttribute('vida', new THREE.BufferAttribute(pVida, 1));
const rastro = new THREE.Points(gRastro, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  vertexShader: `
    attribute float vida; varying float vVida;
    void main(){
      vVida = vida;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = ((1.0 - vida) * 2.2 + 0.4) * 300.0 / -mv.z; // crece al envejecer
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying float vVida;
    void main(){
      float d = length(gl_PointCoord - 0.5);
      if (vVida <= 0.0 || d > 0.5) discard;
      float a = smoothstep(0.5, 0.0, d) * vVida * 0.6; // nube suave que se desvanece
      gl_FragColor = vec4(0.80, 0.55, 0.38, a);
    }`,
}));
rastro.frustumCulled = false;
scene.add(rastro);

let siguiente = 0, acumulado = 0;
const pRueda = new THREE.Vector3();
function actualizarPolvo(dt) {
  // Emitir partículas según la velocidad (más rápido = más polvo)
  acumulado += Math.abs(velocidad) * dt * 40;
  while (acumulado >= 1) {
    acumulado -= 1;
    const rueda = ruedas[Math.floor(Math.random() * ruedas.length)];
    rueda.getWorldPosition(pRueda);
    const i = siguiente; siguiente = (siguiente + 1) % NPOLVO;
    pPos.set([pRueda.x + (Math.random() - 0.5) * 0.4, pRueda.y - 0.15, pRueda.z + (Math.random() - 0.5) * 0.4], i * 3);
    pVel.set([(Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6], i * 3);
    pVida[i] = 1;
  }
  // Mover y envejecer las partículas vivas
  for (let i = 0; i < NPOLVO; i++) {
    if (pVida[i] <= 0) continue;
    pVida[i] -= dt * 0.6;
    pPos[i * 3] += (pVel[i * 3] + 0.4) * dt;      // + un poco de viento
    pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
    pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
    pVel[i * 3 + 1] *= 0.98;
  }
  gRastro.attributes.position.needsUpdate = true;
  gRastro.attributes.vida.needsUpdate = true;
}

// ---------- 11b. Huellas de las ruedas ----------
// Marcas oscuras en la arena: un InstancedMesh que recicla las huellas más viejas
const NHUELLAS = 6000;
const gHuella = new THREE.PlaneGeometry(0.4, 0.2).rotateX(-Math.PI / 2);
const huellas = new THREE.InstancedMesh(gHuella, new THREE.MeshStandardMaterial({
  color: 0x5a2410, roughness: 1, transparent: true, opacity: 0.3, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -2,
}), NHUELLAS);
huellas.receiveShadow = true;
huellas.count = 0;
huellas.frustumCulled = false;
scene.add(huellas);

let huellaSiguiente = 0, desdeUltimaHuella = 0;
const pHuella = new THREE.Vector3(), mHuella = new THREE.Object3D();
function actualizarHuellas(avance) {
  desdeUltimaHuella += avance;
  if (desdeUltimaHuella < 0.15) return; // una marca cada 15 cm: se superponen y forman una línea continua
  desdeUltimaHuella = 0;
  for (const rueda of ruedas) {
    rueda.getWorldPosition(pHuella);
    mHuella.position.set(pHuella.x, altura(pHuella.x, pHuella.z) + 0.04, pHuella.z);
    mHuella.rotation.set(0, rumbo, 0);
    mHuella.updateMatrix();
    huellas.setMatrixAt(huellaSiguiente, mHuella.matrix);
    huellaSiguiente = (huellaSiguiente + 1) % NHUELLAS;
    huellas.count = Math.min(huellas.count + 1, NHUELLAS);
  }
  huellas.instanceMatrix.needsUpdate = true;
}

// ---------- 12. Cámara de seguimiento (tecla C) ----------
let modoCamara = 'seguimiento'; // la cámara sigue al rover desde el inicio
controls.enabled = false;
addEventListener('keydown', (e) => {
  if (e.code !== 'KeyC') return;
  modoCamara = modoCamara === 'orbital' ? 'seguimiento' : 'orbital';
  controls.enabled = modoCamara === 'orbital';
  if (controls.enabled) controls.target.copy(rover.position).y += 1.1;
});
const camDeseada = new THREE.Vector3(), miraRover = new THREE.Vector3();
function camaraSeguimiento(dt) {
  // Detrás y un poco arriba del rover, con movimiento suave
  camDeseada.set(-Math.sin(rumbo) * 7, 3, -Math.cos(rumbo) * 7).add(rover.position);
  camDeseada.y = Math.max(camDeseada.y, altura(camDeseada.x, camDeseada.z) + 1.5); // no entrar en la duna
  camera.position.lerp(camDeseada, 1 - Math.exp(-dt * 3));
  miraRover.copy(rover.position).y += 1.2;
  camera.lookAt(miraRover);
}

// ---------- 13. Animación ----------
const reloj = new THREE.Timer();
let distancia = 0;
renderer.setAnimationLoop(() => {
  reloj.update();
  const dt = Math.min(reloj.getDelta(), 0.05);
  const t = reloj.getElapsed();
  const antes = rover.position.clone();
  conducir(dt);
  const avance = rover.position.distanceTo(antes);
  distancia += avance;
  actualizarHuellas(avance);
  actualizarPolvo(dt);
  if (modoCamara === 'seguimiento') camaraSeguimiento(dt);
  actualizarTelemetria(dt, {
    velocidad, rumbo, distancia, t,
    elevacion: rover.position.y, cabeceo: rover.rotation.x, ladeo: rover.rotation.z,
    camara: modoCamara === 'orbital' ? 'Orbital' : 'Seguimiento',
  });
  polvo.position.x = (t * 1.5) % 40;      // el viento arrastra el polvo
  fobos.rotation.y = t * 0.05;
  animarCamarasFoto(t);
  deimos.rotation.y = -t * 0.03;
  if (controls.enabled) controls.update();
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
