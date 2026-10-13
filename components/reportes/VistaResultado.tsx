import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineasComparadas } from '../charts/LineasComparadas';
import { BarrasHorizontales } from '../charts/BarrasHorizontales';
import { TablaDatos, ColumnaTabla } from '../charts/TablaDatos';
import { claseDelta } from '../../utils/comparaciones';
import { FilaTooltip, IconoEstado, Indicador, Leyenda, SinDatos, TarjetaGrafico } from '../charts/base';
import { fmt, tema } from '../charts/tema';
import { etiquetaCategoria } from '../../services/costosService';
import { AreaPorTerapeuta, AreaRaw, FacturaAnalizada, Rango, SIN_AREA } from '../../utils/reportes';
import {
  BaseIngresos, CostoAnalizado, costosEnRango, resultadoPorArea, FilaResultadoArea, resumirResultado, serieResultado,
} from '../../utils/resultado';

const GRILLA = 'grid min-h-0 flex-1 gap-3 lg:grid-rows-[minmax(0,1fr)]';
const COLOR_COSTOS = '#eb6834'; // categórica slot 2 (validada junto al slot 1)

interface Props {
  facturas: FacturaAnalizada[]; // sin período ni estado (la vista aplica el período según la base de ingresos)
  costos: CostoAnalizado[];
  rango: Rango;
  hoy: number;
  areas: AreaRaw[];
  areaPorTerapeuta: AreaPorTerapeuta;
  actualizando: boolean;
}

