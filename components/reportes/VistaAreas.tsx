import React, { useMemo } from 'react';
import { ColumnasApiladas } from '../charts/ColumnasApiladas';
import { ColumnaTabla, TablaDatos } from '../charts/TablaDatos';
import { Indicador, SinDatos, TarjetaGrafico, VistaVacia } from '../charts/base';
import { fmt, tema } from '../charts/tema';
import { AreaPorTerapeuta, AreaRaw, diaAIso, FacturaAnalizada, Rango, SIN_AREA, TurnoAnalizado } from '../../utils/reportes';
import { facturacionMensualPorArea, FilaArea, resumenPorArea, seriesDeAreas, SerieArea } from '../../utils/areas';

const GRILLA = 'grid min-h-0 flex-1 gap-3 lg:grid-rows-[minmax(0,1fr)]';

interface Props {
  facturas: FacturaAnalizada[]; // filtradas por período, obra social, terapeuta y estado (no por área)
  turnos: TurnoAnalizado[]; // del período, filtrados por terapeuta (no por área)
  areas: AreaRaw[];
  areaPorTerapeuta: AreaPorTerapeuta;
  areasSeleccionadas: string[];
  onAlternarArea: (id: string) => void;
  rango: Rango;
  hoy: number;
  actualizando: boolean;
}

// Leyenda que además funciona como filtro: cada área se puede marcar o desmarcar.
const LeyendaAreas: React.FC<{ series: SerieArea[]; seleccionadas: Set<string>; onAlternar: (id: string) => void }> = ({
  series, seleccionadas, onAlternar,
}) => (
  <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
    {series.map(s => {
      const elegida = s.ids.some(id => seleccionadas.has(id));
      const contenido = (
        <>
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
          <span>{s.etiqueta}</span>
        </>
      );
      return (
        <li key={s.clave}>
          {s.ids.length === 1 ? (
            <button
              type="button"
              aria-pressed={elegida}
              onClick={() => onAlternar(s.ids[0])}
              className={`flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${elegida ? 'font-semibold text-slate-900 underline underline-offset-2' : ''}`}
            >
              {contenido}
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-1 py-0.5">{contenido}</span>
          )}
        </li>
      );
    })}
  </ul>
);

// Áreas con el valor más alto (o más bajo). Las que se ven iguales con el redondeo de la vista
// cuentan como empate, para no nombrar a una sola por una diferencia que no se ve.
const extremos = (filas: FilaArea[], valor: (f: FilaArea) => number | null, mayor: boolean, mostrar: (n: number) => string) => {
  const con = filas.filter(f => valor(f) !== null);
  if (!con.length) return null;
  const v = (mayor ? Math.max : Math.min)(...con.map(f => valor(f) as number));
  return { valor: v, filas: con.filter(f => mostrar(valor(f) as number) === mostrar(v)) };
};

const nombres = (fs: FilaArea[]) => (fs.length > 1 ? `Empate: ${fs.map(f => f.nombre).join(' y ')}` : fs[0].nombre);

