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

// Prueba de manejo: avanzar (W) y girar (A) un rato, luego otra captura
await page.mouse.click(640, 360);
await page.keyboard.down('KeyW');
await page.waitForTimeout(2500);
await page.keyboard.down('KeyA');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyA');
await page.screenshot({ path: 'screenshots/check-manejo.png' }); // aún avanzando: se ve el polvo
// Cambiar a cámara orbital (C) mientras sigue avanzando
await page.keyboard.press('KeyC');
await page.waitForTimeout(2000);
await page.screenshot({ path: 'screenshots/check-orbital.png' });
await page.keyboard.up('KeyW');
await browser.close();

if (mensajes.length) { console.log('💬 Consola:'); mensajes.forEach((m) => console.log('  ' + m)); }
console.log('📸 Capturas: screenshots/check.png, check-manejo.png y check-orbital.png');
if (errores.length) { console.log(`❌ ${errores.length} error(es):`); errores.forEach((e) => console.log('  - ' + e)); process.exit(1); }
console.log('✅ Sin errores de consola');
