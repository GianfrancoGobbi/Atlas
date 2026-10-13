import React, { ReactNode, useState } from 'react';
import { EstadoTooltip, Tooltip, useTamano } from './base';
import { pathBarra, tema } from './tema';

export interface FilaBarra {
  clave: string;
  etiqueta: string;
  valor: number | null;
  color: string;
  tooltip: ReactNode;
  seleccionada?: boolean;
}

interface Props {
  filas: FilaBarra[];
  formatoValor: (n: number) => string;
  referencia?: { valor: number; etiqueta: string };
  onClickFila?: (clave: string) => void;
}

const ANCHO_VALOR = 64;
const ALTO_REFERENCIA = 18;

// Barras horizontales con valor en la punta y una línea de referencia opcional (p. ej., el plazo).
// Si se pasa onClickFila, cada fila funciona como un botón (filtro cruzado).
// Llena el contenedor; el alto de cada fila se ajusta al espacio (si no entran, scroll interno).
export const BarrasHorizontales: React.FC<Props> = ({ filas, formatoValor, referencia, onClickFila }) => {
  const [ref, { ancho, alto }] = useTamano<HTMLDivElement>();
  const [activa, setActiva] = useState<string | null>(null);
  const [tip, setTip] = useState<EstadoTooltip | null>(null);

  const altoFila = Math.max(22, Math.min(34, Math.floor((alto - (referencia ? ALTO_REFERENCIA : 0)) / Math.max(1, filas.length))));
  const grosor = Math.max(10, Math.min(16, Math.round(altoFila * 0.5)));
  const anchoEtiquetas = Math.min(150, Math.max(80, ancho * 0.3));
  const anchoPlot = Math.max(0, ancho - anchoEtiquetas - ANCHO_VALOR);
  const max = Math.max(referencia?.valor ?? 0, ...filas.map(f => f.valor ?? 0)) || 1;
  const escala = (v: number) => (v / max) * anchoPlot;
  const xRef = referencia ? anchoEtiquetas + escala(referencia.valor) : 0;

  const mostrar = (f: FilaBarra, i: number) => {
    setActiva(f.clave);
    setTip({ x: anchoEtiquetas + escala(f.valor ?? 0), y: (referencia ? ALTO_REFERENCIA : 0) + i * altoFila, contenido: f.tooltip });
  };
  const ocultar = () => { setActiva(null); setTip(null); };

  return (
    <div ref={ref} className="absolute inset-0 overflow-y-auto overflow-x-hidden" onPointerLeave={ocultar}>
      {ancho > 0 && referencia && (
        <div className="relative text-[11px] text-slate-500" style={{ height: ALTO_REFERENCIA }}>
          <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: xRef }}>{referencia.etiqueta}</span>
        </div>
      )}
      <div className="relative">
        {ancho > 0 && referencia && (
          <div className="pointer-events-none absolute top-0 bottom-0 w-px" style={{ left: xRef, background: tema.tenue }} />
        )}
        {ancho > 0 && filas.map((f, i) => {
          const interactiva = !!onClickFila;
          const props = interactiva ? {
            role: 'button' as const,
            tabIndex: 0,
            'aria-pressed': !!f.seleccionada,
            onClick: () => onClickFila!(f.clave),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClickFila!(f.clave); }
            },
          } : { tabIndex: 0 };
          return (
            <div
              key={f.clave}
              {...props}
              onPointerMove={() => mostrar(f, i)}
              onFocus={() => mostrar(f, i)}
              onBlur={ocultar}
              className={`flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary ${interactiva ? 'cursor-pointer' : ''} ${activa === f.clave ? 'bg-slate-50' : ''}`}
              style={{ height: altoFila }}
            >
              <span
                className={`truncate pr-3 text-right text-sm ${f.seleccionada ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
                style={{ width: anchoEtiquetas }}
                title={f.etiqueta}
              >
                {f.etiqueta}
              </span>
              <svg width={anchoPlot + ANCHO_VALOR} height={altoFila} aria-hidden>
                {f.valor !== null && f.valor > 0 && (
                  <path
                    d={pathBarra(0, (altoFila - grosor) / 2, Math.max(2, escala(f.valor)), grosor)}
                    fill={f.color}
                    opacity={activa === null || activa === f.clave ? 1 : 0.6}
                  />
                )}
                <text
                  x={(f.valor ? escala(f.valor) : 0) + 6}
                  y={altoFila / 2}
                  dy="0.32em"
                  fontSize={12}
                  fill={f.valor === null ? tema.tenue : tema.tinta2}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {f.valor === null ? 'sin datos' : formatoValor(f.valor)}
                </text>
              </svg>
            </div>
          );
        })}
      </div>
      <Tooltip estado={tip} anchoContenedor={ancho} />
    </div>
  );
};
