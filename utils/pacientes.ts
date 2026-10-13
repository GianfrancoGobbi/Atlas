// Cálculos de la vista "Pacientes y riesgo": quiénes se van, quiénes no vuelven y qué
// facturación no tiene respaldo en la agenda. Todo puro y agregado: nunca devuelve
// nombres ni ids de pacientes.

import { diaAIso, diaDe, FacturaAnalizada, FacturaPacienteRaw, HistorialRaw, PersonaRaw, TurnoAnalizado } from './reportes';

export const DIAS_ACTIVO = 60; // activo = tuvo una sesión finalizada en estos últimos días
export const DIAS_BAJA = 60; // una baja se confirma cuando pasaron estos días sin volver
export const META_RESPALDO = 0.98;
export const META_EVOLUCION = 0.95;
export const TOLERANCIA_EVOLUCION_DIAS = 1; // la evolución puede cargarse el día anterior o el siguiente
export const MESES_RIESGO = 6;

const ABIERTOS = new Set(['pendiente', 'confirmado']);

// ---------- Meses 'AAAA-MM' ----------

export const mesDeDia = (dia: number): string => diaAIso(dia).slice(0, 7);

export const sumarMeses = (mes: string, k: number): string => {
  const [y, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + k, 1)).toISOString().slice(0, 7);
};

const inicioMes = (mes: string) => diaDe(`${mes}-01`);
const finMes = (mes: string) => inicioMes(sumarMeses(mes, 1)) - 1;

// Los `n` meses que terminan en `ultimo` (inclusive), del más viejo al más nuevo.
const mesesHasta = (ultimo: string, n: number): string[] => Array.from({ length: n }, (_, i) => sumarMeses(ultimo, i - n + 1));

export const ultimoMesCerrado = (hoy: number) => sumarMeses(mesDeDia(hoy), -1);

const ratio = (a: number, b: number): number | null => (b ? a / b : null);

// ---------- Historia de cada paciente ----------

interface Historia {
  primero: number; // primer turno finalizado
  ultimo: number;
  dias: number[]; // turnos finalizados (hasta hoy)
  meses: Set<string>;
  conFuturo: boolean; // tiene un turno pendiente o confirmado desde hoy
}

function historias(turnos: TurnoAnalizado[], hoy: number): Map<string, Historia> {
  const mapa = new Map<string, Historia>();
  const futuros = new Set<string>();
  for (const t of turnos) {
    if (!t.pacienteId) continue;
    if (ABIERTOS.has(t.estado) && t.dia >= hoy) futuros.add(t.pacienteId);
    if (t.estado !== 'finalizado' || t.dia > hoy) continue;
    const h = mapa.get(t.pacienteId);
    if (h) {
      h.primero = Math.min(h.primero, t.dia);
      h.ultimo = Math.max(h.ultimo, t.dia);
      h.dias.push(t.dia);
      h.meses.add(mesDeDia(t.dia));
    } else {
      mapa.set(t.pacienteId, { primero: t.dia, ultimo: t.dia, dias: [t.dia], meses: new Set([mesDeDia(t.dia)]), conFuturo: false });
    }
  }
  for (const [id, h] of mapa) h.conFuturo = futuros.has(id);
  return mapa;
}

// ---------- Indicadores de continuidad ----------

export interface Continuidad {
  activos: number;
  sinProximo: number; // activos sin ningún turno agendado desde hoy
  conRitmo: number; // venían al menos una vez por mes (entre hoy−120 y hoy−30)
  enfriandose: number; // de esos, en los últimos 30 días vinieron menos de la mitad que antes
}

function continuidad(hs: Map<string, Historia>, hoy: number): Continuidad {
  const r: Continuidad = { activos: 0, sinProximo: 0, conRitmo: 0, enfriandose: 0 };
  for (const h of hs.values()) {
    if (h.ultimo > hoy - DIAS_ACTIVO) {
      r.activos++;
      if (!h.conFuturo) r.sinProximo++;
    }
    const antes = h.dias.filter(d => d >= hoy - 120 && d < hoy - 30).length;
    const ritmoMensual = antes / 3;
    if (ritmoMensual < 1) continue;
    r.conRitmo++;
    const ahora = h.dias.filter(d => d >= hoy - 30).length;
    if (ahora < ritmoMensual / 2) r.enfriandose++;
  }
  return r;
}

// ---------- Cohortes ----------

