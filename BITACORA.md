# 📓 Bitácora: Simulación 3D del rover Perseverance

Registro paso a paso de lo que construimos en la clase de Claude Code (60 min).

Formato de cada entrada:
- **Hora / Etapa**
- **Prompt:** lo que le pedimos a Claude
- **Cambios:** qué se creó o modificó
- **Aprendizaje:** qué nos llevamos de este paso

---

## Paso 0: Preparación (2026-10-25)
- **Etapa:** Antes de la clase
- **Prompt:** "Crea un CLAUDE.md con un mensaje inspirador y la descripción del proyecto."
- **Cambios:** Se creó `CLAUDE.md` con el mensaje para los asistentes, la descripción del proyecto,
  la agenda de 60 min y las instrucciones para registrar el proceso. Se creó esta `BITACORA.md`.
- **Aprendizaje:** `CLAUDE.md` es la "memoria" del proyecto: Claude Code lo lee automáticamente
  y sigue sus instrucciones en cada sesión.

---


## Paso 1 · 2026-10-25 — Escena base
- **Prompt:** "Crea un proyecto con Vite y Three.js, paisaje de Marte de película: dunas, rocas, cielo, sombras suaves y las dos lunas. Crea `npm run check` con Playwright usando mi Chrome."
- **Cambios:** `package.json`, `index.html`, `src/main.js` (terreno con ruido fBm + dunas, rocas con InstancedMesh, cielo con shader y halo azul del atardecer marciano, sombras PCFSoft, Fobos y Deimos, polvo flotante), `scripts/check.mjs`.
- **Aprendido:**
  - `npm i -D vite` falló con `Cannot read properties of null (reading 'edgesOut')` (bug de npm 10.8); se resolvió con `--legacy-peer-deps`.
  - `playwright-core` + `channel: 'chrome'` usa el Chrome instalado: no descarga navegadores.
  - El primer 404 era el favicon → `<link rel="icon" href="data:,">`.

## Paso 1 · Rondas de revisión con `npm run check`
1. Sin errores; solo se veía una luna y las rocas estaban amontonadas → se repartieron las rocas y se movieron las lunas.
2. Seguía viéndose una sola luna → ahora las lunas se ubican según hacia dónde mira la cámara (`enCielo`).
3. Deimos quedaba cortada → se bajó su altura. ✅ 0 errores y se ven las dos lunas.

## Paso 2 · 2026-10-25 — plan.md vivo
- **Prompt:** "Guarda lo que hemos hecho en un plan.md con la fase actual y que se actualice con cada mejora."
- **Cambios:** se creó `plan.md` y se agregó en `CLAUDE.md` la regla de mantenerlo al día.
- **Aprendizaje:** `BITACORA.md` cuenta *cómo* llegamos; `plan.md` dice *dónde estamos* y qué sigue.

## Paso 3 · 2026-10-25 — Fase 2: Rover Perseverance
- **Prompt:** "Comienza con la fase 2."
- **Cambios:** nuevo `src/rover.js` con el rover hecho de figuras: caja, cilindros, esferas. Tiene cuerpo, 6 ruedas, rocker-bogie, mástil con Mastcam-Z, brazo y RTG. `main.js` lo pone en el centro y acerca la cámara.
- **Rondas de `npm run check`:** (1) el rover salía cortado porque el suelo del centro está más bajo que la mira de la cámara, y ahora la cámara usa la altura del rover; (2) se veía todo, pero Deimos estaba pegada al borde; (3) ✅ 0 errores.
- **Aprendizaje:** con `THREE.Group` armamos piezas jerárquicas (el codo del brazo dentro del brazo, la cabeza dentro del mástil). Las ruedas quedan guardadas para hacerlas girar en la Fase 3.

## Paso 4 · 2026-10-25 — Fase 3: Controles
- **Prompt:** "Comienza la fase 3."
- **Cambios:** nueva función `conducir(dt)` en `src/main.js`: teclado (W A S D / flechas), velocidad con inercia, giro de ruedas, adaptación al terreno (cabeceo y ladeo), choques con rocas grandes, cámara que acompaña al rover y sombra que lo sigue. `scripts/check.mjs` ahora simula manejar (W + A) y guarda `check-manejo.png`.
- **Rondas de `npm run check`:** (1) el rover manejaba bien, pero atravesaba una roca, así que se agregaron choques; (2) ✅ 0 errores.
- **Aprendizaje:** el ángulo que gira una rueda es la distancia recorrida dividida por su radio. Para inclinar el rover se mide la altura del suelo adelante, atrás y a los costados, y se calcula el ángulo con `atan2`.

## Paso 5 · 2026-10-25 — Fase 4: Detalles
- **Prompt:** "Comienza la fase 4."
- **Cambios:** polvo de las ruedas (secciones 11 y 12 de `src/main.js`, con partículas recicladas y un shader), cámara de seguimiento con la tecla C, nuevo `src/telemetria.js` con el panel HTML encima del 3D y la barra de ayuda. `check.mjs` ahora toma 3 capturas.
- **Rondas de `npm run check`:** (1) todo funcionaba, pero el rover quedaba atascado a 0 km/h contra una roca y el polvo eran puntitos casi invisibles; (2) choque con deslizamiento y polvo más grande ✅ 0 errores.
- **Aprendizaje:** un "estanque" de partículas recicladas evita crear objetos nuevos en cada cuadro. Además, un panel HTML encima del canvas es la forma más fácil de mostrar texto en una escena 3D.

## Paso 6 · 2026-10-25 — Rover oficial de la NASA
- **Prompt:** "Trae el rover de verdad: descarga el modelo 3D oficial de Perseverance de la NASA en public/models/. Ponlo a tamaño real, que se maneje con WASD, deje huellas y la cámara lo siga. En la consola, escribe los nombres de las piezas que son cámaras."
- **Cambios:**
  - Se descargó `public/models/perseverance.glb` y se copió el decodificador Draco a `public/draco/`.
  - Nuevo `cargarRoverNASA()` en `src/rover.js`.
  - En `main.js`: huellas con InstancedMesh, cámara de seguimiento por defecto y la lista de cámaras en la consola (`window.camarasRover`).
  - `check.mjs` ahora muestra los mensajes de la consola.
- **Problemas y soluciones:**
  - La URL tenía un espacio doble ("2020  Perseverance") y daba 404. Con la API de GitHub encontramos la ruta correcta.
  - El modelo usa compresión Draco, así que hace falta `DRACOLoader`.
  - Primero lo escalé a "3 m de largo" y quedó mal. El modelo **ya venía en metros**: sus ruedas miden 0.52 m, como las reales.
  - La lista de cámaras traía tapas y soportes; se filtraron por nombre.
- **Rondas de `npm run check`:** (1) todo funcionaba, pero las huellas parecían baldosas; (2) huellas más finas y continuas ✅ 0 errores.
- **Aprendizaje:** antes de reescalar un modelo, conviene comparar una medida conocida (como el diámetro de la rueda) con la realidad.
