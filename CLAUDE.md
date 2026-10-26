# ¡Bienvenidos a la clase de Claude Code! 🚀

Hoy no solo vienen a aprender una herramienta: vienen a descubrir una nueva forma de crear.

## Un mensaje para ustedes

La inteligencia artificial no reemplaza tu creatividad: la multiplica.
Esa idea que tienes guardada desde hace meses, esa app que "algún día" ibas a construir,
ese problema que te frustra cada semana... hoy pueden empezar a hacerse realidad.

Con Claude Code puedes:
- **Convertir ideas en código** describiéndolas con tus propias palabras.
- **Aprender mientras construyes**, preguntando el "por qué" de cada paso.
- **Equivocarte sin miedo**: cada error es una conversación, no un muro.
- **Ir más lejos de lo que creías posible**, más rápido de lo que imaginabas.

## Recuerda

- No necesitas saberlo todo para empezar. Solo necesitas curiosidad.
- La mejor herramienta sigue siendo tu criterio: tú decides qué construir y por qué.
- La perseverancia vence al talento cuando el talento no persevera.

## Tu reto de hoy

Piensa en algo pequeño que te gustaría que existiera… y constrúyelo.
Luego compártelo. Inspira a alguien más.

> "El futuro no se predice, se construye." ✨

¡Manos a la obra, y a crear!

---

# 🔴 Proyecto de la clase: Simulación 3D del rover Perseverance

## ¿Qué vamos a crear?

Una simulación 3D interactiva del rover **Perseverance** de la NASA sobre la superficie de Marte,
que se ejecuta directamente en el navegador. La construiremos desde cero, en vivo, en **60 minutos**,
usando Claude Code como copiloto.

Al final de la clase tendremos:
- Un **terreno marciano** con relieve, rocas y color rojizo, con cielo y luz de Marte.
- El **rover Perseverance** modelado con figuras geométricas: cuerpo, 6 ruedas con suspensión
  *rocker-bogie*, mástil con cámaras (Mastcam-Z), brazo robótico y generador RTG.
- **Controles con teclado** (W A S D / flechas) para conducir el rover; las ruedas giran y el rover
  se adapta al terreno.
- **Cámara orbital** para mirar el rover desde cualquier ángulo y una cámara que lo sigue.
- **Extra (si da tiempo):** el helicóptero *Ingenuity* volando, polvo al moverse, minimapa o un panel de telemetría.

## Tecnología

- **HTML + JavaScript + [Three.js](https://threejs.org/)** cargado desde CDN.
- Un solo archivo `index.html` (sin instalaciones ni compilación): se abre con doble clic en el navegador.

## Agenda (60 min)

| Minuto | Etapa |
|--------|-------|
| 0–5    | Bienvenida, ¿qué es Perseverance? y presentación de Claude Code |
| 5–15   | Escena base: Three.js, cámara, luces, cielo y terreno marciano |
| 15–30  | Modelado del rover: cuerpo, ruedas, mástil, brazo y RTG |
| 30–40  | Controles: conducir el rover, giro de ruedas y adaptación al terreno |
| 40–50  | Detalles: rocas, polvo, cámara de seguimiento, telemetría |
| 50–55  | Extra: Ingenuity u otra idea del grupo |
| 55–60  | Demo final, preguntas y reto para casa |

## 📓 Registro del proceso

Todo el proceso de construcción se guarda en **`BITACORA.md`**, para que cualquiera pueda
repetir la clase paso a paso.

### Instrucciones para Claude
- Después de cada paso o cambio importante, agrega una entrada en `BITACORA.md` con:
  hora, etapa de la agenda, qué pidió el grupo (el prompt), qué se cambió y qué se aprendió.
- Mantén el código en un solo `index.html`, ordenado por secciones y con comentarios breves
  en español, pensado para que principiantes lo entiendan.
- Prioriza que algo funcione y se vea en pantalla rápido: estamos en clase y el tiempo cuenta.
- Explica en español y de forma sencilla cada paso.
