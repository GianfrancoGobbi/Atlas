import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { tema } from './tema';

// Ancho disponible del contenedor (los gráficos se dibujan en SVG a ese ancho).
export function useAncho<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setAncho(Math.floor(e.contentRect.width)));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, ancho];
}

// ---------- Tooltip ----------

export interface EstadoTooltip { x: number; y: number; contenido: ReactNode }

export const Tooltip: React.FC<{ estado: EstadoTooltip | null; anchoContenedor: number }> = ({ estado, anchoContenedor }) => {
  if (!estado) return null;
  const aLaIzquierda = estado.x > anchoContenedor * 0.6;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-20 min-w-[10rem] max-w-[18rem] rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-lg"
      style={{
        left: aLaIzquierda ? undefined : estado.x + 12,
        right: aLaIzquierda ? anchoContenedor - estado.x + 12 : undefined,
        top: Math.max(0, estado.y - 12),
      }}
    >
      {estado.contenido}
    </div>
  );
};

// Fila de tooltip: el valor manda, la etiqueta acompaña; la serie se marca con un trazo corto.
export const FilaTooltip: React.FC<{ color?: string; etiqueta: ReactNode; valor: ReactNode; fuerte?: boolean }> = ({
  color, etiqueta, valor, fuerte,
}) => (
  <div className="flex items-center gap-2 py-0.5">
    {color && <span className="inline-block h-0.5 w-3 shrink-0 rounded" style={{ background: color }} />}
    <span className={`tabular-nums ${fuerte ? 'font-semibold text-slate-900' : 'font-semibold text-slate-800'}`}>{valor}</span>
    <span className="text-slate-500">{etiqueta}</span>
  </div>
);

// ---------- Leyenda ----------

export interface ItemLeyenda { color: string; etiqueta: string; icono?: ReactNode; forma?: 'rect' | 'linea' }

export const Leyenda: React.FC<{ items: ItemLeyenda[] }> = ({ items }) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
    {items.map(i => (
      <li key={i.etiqueta} className="flex items-center gap-1.5">
        {i.forma === 'linea'
          ? <span className="inline-block h-0.5 w-3 rounded" style={{ background: i.color }} />
          : <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />}
        {i.icono}
        <span>{i.etiqueta}</span>
      </li>
    ))}
  </ul>
);

// Íconos de estado: el color nunca va solo.
export const IconoEstado: React.FC<{ tipo: 'bien' | 'alerta' | 'neutro' | 'critico' }> = ({ tipo }) => {
  const comun = { width: 12, height: 12, viewBox: '0 0 12 12', 'aria-hidden': true } as const;
  if (tipo === 'bien') return <svg {...comun}><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke={tema.tinta2} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (tipo === 'alerta') return <svg {...comun}><path d="M6 3v3.5M6 8.6v.1" stroke={tema.tinta2} strokeWidth="1.6" strokeLinecap="round" /><circle cx="6" cy="6" r="5" fill="none" stroke={tema.tinta2} strokeWidth="1.2" /></svg>;
  if (tipo === 'critico') return <svg {...comun}><path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke={tema.tinta2} strokeWidth="1.6" strokeLinecap="round" /></svg>;
  return <svg {...comun}><circle cx="6" cy="6" r="2.5" fill={tema.tinta2} /></svg>;
};

// ---------- Tarjeta de gráfico ----------

export const TarjetaGrafico: React.FC<{
  titulo: string;
  subtitulo?: ReactNode;
  leyenda?: ReactNode;
  tabla?: ReactNode;
  actualizando?: boolean;
  className?: string;
  children: ReactNode;
}> = ({ titulo, subtitulo, leyenda, tabla, actualizando, className = '', children }) => {
  const [verTabla, setVerTabla] = useState(false);
  return (
    <section className={`min-w-0 rounded-xl border border-black/5 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{titulo}</h3>
          {subtitulo && <p className="mt-0.5 text-sm text-slate-500">{subtitulo}</p>}
        </div>
        {tabla && (
          <button
            type="button"
            onClick={() => setVerTabla(v => !v)}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-pressed={verTabla}
          >
            {verTabla ? 'Ver gráfico' : 'Ver tabla'}
          </button>
        )}
      </header>
      {leyenda && !verTabla && <div className="mb-3">{leyenda}</div>}
      <div className={`transition-opacity duration-200 ${actualizando ? 'opacity-50' : ''}`}>
        {verTabla ? tabla : children}
      </div>
    </section>
  );
};

// ---------- Indicadores ----------

export const Indicador: React.FC<{
  etiqueta: string;
  valor: ReactNode;
  detalle?: ReactNode;
  icono?: ReactNode;
}> = ({ etiqueta, valor, detalle, icono }) => (
  <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-1.5 text-sm text-slate-500">{icono}{etiqueta}</div>
    <div className="mt-1 text-2xl font-semibold text-slate-900">{valor}</div>
    {detalle && <div className="mt-0.5 text-xs text-slate-500">{detalle}</div>}
  </div>
);

export const SinDatos: React.FC<{ texto: string }> = ({ texto }) => (
  <p className="py-10 text-center text-sm text-slate-500">{texto}</p>
);
