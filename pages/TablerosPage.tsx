import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { Spinner } from '../components/shared/Spinner';
import { Alert } from '../components/shared/Alert';
import { BarraFiltros } from '../components/reportes/BarraFiltros';
import { SeccionCobranzas, VistaCobranzas } from '../components/reportes/VistaCobranzas';
import { SeccionSesiones, VistaSesiones } from '../components/reportes/VistaSesiones';
import { VistaTerapeutas } from '../components/reportes/VistaTerapeutas';
import { DatosTableros, reportesService } from '../services/reportesService';
import {
  analizarFacturas, analizarTurnos, CalidadDatos, FILTROS_INICIALES, FiltroEstado, Filtros, filtrarFacturas, filtrarTurnos,
  hoyDia, PRESETS_PERIODO, PresetPeriodo, rangoDeFiltros,
} from '../utils/reportes';

type Vista = SeccionCobranzas | SeccionSesiones | 'terapeutas';

// Menú de vistas: todas a un clic, agrupadas por tema.
const GRUPOS: { titulo: string; soloAdmin?: boolean; vistas: { id: Vista; etiqueta: string }[] }[] = [
  {
    titulo: 'Cobranzas',
    vistas: [
      { id: 'resumen', etiqueta: 'Resumen' },
      { id: 'obras', etiqueta: 'Por obra social' },
      { id: 'deuda', etiqueta: 'Deuda impaga' },
    ],
  },
  {
    titulo: 'Actividad',
    vistas: [
      { id: 'sesiones', etiqueta: 'Sesiones' },
      { id: 'turnos', etiqueta: 'Turnos' },
    ],
  },
  { titulo: 'Equipo', soloAdmin: true, vistas: [{ id: 'terapeutas', etiqueta: 'Por terapeuta' }] },
];

// ---------- Filtros en la URL (se pueden compartir o guardar como favorito) ----------

const PRESETS_VALIDOS = new Set<string>([...PRESETS_PERIODO.map(p => p.id), 'personalizado']);
const ESTADOS_VALIDOS = new Set<string>(['todas', 'pagas', 'impagas', 'vencidas']);
const lista = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

function leerFiltros(p: URLSearchParams): Filtros {
  const preset = p.get('periodo');
  const estado = p.get('estado');
  return {
    preset: preset && PRESETS_VALIDOS.has(preset) ? (preset as PresetPeriodo) : FILTROS_INICIALES.preset,
    desde: p.get('desde') ?? '',
    hasta: p.get('hasta') ?? '',
    obrasSociales: lista(p.get('os')),
    terapeutas: lista(p.get('ter')),
    estado: estado && ESTADOS_VALIDOS.has(estado) ? (estado as FiltroEstado) : FILTROS_INICIALES.estado,
  };
}

function aParams(f: Filtros, vista: Vista): URLSearchParams {
  const p = new URLSearchParams();
  if (vista !== 'resumen') p.set('vista', vista);
  if (f.preset !== FILTROS_INICIALES.preset) p.set('periodo', f.preset);
  if (f.preset === 'personalizado') {
    if (f.desde) p.set('desde', f.desde);
    if (f.hasta) p.set('hasta', f.hasta);
  }
  if (f.obrasSociales.length) p.set('os', f.obrasSociales.join(','));
  if (f.terapeutas.length) p.set('ter', f.terapeutas.join(','));
  if (f.estado !== 'todas') p.set('estado', f.estado);
  return p;
}

const horaCorta = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' });

// Permisos y carga de datos. La presentación está en <Tableros>, que no depende de Supabase.
export const TablerosPage: React.FC = () => {
  const { role } = useAuth();
  const [datos, setDatos] = useState<DatosTableros | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizado, setActualizado] = useState<Date | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await reportesService.cargar());
      setActualizado(new Date());
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar los datos de los tableros.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (role !== UserRole.TERAPEUTA && role !== UserRole.ADMIN) {
    return <Alert type="error" message="No tiene permisos para acceder a esta sección." />;
  }
  return (
    <Tableros
      datos={datos}
      esAdmin={role === UserRole.ADMIN}
      cargando={cargando}
      error={error}
      actualizado={actualizado}
      onActualizar={cargar}
    />
  );
};

// Notas sobre la calidad de los datos, en un desplegable para no ocupar lugar.
const NotasDatos: React.FC<{ calidad: CalidadDatos }> = ({ calidad }) => {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [abierto]);

  const notas = [
    calidad.pagasSinFecha > 0 && `${calidad.pagasSinFecha} facturas pagas no tienen fecha de pago: cuentan como cobradas, pero no entran en los días promedio.`,
    calidad.pagoAntesDeEmision > 0 && `${calidad.pagoAntesDeEmision} facturas tienen fecha de pago anterior a la de emisión: se cuentan como cobradas en el día.`,
    calidad.sinFechaEmision > 0 && `${calidad.sinFechaEmision} facturas sin fecha de emisión no se incluyen.`,
  ].filter(Boolean) as string[];
  if (!notas.length) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-white hover:text-slate-800"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M8 7.2v3.8M8 5v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        Notas sobre los datos ({notas.length})
      </button>
      {abierto && (
        <div className="absolute bottom-full left-0 z-30 mb-1 w-72 rounded-xl border border-black/10 bg-white p-3 text-xs text-slate-600 shadow-xl">
          <ul className="space-y-1.5">{notas.map(n => <li key={n}>{n}</li>)}</ul>
        </div>
      )}
    </div>
  );
};

interface PropsTableros {
  datos: DatosTableros | null;
  esAdmin: boolean;
  cargando: boolean;
  error: string | null;
  actualizado: Date | null;
  onActualizar: () => void;
}

