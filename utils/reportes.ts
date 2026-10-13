// Cálculos de los tableros: cobranzas, atrasos, sesiones y turnos.
// Todo es puro: recibe las filas que ya trajo Supabase (con el RLS de quien consulta
// aplicado, así que un terapeuta solo ve lo suyo) y devuelve agregados.

export interface FacturaRaw {
  id: string;
  terapeuta_id: string | null;
  obra_social_id: string | null;
  monto: number | string | null;
  estado: string | null;
  fecha_generada: string | null;
  fecha_pago: string | null;
  sesiones: number | null;
}

export interface ObraSocialRaw {
  id: string;
  nombre: string;
  dias_vencimiento: number | null;
}

export interface TurnoRaw {
  id: string;
  terapeuta_id: string | null;
  fecha_hora_inicio: string | null;
  fecha_hora_fin: string | null;
  estado: string | null;
  inicio_real?: string | null;
  fin_real?: string | null;
}

export interface PersonaRaw {
  id: string;
  nombre: string | null;
  apellido: string | null;
  area_id?: string | null;
}

export interface AreaRaw {
  id: string;
  nombre: string;
}

// Clave del grupo de terapeutas sin área asignada.
export const SIN_AREA = 'sin_area';

// ---------- Fechas de calendario ----------
// Se usa solo AAAA-MM-DD (y la hora tal como está guardada, que es hora local) y se
// cuentan días enteros en UTC, así no influyen husos horarios ni horario de verano.

const DIA_MS = 86_400_000;
export const PLAZO_POR_DEFECTO = 30;

export const diaDe = (s: string): number => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DIA_MS;
};

export const hoyDia = (): number => {
  const n = new Date();
  return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / DIA_MS;
};

export const diaAIso = (dia: number): string => new Date(dia * DIA_MS).toISOString().slice(0, 10);

const mesDe = (dia: number): string => diaAIso(dia).slice(0, 7);

const inicioDeMes = (dia: number, mesesAtras = 0): number => {
  const f = new Date(dia * DIA_MS);
  return Date.UTC(f.getUTCFullYear(), f.getUTCMonth() - mesesAtras, 1) / DIA_MS;
};

// Meses 'AAAA-MM' consecutivos entre dos días (inclusive).
const mesesEntre = (desde: number, hasta: number): string[] => {
  const meses: string[] = [];
  const f = new Date(inicioDeMes(desde) * DIA_MS);
  const fin = mesDe(hasta);
  for (let i = 0; i < 600; i++) {
    const mes = f.toISOString().slice(0, 7);
    meses.push(mes);
    if (mes >= fin) break;
    f.setUTCMonth(f.getUTCMonth() + 1);
  }
  return meses;
};

// ---------- Filtros ----------

export type PresetPeriodo = 'mes' | '3m' | '6m' | '12m' | 'anio' | 'anio_anterior' | 'todo' | 'personalizado';
export type FiltroEstado = 'todas' | 'pagas' | 'impagas' | 'vencidas';

export const PRESETS_PERIODO: { id: PresetPeriodo; etiqueta: string }[] = [
  { id: 'mes', etiqueta: 'Este mes' },
  { id: '3m', etiqueta: 'Últimos 3 meses' },
  { id: '6m', etiqueta: 'Últimos 6 meses' },
  { id: '12m', etiqueta: 'Últimos 12 meses' },
  { id: 'anio', etiqueta: 'Este año' },
  { id: 'anio_anterior', etiqueta: 'Año anterior' },
  { id: 'todo', etiqueta: 'Todo el historial' },
];

export interface Filtros {
  preset: PresetPeriodo;
  desde: string; // solo para 'personalizado' (AAAA-MM-DD)
  hasta: string;
  obrasSociales: string[];
  terapeutas: string[];
  areas: string[]; // ids de área (o SIN_AREA), según el área del terapeuta
  estado: FiltroEstado;
}

