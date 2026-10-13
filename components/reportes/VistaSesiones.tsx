import React, { useMemo } from 'react';
import { ColumnasApiladas } from '../charts/ColumnasApiladas';
import { BarrasHorizontales } from '../charts/BarrasHorizontales';
import { MapaDeCalor } from '../charts/MapaDeCalor';
import { ColumnaTabla, TablaDatos } from '../charts/TablaDatos';
import { FilaTooltip, IconoEstado, Indicador, SinDatos, TarjetaGrafico } from '../charts/base';
import { fmt, tema } from '../charts/tema';
import {
  cobranzaPorMes, DIAS_SEMANA, TOLERANCIA_PUNTUAL_MIN, FacturaAnalizada, FilaTurnosTerapeuta, grillaTurnos, PersonaRaw, proximosTurnos, Rango,
  resumenPorObraSocial, resumirTurnos, TurnoAnalizado, turnosPorTerapeuta,
} from '../../utils/reportes';
import { deltaPct, deltaPuntos, deltaValor } from '../../utils/comparaciones';

export type SeccionSesiones = 'sesiones' | 'turnos';

// Grilla que ocupa el alto restante de la vista (en pantallas grandes, sin scroll de página).
const GRILLA = 'grid min-h-0 flex-1 gap-3 lg:grid-rows-[minmax(0,1fr)]';

interface Props {
  seccion: SeccionSesiones;
  facturas: FacturaAnalizada[];
  turnos: TurnoAnalizado[]; // del período
  turnosTodos: TurnoAnalizado[]; // sin filtro de período (para los próximos)
  facturasAnioAnterior: FacturaAnalizada[] | null; // mismo período, un año antes
  turnosAnioAnterior: TurnoAnalizado[] | null;
  personas: PersonaRaw[];
  hoy: number;
  rango: Rango;
  obrasSeleccionadas: string[];
  onAlternarObraSocial: (id: string) => void;
  avisoFiltrosNoAplican: boolean;
  actualizando: boolean;
}