export interface Cohorte {
  mes: string; // mes del primer turno finalizado
  n: number;
  retenidos: (number | null)[]; // por mes +1..+N; null si ese mes todavía no cerró
}

function cohortes(hs: Map<string, Historia>, hoy: number, cantidad: number, offsets: number): Cohorte[] {
  const cerrado = ultimoMesCerrado(hoy);
  const ultima = sumarMeses(cerrado, -1); // la última cohorte con al menos el mes +1 maduro
  const porMes = new Map(mesesHasta(ultima, cantidad).map(mes => [mes, { mes, n: 0, retenidos: Array<number | null>(offsets).fill(0) }]));
  for (const h of hs.values()) {
    const c = porMes.get(mesDeDia(h.primero));
    if (!c) continue;
    c.n++;
    for (let k = 1; k <= offsets; k++) if (h.meses.has(sumarMeses(c.mes, k))) (c.retenidos[k - 1] as number)++;
  }
  const lista = [...porMes.values()].map(c => ({
    ...c,
    retenidos: c.retenidos.map((r, i) => (sumarMeses(c.mes, i + 1) <= cerrado ? r : null)),
  }));
  // Sin los meses vacíos del principio (antes de que hubiera datos).
  const primera = lista.findIndex(c => c.n > 0);
  return primera < 0 ? [] : lista.slice(primera);
}

export interface Retencion { desde: string; hasta: string; n: number; retenidos: number; pct: number | null }

// Retención al mes +k de las 3 últimas cohortes maduras contra las 3 anteriores (en conjunto, no promedio de porcentajes).
function retencionComparada(hs: Map<string, Historia>, hoy: number, k = 3): { reciente: Retencion; anterior: Retencion } {
  const ultima = sumarMeses(ultimoMesCerrado(hoy), -k);
  const grupo = (hasta: string): Retencion => {
    const meses = new Set(mesesHasta(hasta, 3));
    let n = 0, retenidos = 0;
    for (const h of hs.values()) {
      const mes = mesDeDia(h.primero);
      if (!meses.has(mes)) continue;
      n++;
      if (h.meses.has(sumarMeses(mes, k))) retenidos++;
    }
    return { desde: sumarMeses(hasta, -2), hasta, n, retenidos, pct: ratio(retenidos, n) };
  };
  return { reciente: grupo(ultima), anterior: grupo(sumarMeses(ultima, -3)) };
}

// ---------- Altas y bajas por mes ----------

export type MesPacientes = {
  mes: string;
  nuevos: number;
  bajas: number; // último turno en el mes, sin turnos futuros y ya pasaron DIAS_BAJA días
  posibles: number; // igual, pero todavía no pasaron DIAS_BAJA días: pueden volver
  atendidos: number;
  neto: number; // nuevos − bajas confirmadas
  provisorio: boolean; // el mes todavía puede sumar bajas
};

function altasYBajas(hs: Map<string, Historia>, hoy: number, cantidad: number): MesPacientes[] {
  const meses = mesesHasta(ultimoMesCerrado(hoy), cantidad);
  const porMes = new Map(meses.map(mes => [mes, {
    mes, nuevos: 0, bajas: 0, posibles: 0, atendidos: 0, neto: 0, provisorio: finMes(mes) > hoy - DIAS_BAJA,
  }]));
  for (const h of hs.values()) {
    const alta = porMes.get(mesDeDia(h.primero));
    if (alta) alta.nuevos++;
    for (const mes of h.meses) { const m = porMes.get(mes); if (m) m.atendidos++; }
    if (h.conFuturo) continue;
    const baja = porMes.get(mesDeDia(h.ultimo));
    if (!baja) continue;
    if (hoy - h.ultimo >= DIAS_BAJA) baja.bajas++; else baja.posibles++;
  }
  const lista = [...porMes.values()].map(m => ({ ...m, neto: m.nuevos - m.bajas }));
  const primera = lista.findIndex(m => m.atendidos > 0);
  return primera < 0 ? [] : lista.slice(primera);
}

// ---------- Respaldo de la facturación y evolución clínica ----------

const clave = (paciente: string, terapeuta: string | null, periodo: string | number) => `${paciente}|${terapeuta ?? ''}|${periodo}`;

interface Respaldo { facturadas: number; sinTurno: number }