export const FILTROS_INICIALES: Filtros = {
  preset: '12m',
  desde: '',
  hasta: '',
  obrasSociales: [],
  terapeutas: [],
  areas: [],
  estado: 'todas',
};

export interface Rango { desde: number | null; hasta: number | null }

// Los presets de varios meses arrancan el día 1 para que los gráficos mensuales muestren meses completos.
export function rangoDeFiltros(f: Filtros, hoy: number): Rango {
  const anio = new Date(hoy * DIA_MS).getUTCFullYear();
  switch (f.preset) {
    case 'mes': return { desde: inicioDeMes(hoy), hasta: hoy };
    case '3m': return { desde: inicioDeMes(hoy, 2), hasta: hoy };
    case '6m': return { desde: inicioDeMes(hoy, 5), hasta: hoy };
    case '12m': return { desde: inicioDeMes(hoy, 11), hasta: hoy };
    case 'anio': return { desde: Date.UTC(anio, 0, 1) / DIA_MS, hasta: hoy };
    case 'anio_anterior': return { desde: Date.UTC(anio - 1, 0, 1) / DIA_MS, hasta: Date.UTC(anio - 1, 11, 31) / DIA_MS };
    case 'todo': return { desde: null, hasta: null };
    case 'personalizado': return {
      desde: f.desde ? diaDe(f.desde) : null,
      hasta: f.hasta ? diaDe(f.hasta) : null,
    };
  }
}

const enRango = (dia: number, r: Rango) => (r.desde === null || dia >= r.desde) && (r.hasta === null || dia <= r.hasta);

// ---------- Facturas ----------

export type EstadoCobranza = 'en_plazo' | 'con_atraso' | 'pendiente' | 'vencida';

export const ESTADOS_COBRANZA: { id: EstadoCobranza; etiqueta: string }[] = [
  { id: 'en_plazo', etiqueta: 'Cobrada en plazo' },
  { id: 'con_atraso', etiqueta: 'Cobrada con atraso' },
  { id: 'pendiente', etiqueta: 'Pendiente, no vencida' },
  { id: 'vencida', etiqueta: 'Vencida sin cobrar' },
];

export interface FacturaAnalizada {
  id: string;
  terapeutaId: string | null;
  obraSocialId: string | null;
  obraSocial: string;
  monto: number;
  sesiones: number;
  emision: number;
  vencimiento: number;
  pago: number | null;
  plazo: number;
  pagada: boolean;
  diasCobro: number | null; // emisión → pago; null si está impaga o paga sin fecha
  diasAtraso: number; // días pasados del vencimiento (al cobrar, o a hoy si sigue impaga)
  estado: EstadoCobranza;
}

export interface CalidadDatos {
  sinFechaEmision: number;
  pagasSinFecha: number;
  pagoAntesDeEmision: number;
}

export function analizarFacturas(
  filas: FacturaRaw[],
  obras: ObraSocialRaw[],
  hoy: number,
): { facturas: FacturaAnalizada[]; calidad: CalidadDatos } {
  const obraPorId = new Map(obras.map(o => [o.id, o]));
  const calidad: CalidadDatos = { sinFechaEmision: 0, pagasSinFecha: 0, pagoAntesDeEmision: 0 };
  const facturas: FacturaAnalizada[] = [];

  for (const f of filas) {
    if (!f.fecha_generada) { calidad.sinFechaEmision++; continue; }
    const obra = f.obra_social_id ? obraPorId.get(f.obra_social_id) : undefined;
    const plazo = obra?.dias_vencimiento ?? PLAZO_POR_DEFECTO;
    const emision = diaDe(f.fecha_generada);
    const vencimiento = emision + plazo;
    const pagada = f.estado === 'paga';
    const pago = pagada && f.fecha_pago ? diaDe(f.fecha_pago) : null;

    let diasCobro: number | null = null;
    let diasAtraso = 0;
    let estado: EstadoCobranza;
    if (pagada) {
      if (pago === null) {
        // Paga pero sin fecha de pago: cuenta como cobrada, pero no entra en los promedios de días.
        calidad.pagasSinFecha++;
        estado = 'en_plazo';
      } else {
        if (pago < emision) calidad.pagoAntesDeEmision++;
        diasCobro = Math.max(0, pago - emision);
        diasAtraso = Math.max(0, pago - vencimiento);
        estado = diasAtraso > 0 ? 'con_atraso' : 'en_plazo';
      }
    } else {
      diasAtraso = Math.max(0, hoy - vencimiento);
      estado = hoy > vencimiento ? 'vencida' : 'pendiente';
    }

    facturas.push({
      id: f.id,
      terapeutaId: f.terapeuta_id,
      obraSocialId: f.obra_social_id,
      obraSocial: obra?.nombre ?? 'Sin obra social',
      monto: Number(f.monto) || 0,
      sesiones: f.sesiones ?? 0,
      emision,
      vencimiento,
      pago,
      plazo,
      pagada,
      diasCobro,
      diasAtraso,
      estado,
    });
  }
  return { facturas, calidad };
}

