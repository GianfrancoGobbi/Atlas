import React, { useMemo } from 'react';
import { ColumnasApiladas } from '../charts/ColumnasApiladas';
import { BarrasHorizontales } from '../charts/BarrasHorizontales';
import { MapaDeCalor } from '../charts/MapaDeCalor';
import { TablaDatos } from '../charts/TablaDatos';
import { FilaTooltip, Indicador, SinDatos, TarjetaGrafico } from '../charts/base';
import { fmt, tema } from '../charts/tema';
import {
  cobranzaPorMes, DIAS_SEMANA, FacturaAnalizada, grillaTurnos, Rango, resumenPorObraSocial, resumirTurnos, TurnoAnalizado,
} from '../../utils/reportes';

export type SeccionSesiones = 'sesiones' | 'turnos';

const ETIQUETA_ESTADO_TURNO: Record<string, string> = {
  pendiente: 'Pendientes', confirmado: 'Confirmados', finalizado: 'Finalizados', cancelado: 'Cancelados',
};

// Grilla que ocupa el alto restante de la vista (en pantallas grandes, sin scroll de página).
const GRILLA = 'grid min-h-0 flex-1 gap-3 lg:grid-rows-[minmax(0,1fr)]';

interface Props {
  seccion: SeccionSesiones;
  facturas: FacturaAnalizada[];
  turnos: TurnoAnalizado[];
  rango: Rango;
  obrasSeleccionadas: string[];
  onAlternarObraSocial: (id: string) => void;
  avisoFiltrosNoAplican: boolean;
  actualizando: boolean;
}

