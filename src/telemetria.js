// =============================================================
// Panel de telemetría (HTML encima del canvas 3D)
// =============================================================

const estilo = document.createElement('style');
estilo.textContent = `
  #telemetria {
    position: fixed; top: 16px; left: 16px; min-width: 230px;
    padding: 12px 16px; border-radius: 10px;
    background: rgba(20, 10, 6, 0.55); backdrop-filter: blur(6px);
    border: 1px solid rgba(255, 190, 140, 0.25);
    color: #ffe2c8; font: 13px/1.6 ui-monospace, Menlo, monospace;
    pointer-events: none; user-select: none;
  }
  #telemetria h1 { margin: 0 0 6px; font-size: 12px; letter-spacing: 2px; color: #ff9a5c; }
  #telemetria .fila { display: flex; justify-content: space-between; gap: 16px; }
  #telemetria .valor { color: #fff; }
  #ayuda {
    position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
    padding: 6px 14px; border-radius: 8px; background: rgba(20, 10, 6, 0.5);
    color: #ffe2c8; font: 12px ui-monospace, Menlo, monospace; pointer-events: none;
  }
`;
document.head.appendChild(estilo);

const panel = document.createElement('div');
panel.id = 'telemetria';
document.body.appendChild(panel);

const ayuda = document.createElement('div');
ayuda.id = 'ayuda';
ayuda.textContent = 'W A S D / flechas: conducir · C: cambiar cámara · mouse: girar la vista';
document.body.appendChild(ayuda);

// Filas del panel: [etiqueta, id]
const filas = [
  ['Velocidad', 'vel'], ['Rumbo', 'rumbo'], ['Recorrido', 'dist'],
  ['Elevación', 'elev'], ['Cabeceo', 'pitch'], ['Ladeo', 'roll'],
  ['Cámara', 'cam'], ['Temperatura', 'temp'], ['Sol (día)', 'sol'],
];
panel.innerHTML = '<h1>● PERSEVERANCE · TELEMETRÍA</h1>' + filas
  .map(([e, id]) => `<div class="fila"><span>${e}</span><span class="valor" id="t-${id}">—</span></div>`)
  .join('');
const celda = Object.fromEntries(filas.map(([, id]) => [id, document.getElementById('t-' + id)]));

const grados = (rad) => ((rad * 180) / Math.PI).toFixed(1) + '°';
const puntos = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

// Se llama en cada cuadro, pero solo actualiza el texto unas 10 veces por segundo
let espera = 0;
export function actualizarTelemetria(dt, d) {
  espera -= dt;
  if (espera > 0) return;
  espera = 0.1;
  const r = ((d.rumbo % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  celda.vel.textContent = (Math.abs(d.velocidad) * 3.6).toFixed(1) + ' km/h';
  celda.rumbo.textContent = grados(r) + ' ' + puntos[Math.round(r / (Math.PI / 4)) % 8];
  celda.dist.textContent = d.distancia.toFixed(1) + ' m';
  celda.elev.textContent = (d.elevacion - 2500).toFixed(1) + ' m'; // cráter Jezero ≈ −2500 m
  celda.pitch.textContent = grados(-d.cabeceo);
  celda.roll.textContent = grados(d.ladeo);
  celda.cam.textContent = d.camara;
  // Temperatura de atardecer en Jezero, con una pequeña variación
  celda.temp.textContent = (-48 + Math.sin(d.t * 0.05) * 3).toFixed(1) + ' °C';
  celda.sol.textContent = 'Sol ' + (1312 + Math.floor(d.t / 60));
}
