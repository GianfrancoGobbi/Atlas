// Rentabilidad por obra social: cuánto se pierde por inflación entre que se factura y se cobra,
// y qué aranceles quedaron atrás. Todo es puro; recibe facturas ya filtradas (sin período ni estado).

import { FacturaAnalizada } from './reportes';

const DIA_MS = 86_400_000;

export const INFLACION_MENSUAL_POR_DEFECTO = 0.046;
export const META_DSO = 45;
export const UMBRAL_AUMENTO = 0.03; // un mes "aumenta" si supera en más de 3 % el máximo anterior
export const MESES_CONGELADO = 6;
export const DIAS_INCOBRABLE = 365;
const MIN_SESIONES_COMPARAR = 10; // para elegir la peor obra social, que el trimestre no sea una muestra mínima
const FRACCION_MES_CHICO = 0.25; // meses con menos del 25 % de las sesiones habituales no marcan el arancel (refacturaciones, ajustes)

// Meses como índice entero (año × 12 + mes) para poder restarlos.
const mesIdx = (dia: number): number => {
  const f = new Date(dia * DIA_MS);
  return f.getUTCFullYear() * 12 + f.getUTCMonth();
};
const diaDeMes = (m: number): number => Date.UTC(Math.floor(m / 12), m % 12, 1) / DIA_MS;
export const mesIso = (m: number): string => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`;

// Valor de hoy de un peso cobrado `dias` días después de facturado.
export const factorDescuento = (dias: number, inflacionMensual: number): number =>
  Math.pow(1 + inflacionMensual, -Math.max(0, dias) / 30);

export const deflactarAnual = (variacionNominal: number, inflacionMensual: number): number =>
  (1 + variacionNominal) / Math.pow(1 + inflacionMensual, 12) - 1;

export const esParticular = (nombre: string): boolean => /particular/i.test(nombre);

export interface Ventana { desde: number; hasta: number }

export interface VentanasRentabilidad {
  doceMeses: Ventana; // últimos 12 meses cerrados
  trimestre: Ventana & { etiqueta: string }; // último trimestre completo
  trimestreAnterior: Ventana & { etiqueta: string }; // el mismo, un año antes
  noventaDias: Ventana;
  mesActual: number;
}

export function ventanasRentabilidad(hoy: number): VentanasRentabilidad {
  const m = mesIdx(hoy);
  const q = Math.floor(m / 3) * 3 - 3; // primer mes del último trimestre cerrado
  const etiqueta = (x: number) => `T${(x % 12) / 3 + 1} ${Math.floor(x / 12)}`;
  return {
    doceMeses: { desde: diaDeMes(m - 12), hasta: diaDeMes(m) - 1 },
    trimestre: { desde: diaDeMes(q), hasta: diaDeMes(q + 3) - 1, etiqueta: etiqueta(q) },
    trimestreAnterior: { desde: diaDeMes(q - 12), hasta: diaDeMes(q - 9) - 1, etiqueta: etiqueta(q - 12) },
    noventaDias: { desde: hoy - 89, hasta: hoy },
    mesActual: m,
  };
}

const en = (dia: number, v: Ventana) => dia >= v.desde && dia <= v.hasta;

// Arancel = monto / sesiones, solo con facturas que tienen sesiones cargadas.
const arancel = (fs: FacturaAnalizada[]): { monto: number; sesiones: number; valor: number | null } => {
  let monto = 0, sesiones = 0;
  for (const f of fs) if (f.sesiones > 0) { monto += f.monto; sesiones += f.sesiones; }
  return { monto, sesiones, valor: sesiones ? monto / sesiones : null };
};

export interface CostoCobro {
  cobrado: number;
  valorReal: number; // lo cobrado, llevado a pesos del día de emisión
  costo: number;
  pct: number | null;
  diasProm: number | null; // ponderado por monto
  arancelReal: number | null; // valor real por sesión
  facturas: number;
}

// Facturas COBRADAS en la ventana (por fecha de pago). Tomarlas por fecha de emisión dejaría afuera
// las emitidas hace poco que todavía no se cobraron, justo las más lentas, y subestimaría el costo.
export function costoCobro(fs: FacturaAnalizada[], v: Ventana, i: number): CostoCobro {
  let cobrado = 0, valorReal = 0, diasPond = 0, realConSesiones = 0, sesiones = 0, facturas = 0;
  for (const f of fs) {
    if (!f.pagada || f.pago === null || !en(f.pago, v)) continue;
    const d = Math.max(0, f.pago - f.emision);
    const real = f.monto * factorDescuento(d, i);
    facturas++;
    cobrado += f.monto;
    valorReal += real;
    diasPond += f.monto * d;
    if (f.sesiones > 0) { realConSesiones += real; sesiones += f.sesiones; }
  }
  return {
    cobrado,
    valorReal,
    costo: cobrado - valorReal,
    pct: cobrado ? (cobrado - valorReal) / cobrado : null,
    diasProm: cobrado ? diasPond / cobrado : null,
    arancelReal: sesiones ? realConSesiones / sesiones : null,
    facturas,
  };
}

export interface HistoriaArancel {
  ultimoAumento: number | null; // índice de mes; si nunca aumentó, el primer mes con datos
  huboAumento: boolean;
  mesesSinAumento: number | null;
  ultimoMesConDatos: number | null;
}

export function historiaArancel(fs: FacturaAnalizada[], mesActual: number): HistoriaArancel {
  const porMes = new Map<number, { monto: number; sesiones: number }>();
  for (const f of fs) {
    if (f.sesiones <= 0) continue;
    const m = mesIdx(f.emision);
    if (m > mesActual) continue;
    const a = porMes.get(m) ?? { monto: 0, sesiones: 0 };
    a.monto += f.monto;
    a.sesiones += f.sesiones;
    porMes.set(m, a);
  }
  const todos = [...porMes.keys()].sort((a, b) => a - b);
  if (!todos.length) return { ultimoAumento: null, huboAumento: false, mesesSinAumento: null, ultimoMesConDatos: null };
  // Un mes con pocas sesiones y un arancel atípico subiría el máximo para siempre y escondería los aumentos reales.
  const ses = todos.map(m => porMes.get(m)!.sesiones).sort((a, b) => a - b);
  const mediana = ses.length % 2 ? ses[(ses.length - 1) / 2] : (ses[ses.length / 2 - 1] + ses[ses.length / 2]) / 2;
  const meses = todos.filter(m => porMes.get(m)!.sesiones >= mediana * FRACCION_MES_CHICO);
  let maximo = -Infinity;
  let ultimo = meses[0];
  let hubo = false;
  for (const m of meses) {
    const { monto, sesiones } = porMes.get(m)!;
    const valor = monto / sesiones;
    if (maximo > 0 && valor > maximo * (1 + UMBRAL_AUMENTO)) { ultimo = m; hubo = true; }
    maximo = Math.max(maximo, valor);
  }
  return { ultimoAumento: ultimo, huboAumento: hubo, mesesSinAumento: mesActual - ultimo, ultimoMesConDatos: todos[todos.length - 1] };
}

export interface FilaRentabilidad extends HistoriaArancel {
  id: string;
  nombre: string;
  particular: boolean;
  sesiones12: number;
  facturado12: number;
  arancel12: number | null;
  arancelTrim: number | null;
  sesionesTrim: number;
  arancelTrimAnt: number | null;
  sesionesTrimAnt: number;
  varNominal: number | null;
  varReal: number | null;
  cobro: CostoCobro;
  pendiente: number; // impago hoy, de cualquier fecha
}

export function rentabilidadPorObraSocial(fs: FacturaAnalizada[], hoy: number, i: number): FilaRentabilidad[] {
  const v = ventanasRentabilidad(hoy);
  const grupos = new Map<string, FacturaAnalizada[]>();
  for (const f of fs) {
    const clave = f.obraSocialId ?? 'sin_os';
    const g = grupos.get(clave);
    if (g) g.push(f); else grupos.set(clave, [f]);
  }
  const filas: FilaRentabilidad[] = [];
  for (const [id, g] of grupos) {
    const doce = arancel(g.filter(f => en(f.emision, v.doceMeses)));
    const cobro = costoCobro(g, v.doceMeses, i);
    const facturado12 = g.filter(f => en(f.emision, v.doceMeses)).reduce((s, f) => s + f.monto, 0);
    if (!facturado12 && !cobro.cobrado) continue;
    const trim = arancel(g.filter(f => en(f.emision, v.trimestre)));
    const trimAnt = arancel(g.filter(f => en(f.emision, v.trimestreAnterior)));
    const varNominal = trim.valor !== null && trimAnt.valor ? trim.valor / trimAnt.valor - 1 : null;
    filas.push({
      id,
      nombre: g[0].obraSocial,
      particular: esParticular(g[0].obraSocial),
      sesiones12: doce.sesiones,
      facturado12,
      arancel12: doce.valor,
      arancelTrim: trim.valor,
      sesionesTrim: trim.sesiones,
      arancelTrimAnt: trimAnt.valor,
      sesionesTrimAnt: trimAnt.sesiones,
      varNominal,
      varReal: varNominal === null ? null : deflactarAnual(varNominal, i),
      cobro,
      pendiente: g.reduce((s, f) => s + (f.pagada ? 0 : f.monto), 0),
      ...historiaArancel(g, v.mesActual),
    });
  }
  return filas.sort((a, b) => b.sesiones12 - a.sesiones12 || b.facturado12 - a.facturado12);
}

export interface ResumenRentabilidad {
  costo: CostoCobro;
  congeladas: { cantidad: number; total: number; desdeMasComun: number | null; cantidadMasComun: number; desdeMasViejo: number | null };
  interanual: {
    nominal: number | null;
    real: number | null;
    peor: { nombre: string; real: number; nominal: number } | null;
  };
  dso: { dias: number | null; pendiente: number; facturado90: number; edadPendiente: number | null };
  incobrables: { cantidad: number; monto: number };
}

export function resumirRentabilidad(fs: FacturaAnalizada[], filas: FilaRentabilidad[], hoy: number, i: number): ResumenRentabilidad {
  const v = ventanasRentabilidad(hoy);

  const conFacturacion = filas.filter(f => f.facturado12 > 0 && !f.particular && f.mesesSinAumento !== null);
  const congeladas = conFacturacion.filter(f => (f.mesesSinAumento as number) >= MESES_CONGELADO);
  const conteo = new Map<number, number>();
  for (const f of congeladas) conteo.set(f.ultimoAumento as number, (conteo.get(f.ultimoAumento as number) ?? 0) + 1);
  const masComun = [...conteo.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0] ?? null;

  // Variación a igual mezcla: solo obras sociales con sesiones en ambos trimestres, ponderadas por las
  // sesiones actuales. El arancel promedio total sube o baja también si cambia el peso de cada obra social.
  let actual = 0, anteriorMismaMezcla = 0;
  for (const f of filas) {
    if (f.arancelTrim === null || f.arancelTrimAnt === null || !f.sesionesTrim || !f.sesionesTrimAnt) continue;
    actual += f.arancelTrim * f.sesionesTrim;
    anteriorMismaMezcla += f.arancelTrimAnt * f.sesionesTrim;
  }
  const nominal = anteriorMismaMezcla ? actual / anteriorMismaMezcla - 1 : null;
  const comparables = filas.filter(f =>
    !f.particular && f.varReal !== null && f.sesionesTrim >= MIN_SESIONES_COMPARAR && f.sesionesTrimAnt >= MIN_SESIONES_COMPARAR);
  const peor = comparables.reduce<FilaRentabilidad | null>((p, f) => (!p || (f.varReal as number) < (p.varReal as number) ? f : p), null);

  let pendiente = 0, edadPond = 0, facturado90 = 0, cantInc = 0, montoInc = 0;
  for (const f of fs) {
    if (en(f.emision, v.noventaDias)) facturado90 += f.monto;
    if (f.pagada) continue;
    const edad = Math.max(0, hoy - f.emision);
    pendiente += f.monto;
    edadPond += f.monto * edad;
    if (edad > DIAS_INCOBRABLE) { cantInc++; montoInc += f.monto; }
  }

  return {
    costo: costoCobro(fs, v.doceMeses, i),
    congeladas: {
      cantidad: congeladas.length,
      total: conFacturacion.length,
      desdeMasComun: masComun?.[0] ?? null,
      cantidadMasComun: masComun?.[1] ?? 0,
      desdeMasViejo: congeladas.length ? Math.min(...congeladas.map(f => f.ultimoAumento as number)) : null,
    },
    interanual: {
      nominal,
      real: nominal === null ? null : deflactarAnual(nominal, i),
      peor: peor ? { nombre: peor.nombre, real: peor.varReal as number, nominal: peor.varNominal as number } : null,
    },
    dso: {
      dias: facturado90 ? (pendiente / facturado90) * 90 : null,
      pendiente,
      facturado90,
      edadPendiente: pendiente ? edadPond / pendiente : null,
    },
    incobrables: { cantidad: cantInc, monto: montoInc },
  };
}
