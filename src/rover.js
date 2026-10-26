// =============================================================
// Rover Perseverance hecho con figuras geométricas
// Medidas aproximadas en metros: 3 m de largo, 2.7 m de ancho, 2.2 m de alto
// El frente del rover mira hacia +Z
// =============================================================
import * as THREE from 'three';

// ---------- Materiales ----------
const blanco = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.6, metalness: 0.2 });
const gris = new THREE.MeshStandardMaterial({ color: 0x8a8d90, roughness: 0.5, metalness: 0.6 });
const oscuro = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.8, metalness: 0.3 });
const dorado = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.35, metalness: 0.9 });
const lente = new THREE.MeshStandardMaterial({ color: 0x0a1a2a, roughness: 0.1, metalness: 0.9 });

// Ayudante: crea una pieza, la posiciona y activa sus sombras
function pieza(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
const caja = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const tubo = (r, largo) => new THREE.CylinderGeometry(r, r, largo, 12);

// ---------- Rueda (aluminio con banda de rodadura) ----------
function crearRueda() {
  const rueda = new THREE.Group();
  const llanta = pieza(new THREE.CylinderGeometry(0.26, 0.26, 0.4, 24), gris);
  llanta.rotation.z = Math.PI / 2;
  rueda.add(llanta);
  // Tacos de la banda de rodadura
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const taco = pieza(caja(0.42, 0.03, 0.05), oscuro, 0, Math.cos(a) * 0.265, Math.sin(a) * 0.265);
    taco.rotation.x = -a;
    rueda.add(taco);
  }
  // Tapa central
  const tapa = pieza(new THREE.CylinderGeometry(0.1, 0.1, 0.42, 12), oscuro);
  tapa.rotation.z = Math.PI / 2;
  rueda.add(tapa);
  return rueda;
}

export function crearRover() {
  const rover = new THREE.Group();
  const ruedas = []; // las guardamos para hacerlas girar en la Fase 3

  // ---------- Cuerpo (chasis) ----------
  const cuerpo = new THREE.Group();
  cuerpo.position.y = 1.0;
  rover.add(cuerpo);
  cuerpo.add(pieza(caja(1.9, 0.55, 2.6), blanco));                 // caja principal
  cuerpo.add(pieza(caja(1.95, 0.06, 2.65), gris, 0, 0.3, 0));      // tapa superior
  cuerpo.add(pieza(caja(1.6, 0.25, 0.3), oscuro, 0, -0.1, 1.35));   // frente
  // Antena de alta ganancia (disco) y antena UHF
  const disco = pieza(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 24), gris, 0.6, 0.5, -0.3);
  disco.rotation.x = Math.PI / 2.5;
  cuerpo.add(disco, pieza(tubo(0.03, 0.3), gris, 0.6, 0.38, -0.3));
  cuerpo.add(pieza(tubo(0.05, 0.35), blanco, -0.6, 0.5, -0.6));

  // ---------- Suspensión rocker-bogie + 6 ruedas ----------
  // Cada lado: un "rocker" largo (rueda delantera) unido a un "bogie" (ruedas media y trasera)
  for (const lado of [-1, 1]) {
    const x = lado * 1.25;
    const suspension = new THREE.Group();
    suspension.position.set(x, 0, 0);
    rover.add(suspension);

    // Pivote del rocker en el costado del cuerpo
    suspension.add(pieza(tubo(0.09, 0.2).rotateZ(Math.PI / 2), gris, -lado * 0.1, 0.95, 0.2));
    // Rocker: brazo hacia la rueda delantera
    const rocker = pieza(caja(0.08, 0.08, 1.3), blanco, 0, 0.65, 0.75);
    rocker.rotation.x = 0.55;
    suspension.add(rocker);
    // Rocker: brazo hacia atrás, hasta el pivote del bogie
    const rockerAtras = pieza(caja(0.08, 0.08, 0.9), blanco, 0, 0.8, -0.2);
    rockerAtras.rotation.x = -0.35;
    suspension.add(rockerAtras);
    // Bogie: barra que une la rueda media y la trasera
    suspension.add(pieza(caja(0.08, 0.08, 1.35), blanco, 0, 0.55, -0.85));
    suspension.add(pieza(tubo(0.07, 0.15).rotateZ(Math.PI / 2), gris, 0, 0.62, -0.5));

    // Patas verticales que bajan a cada rueda
    for (const z of [1.25, -0.2, -1.5]) {
      suspension.add(pieza(caja(0.07, 0.4, 0.07), gris, 0, 0.45, z));
      const rueda = crearRueda();
      rueda.position.set(lado * 0.1, 0.26, z);
      suspension.add(rueda);
      ruedas.push(rueda);
    }
  }

  // ---------- Mástil con Mastcam-Z ----------
  const mastil = new THREE.Group();
  mastil.position.set(0.65, 1.3, 1.0);
  rover.add(mastil);
  mastil.add(pieza(tubo(0.06, 1.3), blanco, 0, 0.65, 0));
  const cabeza = new THREE.Group();
  cabeza.position.y = 1.35;
  mastil.add(cabeza);
  cabeza.add(pieza(caja(0.55, 0.22, 0.25), blanco));
  cabeza.add(pieza(caja(0.2, 0.12, 0.14), gris, 0, 0.17, 0)); // SuperCam
  // Dos cámaras Mastcam-Z (ojos estéreo) + lente de SuperCam
  for (const dx of [-0.15, 0.15]) {
    const cam = pieza(tubo(0.055, 0.12).rotateX(Math.PI / 2), oscuro, dx, -0.02, 0.17);
    cabeza.add(cam, pieza(new THREE.CircleGeometry(0.04, 16), lente, dx, -0.02, 0.235));
  }
  cabeza.add(pieza(new THREE.CircleGeometry(0.05, 16), lente, 0, 0.17, 0.075));

  // ---------- Brazo robótico (5 articulaciones simplificadas) ----------
  const brazo = new THREE.Group();
  brazo.position.set(-0.55, 1.0, 1.35);
  rover.add(brazo);
  brazo.add(pieza(new THREE.SphereGeometry(0.1, 12, 12), gris));       // hombro
  const segmento1 = pieza(tubo(0.05, 1.0).rotateX(Math.PI / 2), blanco, 0, 0, 0.5);
  brazo.add(segmento1);
  const codo = new THREE.Group();
  codo.position.set(0, 0, 1.0);
  codo.rotation.x = 0.9; // el brazo baja hacia el suelo
  brazo.add(codo);
  codo.add(pieza(new THREE.SphereGeometry(0.09, 12, 12), gris));
  codo.add(pieza(tubo(0.045, 0.7).rotateX(Math.PI / 2), blanco, 0, 0, 0.35));
  // Torreta con herramientas (taladro, PIXL, SHERLOC)
  const torreta = pieza(new THREE.DodecahedronGeometry(0.18), gris, 0, 0, 0.75);
  codo.add(torreta, pieza(tubo(0.025, 0.25), dorado, 0, -0.18, 0.75));

  // ---------- Generador RTG (atrás, inclinado, con aletas) ----------
  const rtg = new THREE.Group();
  rtg.position.set(0, 1.25, -1.5);
  rtg.rotation.x = -0.6;
  rover.add(rtg);
  rtg.add(pieza(tubo(0.18, 0.75), oscuro));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const aleta = pieza(caja(0.02, 0.7, 0.22), oscuro, Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25);
    aleta.rotation.y = -a;
    rtg.add(aleta);
  }
  rtg.add(pieza(tubo(0.12, 0.08), dorado, 0, 0.41, 0));

  return { rover, ruedas };
}

