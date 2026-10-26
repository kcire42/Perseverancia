# 🗺️ Plan del proyecto: Marte + rover Perseverance

> Documento vivo: dice **en qué fase estamos**, qué se hizo y qué sigue.
> El detalle de cada prompt está en `BITACORA.md`.

## 📍 Fase actual
**Fotos reales de las cámaras de Percy ✅** (después del control de misión).
**Siguiente:** Fase 5, extra (Ingenuity o un minimapa). Las cámaras del rover se usarán al final.

## ✅ Hecho
- Proyecto **Vite + Three.js**, con el servidor en http://localhost:5173 (`npm run dev`).
- **`npm run check`** (`scripts/check.mjs`): abre la página en tu Chrome invisible (playwright-core, sin descargar navegadores), guarda `screenshots/check.png` y lista los errores de consola.
- Paisaje en `src/main.js`:
  - Dunas con ruido fBm, coloreadas según la altura y la pendiente
  - Unas 880 rocas con `InstancedMesh`
  - Cielo de atardecer marciano (shader con halo azul) y niebla de polvo
  - Sombras suaves (`PCFShadowMap` con `radius`, porque `PCFSoftShadowMap` ya no existe en esta versión) y tono de cine (ACES)
  - Fobos y Deimos, ubicadas con `enCielo()` según la vista de la cámara
  - Polvo flotante y cámara orbital
- **Rover** en `src/rover.js` (`crearRover()` devuelve `{ rover, ruedas }`): cuerpo, 6 ruedas con tacos, suspensión rocker-bogie, mástil con Mastcam-Z y SuperCam, brazo robótico con torreta, RTG con aletas y antenas. Está en el centro del mapa, sobre `altura(0, 0)`, y la cámara lo enfoca.
- **Controles** (`conducir()` en `src/main.js`): W A S D / flechas con inercia, ruedas que giran según la distancia recorrida, cabeceo y ladeo a partir de 4 alturas medidas alrededor del rover, choques con las rocas grandes (`obstaculos`), cámara orbital que acompaña al rover y sombra que lo sigue.
- **Detalles:**
  - Polvo que levantan las ruedas: partículas con un shader que crecen y se desvanecen (`actualizarPolvo()`).
  - Cámara de seguimiento con la tecla **C** (`camaraSeguimiento()`).
  - Panel de telemetría en `src/telemetria.js`: velocidad, rumbo, recorrido, elevación, cabeceo, ladeo, cámara, temperatura y sol, más una barra de ayuda con los controles.
  - Los choques ahora empujan al rover hasta el borde de la roca, así se desliza alrededor en vez de atascarse.
- **Rover oficial de la NASA**: `public/models/perseverance.glb` (de NASA-3D-Resources, comprimido con Draco; el decodificador está en `public/draco/`). Lo carga `cargarRoverNASA()` en `src/rover.js`.
  - Tamaño real: escala 1, porque el modelo ya viene en metros (las ruedas miden 0.52 m, igual que las reales). El rover de figuras se ve mientras carga.
  - **Huellas** en la arena (`actualizarHuellas()`, InstancedMesh reciclado); la cámara de seguimiento viene activada por defecto.
  - **Cámaras del rover** (impresas en la consola y disponibles en `window.camarasRover`): `lens`, `Mastcam_Z_cams`, `NavCams`, `hazcams_front`, `hazcams_rear`, `WATSON`, `Up_Look_Camera`, `Down_Look_Camera`.
- **Control de misión** (`src/mision.js`, tecla **T**), con el patrón de Open MCT: proveedores (`agregarProveedor`, con `request` y `subscribe`) y metadatos por dato (nombre, unidad, frase). Muestra 4 datos reales, cada uno con su gráfica de toda la misión:
  - Distancia recorrida, altura del terreno e inclinación, del historial de manejos de la NASA (`M20_waypoints.json`, 706 manejos hasta el sol 2009). Se pide por el proxy `/nasa` de `vite.config.js`, porque el servidor de la NASA no permite CORS.
  - Tiempo de luz Tierra → Marte, calculado en vivo cada segundo con los elementos orbitales de JPL.
  - El "Sol" del panel de telemetría ahora es el sol real de la misión.
- **Física de las ruedas** (`moverRuedas()` en `main.js`): cada rueda se mueve a v·adelante + ω × posición. Las 4 de las esquinas se orientan hacia donde van, las del medio quedan fijas (como el real) y cada rueda rueda distancia/radio, así que las de adentro de la curva ruedan menos. También gira en el lugar.
- `npm run check` revisa las ruedas (que las 6 rueden, las 4 esquinas se orienten y las del medio no) y guarda `check-ruedas.png`.
- **Fotos reales** (`src/fotos.js` + `src/fotos-catalogo.json`): 4 puntos que brillan sobre Mastcam_Z_cams, NavCams, hazcams_front y WATSON, con su nombre al pasar el mouse.
  - Clic: obturador, flash, sonido y revelado de 3 s. La foto queda grande 9 s y luego se va a una esquina. Clic para ampliar, ← → para más fotos de esa cámara (no mueven al rover), Esc para volver.
  - Cada foto dice cámara, sol y hace cuántos días.
  - 19 fotos (5/5/5/4) elegidas a mano de la API raw_images, soles 2009-2019. Se descargaron unas 990 miniaturas, se puntuaron por color y textura y se miraron en hojas de contacto. Se descartaron cielo vacío, sol, calibración, fotos en blanco y negro y repetidas.