// Área de cada terapeuta (SIN_AREA si no tiene). Se usa para el filtro y el análisis por área.
export type AreaPorTerapeuta = Map<string, string>;
export const areaDe = (mapa: AreaPorTerapeuta | undefined, terapeutaId: string | null) =>
  (terapeutaId && mapa?.get(terapeutaId)) || SIN_AREA;

export function filtrarFacturas(fs: FacturaAnalizada[], f: Filtros, rango: Rango, areas?: AreaPorTerapeuta): FacturaAnalizada[] {
  const obras = new Set(f.obrasSociales);
  const terapeutas = new Set(f.terapeutas);
  const areasSel = new Set(f.areas);
  return fs.filter(x =>
    enRango(x.emision, rango)
    && (areasSel.size === 0 || areasSel.has(areaDe(areas, x.terapeutaId)))
    && (obras.size === 0 || (x.obraSocialId !== null && obras.has(x.obraSocialId)))
    && (terapeutas.size === 0 || (x.terapeutaId !== null && terapeutas.has(x.terapeutaId)))
    && (f.estado === 'todas'
      || (f.estado === 'pagas' && x.pagada)
      || (f.estado === 'impagas' && !x.pagada)
      || (f.estado === 'vencidas' && x.estado === 'vencida')));
}

const promedio = (xs: number[]): number | null => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

export interface ResumenCobranza {
  cantidad: number;
  facturado: number;
  cobrado: number;
  pendiente: number;
  vencido: number;
  cantVencidas: number;
  mayorAtraso: number; // de las impagas
  diasPromCobro: number | null;
  pctEnPlazo: number | null; // de las cobradas con fecha
  sesiones: number;
}

export function resumirCobranza(fs: FacturaAnalizada[]): ResumenCobranza {
  const r: ResumenCobranza = {
    cantidad: fs.length, facturado: 0, cobrado: 0, pendiente: 0, vencido: 0,
    cantVencidas: 0, mayorAtraso: 0, diasPromCobro: null, pctEnPlazo: null, sesiones: 0,
  };
  const dias: number[] = [];
  let enPlazo = 0;
  for (const x of fs) {
    r.facturado += x.monto;
    r.sesiones += x.sesiones;
    if (x.pagada) {
      r.cobrado += x.monto;
      if (x.diasCobro !== null) {
        dias.push(x.diasCobro);
        if (x.estado === 'en_plazo') enPlazo++;
      }
    } else {
      r.pendiente += x.monto;
      r.mayorAtraso = Math.max(r.mayorAtraso, x.diasAtraso);
      if (x.estado === 'vencida') { r.vencido += x.monto; r.cantVencidas++; }
    }
  }
  r.diasPromCobro = promedio(dias);
  r.pctEnPlazo = dias.length ? enPlazo / dias.length : null;
  return r;
}

export type MesCobranza = { mes: string; cantidad: number; sesiones: number } & Record<EstadoCobranza, number>;

