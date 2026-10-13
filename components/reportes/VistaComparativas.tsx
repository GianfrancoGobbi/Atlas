import React, { ReactNode, useMemo, useState } from 'react';
import { LineasComparadas } from '../charts/LineasComparadas';
import { TablaDatos, ColumnaTabla } from '../charts/TablaDatos';
import { Indicador, Leyenda, TarjetaGrafico } from '../charts/base';
import { fmt, tema } from '../charts/tema';
import { claseDelta, Delta, deltaPct, deltaPuntos, deltaValor } from '../../utils/comparaciones';
import {
  FacturaAnalizada, metricas, MetricaMensual, Metricas, resumenPorObraSocial, serieMensual, TurnoAnalizado, ventanasComparacion,
} from '../../utils/reportes';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const GRILLA = 'grid min-h-0 flex-1 gap-3 lg:grid-rows-[minmax(0,1fr)]';
const COLOR_ANTERIOR = tema.tenue; // de-énfasis: el año anterior es contexto

// Cada fila de la comparativa: cómo se formatea y en qué dirección es bueno que se mueva.
interface DefMetrica {
  clave: keyof Metricas;
  etiqueta: string;
  formato: (v: number | null) => string;
  delta: (a: number | null, b: number | null) => Delta | undefined;
}

const nulo = (f: (v: number) => string) => (v: number | null) => (v === null ? '—' : f(v));

const DEFINICIONES: DefMetrica[] = [
  { clave: 'facturado', etiqueta: 'Facturado', formato: nulo(fmt.monedaCompacta), delta: (a, b) => deltaPct(a, b) },
  { clave: 'cobradoEnPeriodo', etiqueta: 'Cobrado (pagos recibidos)', formato: nulo(fmt.monedaCompacta), delta: (a, b) => deltaPct(a, b) },
  { clave: 'facturas', etiqueta: 'Facturas emitidas', formato: nulo(fmt.entero), delta: (a, b) => deltaPct(a, b) },
  { clave: 'sesiones', etiqueta: 'Sesiones facturadas', formato: nulo(fmt.entero), delta: (a, b) => deltaPct(a, b) },
  { clave: 'porSesion', etiqueta: 'Facturado por sesión', formato: nulo(fmt.moneda), delta: (a, b) => deltaPct(a, b) },
  { clave: 'diasPromCobro', etiqueta: 'Días promedio de cobro', formato: nulo(v => `${fmt.decimal(v)} d`), delta: (a, b) => deltaValor(a, b, 'd') },
  { clave: 'pctEnPlazo', etiqueta: 'Cobradas en plazo', formato: v => fmt.pct(v), delta: (a, b) => deltaPuntos(a, b) },
  { clave: 'turnos', etiqueta: 'Turnos agendados', formato: nulo(fmt.entero), delta: (a, b) => deltaPct(a, b) },
  { clave: 'pctFinalizados', etiqueta: 'Turnos finalizados', formato: v => fmt.pct(v), delta: (a, b) => deltaPuntos(a, b) },
  { clave: 'pctCancelados', etiqueta: 'Turnos cancelados', formato: v => fmt.pct(v), delta: (a, b) => deltaPuntos(a, b, false) },
  { clave: 'atrasoMinProm', etiqueta: 'Atraso al empezar', formato: nulo(v => `${fmt.entero(v)} min`), delta: (a, b) => deltaValor(a, b, 'min') },
  { clave: 'pctPuntuales', etiqueta: 'Turnos puntuales', formato: v => fmt.pct(v), delta: (a, b) => deltaPuntos(a, b) },
  { clave: 'horas', etiqueta: 'Horas agendadas', formato: nulo(fmt.entero), delta: (a, b) => deltaPct(a, b) },
];

const METRICAS_GRAFICO: { id: MetricaMensual; etiqueta: string; formato: (n: number) => string; eje: (n: number) => string }[] = [
  { id: 'facturado', etiqueta: 'Facturado', formato: fmt.moneda, eje: fmt.monedaCompacta },
  { id: 'cobrado', etiqueta: 'Cobrado', formato: fmt.moneda, eje: fmt.monedaCompacta },
  { id: 'sesiones', etiqueta: 'Sesiones', formato: fmt.entero, eje: fmt.entero },
  { id: 'turnos', etiqueta: 'Turnos', formato: fmt.entero, eje: fmt.entero },
];

const CeldaDelta: React.FC<{ d?: Delta }> = ({ d }) =>
  d ? <span className={`font-medium ${claseDelta(d)}`}>{d.texto}</span> : <span className="text-slate-400">—</span>;

const fechaCorta = (dia: number) => fmt.fecha(dia).slice(0, 5); // dd/mm