- `npm run check` hace clic con el mouse en las 4 cámaras, confirma que cada una abre una foto real de su instrumento, prueba → y Esc, y guarda `check-foto.png`.
- `npm run check` confirma que los 4 datos cargaron con números reales, que T oculta y muestra el panel, y guarda `check-mision.png`.
- `npm run check` hace una **prueba de manejo** (W + A, luego C) y guarda `check-manejo.png` y `check-orbital.png`. También muestra los mensajes de la consola.
- Revisión de la Fase 1: 3 rondas (lunas fuera de cuadro y rocas amontonadas) que terminaron con 0 errores.

## 🔭 Investigación: Open MCT (NASA)
- Guía publicada: https://claude.ai/artifact/MnQyHTSukmJre5nQDT9Qyr (diagrama con archivo:línea, 5 piezas clave y "Cómo conectamos Percy").
- Idea pendiente: Percy envía su telemetría por WebSocket → un puente Node → un plugin "Percy" en Open MCT (`addType` + `addProvider` con `subscribe`/`request`).

## ⏳ Pendiente (agenda de la clase)
- [x] **Fase 2: Rover:** cuerpo, 6 ruedas con *rocker-bogie*, mástil Mastcam-Z, brazo robótico, RTG
- [x] **Fase 3: Controles:** W A S D / flechas, giro de ruedas y adaptación al terreno (`altura()`)
- [x] **Fase 4: Detalles:** cámara de seguimiento, polvo al moverse y panel de telemetría
- [ ] **Fase 5: Extra:** helicóptero Ingenuity o un minimapa
- [ ] **Fase 6: Demo final**

## 🔀 Cambios al plan original
- El rover de figuras se reemplazó por el **modelo 3D oficial de la NASA**. Su pieza `Wheels_objs` trae las 6 ruedas juntas; `separarRuedas()` las divide (k-medias por triángulo) para que giren por separado.
- Se usa **Vite** (`index.html` + `src/main.js`) en lugar de un solo `index.html` sin compilación, porque lo pidió el grupo.
- Después de cada mejora grande se corre `npm run check` y se revisa la captura (máximo 3 rondas).

## 🕓 Historial de actualizaciones
- **2026-10-25:** se crea `plan.md`. Fase 1 (paisaje) completa.
- **2026-10-25:** Fase 2 (rover) completa en 3 rondas de revisión: la cámara ahora apunta a la altura real del rover y Deimos se bajó un poco. El rover está en su propio archivo, `src/rover.js`.
- **2026-10-25:** Fase 3 (controles) completa en 2 rondas de revisión: se agregaron los choques con rocas porque el rover las atravesaba. `npm run check` ahora incluye una prueba de manejo.
- **2026-10-25:** Fase 4 (detalles) completa en 2 rondas de revisión: el rover se atascaba contra una roca y el polvo casi no se veía. Se cambió el choque a deslizamiento y se agrandó el polvo.
- **2026-10-25:** se integra el rover oficial de la NASA, con huellas y la cámara de seguimiento por defecto. Revisión en 2 rondas: se corrigió la escala (el modelo ya venía en metros), se limpió la lista de cámaras, se quitaron los avisos de Three.js (`Clock` → `Timer`, `PCFSoftShadowMap` → `PCFShadowMap`) y se suavizaron las huellas.
- **2026-10-25:** investigación de Open MCT con 2 subagentes en paralelo y guía publicada. El código del proyecto no cambió.
- **2026-10-25:** control de misión con 4 datos reales y la tecla T. Revisión en 2 rondas: se reinició Vite para activar el proxy, se corrigió la prueba de T y se arreglaron detalles visuales (picos en la gráfica de distancia, textos partidos y la barra de ayuda encima del panel).
- **2026-10-25:** las ruedas del modelo de la NASA ahora giran y se orientan con física real. Revisión en 2 rondas: `Wheels_objs` resultó ser un grupo de mallas, no una sola.
- **2026-10-25:** fotos reales con las 4 cámaras. Revisión: se eligen los puntos por distancia en pantalla, el clic de foco del check se movió al suelo (abría NavCam sin querer y la tarjeta tapaba los demás puntos) y la tarjeta se limitó a la altura de la ventana.
