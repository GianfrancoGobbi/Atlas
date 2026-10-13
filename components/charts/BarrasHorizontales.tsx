import React, { ReactNode, useState } from 'react';
import { EstadoTooltip, Tooltip, useAncho } from './base';
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

const ALTO_FILA = 32;
const GROSOR = 16;
const ANCHO_VALOR = 64;

// Barras horizontales con valor en la punta y una línea de referencia opcional (p. ej., el plazo).
// Si se pasa onClickFila, cada fila funciona como un botón (filtro cruzado).
export const BarrasHorizontales: React.FC<Props> = ({ filas, formatoValor, referencia, onClickFila }) => {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [activa, setActiva] = useState<string | null>(null);
  const [tip, setTip] = useState<EstadoTooltip | null>(null);

  const anchoEtiquetas = Math.min(170, Math.max(90, ancho * 0.32));
  const anchoPlot = Math.max(0, ancho - anchoEtiquetas - ANCHO_VALOR);
  const max = Math.max(referencia?.valor ?? 0, ...filas.map(f => f.valor ?? 0)) || 1;
  const escala = (v: number) => (v / max) * anchoPlot;
  const xRef = referencia ? anchoEtiquetas + escala(referencia.valor) : 0;

  const mostrar = (f: FilaBarra, i: number) => {
    setActiva(f.clave);
    setTip({ x: anchoEtiquetas + escala(f.valor ?? 0), y: 20 + i * ALTO_FILA, contenido: f.tooltip });
  };
  const ocultar = () => { setActiva(null); setTip(null); };

  return (
    <div ref={ref} className="relative w-full min-w-0" onPointerLeave={ocultar}>
      {ancho > 0 && referencia && (
        <div className="relative h-5 text-[11px] text-slate-500">
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
              style={{ height: ALTO_FILA }}
            >
              <span
                className={`truncate pr-3 text-right text-sm ${f.seleccionada ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
                style={{ width: anchoEtiquetas }}
                title={f.etiqueta}
              >
                {f.etiqueta}
              </span>
              <svg width={anchoPlot + ANCHO_VALOR} height={ALTO_FILA} aria-hidden>
                {f.valor !== null && f.valor > 0 && (
                  <path
                    d={pathBarra(0, (ALTO_FILA - GROSOR) / 2, Math.max(2, escala(f.valor)), GROSOR)}
                    fill={f.color}
                    opacity={activa === null || activa === f.clave ? 1 : 0.6}
                  />
                )}
                <text
                  x={(f.valor ? escala(f.valor) : 0) + 6}
                  y={ALTO_FILA / 2}
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