// Un registro por mes del rango (también los meses sin facturas, para que los huecos se vean).
export function cobranzaPorMes(fs: FacturaAnalizada[], rango: Rango): MesCobranza[] {
  if (!fs.length && (rango.desde === null || rango.hasta === null)) return [];
  const emisiones = fs.map(x => x.emision);
  const desde = rango.desde ?? Math.min(...emisiones);
  const hasta = rango.hasta ?? Math.max(...emisiones);
  const porMes = new Map<string, MesCobranza>(
    mesesEntre(desde, hasta).map(mes => [mes, { mes, cantidad: 0, sesiones: 0, en_plazo: 0, con_atraso: 0, pendiente: 0, vencida: 0 }]),
  );
  for (const x of fs) {
    const m = porMes.get(mesDe(x.emision));
    if (!m) continue;
    m[x.estado] += x.monto;
    m.cantidad++;
    m.sesiones += x.sesiones;
  }
  return [...porMes.values()];
}

export interface FilaObraSocial extends ResumenCobranza {
  id: string;
  nombre: string;
  plazo: number;
}

export function resumenPorObraSocial(fs: FacturaAnalizada[]): FilaObraSocial[] {
  const grupos = new Map<string, FacturaAnalizada[]>();
  for (const x of fs) {
    const clave = x.obraSocialId ?? 'sin_os';
    const g = grupos.get(clave);
    if (g) g.push(x); else grupos.set(clave, [x]);
  }
  return [...grupos.entries()]
    .map(([id, g]) => ({ id, nombre: g[0].obraSocial, plazo: g[0].plazo, ...resumirCobranza(g) }))
    .sort((a, b) => b.facturado - a.facturado);
}

export const TRAMOS_ANTIGUEDAD = [
  { id: 'no_vencida', etiqueta: 'No vencida' },
  { id: '1_30', etiqueta: '1 a 30 d' },
  { id: '31_90', etiqueta: '31 a 90 d' },
  { id: '91_180', etiqueta: '91 a 180 d' },
  { id: 'mas_180', etiqueta: 'Más de 180 d' },
] as const;

export interface TramoAntiguedad { id: string; etiqueta: string; monto: number; cantidad: number }

// Deuda impaga agrupada por cuántos días pasaron desde el vencimiento.
export function antiguedadDeuda(fs: FacturaAnalizada[]): TramoAntiguedad[] {
  const tramos = TRAMOS_ANTIGUEDAD.map(t => ({ id: t.id as string, etiqueta: t.etiqueta as string, monto: 0, cantidad: 0 }));
  for (const x of fs) {
    if (x.pagada) continue;
    const d = x.diasAtraso;
    const i = x.estado !== 'vencida' ? 0 : d <= 30 ? 1 : d <= 90 ? 2 : d <= 180 ? 3 : 4;
    tramos[i].monto += x.monto;
    tramos[i].cantidad++;
  }
  return tramos;
}

// ---------- Turnos ----------

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export interface TurnoAnalizado {
  id: string;
  terapeutaId: string | null;
  dia: number;
  diaSemana: number; // 0 = lunes
  hora: number; // hora local, tal como se guardó
  duracionMin: number | null;
  estado: string;
  atrasoMin: number | null; // inicio real − horario del turno (negativo = empezó antes); null si no se registró
  duracionRealMin: number | null; // fin real − inicio real
  extraMin: number | null; // duración real − duración pactada (negativo = duró menos)
}

const minutosDe = (s: string) => Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16));

// Minutos entre dos horas locales 'AAAA-MM-DDTHH:MM...' (b − a).
export const minutosEntre = (a: string, b: string): number => (diaDe(b) - diaDe(a)) * 1440 + minutosDe(b) - minutosDe(a);

// Hora local 'AAAA-MM-DDTHH:MM:SS' corrida `m` minutos.
export const sumarMinutos = (s: string, m: number): string => {
  const total = diaDe(s) * 1440 + minutosDe(s) + m;
  const dia = Math.floor(total / 1440);
  const min = total - dia * 1440;
  return `${diaAIso(dia)}T${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00`;
};

