import React, { ReactNode, useState } from 'react';
import { EstadoTooltip, Tooltip, useTamano } from './base';
import { fmt, GAP, tema } from './tema';

interface Props {
  filas: { clave: string; etiqueta: string; n: number }[]; // una por cohorte
  columnas: string[]; // "+1", "+2"…
  celdas: (number | null)[][]; // proporción de 0 a 1; null = todavía no se puede medir (no se dibuja)
  tooltip: (fila: number, columna: number) => ReactNode;
}

const ALTO_EJE = 18;
const ALTO_LEYENDA = 24;
const ANCHO_FILAS = 86;
const OSCUROS = 4; // desde este paso de la rampa, el texto va en blanco

// Matriz de cohortes con escala fija de 0 a 100 % (rampa secuencial) y el valor escrito en cada celda.
// Llena el contenedor; el alto de las celdas se ajusta al espacio.
export const MapaDeCohortes: React.FC<Props> = ({ filas, columnas, celdas, tooltip }) => {
  const [ref, { ancho, alto: altoDisponible }] = useTamano<HTMLDivElement>();
  const [tip, setTip] = useState<EstadoTooltip | null>(null);
  const [activa, setActiva] = useState<string | null>(null);

  const altoCelda = Math.max(16, Math.min(40, Math.floor((altoDisponible - ALTO_EJE - ALTO_LEYENDA) / Math.max(1, filas.length))));
  const anchoCelda = Math.max(16, (ancho - ANCHO_FILAS) / Math.max(1, columnas.length));
  const alto = filas.length * altoCelda + ALTO_EJE;
  const paso = (v: number) => Math.min(tema.secuencial.length - 1, Math.round(v * (tema.secuencial.length - 1)));
  const conTexto = anchoCelda >= 34 && altoCelda >= 18;
  const ocultar = () => { setTip(null); setActiva(null); };

  return (
    <div ref={ref} className="absolute inset-0" onPointerLeave={ocultar}>
      {ancho > 0 && altoDisponible > 60 && (
        <svg width={ancho} height={alto} className="block" role="img" aria-label="Retención por cohorte">
          {columnas.map((c, j) => (
            <text key={c} x={ANCHO_FILAS + j * anchoCelda + anchoCelda / 2} y={12} textAnchor="middle" fontSize={11} fill={tema.tenue}>{c}</text>
          ))}
          {filas.map((f, i) => (
            <g key={f.clave}>
              <text x={0} y={ALTO_EJE + i * altoCelda + altoCelda / 2} dy="0.32em" fontSize={11} fill={tema.tinta2}>
                {f.etiqueta}
                <tspan fill={tema.tenue}>{`  n ${fmt.entero(f.n)}`}</tspan>
              </text>
              {columnas.map((c, j) => {
                const v = celdas[i][j];
                if (v === null) return null;
                const clave = `${i}-${j}`;
                const x = ANCHO_FILAS + j * anchoCelda;
                const yy = ALTO_EJE + i * altoCelda;
                const mostrar = () => { setActiva(clave); setTip({ x: x + anchoCelda / 2, y: yy, contenido: tooltip(i, j) }); };
                return (
                  <g key={clave}>
                    <rect
                      x={x + GAP / 2}
                      y={yy + GAP / 2}
                      width={anchoCelda - GAP}
                      height={altoCelda - GAP}
                      rx={3}
                      fill={tema.secuencial[paso(v)]}
                      stroke={activa === clave ? tema.tinta : 'none'}
                      strokeWidth={1.5}
                      tabIndex={0}
                      aria-label={`${f.etiqueta}, mes ${c}: ${fmt.pct(v)}`}
                      onPointerMove={mostrar}
                      onFocus={mostrar}
                      onBlur={ocultar}
                      style={{ outline: 'none' }}
                    />
                    {conTexto && (
                      <text
                        x={x + anchoCelda / 2}
                        y={yy + altoCelda / 2}
                        dy="0.32em"
                        textAnchor="middle"
                        fontSize={11}
                        fill={paso(v) >= OSCUROS ? '#ffffff' : tema.tinta}
                        pointerEvents="none"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {fmt.entero(v * 100)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      )}
      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
        <span className="mr-1">0 %</span>
        {tema.secuencial.map(c => <span key={c} className="inline-block h-3 w-4 rounded-sm" style={{ background: c }} />)}
        <span className="ml-1">100 %</span>
      </div>
      <Tooltip estado={tip} anchoContenedor={ancho} />
    </div>
  );
};