export const VistaAreas: React.FC<Props> = ({
  facturas, turnos, areas, areaPorTerapeuta, areasSeleccionadas, onAlternarArea, rango, hoy, actualizando,
}) => {
  const filas = useMemo(() => resumenPorArea(facturas, turnos, areas, areaPorTerapeuta, hoy), [facturas, turnos, areas, areaPorTerapeuta, hoy]);
  const series = useMemo(
    () => seriesDeAreas(filas.filter(f => f.facturado > 0).map(f => f.id), areas, tema.tenue, tema.atenuado),
    [filas, areas],
  );
  const meses = useMemo(() => facturacionMensualPorArea(facturas, series, areaPorTerapeuta, rango), [facturas, series, areaPorTerapeuta, rango]);
  const seleccionadas = useMemo(() => new Set(areasSeleccionadas), [areasSeleccionadas]);

  if (!filas.length) return <VistaVacia texto="No hay facturas ni turnos en el período con estos filtros." />;

  const total = facturas.reduce((s, f) => s + f.monto, 0);
  const lider = filas[0].facturado > 0 ? filas[0] : null;
  const sesionesTotales = filas.reduce((s, f) => s + f.sesiones, 0);
  const arancelGeneral = sesionesTotales ? total / sesionesTotales : null;
  const conArancel = filas.filter(f => f.porSesion !== null);
  const mejorArancel = conArancel.length > 1 ? extremos(conArancel, f => f.porSesion, true, fmt.moneda) : null;
  const peorArancel = conArancel.length > 1 ? extremos(conArancel, f => f.porSesion, false, fmt.moneda) : null;
  const masLenta = extremos(filas, f => f.diasPromCobro, true, fmt.dias);
  const activas = filas.filter(f => f.id !== SIN_AREA).length;
  const detalleArancel = (e: typeof mejorArancel) =>
    e ? `${nombres(e.filas)}${arancelGeneral !== null ? ` · general ${fmt.moneda(arancelGeneral)}` : ''}` : 'Hacen falta dos áreas con sesiones';

  // El último mes del gráfico puede estar en curso: se aclara en el tooltip para no leerlo como una caída.
  const ultimo = meses.length ? meses[meses.length - 1].mes : null;
  const mesEnCurso = ultimo !== null && rango.hasta !== null && diaAIso(rango.hasta).slice(0, 7) === ultimo
    && diaAIso(rango.hasta + 1).slice(0, 7) === ultimo;

  const nombreCelda = (f: FilaArea) => {
    const elegida = seleccionadas.has(f.id);
    const serie = series.find(s => s.ids.includes(f.id));
    return (
      <button
        type="button"
        aria-pressed={elegida}
        onClick={() => onAlternarArea(f.id)}
        title={elegida ? 'Quitar del filtro de área' : 'Filtrar por esta área'}
        className={`inline-flex items-center gap-1.5 rounded text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${elegida ? 'font-semibold text-slate-900' : ''}`}
      >
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: serie?.color ?? 'transparent', boxShadow: serie ? undefined : `inset 0 0 0 1px ${tema.base}` }} />
        {f.nombre}
      </button>
    );
  };

  const columnas: ColumnaTabla<FilaArea>[] = [
    { clave: 'nombre', titulo: 'Área', valor: f => f.nombre, mostrar: nombreCelda },
    { clave: 'facturado', titulo: 'Facturado', valor: f => f.facturado, mostrar: f => fmt.moneda(f.facturado), numerica: true },
    { clave: 'pct', titulo: '% total', valor: f => f.pctTotal, mostrar: f => fmt.pct(f.pctTotal), numerica: true },
    { clave: 'sesiones', titulo: 'Sesiones', valor: f => f.sesiones, mostrar: f => fmt.entero(f.sesiones), numerica: true },
    { clave: 'porSesion', titulo: 'Por sesión', valor: f => f.porSesion, mostrar: f => (f.porSesion === null ? '—' : fmt.moneda(f.porSesion)), numerica: true },
    { clave: 'pacientes', titulo: 'Pacientes', valor: f => f.pacientes, mostrar: f => fmt.entero(f.pacientes), numerica: true },
    { clave: 'turnos', titulo: 'Turnos', valor: f => f.turnos, mostrar: f => fmt.entero(f.turnos), numerica: true },
    { clave: 'fin', titulo: 'Finaliz.', valor: f => f.pctFinalizados, mostrar: f => fmt.pct(f.pctFinalizados), numerica: true },
    { clave: 'canc', titulo: 'Cancel.', valor: f => f.pctCancelados, mostrar: f => fmt.pct(f.pctCancelados), numerica: true },
    { clave: 'dias', titulo: 'Días cobro', valor: f => f.diasPromCobro, mostrar: f => fmt.dias(f.diasPromCobro), numerica: true },
    { clave: 'vencido', titulo: 'Vencido', valor: f => f.vencido, mostrar: f => (f.vencido ? fmt.moneda(f.vencido) : '—'), numerica: true },
  ];

  const nombresSeleccionados = filas.filter(f => seleccionadas.has(f.id)).map(f => f.nombre);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Indicador
          etiqueta="Área líder en facturación"
          valor={lider ? lider.nombre : '—'}
          detalle={lider ? `${fmt.pct(lider.pctTotal)} del total · ${fmt.monedaCompacta(lider.facturado)}` : 'Sin facturación en el período'}
        />
        <Indicador
          etiqueta="Mejor arancel por sesión"
          valor={mejorArancel ? fmt.moneda(mejorArancel.valor) : '—'}
          detalle={detalleArancel(mejorArancel)}
        />
        <Indicador
          etiqueta="Menor arancel por sesión"
          valor={peorArancel ? fmt.moneda(peorArancel.valor) : '—'}
          detalle={detalleArancel(peorArancel)}
        />
        <Indicador
          etiqueta="Más días de cobro"
          valor={masLenta ? fmt.dias(masLenta.valor) : '—'}
          detalle={masLenta ? `${nombres(masLenta.filas)} · de emisión a pago, solo cobradas` : 'Sin facturas cobradas con fecha'}
        />
        <Indicador
          etiqueta="Áreas activas"
          valor={fmt.entero(activas)}
          detalle={filas.some(f => f.id === SIN_AREA) ? 'Además hay actividad sin área asignada' : 'Con facturas o turnos en el período'}
        />
      </div>

      <div className={`${GRILLA} lg:grid-cols-5`}>
        <TarjetaGrafico
          className="lg:col-span-2"
          titulo="Facturación mensual por área"
          subtitulo={nombresSeleccionados.length
            ? `Por mes de emisión. Elegidas en el filtro: ${nombresSeleccionados.join(', ')}.`
            : 'Por mes de emisión. Tocá un área para filtrar el resto del tablero.'}
          actualizando={actualizando}
          cuerpoClassName="min-h-[16rem]"
          leyenda={series.length > 0 && <LeyendaAreas series={series} seleccionadas={seleccionadas} onAlternar={onAlternarArea} />}
          tabla={
            <TablaDatos
              columnas={[
                { clave: 'mes', titulo: 'Mes', valor: (m: (typeof meses)[number]) => m.mes, mostrar: m => fmt.mes(m.mes) },
                ...series.map(s => ({
                  clave: s.clave, titulo: s.etiqueta, valor: (m: (typeof meses)[number]) => m[s.clave] as number,
                  mostrar: (m: (typeof meses)[number]) => fmt.moneda(m[s.clave] as number), numerica: true,
                })),
                { clave: 'total', titulo: 'Total', valor: m => m.total, mostrar: m => fmt.moneda(m.total), numerica: true },
              ]}
              filas={meses}
              claveFila={m => m.mes}
            />
          }
        >
          {total > 0 ? (
            <ColumnasApiladas
              categorias={meses.map(m => ({ clave: m.mes, etiqueta: fmt.mes(m.mes) }))}
              series={series}
              valores={meses}
              formatoValor={fmt.moneda}
              formatoEje={fmt.monedaCompacta}
              extraTooltip={i => (mesEnCurso && i === meses.length - 1 && rango.hasta !== null
                ? <div className="mt-1 text-[11px] text-slate-500">Mes en curso, hasta el {fmt.fecha(rango.hasta)}</div>
                : null)}
            />
          ) : <SinDatos texto="No hay facturación en el período." />}
        </TarjetaGrafico>

        <TarjetaGrafico
          className="lg:col-span-3"
          titulo="Comparación de áreas"
          subtitulo="Facturación por emisión en el período; pacientes distintos con turnos finalizados. Las áreas elegidas en el filtro van en negrita."
          actualizando={actualizando}
          cuerpoClassName="min-h-[16rem]"
        >
          <TablaDatos llenar columnas={columnas} filas={filas} claveFila={f => f.id} orden={{ clave: 'facturado', desc: true }} />
        </TarjetaGrafico>
      </div>
    </div>
  );
};