export const Tableros: React.FC<PropsTableros> = ({ datos, esAdmin, cargando, error, actualizado, onActualizar }) => {
  const [params, setParams] = useSearchParams();
  const filtros = useMemo(() => leerFiltros(params), [params]);
  const grupos = GRUPOS.filter(g => !g.soloAdmin || esAdmin);
  const vistaParam = params.get('vista');
  const vista: Vista = grupos.flatMap(g => g.vistas).find(v => v.id === vistaParam)?.id ?? 'resumen';

  const hoy = useMemo(() => hoyDia(), [actualizado]);
  const base = useMemo(() => {
    if (!datos) return null;
    const { facturas, calidad } = analizarFacturas(datos.facturas, datos.obrasSociales, hoy);
    return { facturas, calidad, turnos: analizarTurnos(datos.turnos) };
  }, [datos, hoy]);

  const rango = useMemo(() => rangoDeFiltros(filtros, hoy), [filtros, hoy]);
  const facturas = useMemo(() => (base ? filtrarFacturas(base.facturas, filtros, rango) : []), [base, filtros, rango]);
  const turnos = useMemo(() => (base ? filtrarTurnos(base.turnos, filtros, rango) : []), [base, filtros, rango]);

  // Opciones de filtro: solo lo que aparece en los datos que esta persona puede ver.
  const opcionesObras = useMemo(() => {
    if (!base) return [];
    const nombres = new Map(base.facturas.filter(f => f.obraSocialId).map(f => [f.obraSocialId as string, f.obraSocial]));
    return [...nombres].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [base]);
  const nombrePersona = useMemo(() => {
    const m = new Map((datos?.terapeutas ?? []).map(p => [p.id, `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() || 'Sin nombre']));
    return (id: string | null) => (id ? m.get(id) ?? 'Sin nombre' : 'Sin asignar');
  }, [datos]);
  const opcionesTerapeutas = useMemo(() => {
    if (!base || !esAdmin) return undefined;
    const ids = new Set([...base.facturas.map(f => f.terapeutaId), ...base.turnos.map(t => t.terapeutaId)].filter((x): x is string => !!x));
    return [...ids].map(id => ({ id, nombre: nombrePersona(id) })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [base, esAdmin, nombrePersona]);

  const actualizarFiltros = (f: Filtros) => setParams(aParams(f, vista), { replace: true });
  const cambiarVista = (v: Vista) => setParams(aParams(filtros, v), { replace: true });
  const alternar = (campo: 'obrasSociales' | 'terapeutas') => (id: string) => {
    const actual = filtros[campo];
    actualizarFiltros({ ...filtros, [campo]: actual.includes(id) ? actual.filter(x => x !== id) : [...actual, id] });
  };

  const botonActualizar = (
    <button
      type="button"
      onClick={onActualizar}
      disabled={cargando}
      title={actualizado ? `Actualizado ${horaCorta.format(actualizado)}` : undefined}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden className={cargando ? 'animate-spin' : ''}>
        <path d="M13.5 8A5.5 5.5 0 1 1 11.9 4.1M13.5 2.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Actualizar
    </button>
  );

  return (
    // En pantallas grandes todo entra en la ventana: 100dvh menos la barra de navegación (64 px) y el margen (32 px).
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-96px)] lg:flex-row lg:gap-4">
      <aside className="flex shrink-0 flex-col gap-3 lg:w-44">
        <nav aria-label="Vistas de los tableros" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0">
          {grupos.map(g => (
            <div key={g.titulo} className="flex gap-1 lg:flex-col lg:gap-0.5">
              <p className="hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:block">{g.titulo}</p>
              {g.vistas.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => cambiarVista(v.id)}
                  aria-current={vista === v.id ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    vista === v.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  {v.etiqueta}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="hidden flex-col items-start gap-2 lg:mt-auto lg:flex">
          {base && <NotasDatos calidad={base.calidad} />}
          {actualizado && <span className="px-2 text-xs text-slate-400">Actualizado {horaCorta.format(actualizado)}</span>}
          {botonActualizar}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <BarraFiltros filtros={filtros} onCambio={actualizarFiltros} obrasSociales={opcionesObras} terapeutas={opcionesTerapeutas} />
          <div className="lg:hidden">{botonActualizar}</div>
        </div>

        {error && <Alert type="error" message={error} />}

        <div className="min-h-0 flex-1">
          {!base && cargando && <div className="flex h-full min-h-[12rem] items-center justify-center"><Spinner size="lg" /></div>}

          {base && (vista === 'resumen' || vista === 'obras' || vista === 'deuda') && (
            <VistaCobranzas
              seccion={vista}
              facturas={facturas}
              rango={rango}
              obrasSeleccionadas={filtros.obrasSociales}
              onAlternarObraSocial={alternar('obrasSociales')}
              nombreTerapeuta={esAdmin ? nombrePersona : undefined}
              actualizando={cargando}
            />
          )}
          {base && (vista === 'sesiones' || vista === 'turnos') && (
            <VistaSesiones
              seccion={vista}
              facturas={facturas}
              turnos={turnos}
              rango={rango}
              obrasSeleccionadas={filtros.obrasSociales}
              onAlternarObraSocial={alternar('obrasSociales')}
              avisoFiltrosNoAplican={filtros.obrasSociales.length > 0 || filtros.estado !== 'todas'}
              actualizando={cargando}
            />
          )}
          {base && vista === 'terapeutas' && datos && (
            <VistaTerapeutas
              facturas={facturas}
              turnos={turnos}
              personas={datos.terapeutas}
              terapeutasSeleccionados={filtros.terapeutas}
              onAlternarTerapeuta={alternar('terapeutas')}
              actualizando={cargando}
            />
          )}
        </div>
      </div>
    </div>
  );
};