const selector = (opciones: { id: string; etiqueta: string }[], valor: string, cambiar: (id: string) => void, etiqueta: string) => (
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

// Solo administración: ingresos contra costos, margen y punto de equilibrio.
export const VistaResultado: React.FC<Props> = ({ facturas, costos, rango, hoy, areas, areaPorTerapeuta, actualizando }) => {
  const [base, setBase] = useState<BaseIngresos>('devengado');
  const [desglose, setDesglose] = useState<'categoria' | 'area'>('categoria');

  const serie = useMemo(() => serieResultado(facturas, costos, rango, base, hoy), [facturas, costos, rango, base, hoy]);
  const r = useMemo(() => resumirResultado(serie), [serie]);
  const porArea = useMemo(() => resultadoPorArea(facturas, costos, serie, base, areaPorTerapeuta), [facturas, costos, serie, base, areaPorTerapeuta]);
  const porCategoria = useMemo(() => {
    const total = new Map<string, number>();
    for (const c of costosEnRango(costos, serie)) total.set(c.categoria, (total.get(c.categoria) ?? 0) + c.monto);
    return [...total.entries()].map(([id, monto]) => ({ id, monto })).sort((a, b) => b.monto - a.monto);
  }, [costos, serie]);

  if (!costos.length) return <ResultadoSinCostos />;

  const nombreArea = (id: string) => (id === SIN_AREA ? 'Sin área asignada' : areas.find(a => a.id === id)?.nombre ?? 'Área');
  const nombreMes = (mes: string) => fmt.mes(mes);
  const signo = (n: number) => (n >= 0 ? '' : '−');
  const textoResultado = (n: number) => `${signo(n)}${fmt.monedaCompacta(Math.abs(n))}`;
  const bueno = r.resultado >= 0;

  const columnasArea: ColumnaTabla<FilaResultadoArea>[] = [
    { clave: 'area', titulo: 'Área', valor: a => nombreArea(a.id) },
    { clave: 'ing', titulo: 'Ingresos', valor: a => a.ingresos, mostrar: a => fmt.monedaCompacta(a.ingresos), numerica: true },
    { clave: 'dir', titulo: 'Costos directos', valor: a => a.directos, mostrar: a => fmt.monedaCompacta(a.directos), numerica: true },
    { clave: 'com', titulo: 'Comunes', valor: a => a.comunes, mostrar: a => fmt.monedaCompacta(a.comunes), numerica: true },
    { clave: 'res', titulo: 'Resultado', valor: a => a.resultado, mostrar: a => textoResultado(a.resultado), numerica: true },
    { clave: 'mar', titulo: 'Margen', valor: a => a.margen, mostrar: a => fmt.pct(a.margen), numerica: true },
  ];

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Indicador etiqueta={base === 'devengado' ? 'Ingresos (facturado)' : 'Ingresos (cobrado)'} valor={fmt.monedaCompacta(r.ingresos)} detalle={`${fmt.entero(serie.length)} meses`} />
        <Indicador etiqueta="Costos" valor={fmt.monedaCompacta(r.costos)} detalle={`${r.mesesConCostos} meses con costos cargados`} />
        <Indicador
          etiqueta="Resultado"
          icono={<IconoEstado tipo={bueno ? 'bien' : 'critico'} />}
          valor={<span className={claseDelta({ texto: '', bueno })}>{textoResultado(r.resultado)}</span>}
          detalle={bueno ? 'Ganancia del período' : 'Pérdida del período'}
        />
        <Indicador etiqueta="Margen" valor={fmt.pct(r.margen)} detalle="Resultado sobre ingresos" />
        <Indicador
          etiqueta="Costo por sesión"
          valor={r.costoPorSesion === null ? '—' : fmt.moneda(r.costoPorSesion)}
          detalle={r.ingresoPorSesion === null ? undefined : `Ingreso por sesión: ${fmt.moneda(r.ingresoPorSesion)}`}
        />
        <Indicador
          etiqueta="Punto de equilibrio"
          valor={r.equilibrioSesionesMes === null ? '—' : `${fmt.entero(r.equilibrioSesionesMes)} ses./mes`}
          detalle={r.sesionesMesProm === null ? undefined : `Hoy: ${fmt.entero(r.sesionesMesProm)} sesiones por mes`}
        />
      </div>

      <div className={`${GRILLA} lg:grid-cols-3`}>
        <TarjetaGrafico
          className="lg:col-span-2"
          titulo="Ingresos y costos por mes"
          subtitulo={base === 'devengado'
            ? 'Ingresos = facturado por mes de emisión. Los filtros de obra social, terapeuta y área no aplican a esta vista.'
            : 'Ingresos = cobrado por mes de pago. Los filtros de obra social, terapeuta y área no aplican a esta vista.'}
          actualizando={actualizando}
          acciones={selector([{ id: 'devengado', etiqueta: 'Facturado' }, { id: 'percibido', etiqueta: 'Cobrado' }], base, id => setBase(id as BaseIngresos), 'Base de ingresos')}
          leyenda={<Leyenda items={[
            { color: tema.serie, etiqueta: 'Ingresos', forma: 'linea' },
            { color: COLOR_COSTOS, etiqueta: 'Costos', forma: 'linea' },
          ]} />}
          cuerpoClassName="min-h-[16rem]"
          tabla={
            <TablaDatos
              columnas={[
                { clave: 'mes', titulo: 'Mes', valor: (m: typeof serie[number]) => m.mes, mostrar: m => nombreMes(m.mes) },
                { clave: 'ing', titulo: 'Ingresos', valor: m => m.ingresos, mostrar: m => fmt.moneda(m.ingresos), numerica: true },
                { clave: 'cos', titulo: 'Costos', valor: m => m.costos, mostrar: m => fmt.moneda(m.costos), numerica: true },
                { clave: 'res', titulo: 'Resultado', valor: m => m.resultado, mostrar: m => `${signo(m.resultado)}${fmt.moneda(Math.abs(m.resultado))}`, numerica: true },
              ]}
              filas={serie}
              claveFila={m => m.mes}
            />
          }
        >
          {serie.length ? (
            <LineasComparadas
              categorias={serie.map(m => nombreMes(m.mes))}
              series={[
                { clave: 'ing', etiqueta: 'Ingresos', color: tema.serie, valores: serie.map(m => m.ingresos) },
                { clave: 'cos', etiqueta: 'Costos', color: COLOR_COSTOS, valores: serie.map(m => (m.costos > 0 ? m.costos : null)) },
              ]}
              formatoValor={fmt.moneda}
              formatoEje={fmt.monedaCompacta}
              extraTooltip={i => (
                <div className="mt-1 border-t border-slate-100 pt-1">
                  <FilaTooltip etiqueta="resultado" valor={`${signo(serie[i].resultado)}${fmt.moneda(Math.abs(serie[i].resultado))}`} fuerte />
                </div>
              )}
            />
          ) : <SinDatos texto="No hay movimientos en este período." />}
        </TarjetaGrafico>

        <TarjetaGrafico
          titulo={desglose === 'categoria' ? 'Costos por categoría' : 'Resultado por área'}
          subtitulo={desglose === 'categoria' ? 'Total del período' : 'Los costos comunes se reparten según lo facturado'}
          actualizando={actualizando}
          acciones={selector([{ id: 'categoria', etiqueta: 'Categoría' }, { id: 'area', etiqueta: 'Área' }], desglose, id => setDesglose(id as 'categoria' | 'area'), 'Desglose')}
          cuerpoClassName="min-h-[16rem]"
        >
          {desglose === 'categoria' ? (
            porCategoria.length ? (
              <BarrasHorizontales
                filas={porCategoria.map(c => ({
                  clave: c.id,
                  etiqueta: etiquetaCategoria(c.id),
                  valor: c.monto,
                  color: tema.serie,
                  tooltip: <FilaTooltip etiqueta={`${fmt.pct(r.costos ? c.monto / r.costos : null)} de los costos`} valor={fmt.moneda(c.monto)} fuerte />,
                }))}
                formatoValor={fmt.monedaCompacta}
              />
            ) : <SinDatos texto="No hay costos en este período." />
          ) : (
            <TablaDatos llenar columnas={columnasArea} filas={porArea} claveFila={a => a.id} vacio="Sin datos por área en este período." />
          )}
        </TarjetaGrafico>
      </div>
    </div>
  );
};

// Sin costos cargados: explica qué falta y lleva a la página de costos.
export const ResultadoSinCostos: React.FC = () => (
  <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 rounded-xl border border-black/5 bg-white p-6 text-center shadow-sm">
    <p className="text-sm text-slate-600">Todavía no hay costos cargados, así que no se puede calcular el resultado.</p>
    <Link to="/costos" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark">Cargar costos</Link>
  </div>
);
