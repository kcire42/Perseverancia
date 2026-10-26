// Revisión automática: abre la página en Chrome invisible, guarda captura y lista errores de consola
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL || 'http://localhost:5173';
mkdirSync('screenshots', { recursive: true });

// channel 'chrome' = usa el Chrome instalado (no descarga navegadores)
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errores = [];
const mensajes = [];
page.on('console', (m) => {
  if (m.type() === 'error') errores.push('console: ' + m.text());
  else mensajes.push(m.text());
});
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(4000); // tiempo para cargar el modelo 3D
await page.screenshot({ path: 'screenshots/check.png' });

// Control de misión: esperar (máx. 20 s) a que los 4 datos tengan un número real
const DATOS = ['distancia', 'altura', 'inclinacion', 'luz'];
const listos = await page
  .waitForFunction((keys) => {
    const e = window.controlMision?.estado;
    return e && keys.every((k) => Number.isFinite(e[k]?.valor) && e[k].puntos > 1);
  }, DATOS, { timeout: 20000 })
  .then(() => true, () => false);
const estado = await page.evaluate(() => window.controlMision?.estado ?? {});
console.log('🛰️  Control de misión:');
for (const k of DATOS) {
  const d = estado[k];
  if (d && Number.isFinite(d.valor)) console.log(`  ✓ ${d.nombre}: ${d.valor.toFixed(2)} ${d.unidad} (${d.puntos} puntos · ${d.proveedor})`);
  else errores.push(`control de misión: el dato "${k}" no cargó`);
}
if (!listos && !errores.some((e) => e.startsWith('control'))) errores.push('control de misión: los datos tardaron demasiado');
await page.screenshot({ path: 'screenshots/check-mision.png' });

// Tecla T: debe ocultar el panel y volver a mostrarlo
const visible = () => page.evaluate(() => {
  const p = document.getElementById('mision');
  return !p.classList.contains('oculto') && parseFloat(getComputedStyle(p).opacity) > 0.5;
});
await page.keyboard.press('KeyT');
await page.waitForTimeout(700);
const ocultoConT = !(await visible());
await page.keyboard.press('KeyT');
await page.waitForTimeout(700);
const vuelveConT = await visible();
if (ocultoConT && vuelveConT) console.log('  ✓ La tecla T oculta y muestra el panel');
else errores.push(`tecla T: ocultó=${ocultoConT}, volvió a mostrar=${vuelveConT}`);

// Prueba de manejo: avanzar (W) y girar (A) un rato, luego otra captura
await page.mouse.click(640, 640); // clic en el suelo para dar foco (no en el rover: abriría una foto)
await page.keyboard.down('KeyW');
await page.waitForTimeout(2500);
// Ruedas: estado antes de doblar
const leerRuedas = () => page.evaluate(() => (window.ruedasRover ?? []).map((r) => ({
  giro: r.giro.rotation.x, dir: r.pivote.rotation.y, esquina: r.orientable, x: r.local.x, z: r.local.z,
})));
const r0 = await leerRuedas();
await page.keyboard.down('KeyA');
await page.waitForTimeout(1500);
const r1 = await leerRuedas(); // doblando a la izquierda
await page.keyboard.up('KeyA');
await page.screenshot({ path: 'screenshots/check-ruedas.png' });
const esquinas = r1.filter((r) => r.esquina);
const ruedan = r1.length === 6 && r1.every((r, i) => Math.abs(r.giro - r0[i].giro) > 1);
const doblan = esquinas.length === 4 && esquinas.every((r) => Math.abs(r.dir) > 0.05);
const medioRectas = r1.filter((r) => !r.esquina).every((r) => Math.abs(r.dir) < 0.01);
console.log('🛞 Ruedas:');
r1.forEach((r, i) => console.log(`  rueda ${i} (x=${r.x.toFixed(2)}, z=${r.z.toFixed(2)}${r.esquina ? ', esquina' : ''}): rodó ${(r.giro - r0[i].giro).toFixed(1)} rad · dirección ${(r.dir * 180 / Math.PI).toFixed(1)}°`));
if (!ruedan) errores.push('ruedas: no todas giran al avanzar (o no se separaron en 6)');
if (!doblan) errores.push('ruedas: las 4 de las esquinas no se orientan al doblar');
if (!medioRectas) errores.push('ruedas: las del medio no deberían orientarse');
await page.screenshot({ path: 'screenshots/check-manejo.png' }); // aún avanzando: se ve el polvo
// Cambiar a cámara orbital (C) mientras sigue avanzando
await page.keyboard.press('KeyC');
await page.waitForTimeout(2000);
await page.screenshot({ path: 'screenshots/check-orbital.png' });
await page.keyboard.up('KeyW');