export const VistaSesiones: React.FC<Props> = ({
  seccion, facturas, turnos, turnosTodos, facturasAnioAnterior, turnosAnioAnterior, personas, hoy, rango, obrasSeleccionadas, onAlternarObraSocial, avisoFiltrosNoAplican, actualizando,
}) => {
  const meses = useMemo(() => cobranzaPorMes(facturas, rango), [facturas, rango]);
  const porObra = useMemo(
    () => resumenPorObraSocial(facturas).filter(o => o.sesiones > 0).sort((a, b) => b.sesiones - a.sesiones),
    [facturas],
  );
  const resumenTurnos = useMemo(() => resumirTurnos(turnos, hoy), [turnos, hoy]);
  const turnosAA = useMemo(() => (turnosAnioAnterior ? resumirTurnos(turnosAnioAnterior, hoy) : null), [turnosAnioAnterior, hoy]);
  const sesionesAA = facturasAnioAnterior ? facturasAnioAnterior.reduce((s, f) => s + f.sesiones, 0) : null;
  const facturadoAA = facturasAnioAnterior ? facturasAnioAnterior.reduce((s, f) => s + f.monto, 0) : null;
  const VS = 'vs mismo período del año anterior';
  const porTerapeuta = useMemo(() => turnosPorTerapeuta(turnos, turnosTodos, personas, hoy), [turnos, turnosTodos, personas, hoy]);
  const grilla = useMemo(() => grillaTurnos(turnos), [turnos]);

  const totalSesiones = facturas.reduce((s, f) => s + f.sesiones, 0);
  const totalFacturado = facturas.reduce((s, f) => s + f.monto, 0);
  const mesesConSesiones = meses.filter(m => m.sesiones > 0).length;

  // ---------- Turnos ----------
  if (seccion === 'turnos') {
    const columnasTerapeuta: ColumnaTabla<FilaTurnosTerapeuta>[] = [
      { clave: 'nombre', titulo: 'Terapeuta', valor: t => t.nombre },
      { clave: 'total', titulo: 'Turnos', valor: t => t.total, mostrar: t => fmt.entero(t.total), numerica: true },
      { clave: 'fin', titulo: 'Finaliz.', valor: t => t.pctFinalizados, mostrar: t => fmt.pct(t.pctFinalizados), numerica: true },
      { clave: 'canc', titulo: 'Cancel.', valor: t => t.pctCancelados, mostrar: t => fmt.pct(t.pctCancelados), numerica: true },
      { clave: 'abiertos', titulo: 'Sin cerrar', valor: t => t.sinCerrar, mostrar: t => (t.sinCerrar ? fmt.entero(t.sinCerrar) : '—'), numerica: true },
      { clave: 'atraso', titulo: 'Atraso', valor: t => t.atrasoMinProm, mostrar: t => (t.atrasoMinProm === null ? '—' : `${fmt.entero(t.atrasoMinProm)} min`), numerica: true },
      { clave: 'puntuales', titulo: 'Puntuales', valor: t => t.pctPuntuales, mostrar: t => fmt.pct(t.pctPuntuales), numerica: true },
      { clave: 'prox', titulo: 'Próx. 30 d', valor: t => t.proximos, mostrar: t => fmt.entero(t.proximos), numerica: true },
    ];
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Indicador
            etiqueta="Turnos agendados"
            valor={fmt.entero(resumenTurnos.total)}
            delta={turnosAA ? deltaPct(resumenTurnos.total, turnosAA.total) : undefined}
            deltaEtiqueta={VS}
            detalle={`${fmt.decimal(resumenTurnos.horasAgendadas)} ${resumenTurnos.horasAgendadas === 1 ? 'hora' : 'horas'}`} />
          <Indicador
            etiqueta="Finalizados"
            icono={<IconoEstado tipo="bien" />}
            valor={fmt.pct(resumenTurnos.pctFinalizados)}
            delta={turnosAA ? deltaPuntos(resumenTurnos.pctFinalizados, turnosAA.pctFinalizados) : undefined}
            deltaEtiqueta={VS}
            detalle={`${fmt.entero(resumenTurnos.finalizados)} de ${fmt.entero(resumenTurnos.pasados)} ya pasados`}
          />
          <Indicador
            etiqueta="Cancelados"
            valor={fmt.pct(resumenTurnos.pctCancelados)}
            delta={turnosAA ? deltaPuntos(resumenTurnos.pctCancelados, turnosAA.pctCancelados, false) : undefined}
            deltaEtiqueta={VS}
            detalle={avisoFiltrosNoAplican ? 'Obra social y pago no aplican a turnos' : 'Del total del período'}
          />
          <Indicador
            etiqueta="Sin cerrar"
            icono={<IconoEstado tipo="alerta" />}
            valor={fmt.entero(resumenTurnos.sinCerrar)}
            detalle={resumenTurnos.sinCerrar ? `Hace ${fmt.entero(resumenTurnos.atrasoProm ?? 0)} días en promedio` : 'Fecha pasada sin registrar'}
          />
          <Indicador
            etiqueta="Atraso al empezar"
            valor={resumenTurnos.atrasoMinProm === null ? '—' : `${fmt.entero(resumenTurnos.atrasoMinProm)} min`}
            delta={turnosAA ? deltaValor(resumenTurnos.atrasoMinProm, turnosAA.atrasoMinProm, 'min') : undefined}
            deltaEtiqueta={VS}
            detalle={resumenTurnos.conInicio
              ? `${fmt.pct(resumenTurnos.pctPuntuales)} puntuales (≤ ${TOLERANCIA_PUNTUAL_MIN} min)`
              : 'Sin registros: se cargan con "Empezó ahora"'}
          />
          <Indicador etiqueta="Próximos 30 días" valor={fmt.entero(proximosTurnos(turnosTodos, hoy))} detalle="Agendados desde hoy" />
        </div>

        <div className={`${GRILLA} lg:grid-cols-3`}>
          <TarjetaGrafico
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
            className="lg:col-span-2"
            titulo="Turnos por terapeuta"
            subtitulo={`Atraso: minutos promedio entre el horario del turno y el inicio real · Puntuales: hasta ${TOLERANCIA_PUNTUAL_MIN} min`}
            actualizando={actualizando}
            cuerpoClassName="min-h-[14rem]"
          >
            <TablaDatos
              llenar
              columnas={columnasTerapeuta}
              filas={porTerapeuta}
              claveFila={t => t.id}
              orden={{ clave: 'total', desc: true }}
              vacio="No hay turnos en este período."
            />
          </TarjetaGrafico>
        </div>
      </div>
    );
  }

  // ---------- Sesiones ----------
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid shrink-0 grid-cols-3 gap-3">
        <Indicador
          etiqueta="Sesiones facturadas"
          valor={fmt.entero(totalSesiones)}
          delta={deltaPct(totalSesiones, sesionesAA)}
          deltaEtiqueta={VS}
          detalle={`${fmt.entero(facturas.length)} facturas`}
        />
        <Indicador
          etiqueta="Sesiones por mes"
          valor={mesesConSesiones ? fmt.decimal(totalSesiones / mesesConSesiones) : '—'}
          detalle="Promedio de los meses con actividad"
        />
        <Indicador
          etiqueta="Facturado por sesión"
          valor={totalSesiones ? fmt.moneda(totalFacturado / totalSesiones) : '—'}
          delta={totalSesiones && sesionesAA && facturadoAA !== null ? deltaPct(totalFacturado / totalSesiones, facturadoAA / sesionesAA) : undefined}
          deltaEtiqueta={VS}
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