// Hasta esta cantidad de minutos de atraso, el turno cuenta como puntual.
export const TOLERANCIA_PUNTUAL_MIN = 5;
// Diferencias de más de 12 horas no son un atraso real sino un dato mal cargado: no entran en los promedios.
export const ATRASO_MAX_VALIDO_MIN = 12 * 60;

export function analizarTurnos(filas: TurnoRaw[]): TurnoAnalizado[] {
  return filas
    .filter((t): t is TurnoRaw & { fecha_hora_inicio: string } => !!t.fecha_hora_inicio)
    .map(t => {
      const dia = diaDe(t.fecha_hora_inicio);
      const inicio = minutosDe(t.fecha_hora_inicio);
      let duracionMin: number | null = null;
      if (t.fecha_hora_fin) {
        const d = (diaDe(t.fecha_hora_fin) - dia) * 1440 + minutosDe(t.fecha_hora_fin) - inicio;
        if (d > 0 && d < 24 * 60) duracionMin = d;
      }
      return {
        id: t.id,
        terapeutaId: t.terapeuta_id,
        dia,
        diaSemana: (new Date(dia * DIA_MS).getUTCDay() + 6) % 7,
        hora: Math.floor(inicio / 60),
        duracionMin,
        estado: t.estado ?? 'sin estado',
        atrasoMin: (() => {
          if (!t.inicio_real) return null;
          const m = minutosEntre(t.fecha_hora_inicio, t.inicio_real);
          return Math.abs(m) > ATRASO_MAX_VALIDO_MIN ? null : m;
        })(),
        ...(() => {
          if (!t.inicio_real || !t.fin_real) return { duracionRealMin: null, extraMin: null };
          const real = minutosEntre(t.inicio_real, t.fin_real);
          if (real <= 0 || real > ATRASO_MAX_VALIDO_MIN) return { duracionRealMin: null, extraMin: null };
          return { duracionRealMin: real, extraMin: duracionMin === null ? null : real - duracionMin };
        })(),
      };
    });
}

export function filtrarTurnos(ts: TurnoAnalizado[], f: Filtros, rango: Rango, areas?: AreaPorTerapeuta): TurnoAnalizado[] {
  const terapeutas = new Set(f.terapeutas);
  const areasSel = new Set(f.areas);
  return ts.filter(t =>
    enRango(t.dia, rango)
    && (terapeutas.size === 0 || (t.terapeutaId !== null && terapeutas.has(t.terapeutaId)))
    && (areasSel.size === 0 || areasSel.has(areaDe(areas, t.terapeutaId))));
}

export const ESTADOS_TURNO = ['pendiente', 'confirmado', 'finalizado', 'cancelado'];

// Un turno "sin cerrar" es uno cuya fecha ya pasó pero sigue pendiente o confirmado:
// nadie registró si se hizo o se canceló. Su atraso son los días desde la fecha del turno.
// (La tabla no guarda horario de llegada ni de creación, así que no se puede medir puntualidad.)
const ESTADOS_ABIERTOS = new Set(['pendiente', 'confirmado']);

export interface ResumenTurnos {
  total: number;
  porEstado: { estado: string; cantidad: number }[];
  pctCancelados: number | null;
  duracionProm: number | null;
  horasAgendadas: number;
  pasados: number;
  finalizados: number;
  pctFinalizados: number | null; // de los turnos con fecha pasada
  sinCerrar: number;
  atrasoProm: number | null; // días promedio de los turnos sin cerrar
  atrasoMax: number;
  conInicio: number; // turnos con hora real de inicio registrada
  atrasoMinProm: number | null; // minutos promedio de atraso al empezar (los que empezaron antes cuentan como 0)
  atrasoMinMax: number;
  pctPuntuales: number | null; // empezaron con hasta TOLERANCIA_PUNTUAL_MIN minutos de atraso
  conDuracionReal: number; // turnos con inicio y fin reales
  duracionRealProm: number | null;
  duracionPactadaProm: number | null; // de esos mismos turnos
  extraMinProm: number | null; // cuánto más (o menos) duran que lo pactado, en promedio
  pctExcedidos: number | null; // duraron más de TOLERANCIA_PUNTUAL_MIN minutos de lo pactado
}

