import React, { ReactNode, useState } from 'react';
import { EstadoTooltip, FilaTooltip, Tooltip, useAncho } from './base';
import { escalaLinda, GAP, pathColumna, tema } from './tema';

export interface SerieColumna { clave: string; etiqueta: string; color: string }

interface Props {
  categorias: { clave: string; etiqueta: string }[];
  series: SerieColumna[];
  valores: ReadonlyArray<Record<string, unknown>>; // valores[i][serie.clave] (se ignora lo que no es número)
  formatoValor: (n: number) => string;
  formatoEje: (n: number) => string;
  extraTooltip?: (i: number) => ReactNode;
  colorCategoria?: (i: number) => string; // serie única con un tono por categoría (rampa ordinal)
  alto?: number;
  etiquetaTotal?: string; // fila "total" del tooltip (solo si hay más de una serie)
}

const M = { izq: 56, der: 8, arriba: 22, abajo: 26 };
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const ANCHO_MAX_BARRA = 24;
const ANCHO_CARACTER = 6.2; // aproximado, a 11 px
const ALTO_LINEA = 13;

// Parte una etiqueta en dos líneas por el espacio más cercano al medio.
const partir = (s: string): string[] => {
  const espacios = [...s].map((c, i) => (c === ' ' ? i : -1)).filter(i => i > 0);
  if (!espacios.length) return [s];
  const corte = espacios.reduce((a, b) => (Math.abs(b - s.length / 2) < Math.abs(a - s.length / 2) ? b : a));
  return [s.slice(0, corte), s.slice(corte + 1)];
};

// Columnas (apiladas si hay varias series). Hover por columna con todas las series.
export const ColumnasApiladas: React.FC<Props> = ({
  categorias, series, valores, formatoValor, formatoEje, extraTooltip, colorCategoria, alto = 260, etiquetaTotal = 'Total',
}) => {
  const colorDe = (s: SerieColumna, i: number) => colorCategoria?.(i) ?? s.color;
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [activa, setActiva] = useState<number | null>(null);
  const [tip, setTip] = useState<EstadoTooltip | null>(null);

  const n = categorias.length;
  const totales = valores.map(v => series.reduce((s, x) => s + num(v[x.clave]), 0));
  const { tope, ticks } = escalaLinda(Math.max(0, ...totales));
  const anchoPlot = Math.max(0, ancho - M.izq - M.der);
  const banda = n ? anchoPlot / n : 0;

  // Etiquetas del eje que no entran en su columna: en dos líneas si son pocas categorías,
  // o mostrando una de cada tantas si son muchas (p. ej., meses). Nunca se pisan.
  const anchoTexto = (s: string) => s.length * ANCHO_CARACTER;
  const lineas = categorias.map(c => [c.etiqueta]);
  const enDosLineas = n <= 8 && categorias.some(c => anchoTexto(c.etiqueta) > banda - 6 && c.etiqueta.includes(' '));
  if (enDosLineas) categorias.forEach((c, i) => { lineas[i] = partir(c.etiqueta); });
  const anchoEtiqueta = Math.max(0, ...lineas.flat().map(anchoTexto));
  const cadaCuantas = Math.max(1, Math.ceil((anchoEtiqueta + 8) / Math.max(1, banda)));
  const abajo = M.abajo + (enDosLineas ? ALTO_LINEA : 0);

  const altoPlot = alto - M.arriba - abajo;
  const anchoBarra = Math.max(2, Math.min(ANCHO_MAX_BARRA, banda * 0.7));
  const y = (v: number) => M.arriba + altoPlot - (v / tope) * altoPlot;
  const iMax = totales.indexOf(Math.max(...totales));

  const mostrar = (i: number, cx: number) => {
    setActiva(i);
    setTip({
      x: cx,
      y: M.arriba,
      contenido: (
        <>
          <div className="mb-1 text-xs font-medium text-slate-500">{categorias[i].etiqueta}</div>
          {[...series].reverse().map(s => (
            <FilaTooltip key={s.clave} color={colorDe(s, i)} etiqueta={s.etiqueta} valor={formatoValor(num(valores[i][s.clave]))} />
          ))}
          {series.length > 1 && (
            <div className="mt-1 border-t border-slate-100 pt-1">
              <FilaTooltip etiqueta={etiquetaTotal} valor={formatoValor(totales[i])} fuerte />
            </div>
          )}
          {extraTooltip?.(i)}
        </>
      ),
    });
  };
  const ocultar = () => { setActiva(null); setTip(null); };

  return (
    <div ref={ref} className="relative w-full min-w-0" onPointerLeave={ocultar}>
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label="Gráfico de columnas">
          {ticks.map(t => (
            <g key={t}>
              <line x1={M.izq} x2={ancho - M.der} y1={y(t)} y2={y(t)} stroke={t === 0 ? tema.base : tema.grilla} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={M.izq - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={tema.tenue} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatoEje(t)}
              </text>
            </g>
          ))}

          {categorias.map((c, i) => {
            const x = M.izq + i * banda + (banda - anchoBarra) / 2;
            let acumulado = 0;
            const visibles = series.filter(s => num(valores[i][s.clave]) > 0);
            const ultima = visibles[visibles.length - 1]?.clave;
            return (
              <g key={c.clave} opacity={activa === null || activa === i ? 1 : 0.55}>
                {visibles.map((s, k) => {
                  const v = num(valores[i][s.clave]);
                  const base = y(acumulado);
                  acumulado += v;
                  const tope = y(acumulado);
                  const hueco = k > 0 ? GAP : 0;
                  const h = base - tope - hueco;
                  if (h <= 0.5) return null;
                  return s.clave === ultima
                    ? <path key={s.clave} d={pathColumna(x, tope, anchoBarra, h)} fill={colorDe(s, i)} />
                    : <rect key={s.clave} x={x} y={tope} width={anchoBarra} height={h} fill={colorDe(s, i)} />;
                })}
                {i % cadaCuantas === 0 && (
                  <text x={x + anchoBarra / 2} y={alto - 8 - (lineas[i].length - 1) * ALTO_LINEA} textAnchor="middle" fontSize={11} fill={tema.tenue}>
                    {lineas[i].map((l, k) => <tspan key={k} x={x + anchoBarra / 2} dy={k ? ALTO_LINEA : 0}>{l}</tspan>)}
                  </text>
                )}
                {i === iMax && totales[i] > 0 && (
                  <text x={x + anchoBarra / 2} y={y(totales[i]) - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill={tema.tinta2}>
                    {formatoEje(totales[i])}
                  </text>
                )}
                <rect
                  x={M.izq + i * banda}
                  y={M.arriba}
                  width={banda}
                  height={altoPlot}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${c.etiqueta}: ${formatoValor(totales[i])}`}
                  onPointerMove={() => mostrar(i, M.izq + i * banda + banda / 2)}
                  onFocus={() => mostrar(i, M.izq + i * banda + banda / 2)}
                  onBlur={ocultar}
                  style={{ outline: 'none' }}
                />
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip estado={tip} anchoContenedor={ancho} />
    </div>
  );
};
