import React, { useMemo } from 'react';
import { ColumnasApiladas } from '../charts/ColumnasApiladas';
import { BarrasHorizontales } from '../charts/BarrasHorizontales';
import { TablaDatos, ColumnaTabla } from '../charts/TablaDatos';
import { FilaTooltip, IconoEstado, Indicador, Leyenda, SinDatos, TarjetaGrafico, VistaVacia } from '../charts/base';
import { fmt, tema } from '../charts/tema';
import {
  antiguedadDeuda, cobranzaPorMes, ESTADOS_COBRANZA, EstadoCobranza, FacturaAnalizada,
  FilaObraSocial, PLAZO_POR_DEFECTO, Rango, resumenPorObraSocial, resumirCobranza,
} from '../../utils/reportes';

export type SeccionCobranzas = 'resumen' | 'obras' | 'deuda';

const ICONO_ESTADO: Record<EstadoCobranza, 'bien' | 'alerta' | 'neutro' | 'critico'> = {
  en_plazo: 'bien', con_atraso: 'alerta', pendiente: 'neutro', vencida: 'critico',
};

const SERIES_ESTADO = ESTADOS_COBRANZA.map(e => ({ clave: e.id, etiqueta: e.etiqueta, color: tema.estados[e.id] }));

// Grilla que ocupa el alto restante de la vista (en pantallas grandes, sin scroll de página).
const GRILLA = 'grid min-h-0 flex-1 gap-3 lg:grid-rows-[minmax(0,1fr)]';

export const ChipEstado: React.FC<{ estado: EstadoCobranza }> = ({ estado }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
    <span className="inline-block h-2 w-2 rounded-full" style={{ background: tema.estados[estado] }} />
    <IconoEstado tipo={ICONO_ESTADO[estado]} />
    {ESTADOS_COBRANZA.find(e => e.id === estado)?.etiqueta}
  </span>
);

interface Props {
  seccion: SeccionCobranzas;
  facturas: FacturaAnalizada[];
  rango: Rango;
  obrasSeleccionadas: string[];
  onAlternarObraSocial: (id: string) => void;
  nombreTerapeuta?: (id: string | null) => string; // solo administración
  actualizando: boolean;
}