export function resumirTurnos(ts: TurnoAnalizado[], hoy: number): ResumenTurnos {
  const conteo = new Map<string, number>(ESTADOS_TURNO.map(e => [e, 0]));
  for (const t of ts) conteo.set(t.estado, (conteo.get(t.estado) ?? 0) + 1);
  const duraciones = ts.map(t => t.duracionMin).filter((d): d is number => d !== null);
  const pasados = ts.filter(t => t.dia < hoy);
  const atrasos = pasados.filter(t => ESTADOS_ABIERTOS.has(t.estado)).map(t => hoy - t.dia);
  const finalizados = pasados.filter(t => t.estado === 'finalizado').length;
  const minutos = ts.map(t => t.atrasoMin).filter((m): m is number => m !== null).map(m => Math.max(0, m));
  return {
    total: ts.length,
    porEstado: [...conteo.entries()].map(([estado, cantidad]) => ({ estado, cantidad })),
    pctCancelados: ts.length ? (conteo.get('cancelado') ?? 0) / ts.length : null,
    duracionProm: promedio(duraciones),
    horasAgendadas: duraciones.reduce((a, b) => a + b, 0) / 60,
    pasados: pasados.length,
    finalizados,
    pctFinalizados: pasados.length ? finalizados / pasados.length : null,
    sinCerrar: atrasos.length,
    atrasoProm: promedio(atrasos),
    atrasoMax: atrasos.length ? Math.max(...atrasos) : 0,
    conInicio: minutos.length,
    atrasoMinProm: promedio(minutos),
    atrasoMinMax: minutos.length ? Math.max(...minutos) : 0,
    pctPuntuales: minutos.length ? minutos.filter(m => m <= TOLERANCIA_PUNTUAL_MIN).length / minutos.length : null,
    ...(() => {
      const conReal = ts.filter(x => x.extraMin !== null && x.duracionRealMin !== null && x.duracionMin !== null);
      const extras = conReal.map(x => x.extraMin as number);
      return {
        conDuracionReal: conReal.length,
        duracionRealProm: promedio(conReal.map(x => x.duracionRealMin as number)),
        duracionPactadaProm: promedio(conReal.map(x => x.duracionMin as number)),
        extraMinProm: promedio(extras),
        pctExcedidos: extras.length ? extras.filter(e => e > TOLERANCIA_PUNTUAL_MIN).length / extras.length : null,
      };
    })(),
  };
}

// Turnos agendados (no cancelados) desde hoy hasta dentro de `dias` días.
export function proximosTurnos(ts: TurnoAnalizado[], hoy: number, dias = 30): number {
  return ts.filter(t => t.dia >= hoy && t.dia < hoy + dias && t.estado !== 'cancelado').length;
}

export interface FilaTurnosTerapeuta extends ResumenTurnos {
  id: string;
  nombre: string;
  proximos: number;
}