// Sesiones facturadas a cada paciente (por mes de emisión y terapeuta de la factura) que no tienen
// un turno finalizado del mismo paciente, mes y terapeuta.
function respaldoAgenda(
  facturas: FacturaAnalizada[], facturaPacientes: FacturaPacienteRaw[], turnos: TurnoAnalizado[], meses: Set<string>,
): Map<string | null, Respaldo> {
  const facturaPorId = new Map(facturas.map(f => [f.id, f]));
  const facturadas = new Map<string, { terapeuta: string | null; sesiones: number }>();
  let sinPaciente = 0;
  for (const fp of facturaPacientes) {
    const f = facturaPorId.get(fp.factura_id);
    if (!f || !meses.has(mesDeDia(f.emision))) continue;
    const s = fp.sesiones ?? 0;
    if (!fp.paciente_id) { sinPaciente += s; continue; }
    const k = clave(fp.paciente_id, f.terapeutaId, mesDeDia(f.emision));
    const x = facturadas.get(k);
    if (x) x.sesiones += s; else facturadas.set(k, { terapeuta: f.terapeutaId, sesiones: s });
  }
  const hechos = new Map<string, number>();
  for (const t of turnos) {
    if (t.estado !== 'finalizado' || !t.pacienteId) continue;
    const k = clave(t.pacienteId, t.terapeutaId, mesDeDia(t.dia));
    hechos.set(k, (hechos.get(k) ?? 0) + 1);
  }
  const porTerapeuta = new Map<string | null, Respaldo>();
  const sumar = (ter: string | null, s: number, sin: number) => {
    const r = porTerapeuta.get(ter) ?? { facturadas: 0, sinTurno: 0 };
    r.facturadas += s;
    r.sinTurno += sin;
    porTerapeuta.set(ter, r);
  };
  for (const [k, x] of facturadas) sumar(x.terapeuta, x.sesiones, Math.max(0, x.sesiones - (hechos.get(k) ?? 0)));
  if (sinPaciente) sumar(null, sinPaciente, sinPaciente);
  return porTerapeuta;
}

interface Evolucion { sesiones: number; conEvolucion: number }

// Turnos finalizados entre `desde` y `hasta` con un registro del historial del mismo paciente y terapeuta
// (el mismo día, con TOLERANCIA_EVOLUCION_DIAS de margen).
function evolucionClinica(turnos: TurnoAnalizado[], historial: HistorialRaw[], desde: number, hasta: number): Map<string | null, Evolucion> {
  const registros = new Set<string>();
  for (const h of historial) if (h.paciente_id && h.fecha) registros.add(clave(h.paciente_id, h.terapeuta_id, diaDe(h.fecha)));
  const porTerapeuta = new Map<string | null, Evolucion>();
  for (const t of turnos) {
    if (t.estado !== 'finalizado' || !t.pacienteId || t.dia < desde || t.dia > hasta) continue;
    const r = porTerapeuta.get(t.terapeutaId) ?? { sesiones: 0, conEvolucion: 0 };
    r.sesiones++;
    for (let d = -TOLERANCIA_EVOLUCION_DIAS; d <= TOLERANCIA_EVOLUCION_DIAS; d++) {
      if (registros.has(clave(t.pacienteId, t.terapeutaId, t.dia + d))) { r.conEvolucion++; break; }
    }
    porTerapeuta.set(t.terapeutaId, r);
  }
  return porTerapeuta;
}

const sumarTodo = <T extends object>(m: Map<string | null, T>, campo: keyof T): number =>
  [...m.values()].reduce((s, x) => s + (x[campo] as number), 0);

// ---------- Riesgo por terapeuta ----------

export interface FilaRiesgo {
  id: string;
  nombre: string;
  facturado: number;
  pctFacturacion: number | null;
  sesionesFacturadas: number;
  conTurno: number;
  sinTurno: number;
  pctSinTurno: number | null;
  sesionesAtendidas: number;
  pctEvolucion: number | null;
  activos: number;
}

// ---------- Todo junto ----------

export interface AnalisisPacientes {
  continuidad: Continuidad;
  retencion: { reciente: Retencion; anterior: Retencion };
  meses: MesPacientes[];
  ultimoMes: MesPacientes | null;
  cohortes: Cohorte[];
  offsetsCohorte: number;
  respaldo: Respaldo & { pct: number | null; desde: string; hasta: string };
  evolucion: Evolucion & { pct: number | null; anio: number };
  riesgo: FilaRiesgo[];
  hhi: number | null; // concentración de la facturación entre terapeutas (0 a 1)
}

