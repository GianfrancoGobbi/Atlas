import React, { useMemo } from 'react';
import { ColumnasDivergentes } from '../charts/ColumnasDivergentes';
import { MapaDeCohortes } from '../charts/MapaDeCohortes';
import { ColumnaTabla, TablaDatos } from '../charts/TablaDatos';
import { FilaTooltip, IconoEstado, Indicador, Leyenda, SinDatos, TarjetaGrafico } from '../charts/base';
import { fmt, tema } from '../charts/tema';
import { deltaPuntos } from '../../utils/comparaciones';
import { FacturaAnalizada, FacturaPacienteRaw, HistorialRaw, PersonaRaw, TurnoAnalizado } from '../../utils/reportes';
import {
  analizarPacientes, DIAS_ACTIVO, DIAS_BAJA, FilaRiesgo, MESES_RIESGO, META_EVOLUCION, META_RESPALDO, MesPacientes, sumarMeses,
  TOLERANCIA_EVOLUCION_DIAS,
} from '../../utils/pacientes';

const GRILLA = 'grid min-h-0 flex-1 gap-3 lg:grid-rows-[minmax(0,1fr)]';
const COLOR_BAJAS = tema.ordinal[4];
const COLOR_POSIBLES = tema.atenuado;

interface Props {
  turnos: TurnoAnalizado[]; // filtrados por terapeuta y área, sin período
  facturas: FacturaAnalizada[]; // filtradas, sin período ni estado
  facturaPacientes: FacturaPacienteRaw[];
  historial: HistorialRaw[];
  personas: PersonaRaw[]; // staff, para los nombres de terapeutas
  esAdmin: boolean;
  hoy: number;
  actualizando: boolean;
}

const rangoMeses = (desde: string, hasta: string) => `${fmt.mes(desde)}–${fmt.mes(hasta)}`;
const signo = (n: number) => (n > 0 ? `+${fmt.entero(n)}` : n < 0 ? `−${fmt.entero(-n)}` : '0');
const plural = (n: number, uno: string, varios: string) => `${fmt.entero(n)} ${n === 1 ? uno : varios}`;