export const VistaCobranzas: React.FC<Props> = ({
  seccion, facturas, rango, obrasSeleccionadas, onAlternarObraSocial, nombreTerapeuta, actualizando,
}) => {
  const resumen = useMemo(() => resumirCobranza(facturas), [facturas]);
  const meses = useMemo(() => cobranzaPorMes(facturas, rango), [facturas, rango]);
  const porObra = useMemo(() => resumenPorObraSocial(facturas), [facturas]);
  const tramos = useMemo(() => antiguedadDeuda(facturas), [facturas]);
  const impagas = useMemo(() => facturas.filter(f => !f.pagada), [facturas]);
  const vencidas = impagas.filter(f => f.estado === 'vencida');
  const masAtrasada = impagas.reduce<FacturaAnalizada | null>((m, f) => (!m || f.diasAtraso > m.diasAtraso ? f : m), null);
  const plazoHabitual = porObra[0]?.plazo ?? PLAZO_POR_DEFECTO;

  if (!facturas.length) return <VistaVacia texto="No hay facturas para estos filtros." />;

  // Solo obras sociales con cobros registrados (las que nunca pagaron se ven en la tabla y en las impagas).
  const rankingCobro = porObra
    .filter(o => o.diasPromCobro !== null)
    .sort((a, b) => (b.diasPromCobro ?? 0) - (a.diasPromCobro ?? 0));

  const barrasCobro = (filas: FilaObraSocial[]) => (filas.length ? (
    <BarrasHorizontales
      filas={filas.map(o => ({
        clave: o.id,
        etiqueta: o.nombre,
        valor: o.diasPromCobro,
        color: o.diasPromCobro !== null && o.diasPromCobro > o.plazo ? tema.serie : tema.atenuado,
        seleccionada: obrasSeleccionadas.includes(o.id),
        tooltip: (
          <>
            <div className="mb-1 text-xs font-medium text-slate-500">{o.nombre}</div>
            <FilaTooltip etiqueta="días promedio de cobro" valor={fmt.dias(o.diasPromCobro)} fuerte />
            <FilaTooltip etiqueta="cobradas en plazo" valor={fmt.pct(o.pctEnPlazo)} />
            <FilaTooltip etiqueta="pendiente" valor={fmt.moneda(o.pendiente)} />
            <FilaTooltip etiqueta="facturas" valor={fmt.entero(o.cantidad)} />
          </>
        ),
      }))}
      formatoValor={v => `${fmt.decimal(v)} d`}
      referencia={{ valor: plazoHabitual, etiqueta: `Plazo ${plazoHabitual} d` }}
      onClickFila={onAlternarObraSocial}
    />
  ) : <SinDatos texto="No hay facturas cobradas con estos filtros." />);

  const leyendaPlazo = rankingCobro.length > 0 && (
    <Leyenda items={[{ color: tema.serie, etiqueta: 'Supera el plazo' }, { color: tema.atenuado, etiqueta: 'Dentro del plazo' }]} />
  );

  const columnasObra: ColumnaTabla<FilaObraSocial>[] = [
    { clave: 'nombre', titulo: 'Obra social', valor: o => o.nombre },
    { clave: 'cantidad', titulo: 'Facturas', valor: o => o.cantidad, mostrar: o => fmt.entero(o.cantidad), numerica: true },
    { clave: 'facturado', titulo: 'Facturado', valor: o => o.facturado, mostrar: o => fmt.moneda(o.facturado), numerica: true },
    { clave: 'pendiente', titulo: 'Pendiente', valor: o => o.pendiente, mostrar: o => fmt.moneda(o.pendiente), numerica: true },
    { clave: 'vencido', titulo: 'Vencido', valor: o => o.vencido, mostrar: o => (o.vencido ? fmt.moneda(o.vencido) : '—'), numerica: true },
    { clave: 'dias', titulo: 'Días cobro', valor: o => o.diasPromCobro, mostrar: o => fmt.dias(o.diasPromCobro), numerica: true },
    { clave: 'plazo', titulo: 'En plazo', valor: o => o.pctEnPlazo, mostrar: o => fmt.pct(o.pctEnPlazo), numerica: true },
    { clave: 'atraso', titulo: 'Atraso máx.', valor: o => o.mayorAtraso, mostrar: o => (o.mayorAtraso ? `${fmt.entero(o.mayorAtraso)} d` : '—'), numerica: true },
  ];

  // ---------- Por obra social ----------
  if (seccion === 'obras') {
    return (
      <div className={`${GRILLA} h-full lg:grid-cols-3`}>
        <TarjetaGrafico
          titulo="Días promedio de cobro"
          subtitulo="Desde la emisión hasta el pago. Tocá una barra para filtrar."
          actualizando={actualizando}
          leyenda={leyendaPlazo}
          cuerpoClassName="min-h-[26rem]"
          tabla={<TablaDatos columnas={[columnasObra[0], columnasObra[5], columnasObra[6]]} filas={rankingCobro} claveFila={o => o.id} orden={{ clave: 'dias', desc: true }} />}
        >
          {barrasCobro(rankingCobro)}
        </TarjetaGrafico>
        <TarjetaGrafico
          className="lg:col-span-2"
          titulo="Resumen por obra social"
          subtitulo="Tocá un encabezado para ordenar"
          actualizando={actualizando}
          cuerpoClassName="min-h-[24rem]"
        >
          <TablaDatos llenar columnas={columnasObra.filter(c => c.clave !== 'cantidad')} filas={porObra} claveFila={o => o.id} orden={{ clave: 'facturado', desc: true }} />
        </TarjetaGrafico>
      </div>
    );
  }

  // ---------- Deuda impaga ----------
  if (seccion === 'deuda') {
    const columnasImpagas: ColumnaTabla<FacturaAnalizada>[] = [
      { clave: 'emision', titulo: 'Emitida', valor: f => f.emision, mostrar: f => fmt.fecha(f.emision) },
      { clave: 'obra', titulo: 'Obra social', valor: f => f.obraSocial },
      ...(nombreTerapeuta ? [{ clave: 'terapeuta', titulo: 'Terapeuta', valor: (f: FacturaAnalizada) => nombreTerapeuta(f.terapeutaId) }] : []),
      { clave: 'monto', titulo: 'Monto', valor: f => f.monto, mostrar: f => fmt.moneda(f.monto), numerica: true },
      { clave: 'atraso', titulo: 'Días de atraso', valor: f => f.diasAtraso, mostrar: f => (f.diasAtraso ? fmt.entero(f.diasAtraso) : '—'), numerica: true },
      { clave: 'estado', titulo: 'Estado', valor: f => f.estado, mostrar: f => <ChipEstado estado={f.estado} /> },
    ];
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
          <Indicador
            etiqueta="Deuda vencida"
            icono={<IconoEstado tipo="critico" />}
            valor={fmt.monedaCompacta(resumen.vencido)}
            detalle={`${fmt.entero(resumen.cantVencidas)} facturas vencidas`}
          />
          <Indicador etiqueta="Pendiente de cobro" valor={fmt.monedaCompacta(resumen.pendiente)} detalle={`${fmt.entero(impagas.length)} facturas impagas`} />
          <Indicador
            etiqueta="Mayor atraso"
            valor={resumen.mayorAtraso ? `${fmt.entero(resumen.mayorAtraso)} días` : '—'}
            detalle={masAtrasada && masAtrasada.diasAtraso > 0 ? masAtrasada.obraSocial : undefined}
          />
          <Indicador
            etiqueta="Atraso promedio"
            valor={vencidas.length ? `${fmt.entero(vencidas.reduce((s, f) => s + f.diasAtraso, 0) / vencidas.length)} días` : '—'}
            detalle="De las facturas vencidas"
          />
        </div>
        <div className={`${GRILLA} lg:grid-cols-3`}>
          <TarjetaGrafico
            titulo="Antigüedad de la deuda"
            subtitulo="Monto sin cobrar según los días desde el vencimiento"
            actualizando={actualizando}
            tabla={
              <TablaDatos
                columnas={[
                  { clave: 'etiqueta', titulo: 'Tramo', valor: t => t.etiqueta },
                  { clave: 'monto', titulo: 'Monto', valor: t => t.monto, mostrar: t => fmt.moneda(t.monto), numerica: true },
                  { clave: 'cantidad', titulo: 'Facturas', valor: t => t.cantidad, numerica: true },
                ]}
                filas={tramos}
                claveFila={t => t.id}
              />
            }
          >
            {impagas.length ? (
              <ColumnasApiladas
                categorias={tramos.map(t => ({ clave: t.id, etiqueta: t.etiqueta }))}
                series={[{ clave: 'monto', etiqueta: 'sin cobrar', color: tema.ordinal[2] }]}
                valores={tramos.map(t => ({ monto: t.monto }))}
                colorCategoria={i => tema.ordinal[i]}
                formatoValor={fmt.moneda}
                formatoEje={fmt.monedaCompacta}
                extraTooltip={i => <div className="mt-1 text-xs text-slate-500">{fmt.entero(tramos[i].cantidad)} facturas</div>}
              />
            ) : <SinDatos texto="No hay deuda impaga para estos filtros." />}
          </TarjetaGrafico>
          <TarjetaGrafico
            className="lg:col-span-2"
            titulo="Facturas impagas"
            subtitulo={`${fmt.entero(impagas.length)} facturas, ordenadas por días de atraso`}
            actualizando={actualizando}
            cuerpoClassName="min-h-[24rem]"
          >
            <TablaDatos
              llenar
              columnas={columnasImpagas}
              filas={impagas}
              claveFila={f => f.id}
              orden={{ clave: 'atraso', desc: true }}
              vacio="No hay facturas impagas para estos filtros."
            />
          </TarjetaGrafico>
        </div>
      </div>
    );
  }

  // ---------- Resumen ----------
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Indicador
          etiqueta="Deuda vencida"
          icono={<><span className="inline-block h-2 w-2 rounded-full" style={{ background: tema.estados.vencida }} /><IconoEstado tipo="critico" /></>}
          valor={fmt.monedaCompacta(resumen.vencido)}
          detalle={`${fmt.entero(resumen.cantVencidas)} facturas · hasta ${fmt.entero(resumen.mayorAtraso)} días`}
        />
        <Indicador etiqueta="Facturado" valor={fmt.monedaCompacta(resumen.facturado)} detalle={`${fmt.entero(resumen.cantidad)} facturas`} />
        <Indicador
          etiqueta="Cobrado"
          valor={fmt.monedaCompacta(resumen.cobrado)}
          detalle={resumen.facturado ? `${fmt.pct(resumen.cobrado / resumen.facturado)} de lo facturado` : undefined}
        />
        <Indicador etiqueta="Pendiente de cobro" valor={fmt.monedaCompacta(resumen.pendiente)} detalle={`${fmt.entero(impagas.length)} facturas`} />
        <Indicador
          etiqueta="Días promedio de cobro"
          valor={resumen.diasPromCobro === null ? '—' : fmt.decimal(resumen.diasPromCobro)}
          detalle={`Plazo habitual: ${plazoHabitual} días`}
        />
        <Indicador
          etiqueta="Cobradas en plazo"
          icono={<IconoEstado tipo="bien" />}
          valor={fmt.pct(resumen.pctEnPlazo)}
          detalle="De las facturas cobradas"
        />
      </div>

      <div className={`${GRILLA} lg:grid-cols-3`}>
        <TarjetaGrafico
          className="lg:col-span-2"
          titulo="Facturación mensual por estado de cobro"
          subtitulo="Monto facturado cada mes, según cómo se cobró"
          actualizando={actualizando}
          leyenda={<Leyenda items={ESTADOS_COBRANZA.map(e => ({ color: tema.estados[e.id], etiqueta: e.etiqueta, icono: <IconoEstado tipo={ICONO_ESTADO[e.id]} /> }))} />}
          cuerpoClassName="min-h-[16rem]"
          tabla={
            <TablaDatos
              columnas={[
                { clave: 'mes', titulo: 'Mes', valor: m => m.mes, mostrar: m => fmt.mes(m.mes) },
                ...ESTADOS_COBRANZA.map(e => ({ clave: e.id, titulo: e.etiqueta, valor: (m: typeof meses[number]) => m[e.id], mostrar: (m: typeof meses[number]) => fmt.moneda(m[e.id]), numerica: true })),
                { clave: 'cantidad', titulo: 'Facturas', valor: m => m.cantidad, numerica: true },
              ]}
              filas={meses}
              claveFila={m => m.mes}
            />
          }
        >
          <ColumnasApiladas
            categorias={meses.map(m => ({ clave: m.mes, etiqueta: fmt.mes(m.mes) }))}
            series={SERIES_ESTADO}
            valores={meses}
            formatoValor={fmt.moneda}
            formatoEje={fmt.monedaCompacta}
            etiquetaTotal="Facturado"
            extraTooltip={i => <div className="mt-1 text-xs text-slate-500">{fmt.entero(meses[i].cantidad)} facturas · {fmt.entero(meses[i].sesiones)} sesiones</div>}
          />
        </TarjetaGrafico>

        <TarjetaGrafico
          titulo="Las que más tardan en pagar"
          subtitulo="Días promedio de cobro. Tocá una barra para filtrar."
          actualizando={actualizando}
          leyenda={leyendaPlazo}
          cuerpoClassName="min-h-[18rem]"
          tabla={<TablaDatos columnas={[columnasObra[0], columnasObra[5], columnasObra[6]]} filas={rankingCobro.slice(0, 8)} claveFila={o => o.id} />}
        >
          {barrasCobro(rankingCobro.slice(0, 8))}
        </TarjetaGrafico>
      </div>
    </div>
  );
};
