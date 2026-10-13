import React, { useState } from 'react';
import { EstadoTooltip, FilaTooltip, Tooltip, useTamano } from './base';
import { escalaLinda, tema } from './tema';

export interface SerieLinea {
  clave: string;
  etiqueta: string;
  color: string;
  valores: (number | null)[]; // null = sin dato (la línea se corta)
}

interface Props {
  categorias: string[];
  series: SerieLinea[];
  formatoValor: (n: number) => string;
  formatoEje: (n: number) => string;
  extraTooltip?: (i: number) => React.ReactNode;
}

const M = { izq: 52, der: 16, arriba: 14, abajo: 22 };

// Líneas de 2 px con punto final; la guía vertical sigue al puntero y el tooltip muestra todas las series.
// Llena el contenedor, que tiene que tener posición relativa y alto definido.
export const LineasComparadas: React.FC<Props> = ({ categorias, series, formatoValor, formatoEje, extraTooltip }) => {
  const [ref, { ancho, alto }] = useTamano<HTMLDivElement>();
  const [activo, setActivo] = useState<number | null>(null);
  const [tip, setTip] = useState<EstadoTooltip | null>(null);

  const n = categorias.length;
  const max = Math.max(0, ...series.flatMap(s => s.valores.map(v => v ?? 0)));
  const { tope, ticks } = escalaLinda(max);
  const anchoPlot = Math.max(0, ancho - M.izq - M.der);
  const altoPlot = Math.max(0, alto - M.arriba - M.abajo);
  const paso = n > 1 ? anchoPlot / (n - 1) : 0;
  const x = (i: number) => M.izq + i * paso;
  const y = (v: number) => M.arriba + altoPlot - (v / tope) * altoPlot;
  const cadaCuantas = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(anchoPlot / 44))));

  const tramo = (valores: (number | null)[]) => {
    let d = '';
    let abierto = false;
    valores.forEach((v, i) => {
      if (v === null) { abierto = false; return; }
      d += `${abierto ? 'L' : 'M'}${x(i)},${y(v)}`;
      abierto = true;
    });
    return d;
  };

  const mostrar = (clientX: number, rect: DOMRect) => {
    const i = Math.max(0, Math.min(n - 1, Math.round((clientX - rect.left - M.izq) / Math.max(1, paso))));
    setActivo(i);
    setTip({
      x: x(i),
      y: M.arriba,
      contenido: (
        <>
          <div className="mb-1 text-xs font-medium text-slate-500">{categorias[i]}</div>
          {series.map(s => (
            <FilaTooltip key={s.clave} color={s.color} etiqueta={s.etiqueta} valor={s.valores[i] === null ? '—' : formatoValor(s.valores[i] as number)} />
          ))}
          {extraTooltip?.(i)}
        </>
      ),
    });
  };
  const ocultar = () => { setActivo(null); setTip(null); };

  return (
    <div ref={ref} className="absolute inset-0" onPointerLeave={ocultar}>
      {ancho > 0 && alto > 80 && (
        <svg width={ancho} height={alto} className="block" role="img" aria-label="Gráfico de líneas">
          {ticks.map(t => (
            <g key={t}>
              <line x1={M.izq} x2={ancho - M.der} y1={y(t)} y2={y(t)} stroke={t === 0 ? tema.base : tema.grilla} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={M.izq - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={tema.tenue} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatoEje(t)}
              </text>
            </g>
          ))}
          {categorias.map((c, i) => i % cadaCuantas === 0 && (
            <text key={c} x={x(i)} y={alto - 6} textAnchor="middle" fontSize={11} fill={tema.tenue}>{c}</text>
          ))}
          {activo !== null && (
            <line x1={x(activo)} x2={x(activo)} y1={M.arriba} y2={M.arriba + altoPlot} stroke={tema.tenue} strokeWidth={1} />
          )}
          {series.map(s => {
            const ultimo = s.valores.reduce<number>((u, v, i) => (v === null ? u : i), -1);
            return (
              <g key={s.clave}>
                <path d={tramo(s.valores)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {ultimo >= 0 && (
                  <circle cx={x(ultimo)} cy={y(s.valores[ultimo] as number)} r={4} fill={s.color} stroke={tema.superficie} strokeWidth={2} />
                )}
                {activo !== null && s.valores[activo] !== null && (
                  <circle cx={x(activo)} cy={y(s.valores[activo] as number)} r={4} fill={s.color} stroke={tema.superficie} strokeWidth={2} />
                )}
              </g>
            );
          })}
          <rect
            x={M.izq - paso / 2}
            y={M.arriba}
            width={anchoPlot + paso}
            height={altoPlot}
            fill="transparent"
            tabIndex={0}
            aria-label="Recorrer los meses con el puntero o con las flechas"
            onPointerMove={e => mostrar(e.clientX, (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect())}
            onKeyDown={e => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
              const i = Math.max(0, Math.min(n - 1, (activo ?? -1) + (e.key === 'ArrowRight' ? 1 : -1)));
              const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
              mostrar(rect.left + x(i), rect);
            }}
            onBlur={ocultar}
            style={{ outline: 'none' }}
          />
        </svg>
      )}
      <Tooltip estado={tip} anchoContenedor={ancho} />
    </div>
  );
};
