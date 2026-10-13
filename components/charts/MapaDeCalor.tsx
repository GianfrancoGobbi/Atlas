import React, { useState } from 'react';
import { EstadoTooltip, FilaTooltip, Tooltip, useAncho } from './base';
import { GAP, tema } from './tema';

interface Props {
  filas: string[]; // p. ej., días de la semana
  columnas: number[]; // horas
  celdas: number[][]; // celdas[fila][columna]
  formatoColumna: (c: number) => string;
  unidad: (n: number) => string; // "3 turnos"
}

const ALTO_CELDA = 26;
const ANCHO_FILAS = 40;
const VACIA = '#f1f1ee';

// Grilla de intensidad (rampa secuencial de un solo tono). Hover y foco por celda.
export const MapaDeCalor: React.FC<Props> = ({ filas, columnas, celdas, formatoColumna, unidad }) => {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [tip, setTip] = useState<EstadoTooltip | null>(null);
  const [activa, setActiva] = useState<string | null>(null);

  const max = Math.max(1, ...celdas.flat());
  const anchoCelda = Math.max(10, (ancho - ANCHO_FILAS) / Math.max(1, columnas.length));
  const color = (v: number) => {
    if (v <= 0) return VACIA;
    const paso = Math.min(tema.secuencial.length - 1, Math.floor((v / max) * (tema.secuencial.length - 1)));
    return tema.secuencial[Math.max(1, paso)];
  };
  const cadaCuantas = anchoCelda < 30 ? 2 : 1;
  const alto = filas.length * ALTO_CELDA + 20;

  // Leyenda de escala: de 1 al máximo.
  const pasosLeyenda = Array.from(new Set([1, Math.ceil(max / 3), Math.ceil((2 * max) / 3), max])).filter(v => v > 0);

  return (
    <div ref={ref} className="relative w-full min-w-0" onPointerLeave={() => { setTip(null); setActiva(null); }}>
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label="Mapa de calor">
          {filas.map((f, i) => (
            <text key={f} x={0} y={i * ALTO_CELDA + ALTO_CELDA / 2} dy="0.32em" fontSize={11} fill={tema.tenue}>{f}</text>
          ))}
          {columnas.map((c, j) => j % cadaCuantas === 0 && (
            <text key={c} x={ANCHO_FILAS + j * anchoCelda + anchoCelda / 2} y={alto - 4} textAnchor="middle" fontSize={11} fill={tema.tenue}>
              {formatoColumna(c)}
            </text>
          ))}
          {filas.map((f, i) => columnas.map((c, j) => {
            const v = celdas[i][j];
            const clave = `${i}-${j}`;
            const mostrar = () => {
              setActiva(clave);
              setTip({
                x: ANCHO_FILAS + j * anchoCelda + anchoCelda / 2,
                y: i * ALTO_CELDA,
                contenido: <FilaTooltip etiqueta={`${f} ${formatoColumna(c)}`} valor={unidad(v)} />,
              });
            };
            return (
              <rect
                key={clave}
                x={ANCHO_FILAS + j * anchoCelda + GAP / 2}
                y={i * ALTO_CELDA + GAP / 2}
                width={anchoCelda - GAP}
                height={ALTO_CELDA - GAP}
                rx={3}
                fill={color(v)}
                stroke={activa === clave ? tema.tinta : 'none'}
                strokeWidth={1.5}
                tabIndex={0}
                aria-label={`${f} ${formatoColumna(c)}: ${unidad(v)}`}
                onPointerMove={mostrar}
                onFocus={mostrar}
                onBlur={() => { setTip(null); setActiva(null); }}
                style={{ outline: 'none' }}
              />
            );
          }))}
        </svg>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        <span>Menos</span>
        {pasosLeyenda.map(v => (
          <span key={v} className="flex items-center gap-1">
            <span className="inline-block h-3 w-4 rounded-sm" style={{ background: color(v) }} />
            <span className="tabular-nums">{v}</span>
          </span>
        ))}
        <span>Más</span>
      </div>
      <Tooltip estado={tip} anchoContenedor={ancho} />
    </div>
  );
};