// Fotos reales: clic (de verdad, con el mouse) en cada cámara del rover
await page.waitForTimeout(1500); // que el rover se detenga
await page.evaluate(() => { // mirar al rover de frente y de lado, para ver bien las 4 cámaras
  const { camera, controls, rover } = window.percy;
  controls.target.copy(rover.position).y += 1.3;
  camera.position.copy(rover.localToWorld(camera.position.clone().set(3.2, 2.4, 5.5)));
  controls.update();
});
await page.waitForTimeout(500);
await page.keyboard.press('Escape'); // por si quedó alguna foto abierta
console.log('📷 Fotos reales:');
const camarasFoto = await page.evaluate(() => window.camarasFoto?.puntos.map((p) => p.cam.nombre) ?? []);
if (camarasFoto.length !== 4) errores.push(`fotos: se esperaban 4 cámaras y hay ${camarasFoto.length}`);
for (let i = 0; i < camarasFoto.length; i++) {
  // Posición en pantalla del punto que brilla
  const xy = await page.evaluate((i) => {
    const { camera } = window.percy;
    const s = window.camarasFoto.puntos[i].sprite;
    const v = s.getWorldPosition(s.position.clone()).project(camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  }, i);
  await page.mouse.move(xy.x, xy.y);
  await page.waitForTimeout(150);
  const tooltip = await page.evaluate(() => document.getElementById('foto-etiqueta').textContent);
  await page.mouse.click(xy.x, xy.y);
  const abierta = await page
    .waitForFunction(() => {
      const e = window.camarasFoto.estado();
      const img = document.querySelector('#foto .marco img');
      return e?.cargada && img?.naturalWidth > 0;
    }, null, { timeout: 15000 })
    .then(() => true, () => false);
  const e = await page.evaluate(() => {
    const e = window.camarasFoto.estado();
    const img = document.querySelector('#foto .marco img');
    return e && { cam: e.cam.nombre, sol: e.foto.sol, url: e.foto.url, ancho: img?.naturalWidth, alto: img?.naturalHeight, pie: document.querySelector('#foto .cam').textContent };
  });
  if (!abierta || e?.cam !== camarasFoto[i]) {
    errores.push(`fotos: el clic en ${camarasFoto[i]} no abrió su foto (abrió: ${e?.cam ?? 'nada'}; etiqueta: "${tooltip}"; en ${xy.x.toFixed(0)},${xy.y.toFixed(0)})`);
    continue;
  }
  console.log(`  ✓ ${e.pie} — ${e.ancho}×${e.alto} px · tooltip: "${tooltip.split('·')[0].trim()}"`);
  if (i === 0) {
    await page.waitForTimeout(3600); // dejar que termine de revelarse
    await page.screenshot({ path: 'screenshots/check-foto.png' });
    // Flechas: otra foto de la misma cámara
    await page.keyboard.press('ArrowRight');
    const otra = await page.waitForFunction((url) => {
      const e = window.camarasFoto.estado();
      return e?.cargada && e.foto.url !== url;
    }, e.url, { timeout: 15000 }).then(() => true, () => false);
    if (otra) console.log('  ✓ La flecha → muestra otra foto de la misma cámara');
    else errores.push('fotos: la flecha → no cambió la foto');
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  if (await page.evaluate(() => window.camarasFoto.estado() !== null)) errores.push('fotos: Esc no cerró la foto');
}
await browser.close();

if (mensajes.length) { console.log('💬 Consola:'); mensajes.forEach((m) => console.log('  ' + m)); }
console.log('📸 Capturas: screenshots/check.png, check-mision.png, check-ruedas.png, check-manejo.png, check-orbital.png y check-foto.png');
if (errores.length) { console.log(`❌ ${errores.length} error(es):`); errores.forEach((e) => console.log('  - ' + e)); process.exit(1); }
console.log('✅ Sin errores de consola');