// Anticipa la caída de ingresos: pacientes que se van o no vuelven, y facturación sin respaldo.
// Nunca muestra pacientes individuales: todo es agregado. El filtro de período no aplica.
export const VistaPacientes: React.FC<Props> = ({
  turnos, facturas, facturaPacientes, historial, personas, esAdmin, hoy, actualizando,
}) => {
  const a = useMemo(
    () => analizarPacientes(turnos, facturas, facturaPacientes, historial, personas, hoy),
    [turnos, facturas, facturaPacientes, historial, personas, hoy],
  );
  const { continuidad: c, retencion, respaldo, evolucion, ultimoMes } = a;

  const provisorios = a.meses.filter(m => m.provisorio);
  const sinAgenda = a.riesgo.filter(f => f.sesionesFacturadas > 0 && f.conTurno === 0 && f.sesionesAtendidas === 0);
  const columnasCohorte = Array.from({ length: a.offsetsCohorte }, (_, k) => `+${k + 1}`);

  const columnasRiesgo: ColumnaTabla<FilaRiesgo>[] = [
    { clave: 'nombre', titulo: 'Terapeuta', valor: f => f.nombre },
    ...(esAdmin ? [{
      clave: 'fact', titulo: '% fact.', valor: (f: FilaRiesgo) => f.pctFacturacion, mostrar: (f: FilaRiesgo) => fmt.pct(f.pctFacturacion), numerica: true,
    }] : []),
    { clave: 'con', titulo: 'Con turno', valor: f => f.conTurno, mostrar: f => fmt.entero(f.conTurno), numerica: true },
    {
      clave: 'sin',
      titulo: 'Sin turno',
      valor: f => f.sinTurno,
      mostrar: f => (f.sinTurno
        ? <span className="inline-flex items-center gap-1">{(f.pctSinTurno ?? 0) > 1 - META_RESPALDO && <IconoEstado tipo="alerta" />}{fmt.entero(f.sinTurno)} <span className="text-slate-500">({fmt.pct(f.pctSinTurno)})</span></span>
        : '—'),
      numerica: true,
    },
    {
      clave: 'evol',
      titulo: 'Evolución',
      valor: f => f.pctEvolucion,
      mostrar: f => (f.pctEvolucion === null ? '—' : (
        <span className="inline-flex items-center gap-1">
          <IconoEstado tipo={f.pctEvolucion >= META_EVOLUCION ? 'bien' : 'alerta'} />{fmt.pct(f.pctEvolucion)}
        </span>
      )),
      numerica: true,
    },
    { clave: 'activos', titulo: 'Activos', valor: f => f.activos, mostrar: f => fmt.entero(f.activos), numerica: true },
  ];

  const respaldoOk = respaldo.pct !== null && respaldo.pct >= META_RESPALDO;
  const evolucionOk = evolucion.pct !== null && evolucion.pct >= META_EVOLUCION;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Indicador
          etiqueta="Activos sin próximo turno"
          icono={c.sinProximo ? <IconoEstado tipo="alerta" /> : <IconoEstado tipo="bien" />}
          valor={fmt.entero(c.sinProximo)}
          detalle={c.activos ? `${fmt.pct(c.sinProximo / c.activos)} de ${fmt.entero(c.activos)} activos (${DIAS_ACTIVO} d)` : 'Sin pacientes activos'}
        />
        <Indicador
          etiqueta="Se están enfriando"
          icono={c.enfriandose ? <IconoEstado tipo="alerta" /> : undefined}
          valor={fmt.entero(c.enfriandose)}
          detalle={`de ${fmt.entero(c.conRitmo)} con ≥ 1 sesión por mes: menos de la mitad en 30 d`}
        />
        <Indicador
          etiqueta="Retención a 3 meses"
          valor={fmt.pct(retencion.reciente.pct)}
          delta={deltaPuntos(retencion.reciente.pct, retencion.anterior.pct)}
          deltaEtiqueta={`vs cohortes ${rangoMeses(retencion.anterior.desde, retencion.anterior.hasta)}`}
          detalle={`Nuevos ${rangoMeses(retencion.reciente.desde, retencion.reciente.hasta)} (n ${fmt.entero(retencion.reciente.n)}) · antes ${fmt.pct(retencion.anterior.pct)} (n ${fmt.entero(retencion.anterior.n)})`}
        />
        <Indicador
          etiqueta={`Crecimiento neto ${ultimoMes ? `${fmt.mes(ultimoMes.mes)}${ultimoMes.provisorio ? ' (prov.)' : ''}` : ''}`}
          valor={ultimoMes ? signo(ultimoMes.neto) : '—'}
          detalle={ultimoMes
            ? `${fmt.entero(ultimoMes.nuevos)} nuevos − ${fmt.entero(ultimoMes.bajas)} bajas${ultimoMes.posibles ? ` (+${fmt.entero(ultimoMes.posibles)} posibles)` : ''} · ${fmt.entero(ultimoMes.atendidos)} atendidos${ultimoMes.provisorio ? ` · bajas a confirmar a los ${DIAS_BAJA} d` : ''}`
            : 'Sin turnos finalizados el mes pasado'}
        />
        <Indicador
          etiqueta="Facturación con turno"
          icono={respaldo.pct === null ? undefined : <IconoEstado tipo={respaldoOk ? 'bien' : 'alerta'} />}
          valor={fmt.pct(respaldo.pct)}
          detalle={respaldo.facturadas
            ? `${fmt.entero(respaldo.sinTurno)} de ${fmt.entero(respaldo.facturadas)} sesiones sin turno · meta ${fmt.pct(META_RESPALDO)}`
            : `Sin sesiones facturadas ${rangoMeses(respaldo.desde, respaldo.hasta)}`}
        />
        <Indicador
          etiqueta="Sesiones con evolución"
          icono={evolucion.pct === null ? undefined : <IconoEstado tipo={evolucionOk ? 'bien' : 'alerta'} />}
          valor={fmt.pct(evolucion.pct)}
          detalle={evolucion.sesiones
            ? `${fmt.entero(evolucion.conEvolucion)} de ${fmt.entero(evolucion.sesiones)} en ${evolucion.anio} · meta ${fmt.pct(META_EVOLUCION)}`
            : `Sin sesiones finalizadas en ${evolucion.anio}`}
        />
      </div>

      <div className={`${GRILLA} lg:grid-cols-7`}>
        <TarjetaGrafico
          className="lg:col-span-2"
          titulo="Nuevos y bajas por mes"
          subtitulo={`Baja: último turno ese mes, nada agendado y ${DIAS_BAJA} d sin volver${provisorios.length ? ` · ${provisorios.map(m => fmt.mes(m.mes)).join(' y ')}: provisorios` : ''}`}
          actualizando={actualizando}
          leyenda={<Leyenda items={[
            { color: tema.serie, etiqueta: 'Nuevos' },
            { color: COLOR_BAJAS, etiqueta: 'Bajas' },
            { color: COLOR_POSIBLES, etiqueta: 'Posibles bajas' },
          ]} />}
          tabla={
            <TablaDatos
              columnas={[
                { clave: 'mes', titulo: 'Mes', valor: (m: MesPacientes) => m.mes, mostrar: m => `${fmt.mes(m.mes)}${m.provisorio ? ' (prov.)' : ''}` },
                { clave: 'nuevos', titulo: 'Nuevos', valor: m => m.nuevos, numerica: true },
                { clave: 'previos', titulo: 'Ya facturados', valor: m => m.previos, numerica: true },
                { clave: 'bajas', titulo: 'Bajas', valor: m => m.bajas, numerica: true },
                { clave: 'posibles', titulo: 'Posibles', valor: m => m.posibles, numerica: true },
                { clave: 'neto', titulo: 'Neto', valor: m => m.neto, mostrar: m => signo(m.neto), numerica: true },
                { clave: 'atendidos', titulo: 'Atendidos', valor: m => m.atendidos, numerica: true },
              ]}
              filas={a.meses}
              claveFila={m => m.mes}
            />
          }
        >
          {a.meses.length ? (
            <ColumnasDivergentes
              categorias={a.meses.map(m => ({ clave: m.mes, etiqueta: fmt.mes(m.mes), nota: m.provisorio ? 'prov.' : undefined }))}
              arriba={[{ clave: 'nuevos', etiqueta: 'nuevos', color: tema.serie }]}
              abajo={[
                { clave: 'bajas', etiqueta: 'bajas', color: COLOR_BAJAS },
                { clave: 'posibles', etiqueta: 'posibles bajas', color: COLOR_POSIBLES },
              ]}
              valores={a.meses}
              formatoValor={fmt.entero}
              formatoEje={fmt.entero}
              extraTooltip={i => {
                const m = a.meses[i];
                return (
                  <div className="mt-1 border-t border-slate-100 pt-1">
                    <FilaTooltip etiqueta="neto" valor={signo(m.neto)} fuerte />
                    <FilaTooltip etiqueta="pacientes atendidos" valor={fmt.entero(m.atendidos)} />
                    {m.previos > 0 && <FilaTooltip etiqueta="primer turno, pero ya facturados antes (no son nuevos)" valor={fmt.entero(m.previos)} />}
                    {m.provisorio && <div className="mt-1 text-xs text-slate-500">Provisorio: las bajas se confirman a los {DIAS_BAJA} días.</div>}
                  </div>
                );
              }}
            />
          ) : <SinDatos texto="No hay turnos finalizados para estos filtros." />}
        </TarjetaGrafico>

        <TarjetaGrafico
          className="lg:col-span-2"
          titulo="Retención por cohorte"
          subtitulo="% de los nuevos de cada mes que tuvieron sesión en el mes +1…+6 · sin los que ya se facturaban antes · solo meses cerrados"
          actualizando={actualizando}
          tabla={
            <TablaDatos
              columnas={[
                { clave: 'mes', titulo: 'Inicio', valor: (f: { i: number }) => a.cohortes[f.i].mes, mostrar: f => fmt.mes(a.cohortes[f.i].mes) },
                { clave: 'n', titulo: 'n', valor: f => a.cohortes[f.i].n, numerica: true },
                ...columnasCohorte.map((t, k) => ({
                  clave: t,
                  titulo: t,
                  valor: (f: { i: number }) => {
                    const r = a.cohortes[f.i].retenidos[k];
                    return r === null || !a.cohortes[f.i].n ? null : r / a.cohortes[f.i].n;
                  },
                  mostrar: (f: { i: number }) => {
                    const r = a.cohortes[f.i].retenidos[k];
                    return r === null || !a.cohortes[f.i].n ? '—' : fmt.pct(r / a.cohortes[f.i].n);
                  },
                  numerica: true,
                })),
              ]}
              filas={a.cohortes.map((_, i) => ({ i }))}
              claveFila={f => a.cohortes[f.i].mes}
            />
          }
        >
          {a.cohortes.some(x => x.n > 0) ? (
            <MapaDeCohortes
              filas={a.cohortes.map(x => ({ clave: x.mes, etiqueta: fmt.mes(x.mes), n: x.n }))}
              columnas={columnasCohorte}
              celdas={a.cohortes.map(x => x.retenidos.map(r => (r === null || !x.n ? null : r / x.n)))}
              tooltip={(i, j) => {
                const x = a.cohortes[i];
                const r = x.retenidos[j] ?? 0;
                return (
                  <>
                    <div className="mb-1 text-xs font-medium text-slate-500">Nuevos de {fmt.mes(x.mes)} · sesión en {fmt.mes(sumarMeses(x.mes, j + 1))}</div>
                    <FilaTooltip etiqueta="siguen viniendo" valor={fmt.pct(r / x.n)} fuerte />
                    <FilaTooltip etiqueta="pacientes" valor={`${fmt.entero(r)} de ${fmt.entero(x.n)}`} />
                  </>
                );
              }}
            />
          ) : <SinDatos texto="Todavía no hay cohortes con meses cerrados." />}
        </TarjetaGrafico>

        <TarjetaGrafico
          className="lg:col-span-3"
          titulo="Riesgo por terapeuta"
          subtitulo={`${rangoMeses(respaldo.desde, respaldo.hasta)} · sesiones facturadas con y sin turno finalizado (mismo paciente, mes y terapeuta) · evolución ±${TOLERANCIA_EVOLUCION_DIAS} d · activos: últimos ${DIAS_ACTIVO} d`}
          actualizando={actualizando}
          cuerpoClassName="min-h-[14rem]"
        >
          <div className="absolute inset-0 flex flex-col">
            <div className="relative min-h-0 flex-1">
              <TablaDatos
                llenar
                columnas={columnasRiesgo}
                filas={a.riesgo}
                claveFila={f => f.id}
                orden={{ clave: esAdmin ? 'fact' : 'con', desc: true }}
                vacio={`No hay sesiones ni facturas en los últimos ${MESES_RIESGO} meses cerrados.`}
              />
            </div>
            {sinAgenda.length > 0 && (
              <p className="shrink-0 border-t border-slate-100 pt-2 text-xs text-slate-500">
                <span className="mr-1 inline-block align-[-1px]"><IconoEstado tipo="alerta" /></span>
                {sinAgenda.length === 1 ? `${sinAgenda[0].nombre} facturó` : `${fmt.entero(sinAgenda.length)} terapeutas facturaron`} sin cargar turnos:
                {' '}sus pacientes no entran en activos, bajas, cohortes ni evolución.
              </p>
            )}
            {esAdmin && a.hhi !== null && a.riesgo.length > 1 && (
              <p className={`shrink-0 text-xs text-slate-500 ${sinAgenda.length ? 'pt-1' : 'border-t border-slate-100 pt-2'}`}>
                Concentración de la facturación (HHI): <span className="font-semibold tabular-nums text-slate-800">{fmt.entero(a.hhi * 10_000)}</span>
                {' '}· equivale a {plural(Math.round(1 / a.hhi), 'terapeuta', 'terapeutas')} con la misma facturación
                {a.hhi > 0.25 ? ' · muy concentrada' : a.hhi > 0.15 ? ' · concentrada' : ''}
              </p>
            )}
          </div>
        </TarjetaGrafico>
      </div>
    </div>
  );
};