// `ts` son los turnos del período; `todos` sirve para contar los próximos (que caen fuera del período).
export function turnosPorTerapeuta(
  ts: TurnoAnalizado[],
  todos: TurnoAnalizado[],
  personas: PersonaRaw[],
  hoy: number,
): FilaTurnosTerapeuta[] {
  const nombrePorId = new Map(personas.map(p => [p.id, `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() || 'Sin nombre']));
  // También entran quienes solo tienen turnos próximos (fuera del período), para que la columna cuadre con el total.
  const ids = new Set(
    [...ts, ...todos.filter(t => t.dia >= hoy && t.dia < hoy + 30)].map(t => t.terapeutaId).filter((x): x is string => !!x),
  );
  return [...ids]
    .map(id => ({
      id,
      nombre: nombrePorId.get(id) ?? 'Sin nombre',
      proximos: proximosTurnos(todos.filter(t => t.terapeutaId === id), hoy),
      ...resumirTurnos(ts.filter(t => t.terapeutaId === id), hoy),
    }))
    .sort((a, b) => b.total - a.total);
}

// Cantidad de turnos por día de la semana × hora. Las horas van del primer al último
// horario con turnos (como mínimo de 8 a 20).
export function grillaTurnos(ts: TurnoAnalizado[]): { horas: number[]; celdas: number[][] } {
  const horasConDatos = ts.map(t => t.hora);
  const desde = Math.min(8, ...horasConDatos);
  const hasta = Math.max(20, ...horasConDatos);
  const horas = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
  const celdas = DIAS_SEMANA.map(() => horas.map(() => 0));
  for (const t of ts) celdas[t.diaSemana][t.hora - desde]++;
  return { horas, celdas };
}

// ---------- Por terapeuta ----------

export interface FilaTerapeuta extends ResumenCobranza {
  id: string;
  nombre: string;
  turnos: number;
}

export function resumenPorTerapeuta(
  fs: FacturaAnalizada[],
  ts: TurnoAnalizado[],
  personas: PersonaRaw[],
): FilaTerapeuta[] {
  const nombrePorId = new Map(personas.map(p => [p.id, `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() || 'Sin nombre']));
  const ids = new Set([...fs.map(x => x.terapeutaId), ...ts.map(t => t.terapeutaId)].filter((x): x is string => !!x));
  return [...ids]
    .map(id => ({
      id,
      nombre: nombrePorId.get(id) ?? 'Sin nombre',
      turnos: ts.filter(t => t.terapeutaId === id).length,
      ...resumirCobranza(fs.filter(x => x.terapeutaId === id)),
    }))
    .sort((a, b) => b.facturado - a.facturado);
}

// ---------- Comparaciones (mes anterior, año anterior) ----------

// Mismo día, `n` años después; el 29 de febrero cae en el 28 si el otro año no es bisiesto.
const sumarAnios = (dia: number, n: number): number => {
  const f = new Date(dia * DIA_MS);
  const y = f.getUTCFullYear() + n, m = f.getUTCMonth();
  const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(f.getUTCDate(), ultimo)) / DIA_MS;
};

export const unAnioAntes = (dia: number) => sumarAnios(dia, -1);

// Las facturas tal como estaban en `corte`: lo cobrado después cuenta como pendiente.
// Sirve para comparar cohortes con el mismo tiempo para cobrarse (si no, las recientes parecen peores).
export function alCorte(fs: FacturaAnalizada[], corte: number): FacturaAnalizada[] {
  return fs.map(f => {
    if (!f.pagada || f.pago === null || f.pago <= corte) return f;
    return {
      ...f, pagada: false, pago: null, diasCobro: null,
      diasAtraso: Math.max(0, corte - f.vencimiento),
      estado: corte > f.vencimiento ? 'vencida' : 'pendiente',
    };
  });
}

const finDeMes = (dia: number): number => {
  const f = new Date(dia * DIA_MS);
  return Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 1, 0) / DIA_MS;
};

// El mismo rango, un año antes. Sin rango (todo el historial) no hay contra qué comparar.
export function rangoAnioAnterior(r: Rango): Rango | null {
  if (r.desde === null || r.hasta === null) return null;
  return { desde: sumarAnios(r.desde, -1), hasta: sumarAnios(r.hasta, -1) };
}