export const VistaSesiones: React.FC<Props> = ({
  seccion, facturas, turnos, rango, obrasSeleccionadas, onAlternarObraSocial, avisoFiltrosNoAplican, actualizando,
}) => {
  const meses = useMemo(() => cobranzaPorMes(facturas, rango), [facturas, rango]);
  const porObra = useMemo(
    () => resumenPorObraSocial(facturas).filter(o => o.sesiones > 0).sort((a, b) => b.sesiones - a.sesiones),
    [facturas],
  );
  const resumenTurnos = useMemo(() => resumirTurnos(turnos), [turnos]);
  const grilla = useMemo(() => grillaTurnos(turnos), [turnos]);

  const totalSesiones = facturas.reduce((s, f) => s + f.sesiones, 0);
  const totalFacturado = facturas.reduce((s, f) => s + f.monto, 0);
  const mesesConSesiones = meses.filter(m => m.sesiones > 0).length;

  // ---------- Turnos ----------
  if (seccion === 'turnos') {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="grid shrink-0 grid-cols-3 gap-3">
          <Indicador etiqueta="Turnos agendados" valor={fmt.entero(resumenTurnos.total)} detalle={`${fmt.decimal(resumenTurnos.horasAgendadas)} horas`} />
          <Indicador etiqueta="Duración promedio" valor={resumenTurnos.duracionProm === null ? '—' : `${fmt.entero(resumenTurnos.duracionProm)} min`} />
          <Indicador
            etiqueta="Turnos cancelados"
            valor={fmt.pct(resumenTurnos.pctCancelados)}
            detalle={avisoFiltrosNoAplican ? 'Los filtros de obra social y pago no aplican a turnos' : undefined}
          />
        </div>
        <div className={`${GRILLA} lg:grid-cols-3`}>
          <TarjetaGrafico
            className="lg:col-span-2"
            titulo="Turnos por día y horario"
            subtitulo="Cuándo se concentran los turnos agendados"
            actualizando={actualizando}
            tabla={
              <TablaDatos
                columnas={[
                  { clave: 'dia', titulo: 'Día', valor: (f: { dia: string; i: number }) => f.i, mostrar: f => f.dia },
                  ...grilla.horas.map((h, j) => ({
                    clave: String(h), titulo: `${h} h`, valor: (f: { dia: string; i: number }) => grilla.celdas[f.i][j], numerica: true,
                  })),
                ]}
                filas={DIAS_SEMANA.map((dia, i) => ({ dia, i }))}
                claveFila={f => f.dia}
              />
            }
          >
            {turnos.length ? (
              <MapaDeCalor
                filas={DIAS_SEMANA}
                columnas={grilla.horas}
                celdas={grilla.celdas}
                formatoColumna={h => `${h} h`}
                unidad={n => `${n} ${n === 1 ? 'turno' : 'turnos'}`}
              />
            ) : <SinDatos texto="No hay turnos en este período." />}
          </TarjetaGrafico>

          <TarjetaGrafico
            titulo="Turnos por estado"
            actualizando={actualizando}
            cuerpoClassName="min-h-[10rem]"
            tabla={
              <TablaDatos
                columnas={[
                  { clave: 'estado', titulo: 'Estado', valor: e => ETIQUETA_ESTADO_TURNO[e.estado] ?? e.estado },
                  { clave: 'cantidad', titulo: 'Turnos', valor: e => e.cantidad, numerica: true },
                ]}
                filas={resumenTurnos.porEstado}
                claveFila={e => e.estado}
              />
            }
          >
            {turnos.length ? (
              <BarrasHorizontales
                filas={resumenTurnos.porEstado.map(e => ({
                  clave: e.estado,
                  etiqueta: ETIQUETA_ESTADO_TURNO[e.estado] ?? e.estado,
                  valor: e.cantidad,
                  color: tema.serie,
                  tooltip: <FilaTooltip etiqueta={ETIQUETA_ESTADO_TURNO[e.estado] ?? e.estado} valor={fmt.entero(e.cantidad)} fuerte />,
                }))}
                formatoValor={fmt.entero}
              />
            ) : <SinDatos texto="No hay turnos en este período." />}
          </TarjetaGrafico>
        </div>
      </div>
    );
  }

  // ---------- Sesiones ----------
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid shrink-0 grid-cols-3 gap-3">
        <Indicador etiqueta="Sesiones facturadas" valor={fmt.entero(totalSesiones)} detalle={`${fmt.entero(facturas.length)} facturas`} />
        <Indicador
          etiqueta="Sesiones por mes"
          valor={mesesConSesiones ? fmt.decimal(totalSesiones / mesesConSesiones) : '—'}
          detalle="Promedio de los meses con actividad"
        />
        <Indicador
          etiqueta="Facturado por sesión"
          valor={totalSesiones ? fmt.moneda(totalFacturado / totalSesiones) : '—'}
          detalle="Promedio del período"
        />
      </div>
      <div className={`${GRILLA} lg:grid-cols-2`}>
        <TarjetaGrafico
          titulo="Sesiones facturadas por mes"
          subtitulo="Según el mes de emisión de la factura"
          actualizando={actualizando}
          tabla={
            <TablaDatos
              columnas={[
                { clave: 'mes', titulo: 'Mes', valor: m => m.mes, mostrar: m => fmt.mes(m.mes) },
                { clave: 'sesiones', titulo: 'Sesiones', valor: m => m.sesiones, numerica: true },
                { clave: 'cantidad', titulo: 'Facturas', valor: m => m.cantidad, numerica: true },
              ]}
              filas={meses}
              claveFila={m => m.mes}
            />
          }
        >
          {totalSesiones ? (
            <ColumnasApiladas
              categorias={meses.map(m => ({ clave: m.mes, etiqueta: fmt.mes(m.mes) }))}
              series={[{ clave: 'sesiones', etiqueta: 'sesiones', color: tema.serie }]}
              valores={meses}
              formatoValor={fmt.entero}
              formatoEje={fmt.entero}
            />
          ) : <SinDatos texto="No hay sesiones facturadas para estos filtros." />}
        </TarjetaGrafico>

        <TarjetaGrafico
          titulo="Sesiones por obra social"
          subtitulo="Tocá una barra para filtrar por esa obra social"
          actualizando={actualizando}
          cuerpoClassName="min-h-[22rem]"
          tabla={
            <TablaDatos
              columnas={[
                { clave: 'nombre', titulo: 'Obra social', valor: o => o.nombre },
                { clave: 'sesiones', titulo: 'Sesiones', valor: o => o.sesiones, numerica: true },
                { clave: 'facturado', titulo: 'Facturado', valor: o => o.facturado, mostrar: o => fmt.moneda(o.facturado), numerica: true },
              ]}
              filas={porObra}
              claveFila={o => o.id}
              orden={{ clave: 'sesiones', desc: true }}
            />
          }
        >
          {porObra.length ? (
            <BarrasHorizontales
              filas={porObra.map(o => ({
                clave: o.id,
                etiqueta: o.nombre,
                valor: o.sesiones,
                color: tema.serie,
                seleccionada: obrasSeleccionadas.includes(o.id),
                tooltip: (
                  <>
                    <div className="mb-1 text-xs font-medium text-slate-500">{o.nombre}</div>
                    <FilaTooltip etiqueta="sesiones" valor={fmt.entero(o.sesiones)} fuerte />
                    <FilaTooltip etiqueta="facturado" valor={fmt.moneda(o.facturado)} />
                    <FilaTooltip etiqueta="por sesión" valor={fmt.moneda(o.facturado / o.sesiones)} />
                  </>
                ),
              }))}
              formatoValor={fmt.entero}
              onClickFila={onAlternarObraSocial}
            />
          ) : <SinDatos texto="No hay sesiones facturadas para estos filtros." />}
        </TarjetaGrafico>
      </div>
    </div>
  );
};