interface Props {
  facturas: FacturaAnalizada[]; // filtradas por obra social / terapeuta / estado, sin período
  turnos: TurnoAnalizado[]; // filtrados por terapeuta, sin período
  hoy: number;
  filtroObraSocial: boolean; // con una obra social filtrada, la concentración no tiene sentido
  actualizando: boolean;
}

// Compara mes y año calendario (el filtro de período no aplica acá).
export const VistaComparativas: React.FC<Props> = ({ facturas, turnos, hoy, filtroObraSocial, actualizando }) => {
  const [base, setBase] = useState<'mes' | 'anio'>('mes');
  const [metricaGrafico, setMetricaGrafico] = useState<MetricaMensual>('facturado');

  const v = useMemo(() => ventanasComparacion(hoy), [hoy]);
  const m = useMemo(() => ({
    mes: metricas(facturas, turnos, v.mes, hoy),
    mesAnterior: metricas(facturas, turnos, v.mesAnterior, hoy),
    mesAnioAnterior: metricas(facturas, turnos, v.mesAnioAnterior, hoy),
    anio: metricas(facturas, turnos, v.anio, hoy),
    anioAnterior: metricas(facturas, turnos, v.anioAnterior, hoy),
  }), [facturas, turnos, v, hoy]);

  const anio = new Date(hoy * 86_400_000).getUTCFullYear();
  const mesActual = new Date(hoy * 86_400_000).getUTCMonth();
  const def = METRICAS_GRAFICO.find(x => x.id === metricaGrafico)!;
  const serieActual = useMemo(() => serieMensual(facturas, turnos, anio, metricaGrafico, hoy), [facturas, turnos, anio, metricaGrafico, hoy]);
  const serieAnterior = useMemo(() => serieMensual(facturas, turnos, anio - 1, metricaGrafico, hoy), [facturas, turnos, anio, metricaGrafico, hoy]);

  // Indicadores destacados
  const obrasAnio = resumenPorObraSocial(facturas.filter(f => f.emision >= v.anio.desde && f.emision <= v.anio.hasta));
  const principal = obrasAnio[0];
  const concentracion = principal && m.anio.facturado ? principal.facturado / m.anio.facturado : null;

  type Fila = { def: DefMetrica; a: number | null; b: number | null; c?: number | null };
  const filas: Fila[] = DEFINICIONES.map(d => base === 'mes'
    ? { def: d, a: m.mes[d.clave], b: m.mesAnterior[d.clave], c: m.mesAnioAnterior[d.clave] }
    : { def: d, a: m.anio[d.clave], b: m.anioAnterior[d.clave] });

  const rango = (r: { desde: number; hasta: number }) => `${fechaCorta(r.desde)}–${fechaCorta(r.hasta)}`;
  const columnas: ColumnaTabla<Fila>[] = base === 'mes'
    ? [
      { clave: 'metrica', titulo: 'Métrica', valor: f => f.def.etiqueta },
      { clave: 'a', titulo: 'Este mes', valor: f => f.a, mostrar: f => f.def.formato(f.a), numerica: true },
      { clave: 'b', titulo: 'Mes anterior', valor: f => f.b, mostrar: f => f.def.formato(f.b), numerica: true },
      { clave: 'db', titulo: 'Var.', valor: () => null, mostrar: f => <CeldaDelta d={f.def.delta(f.a, f.b)} />, numerica: true },
      { clave: 'c', titulo: `Mismo mes ${anio - 1}`, valor: f => f.c ?? null, mostrar: f => f.def.formato(f.c ?? null), numerica: true },
      { clave: 'dc', titulo: 'Var.', valor: () => null, mostrar: f => <CeldaDelta d={f.def.delta(f.a, f.c ?? null)} />, numerica: true },
    ]
    : [
      { clave: 'metrica', titulo: 'Métrica', valor: f => f.def.etiqueta },
      { clave: 'a', titulo: `${anio} (al ${fechaCorta(hoy)})`, valor: f => f.a, mostrar: f => f.def.formato(f.a), numerica: true },
      { clave: 'b', titulo: `${anio - 1} (al ${fechaCorta(v.anioAnterior.hasta)})`, valor: f => f.b, mostrar: f => f.def.formato(f.b), numerica: true },
      { clave: 'db', titulo: 'Var.', valor: () => null, mostrar: f => <CeldaDelta d={f.def.delta(f.a, f.b)} />, numerica: true },
    ];

  const selector = (opciones: { id: string; etiqueta: string }[], valor: string, cambiar: (id: string) => void, etiqueta: string): ReactNode => (
    <div role="radiogroup" aria-label={etiqueta} className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
      {opciones.map(o => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={valor === o.id}
          onClick={() => cambiar(o.id)}
          className={`rounded px-2 py-0.5 text-xs font-medium ${valor === o.id ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          etiqueta="Cobrado este mes"
          valor={fmt.monedaCompacta(m.mes.cobradoEnPeriodo)}
          delta={deltaPct(m.mes.cobradoEnPeriodo, m.mesAnterior.cobradoEnPeriodo)}
          deltaEtiqueta="vs los mismos días del mes anterior"
          detalle={`Pagos recibidos del ${rango(v.mes)}`}
        />
        <Indicador
          etiqueta={`Facturado ${anio} a la fecha`}
          valor={fmt.monedaCompacta(m.anio.facturado)}
          delta={deltaPct(m.anio.facturado, m.anioAnterior.facturado)}
          deltaEtiqueta="vs año anterior a la misma fecha"
          detalle={`vs ${fmt.monedaCompacta(m.anioAnterior.facturado)} en ${anio - 1}`}
        />
        <Indicador
          etiqueta="Facturado por sesión"
          valor={m.anio.porSesion === null ? '—' : fmt.moneda(m.anio.porSesion)}
          delta={deltaPct(m.anio.porSesion, m.anioAnterior.porSesion)}
          deltaEtiqueta="vs año anterior"
          detalle={`Promedio ${anio} · vs ${anio - 1}`}
        />
        <Indicador
          etiqueta="Concentración"
          valor={filtroObraSocial ? '—' : fmt.pct(concentracion)}
          detalle={filtroObraSocial ? 'Quitá el filtro de obra social para verla' : principal ? `de lo facturado en ${anio} es de ${principal.nombre}` : 'Sin facturación este año'}
        />
      </div>

      <div className={`${GRILLA} lg:grid-cols-3`}>
        <TarjetaGrafico
          className="lg:col-span-2"
          titulo={base === 'mes' ? 'Este mes contra el anterior y el del año pasado' : `${anio} contra ${anio - 1}`}
          subtitulo={base === 'mes'
            ? `Del ${rango(v.mes)} contra los mismos días de cada mes. No aplican período ni estado de pago; la obra social no filtra turnos.`
            : `Del 1 de enero al ${fechaCorta(hoy)} de cada año. No aplican período ni estado de pago; la obra social no filtra turnos.`}
          actualizando={actualizando}
          cuerpoClassName="min-h-[26rem]"
          acciones={selector([{ id: 'mes', etiqueta: 'Mes' }, { id: 'anio', etiqueta: 'Año' }], base, id => setBase(id as 'mes' | 'anio'), 'Comparar por')}
        >
          <TablaDatos llenar columnas={columnas} filas={filas} claveFila={f => f.def.clave} />
        </TarjetaGrafico>

        <TarjetaGrafico
          titulo={`${def.etiqueta} por mes`}
          subtitulo={`${anio} contra ${anio - 1} · solo meses completos`}
          actualizando={actualizando}
          leyenda={<Leyenda items={[
            { color: tema.serie, etiqueta: String(anio), forma: 'linea' },
            { color: COLOR_ANTERIOR, etiqueta: String(anio - 1), forma: 'linea' },
          ]} />}
          cuerpoClassName="min-h-[16rem]"
          acciones={
            <select
              aria-label="Métrica del gráfico"
              value={metricaGrafico}
              onChange={e => setMetricaGrafico(e.target.value as MetricaMensual)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-primary focus:outline-none"
            >
              {METRICAS_GRAFICO.map(o => <option key={o.id} value={o.id}>{o.etiqueta}</option>)}
            </select>
          }
          tabla={
            <TablaDatos
              columnas={[
                { clave: 'mes', titulo: 'Mes', valor: (f: { i: number }) => f.i, mostrar: f => MESES[f.i] },
                { clave: 'a', titulo: String(anio), valor: f => serieActual[f.i], mostrar: f => (serieActual[f.i] === null ? '—' : def.formato(serieActual[f.i] as number)), numerica: true },
                { clave: 'b', titulo: String(anio - 1), valor: f => serieAnterior[f.i], mostrar: f => (serieAnterior[f.i] === null ? '—' : def.formato(serieAnterior[f.i] as number)), numerica: true },
              ]}
              filas={MESES.map((_, i) => ({ i }))}
              claveFila={f => String(f.i)}
            />
          }
        >
          <LineasComparadas
            categorias={MESES}
            series={[
              { clave: 'ant', etiqueta: String(anio - 1), color: COLOR_ANTERIOR, valores: serieAnterior },
              { clave: 'act', etiqueta: String(anio), color: tema.serie, valores: serieActual },
            ]}
            formatoValor={def.formato}
            formatoEje={def.eje}
            extraTooltip={i => {
              const d = deltaPct(serieActual[i], serieAnterior[i]);
              return d && i < mesActual ? <div className={`mt-1 text-xs font-medium ${claseDelta(d)}`}>{d.texto} vs {anio - 1}</div> : null;
            }}
          />
        </TarjetaGrafico>
      </div>
    </div>
  );
};
