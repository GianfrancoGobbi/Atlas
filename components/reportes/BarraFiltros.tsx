import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { FILTROS_INICIALES, FiltroEstado, Filtros, PRESETS_PERIODO, PresetPeriodo } from '../../utils/reportes';

interface Opcion { id: string; nombre: string }

interface Props {
  filtros: Filtros;
  onCambio: (f: Filtros) => void;
  obrasSociales: Opcion[];
  terapeutas?: Opcion[]; // solo administración
}

const Check: React.FC<{ visible: boolean }> = ({ visible }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className={visible ? '' : 'invisible'}>
    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Botón con panel desplegable; se cierra con clic afuera o Escape.
const Desplegable: React.FC<{ etiqueta: ReactNode; activo: boolean; children: (cerrar: () => void) => ReactNode }> = ({
  etiqueta, activo, children,
}) => {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', esc); };
  }, [abierto]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={abierto}
        onClick={() => setAbierto(a => !a)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          activo ? 'border-primary-dark/40 bg-primary-light/20 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        {etiqueta}
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </button>
      {abierto && (
        <div className="absolute left-0 z-30 mt-1 w-64 rounded-xl border border-black/10 bg-white p-1.5 shadow-xl">
          {children(() => setAbierto(false))}
        </div>
      )}
    </div>
  );
};

const SeleccionMultiple: React.FC<{
  titulo: string;
  plural: string;
  opciones: Opcion[];
  seleccion: string[];
  onCambio: (ids: string[]) => void;
}> = ({ titulo, plural, opciones, seleccion, onCambio }) => {
  const [busqueda, setBusqueda] = useState('');
  const visibles = opciones.filter(o => o.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));
  const etiqueta = seleccion.length === 0
    ? `${titulo}: todas`
    : seleccion.length === 1
      ? opciones.find(o => o.id === seleccion[0])?.nombre ?? titulo
      : `${seleccion.length} ${plural}`;
  const alternar = (id: string) => onCambio(seleccion.includes(id) ? seleccion.filter(x => x !== id) : [...seleccion, id]);
  return (
    <Desplegable etiqueta={etiqueta} activo={seleccion.length > 0}>
      {() => (
        <>
          {opciones.length > 6 && (
            <input
              type="search"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar…"
              className="mb-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
          )}
          <ul className="max-h-64 overflow-y-auto">
            <li>
              <button type="button" onClick={() => onCambio([])} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                <Check visible={seleccion.length === 0} /> Todas
              </button>
            </li>
            {visibles.map(o => (
              <li key={o.id}>
                <button type="button" onClick={() => alternar(o.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                  <Check visible={seleccion.includes(o.id)} />
                  <span className="truncate">{o.nombre}</span>
                </button>
              </li>
            ))}
            {!visibles.length && <li className="px-2 py-1.5 text-sm text-slate-500">Sin resultados</li>}
          </ul>
        </>
      )}
    </Desplegable>
  );
};

const ESTADOS: { id: FiltroEstado; etiqueta: string }[] = [
  { id: 'todas', etiqueta: 'Todas' },
  { id: 'pagas', etiqueta: 'Pagas' },
  { id: 'impagas', etiqueta: 'Impagas' },
  { id: 'vencidas', etiqueta: 'Vencidas' },
];

// Una sola fila de filtros arriba de todo lo que afectan.
export const BarraFiltros: React.FC<Props> = ({ filtros, onCambio, obrasSociales, terapeutas }) => {
  const set = (cambios: Partial<Filtros>) => onCambio({ ...filtros, ...cambios });
  const etiquetaPeriodo = filtros.preset === 'personalizado'
    ? `${filtros.desde || '…'} → ${filtros.hasta || '…'}`
    : PRESETS_PERIODO.find(p => p.id === filtros.preset)?.etiqueta;
  const hayCambios = JSON.stringify(filtros) !== JSON.stringify(FILTROS_INICIALES);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Desplegable etiqueta={<><span className="text-slate-500">Período:</span> {etiquetaPeriodo}</>} activo={filtros.preset !== FILTROS_INICIALES.preset}>
        {cerrar => (
          <>
            <ul>
              {PRESETS_PERIODO.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => { set({ preset: p.id as PresetPeriodo }); cerrar(); }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50 ${filtros.preset === p.id ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
                  >
                    <Check visible={filtros.preset === p.id} /> {p.etiqueta}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-1.5 border-t border-slate-100 px-2 pt-2 pb-1">
              <p className="mb-1 text-xs font-medium text-slate-500">Rango a medida</p>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  aria-label="Desde"
                  value={filtros.desde}
                  onChange={e => set({ preset: 'personalizado', desde: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-xs focus:border-primary focus:outline-none"
                />
                <span className="text-slate-400">→</span>
                <input
                  type="date"
                  aria-label="Hasta"
                  value={filtros.hasta}
                  onChange={e => set({ preset: 'personalizado', hasta: e.target.value })}
                  className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </>
        )}
      </Desplegable>

      <SeleccionMultiple
        titulo="Obra social"
        plural="obras sociales"
        opciones={obrasSociales}
        seleccion={filtros.obrasSociales}
        onCambio={ids => set({ obrasSociales: ids })}
      />

      {terapeutas && terapeutas.length > 1 && (
        <SeleccionMultiple
          titulo="Terapeuta"
          plural="terapeutas"
          opciones={terapeutas}
          seleccion={filtros.terapeutas}
          onCambio={ids => set({ terapeutas: ids })}
        />
      )}

      <div role="radiogroup" aria-label="Estado de pago" className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
        {ESTADOS.map(e => (
          <button
            key={e.id}
            type="button"
            role="radio"
            aria-checked={filtros.estado === e.id}
            onClick={() => set({ estado: e.id })}
            className={`rounded-md px-2.5 py-1 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              filtros.estado === e.id ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {e.etiqueta}
          </button>
        ))}
      </div>

      {hayCambios && (
        <button type="button" onClick={() => onCambio(FILTROS_INICIALES)} className="px-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:underline">
          Limpiar filtros
        </button>
      )}
    </div>
  );
};
