import React, { ReactNode, useState } from 'react';
import { EstadoTooltip, Tooltip, useTamano } from './base';
import { escalaLinda, tema } from './tema';

export interface PuntoBurbuja {
  clave: string;
  etiqueta: string;
  x: number;
  y: number;
  tamano: number; // define el área de la burbuja
  tooltip: ReactNode;
}

interface Props {
  puntos: PuntoBurbuja[];
  formatoX: (n: number) => string;
  formatoY: (n: number) => string;
  tituloX: string;
  tituloY: string;
  referenciaX?: { valor: number; etiqueta: string };
  etiquetas?: number; // cuántas de las burbujas más grandes llevan nombre
}

const M = { izq: 60, der: 16, arriba: 22, abajo: 38 };

const recortar = (s: string, n = 18) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// Dispersión con burbujas de un solo color: el área es proporcional al tamaño.
// Las chicas se dibujan arriba de las grandes para que se puedan señalar.
// Llena el contenedor, que tiene que tener posición relativa y alto definido.
export const Burbujas: React.FC<Props> = ({ puntos, formatoX, formatoY, tituloX, tituloY, referenciaX, etiquetas = 4 }) => {
  const [ref, { ancho, alto }] = useTamano<HTMLDivElement>();
  const [activa, setActiva] = useState<string | null>(null);
  const [tip, setTip] = useState<EstadoTooltip | null>(null);

  const anchoPlot = Math.max(0, ancho - M.izq - M.der);
  const altoPlot = Math.max(0, alto - M.arriba - M.abajo);
  const ejeX = escalaLinda(Math.max(referenciaX?.valor ?? 0, ...puntos.map(p => p.x)) * 1.08);
  const ejeY = escalaLinda(Math.max(0, ...puntos.map(p => p.y)) * 1.08);
  const x = (v: number) => M.izq + (v / ejeX.tope) * anchoPlot;
  const y = (v: number) => M.arriba + altoPlot - (v / ejeY.tope) * altoPlot;
  const maxTam = Math.max(1, ...puntos.map(p => p.tamano));
  const rMax = Math.max(8, Math.min(28, Math.min(anchoPlot, altoPlot) / 9));
  const radio = (t: number) => Math.max(3, rMax * Math.sqrt(Math.max(0, t) / maxTam));

  const orden = [...puntos].sort((a, b) => b.tamano - a.tamano);
  const conNombre = new Set(orden.slice(0, etiquetas).map(p => p.clave));

  const mostrar = (p: PuntoBurbuja) => {
    setActiva(p.clave);
    setTip({ x: x(p.x), y: y(p.y) - radio(p.tamano), contenido: p.tooltip });
  };
  const ocultar = () => { setActiva(null); setTip(null); };

  return (
    <div ref={ref} className="absolute inset-0" onPointerLeave={ocultar}>
      {ancho > 0 && alto > 100 && (
        <svg width={ancho} height={alto} className="block overflow-visible" role="img" aria-label="Gráfico de burbujas">
          {ejeY.ticks.map(t => (
            <g key={`y${t}`}>
              <line x1={M.izq} x2={ancho - M.der} y1={y(t)} y2={y(t)} stroke={t === 0 ? tema.base : tema.grilla} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={M.izq - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={tema.tenue} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatoY(t)}
              </text>
            </g>
          ))}
          {ejeX.ticks.map(t => (
            <text key={`x${t}`} x={x(t)} y={M.arriba + altoPlot + 15} textAnchor="middle" fontSize={11} fill={tema.tenue} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatoX(t)}
            </text>
          ))}
          <text x={M.izq + anchoPlot} y={alto - 4} textAnchor="end" fontSize={11} fill={tema.tinta2}>{tituloX} →</text>
          <text x={M.izq} y={11} textAnchor="start" fontSize={11} fill={tema.tinta2}>↑ {tituloY}</text>

          {referenciaX && (
            <g>
              <line
                x1={x(referenciaX.valor)} x2={x(referenciaX.valor)} y1={M.arriba} y2={M.arriba + altoPlot}
                stroke={tema.tenue} strokeWidth={1} strokeDasharray="3 3"
              />
              <text x={x(referenciaX.valor) + 4} y={M.arriba + 10} fontSize={11} fill={tema.tenue}>{referenciaX.etiqueta}</text>
            </g>
          )}

          {orden.map(p => {
            const r = radio(p.tamano);
            const esActiva = activa === p.clave;
            return (
              <circle
                key={p.clave}
                cx={x(p.x)}
                cy={y(p.y)}
                r={r}
                fill={tema.serie}
                fillOpacity={activa === null || esActiva ? 0.45 : 0.2}
                stroke={esActiva ? tema.tinta : tema.serie}
                strokeWidth={esActiva ? 2 : 1.5}
                tabIndex={0}
                aria-label={p.etiqueta}
                onPointerMove={() => mostrar(p)}
                onFocus={() => mostrar(p)}
                onBlur={ocultar}
                style={{ outline: 'none', cursor: 'default' }}
              />
            );
          })}

          {orden.filter(p => conNombre.has(p.clave)).map(p => {
            const r = radio(p.tamano);
            const cx = x(p.x);
            const derecha = cx + r + 120 < ancho;
            return (
              <text
                key={`e${p.clave}`}
                x={derecha ? cx + r + 4 : cx - r - 4}
                y={y(p.y)}
                dy="0.32em"
                textAnchor={derecha ? 'start' : 'end'}
                fontSize={11}
                fill={tema.tinta2}
                stroke={tema.superficie}
                strokeWidth={3}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {recortar(p.etiqueta)}
              </text>
            );
          })}
        </svg>
      )}
      <Tooltip estado={tip} anchoContenedor={ancho} />
    </div>
  );
};