export function analizarPacientes(
  turnos: TurnoAnalizado[],
  facturas: FacturaAnalizada[],
  facturaPacientes: FacturaPacienteRaw[],
  historial: HistorialRaw[],
  personas: PersonaRaw[],
  hoy: number,
): AnalisisPacientes {
  const hs = historias(turnos, hoy);
  const cerrado = ultimoMesCerrado(hoy);
  const mesesRiesgo = mesesHasta(cerrado, MESES_RIESGO);
  const desde = inicioMes(mesesRiesgo[0]);
  const hasta = finMes(cerrado);

  const respaldo = respaldoAgenda(facturas, facturaPacientes, turnos, new Set(mesesRiesgo));
  const anio = new Date(hoy * 86_400_000).getUTCFullYear();
  const evolAnio = evolucionClinica(turnos, historial, diaDe(`${anio}-01-01`), hoy);
  const evolRiesgo = evolucionClinica(turnos, historial, desde, hasta);

  const facturadoPorTer = new Map<string | null, number>();
  for (const f of facturas) {
    if (f.emision < desde || f.emision > hasta) continue;
    facturadoPorTer.set(f.terapeutaId, (facturadoPorTer.get(f.terapeutaId) ?? 0) + f.monto);
  }
  const totalFacturado = [...facturadoPorTer.values()].reduce((a, b) => a + b, 0);

  const activosPorTer = new Map<string | null, Set<string>>();
  for (const t of turnos) {
    if (t.estado !== 'finalizado' || !t.pacienteId || t.dia > hoy || t.dia <= hoy - DIAS_ACTIVO) continue;
    const s = activosPorTer.get(t.terapeutaId) ?? new Set<string>();
    s.add(t.pacienteId);
    activosPorTer.set(t.terapeutaId, s);
  }

  const nombrePorId = new Map(personas.map(p => [p.id, `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() || 'Sin nombre']));
  const ids = new Set<string | null>([...facturadoPorTer.keys(), ...respaldo.keys(), ...evolRiesgo.keys(), ...activosPorTer.keys()]);
  const riesgo: FilaRiesgo[] = [...ids].map(id => {
    const r = respaldo.get(id) ?? { facturadas: 0, sinTurno: 0 };
    const e = evolRiesgo.get(id) ?? { sesiones: 0, conEvolucion: 0 };
    const facturado = facturadoPorTer.get(id) ?? 0;
    return {
      id: id ?? 'sin_terapeuta',
      nombre: id ? nombrePorId.get(id) ?? 'Sin nombre' : 'Sin terapeuta',
      facturado,
      pctFacturacion: ratio(facturado, totalFacturado),
      sesionesFacturadas: r.facturadas,
      conTurno: r.facturadas - r.sinTurno,
      sinTurno: r.sinTurno,
      pctSinTurno: ratio(r.sinTurno, r.facturadas),
      sesionesAtendidas: e.sesiones,
      pctEvolucion: ratio(e.conEvolucion, e.sesiones),
      activos: activosPorTer.get(id)?.size ?? 0,
    };
  }).sort((a, b) => b.facturado - a.facturado || b.sesionesAtendidas - a.sesionesAtendidas);

  const meses = altasYBajas(hs, hoy, 12);
  const facturadas = sumarTodo(respaldo, 'facturadas');
  const sinTurno = sumarTodo(respaldo, 'sinTurno');
  const sesiones = sumarTodo(evolAnio, 'sesiones');
  const conEvolucion = sumarTodo(evolAnio, 'conEvolucion');

  return {
    continuidad: continuidad(hs, hoy),
    retencion: retencionComparada(hs, hoy),
    meses,
    ultimoMes: meses.find(m => m.mes === cerrado) ?? null,
    cohortes: cohortes(hs, hoy, 8, 6),
    offsetsCohorte: 6,
    respaldo: { facturadas, sinTurno, pct: facturadas ? 1 - sinTurno / facturadas : null, desde: mesesRiesgo[0], hasta: cerrado },
    evolucion: { sesiones, conEvolucion, pct: ratio(conEvolucion, sesiones), anio },
    riesgo,
    hhi: totalFacturado ? riesgo.reduce((s, f) => s + (f.pctFacturacion ?? 0) ** 2, 0) : null,
  };
}
