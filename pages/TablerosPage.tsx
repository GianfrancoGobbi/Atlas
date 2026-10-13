import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  analizarFacturas, analizarTurnos, FILTROS_INICIALES, FiltroEstado, Filtros, filtrarFacturas, filtrarTurnos,
  hoyDia, PRESETS_PERIODO, PresetPeriodo, rangoDeFiltros,
} from '../utils/reportes';

type Vista = 'cobranzas' | 'sesiones' | 'terapeutas';

// Subpestañas de cada pestaña (la primera es la de entrada).
const SUBVISTAS: Record<Vista, { id: string; etiqueta: string }[]> = {
  cobranzas: [
    { id: 'resumen', etiqueta: 'Resumen' },
    { id: 'obras', etiqueta: 'Por obra social' },
    { id: 'deuda', etiqueta: 'Deuda impaga' },
  ],
  sesiones: [
    { id: 'sesiones', etiqueta: 'Sesiones' },
    { id: 'turnos', etiqueta: 'Turnos' },
  ],
  terapeutas: [],
};

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

function aParams(f: Filtros, vista: Vista, sub?: string): URLSearchParams {
  const p = new URLSearchParams();
  if (vista !== 'cobranzas') p.set('vista', vista);
  if (sub && sub !== SUBVISTAS[vista][0]?.id) p.set('sub', sub);
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
  const vistaParam = params.get('vista');
  const vista: Vista = vistaParam === 'sesiones' || (vistaParam === 'terapeutas' && esAdmin) ? vistaParam : 'cobranzas';
  const subvistas = SUBVISTAS[vista];
  const sub = subvistas.find(s => s.id === params.get('sub'))?.id ?? subvistas[0]?.id;

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

  const actualizarFiltros = (f: Filtros) => setParams(aParams(f, vista, sub), { replace: true });
  const cambiarVista = (v: Vista) => setParams(aParams(filtros, v), { replace: true });
  const cambiarSub = (s: string) => setParams(aParams(filtros, vista, s), { replace: true });
  const alternar = (campo: 'obrasSociales' | 'terapeutas') => (id: string) => {
    const actual = filtros[campo];
    actualizarFiltros({ ...filtros, [campo]: actual.includes(id) ? actual.filter(x => x !== id) : [...actual, id] });
  };

  const pestañas: { id: Vista; etiqueta: string }[] = [
    { id: 'cobranzas', etiqueta: 'Cobranzas y atrasos' },
    { id: 'sesiones', etiqueta: 'Sesiones y turnos' },
    ...(esAdmin ? [{ id: 'terapeutas' as Vista, etiqueta: 'Por terapeuta' }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-primary-dark">Tableros</h1>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          {actualizado && <span>Actualizado {horaCorta.format(actualizado)}</span>}
          <button
            type="button"
            onClick={onActualizar}
            disabled={cargando}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden className={cargando ? 'animate-spin' : ''}>
              <path d="M13.5 8A5.5 5.5 0 1 1 11.9 4.1M13.5 2.5v3h-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Secciones de los tableros">
        {pestañas.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => cambiarVista(p.id)}
            aria-current={vista === p.id ? 'page' : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              vista === p.id ? 'border-primary-dark text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </nav>

      {subvistas.length > 1 && (
        <nav className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-200/60 p-1" aria-label="Subsecciones">
          {subvistas.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => cambiarSub(s.id)}
              aria-current={sub === s.id ? 'page' : undefined}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                sub === s.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s.etiqueta}
            </button>
          ))}
        </nav>
      )}

      <BarraFiltros
        filtros={filtros}
        onCambio={actualizarFiltros}
        obrasSociales={opcionesObras}
        terapeutas={opcionesTerapeutas}
      />

      {error && <Alert type="error" message={error} />}

      {!base && cargando && (
        <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
      )}

      {base && vista === 'cobranzas' && (
        <VistaCobranzas
          seccion={sub as SeccionCobranzas}
          facturas={facturas}
          rango={rango}
          calidad={base.calidad}
          obrasSeleccionadas={filtros.obrasSociales}
          onAlternarObraSocial={alternar('obrasSociales')}
          nombreTerapeuta={esAdmin ? nombrePersona : undefined}
          actualizando={cargando}
        />
      )}
      {base && vista === 'sesiones' && (
        <VistaSesiones
          seccion={sub as SeccionSesiones}
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
  );
};