// =============================================================
// Rover oficial de la NASA (modelo glTF de NASA-3D-Resources)
// =============================================================
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// El modelo de la NASA ya viene en metros reales: sus ruedas miden 0.52 m, como las del rover verdadero

// Carga el modelo y lo mete dentro del grupo "rover" (reemplaza al rover de figuras).
// Devuelve las posiciones de las ruedas (para el polvo y las huellas) y las piezas que son cámaras.
export async function cargarRoverNASA(rover) {
  const draco = new DRACOLoader().setDecoderPath('/draco/'); // el modelo viene comprimido con Draco
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await loader.loadAsync('/models/perseverance.glb');
  const modelo = gltf.scene;

  // Sombras en todas las piezas
  modelo.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });

  // Tamaño real (escala 1). Solo lo centramos y apoyamos las ruedas en el suelo
  const caja = new THREE.Box3().setFromObject(modelo);
  const centro = caja.getCenter(new THREE.Vector3());
  modelo.position.set(-centro.x, -caja.min.y, -centro.z);

  // Quitamos el rover de figuras y ponemos el de la NASA
  rover.clear();
  rover.add(modelo);

  // Puntos invisibles donde están las 6 ruedas (el modelo trae las ruedas en una sola pieza)
  const t = new THREE.Box3().setFromObject(modelo).getSize(new THREE.Vector3());
  const ruedas = [];
  for (const lado of [-1, 1]) for (const z of [0.38, 0, -0.38]) {
    const p = new THREE.Object3D();
    p.position.set(lado * (t.x / 2 - 0.25), 0.26, z * t.z);
    rover.add(p);
    ruedas.push(p);
  }

  // Piezas que son cámaras (por su nombre)
  const camaras = [];
  // (sin tapas, soportes ni cables, que también llevan "cam" en el nombre)
  modelo.traverse((o) => {
    if (/cam|lens|watson/i.test(o.name) && !/cover|bracket|wiring|^\d/i.test(o.name)) camaras.push(o);
  });

  return { ruedas, camaras, medidas: t };
}