// Ventanas de comparación cortadas al mismo día, para que un mes en curso no se compare con uno completo.
export function ventanasComparacion(hoy: number) {
  const anio = new Date(hoy * DIA_MS).getUTCFullYear();
  const inicio = inicioDeMes(hoy);
  const transcurridos = hoy - inicio; // 0 el día 1
  const inicioAnterior = inicioDeMes(hoy, 1);
  const inicioAnioAnt = sumarAnios(inicio, -1);
  return {
    diaDelMes: transcurridos + 1,
    diasDelMes: finDeMes(hoy) - inicio + 1,
    mes: { desde: inicio, hasta: hoy },
    mesAnterior: { desde: inicioAnterior, hasta: Math.min(inicioAnterior + transcurridos, inicio - 1) },
    mesAnioAnterior: { desde: inicioAnioAnt, hasta: Math.min(inicioAnioAnt + transcurridos, finDeMes(inicioAnioAnt)) },
    anio: { desde: Date.UTC(anio, 0, 1) / DIA_MS, hasta: hoy },
    anioAnterior: { desde: Date.UTC(anio - 1, 0, 1) / DIA_MS, hasta: sumarAnios(hoy, -1) },
  };
}

export interface Metricas {
  facturado: number;
  facturas: number;
  sesiones: number;
  porSesion: number | null;
  cobradoEnPeriodo: number; // pagos recibidos dentro de la ventana (por fecha de pago)
  diasPromCobro: number | null;
  pctEnPlazo: number | null;
  turnos: number;
  pctFinalizados: number | null;
  pctCancelados: number | null;
  atrasoMinProm: number | null;
  pctPuntuales: number | null;
  extraMinProm: number | null;
  horas: number;
}

// `fs` y `ts` ya filtrados por obra social / terapeuta / estado, pero NO por período.
export function metricas(fs: FacturaAnalizada[], ts: TurnoAnalizado[], v: Rango, hoy: number): Metricas {
  // Cohorte emitida en la ventana, vista al final de la ventana (mismo tiempo para cobrarse en todas).
  const facturasV = alCorte(fs.filter(f => enRango(f.emision, v)), v.hasta ?? Infinity);
  const c = resumirCobranza(facturasV);
  const t = resumirTurnos(ts.filter(x => enRango(x.dia, v)), hoy);
  return {
    facturado: c.facturado,
    facturas: c.cantidad,
    sesiones: c.sesiones,
    porSesion: c.sesiones ? c.facturado / c.sesiones : null,
    cobradoEnPeriodo: fs.filter(f => f.pago !== null && enRango(f.pago, v)).reduce((s, f) => s + f.monto, 0),
    diasPromCobro: c.diasPromCobro,
    pctEnPlazo: c.pctEnPlazo,
    turnos: t.total,
    pctFinalizados: t.pctFinalizados,
    pctCancelados: t.pctCancelados,
    atrasoMinProm: t.atrasoMinProm,
    pctPuntuales: t.pctPuntuales,
    extraMinProm: t.extraMinProm,
    horas: t.horasAgendadas,
  };
}

export type MetricaMensual = 'facturado' | 'cobrado' | 'sesiones' | 'turnos';

// Valor de cada mes calendario (enero..diciembre) de un año. El mes en curso y los futuros quedan en null:
// solo se comparan meses completos (el mes en curso se compara cortado al mismo día en la tabla).
export function serieMensual(fs: FacturaAnalizada[], ts: TurnoAnalizado[], anio: number, metrica: MetricaMensual, hoy: number): (number | null)[] {
  const valores: (number | null)[] = Array(12).fill(0);
  const mesDeDia = (dia: number) => {
    const f = new Date(dia * DIA_MS);
    return f.getUTCFullYear() === anio ? f.getUTCMonth() : -1;
  };
  const sumar = (dia: number, x: number) => { const m = mesDeDia(dia); if (m >= 0) valores[m] = (valores[m] ?? 0) + x; };
  if (metrica === 'facturado') fs.forEach(f => sumar(f.emision, f.monto));
  if (metrica === 'sesiones') fs.forEach(f => sumar(f.emision, f.sesiones));
  if (metrica === 'cobrado') fs.forEach(f => { if (f.pago !== null) sumar(f.pago, f.monto); });
  if (metrica === 'turnos') ts.forEach(t => sumar(t.dia, 1));
  const hoyF = new Date(hoy * DIA_MS);
  if (hoyF.getUTCFullYear() === anio) for (let m = hoyF.getUTCMonth(); m < 12; m++) valores[m] = null;
  return valores;
}
