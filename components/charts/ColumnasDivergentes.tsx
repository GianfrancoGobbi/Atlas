import React, { ReactNode, useState } from 'react';
import { EstadoTooltip, FilaTooltip, Tooltip, useTamano } from './base';
import { escalaLinda, GAP, pathColumna, RADIO, tema } from './tema';

export interface SerieDivergente { clave: string; etiqueta: string; color: string }

interface Props {
  categorias: { clave: string; etiqueta: string; nota?: string }[]; // nota: segunda línea bajo la etiqueta (p. ej., "prov.")
  arriba: SerieDivergente[]; // se apilan hacia arriba del cero
  abajo: SerieDivergente[]; // se apilan hacia abajo del cero
  valores: ReadonlyArray<Record<string, unknown>>; // valores[i][serie.clave], siempre positivos
  formatoValor: (n: number) => string;
  formatoEje: (n: number) => string;
  extraTooltip?: (i: number) => ReactNode;
}

const M = { izq: 40, der: 8, arriba: 10, abajo: 34 };
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0);
const ANCHO_MAX_BARRA = 24;
const ANCHO_CARACTER = 6.2;

// Columna hacia abajo: extremo inferior redondeado, recta contra el cero.
function pathColumnaAbajo(x: number, y: number, w: number, h: number, r = RADIO): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y}V${y + h - rr}Q${x},${y + h} ${x + rr},${y + h}H${x + w - rr}Q${x + w},${y + h} ${x + w},${y + h - rr}V${y}Z`;
}

// Columnas que crecen hacia los dos lados de un cero común (p. ej., altas arriba y bajas abajo).
// Una sola escala para ambos lados. Llena el contenedor, que tiene que tener posición relativa y alto definido.
export const ColumnasDivergentes: React.FC<Props> = ({ categorias, arriba, abajo, valores, formatoValor, formatoEje, extraTooltip }) => {
  const [ref, { ancho, alto }] = useTamano<HTMLDivElement>();
  const [activa, setActiva] = useState<number | null>(null);
  const [tip, setTip] = useState<EstadoTooltip | null>(null);

  const n = categorias.length;
  const total = (series: SerieDivergente[], i: number) => series.reduce((s, x) => s + num(valores[i][x.clave]), 0);
  const maxArriba = Math.max(0, ...categorias.map((_, i) => total(arriba, i)));
  const maxAbajo = Math.max(0, ...categorias.map((_, i) => total(abajo, i)));
  const { ticks } = escalaLinda(Math.max(maxArriba, maxAbajo, 1));
  const paso = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
  const topeArriba = Math.max(paso, Math.ceil(maxArriba / paso) * paso);
  const topeAbajo = maxAbajo > 0 ? Math.ceil(maxAbajo / paso) * paso : 0;
  const marcas: number[] = [];
  for (let v = -topeAbajo; v <= topeArriba + 1e-9; v += paso) marcas.push(Math.round(v * 1e6) / 1e6);

  const anchoPlot = Math.max(0, ancho - M.izq - M.der);
  const altoPlot = Math.max(0, alto - M.arriba - M.abajo);
  const banda = n ? anchoPlot / n : 0;
  const anchoBarra = Math.max(2, Math.min(ANCHO_MAX_BARRA, banda * 0.7));
  const k = altoPlot / (topeArriba + topeAbajo);
  const y = (v: number) => M.arriba + (topeArriba - v) * k;
  const cero = y(0);
  const anchoEtiqueta = Math.max(0, ...categorias.map(c => c.etiqueta.length * ANCHO_CARACTER));
  const cadaCuantas = Math.max(1, Math.ceil((anchoEtiqueta + 8) / Math.max(1, banda)));

  const mostrar = (i: number, cx: number) => {
    setActiva(i);
    setTip({
      x: cx,
      y: M.arriba,
      contenido: (
        <>
          <div className="mb-1 text-xs font-medium text-slate-500">{categorias[i].etiqueta}</div>
          {[...arriba, ...abajo].map(s => (
            <FilaTooltip key={s.clave} color={s.color} etiqueta={s.etiqueta} valor={formatoValor(num(valores[i][s.clave]))} />
          ))}
          {extraTooltip?.(i)}
        </>
      ),
    });
  };
  const ocultar = () => { setActiva(null); setTip(null); };

  const pila = (series: SerieDivergente[], i: number, x: number, haciaArriba: boolean) => {
    const visibles = series.filter(s => num(valores[i][s.clave]) > 0);
    const ultima = visibles[visibles.length - 1]?.clave;
    let acumulado = 0;
    return visibles.map((s, j) => {
      const v = num(valores[i][s.clave]);
      const desde = acumulado;
      acumulado += v;
      const hueco = j > 0 ? GAP : 0;
      const h = (acumulado - desde) * k - hueco;
      if (h <= 0.5) return null;
      if (haciaArriba) {
        const tope = y(acumulado);
        return s.clave === ultima
          ? <path key={s.clave} d={pathColumna(x, tope, anchoBarra, h)} fill={s.color} />
          : <rect key={s.clave} x={x} y={tope} width={anchoBarra} height={h} fill={s.color} />;
      }
      const top = y(-desde) + hueco;
      return s.clave === ultima
        ? <path key={s.clave} d={pathColumnaAbajo(x, top, anchoBarra, h)} fill={s.color} />
        : <rect key={s.clave} x={x} y={top} width={anchoBarra} height={h} fill={s.color} />;
    });
  };

  return (
    <div ref={ref} className="absolute inset-0" onPointerLeave={ocultar}>
      {ancho > 0 && alto > 80 && (
        <svg width={ancho} height={alto} className="block" role="img" aria-label="Gráfico de columnas hacia arriba y hacia abajo">
          {marcas.map(t => (
            <g key={t}>
              <line x1={M.izq} x2={ancho - M.der} y1={y(t)} y2={y(t)} stroke={tema.grilla} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={M.izq - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={tema.tenue} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatoEje(Math.abs(t))}
              </text>
            </g>
          ))}

          {categorias.map((c, i) => {
            const x = M.izq + i * banda + (banda - anchoBarra) / 2;
            const cx = x + anchoBarra / 2;
            return (
              <g key={c.clave} opacity={activa === null || activa === i ? 1 : 0.55}>
                {pila(arriba, i, x, true)}
                {pila(abajo, i, x, false)}
                {i % cadaCuantas === 0 && (
                  <text x={cx} y={alto - 20} textAnchor="middle" fontSize={11} fill={tema.tenue}>{c.etiqueta}</text>
                )}
                {c.nota && (
                  <text x={cx} y={alto - 6} textAnchor="middle" fontSize={10} fontStyle="italic" fill={tema.tenue}>{c.nota}</text>
                )}
                <rect
                  x={M.izq + i * banda}
                  y={M.arriba}
                  width={banda}
                  height={altoPlot}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${c.etiqueta}${c.nota ? ` (${c.nota})` : ''}: ${[...arriba, ...abajo].map(s => `${s.etiqueta} ${formatoValor(num(valores[i][s.clave]))}`).join(', ')}`}
                  onPointerMove={() => mostrar(i, cx)}
                  onFocus={() => mostrar(i, cx)}
                  onBlur={ocultar}
                  style={{ outline: 'none' }}
                />
              </g>
            );
          })}
          <line x1={M.izq} x2={ancho - M.der} y1={cero} y2={cero} stroke={tema.base} strokeWidth={1} shapeRendering="crispEdges" />
        </svg>
      )}
      <Tooltip estado={tip} anchoContenedor={ancho} />
    </div>
  );
};
