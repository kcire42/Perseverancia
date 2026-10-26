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

## Paso 7 · 2026-10-25 — Entender Open MCT (control de misión de la NASA)
- **Prompt:** "Clona nasa/openmct, usa dos subagentes en paralelo (arquitectura y viaje de un dato de telemetría) y hazme un artefacto en español simple con un mapa-del-repo y cómo conectar Percy."
- **Cambios:** se clonó en una carpeta temporal, fuera del proyecto, y no se instaló nada. Se publicó la guía en https://claude.ai/artifact/MnQyHTSukmJre5nQDT9Qyr.
- **Verificación:** se revisaron 3 archivo:línea al azar y otros 19 del diagrama; todos coincidieron.
- **Aprendizaje:** Open MCT es un núcleo con APIs más plugins. Un dato viaja así: proveedor → `telemetry.subscribe` → `PlotSeries.add` → `MctChart.draw` → `gl.drawArrays`. Para conectar Percy basta con escribir un plugin con un proveedor de telemetría.

## Paso 8 · 2026-10-25 — Control de misión con datos reales
- **Prompt:** "Arma un control de misión dentro de la simulación con el patrón de Open MCT y 4 datos reales de Percy: distancia, altura del terreno e inclinación (M20_waypoints.json de la NASA) y el tiempo de luz Tierra-Marte en vivo. Con gráfica de toda la misión, una frase simple y la tecla T para ocultarlo. Amplía npm run check."
- **Cambios:** nuevo `src/mision.js` con proveedores y metadatos, gráficas en canvas y frases. Nuevo `vite.config.js` con el proxy `/nasa`. `check.mjs` ahora verifica los 4 datos y la tecla T. La telemetría muestra el sol real.
- **Problemas y soluciones:**
  - El JSON de la NASA no trae CORS → se usa el proxy que ya incluye Vite, sin instalar nada. Hubo que reiniciar el servidor para que tomara la configuración.
  - Algunos manejos traen la distancia total reiniciada → se usa el máximo acumulado.
  - El check medía la opacidad en plena animación → ahora revisa la clase `oculto`.
- **Resultado:** 45.22 km recorridos, −1937 m de altura, 9.6° de inclinación (máximo 20.7°) y 12.3 min de luz (hoy, en vivo). ✅ 0 errores.
- **Aprendizaje:** el tiempo de luz se calcula con las órbitas de los dos planetas (ecuación de Kepler) y la distancia dividida por la velocidad de la luz. Su gráfica sube y baja cada ~26 meses, que es lo que tardan la Tierra y Marte en volver a acercarse.

## Paso 9 · 2026-10-25 — Ruedas con física real
- **Prompt:** "Las ruedas de Perseverance no están girando, súmale física real para que se muevan y también que giren cuando voy a la izquierda o derecha."
- **Cambios:**
  - `separarRuedas()` en `src/rover.js` divide la pieza `Wheels_objs` en 6 ruedas: agrupa los triángulos por cercanía (k-medias). Cada rueda queda con un pivote de dirección y otro de giro.
  - `moverRuedas()` en `main.js` aplica la cinemática.
  - `check.mjs` revisa las 6 ruedas y guarda `check-ruedas.png`.
- **Física:** velocidad de cada rueda = v·adelante + ω × posición. La rueda apunta en esa dirección (solo las 4 de las esquinas, como el Perseverance real) y rueda distancia/radio.
- **Rondas de `npm run check`:** (1) error: `Wheels_objs` era un grupo de mallas (una por material) y no una sola malla; (2) ✅ al doblar a la izquierda, las ruedas de adentro rodaron 8 rad y las de afuera 19 rad, las delanteras y traseras se orientaron en sentidos opuestos y las del medio quedaron rectas.
- **Aprendizaje:** al doblar, las ruedas de afuera recorren más camino que las de adentro, y por eso deben girar más rápido. Es el mismo motivo por el que los autos tienen diferencial.

## Paso 10 · 2026-10-25 — Las cámaras de Percy toman fotos reales
- **Prompt:** "Que las cámaras de Percy tomen fotos reales de Marte: 4 puntos que brillan (Mastcam_Z_cams, NavCams, hazcams_front, WATSON), obturador, flash y revelado. Clic para ampliar, Esc para volver y flechas para más fotos. Fotos de la API raw_images, las más impresionantes y a color: descárgalas y míralas antes de escoger. Amplía npm run check."
- **Selección de fotos:** se pidieron las últimas 300 fotos de cada instrumento (MCZ_LEFT, NAVCAM_LEFT, FRONT_HAZCAM_LEFT_A, SHERLOC_WATSON) y se dejaron solo las de tamaño completo (y, de Mastcam-Z, las del filtro RGB). Se descargaron unas 990 miniaturas, se puntuaron por saturación, tono rojizo y textura, y se miraron en hojas de contacto y luego en grande. Quedaron 19 (`src/fotos-catalogo.json`).
- **Cambios:** nuevo `src/fotos.js` con los puntos que brillan, la etiqueta, el obturador, el flash, el sonido, el revelado, la tarjeta, la lupa y el teclado. `rover.js` ahora devuelve el `modelo`. `check.mjs` hace clic en las 4 cámaras.
- **Problemas y soluciones:**
  - Mastcam-Z y NavCam están juntas en el mástil → los puntos se separaron y ahora gana el más cercano al mouse en la pantalla.
  - El check fallaba porque su clic inicial de foco caía sobre NavCam y abría una foto que tapaba los demás puntos → el clic de foco ahora va al suelo.
  - La tarjeta no cabía en pantallas bajas → su tamaño también depende de la altura.
- **Resultado:** ✅ las 4 cámaras abren una foto real (Mastcam-Z sol 2019 "hoy", NavCam y Hazcam sol 2009, WATSON sol 2014), → cambia de foto, Esc cierra y 0 errores.
- **Aprendizaje:** las flechas también manejan el rover. Para que con una foto abierta solo cambien de foto, se escucha el teclado en fase de captura y se detiene el evento (`stopImmediatePropagation`).
