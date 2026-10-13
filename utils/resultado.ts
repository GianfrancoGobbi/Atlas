// Resultado de la clínica: ingresos contra costos.
// Ingresos "devengados" = facturado por mes de emisión; "percibidos" = cobrado por mes de pago.
// Los costos sin área ni terapeuta son comunes y, por área, se reparten según lo facturado.

import type { CostoRaw } from '../services/costosService';
import { AreaPorTerapeuta, areaDe, diaDe, FacturaAnalizada, mesesEntre, Rango, SIN_AREA } from './reportes';

export type BaseIngresos = 'devengado' | 'percibido';

export interface CostoAnalizado {
  id: string;
  dia: number; // primer día del mes
  mes: string; // AAAA-MM
  categoria: string;
  monto: number;
  areaId: string | null;
  terapeutaId: string | null;
}

export const analizarCostos = (filas: CostoRaw[]): CostoAnalizado[] => filas.map(c => ({
  id: c.id,
  dia: diaDe(c.mes),
  mes: c.mes.slice(0, 7),
  categoria: c.categoria,
  monto: Number(c.monto) || 0,
  areaId: c.area_id,
  terapeutaId: c.terapeuta_id,
}));

const enRango = (dia: number, r: Rango) => (r.desde === null || dia >= r.desde) && (r.hasta === null || dia <= r.hasta);
const mesDe = (dia: number) => new Date(dia * 86_400_000).toISOString().slice(0, 7);

// Día que define el mes del ingreso según la base elegida (null = no cuenta).
const diaIngreso = (f: FacturaAnalizada, base: BaseIngresos) => (base === 'devengado' ? f.emision : f.pago);

export interface MesResultado { mes: string; ingresos: number; costos: number; resultado: number; sesiones: number }

export function serieResultado(fs: FacturaAnalizada[], cs: CostoAnalizado[], rango: Rango, base: BaseIngresos, hoy: number): MesResultado[] {
  const dias = [...fs.map(f => diaIngreso(f, base)).filter((d): d is number => d !== null), ...cs.map(c => c.dia)];
  if (!dias.length) return [];
  const desde = rango.desde ?? Math.min(...dias);
  const hasta = rango.hasta ?? Math.max(hoy, ...dias);
  const meses = new Map(mesesEntre(desde, hasta).map(m => [m, { mes: m, ingresos: 0, costos: 0, resultado: 0, sesiones: 0 }]));
  for (const f of fs) {
    const d = diaIngreso(f, base);
    if (d === null || !enRango(d, rango)) continue;
    const m = meses.get(mesDe(d));
    if (m) { m.ingresos += f.monto; m.sesiones += f.sesiones; }
  }
  for (const c of cs) {
    // El costo de un mes cuenta entero si ese mes está dentro del período.
    const m = meses.get(c.mes);
    if (m) m.costos += c.monto;
  }
  return [...meses.values()].map(m => ({ ...m, resultado: m.ingresos - m.costos }));
}

// Un mes entra en el resultado solo si tiene costos cargados: un mes sin costos (típicamente el
// mes en curso, que además tiene facturación parcial) sumaría ingresos sin sus costos e inflaría
// el resultado y el margen.
export const mesConCostos = (m: MesResultado) => m.costos > 0;

export interface ResumenResultado {
  ingresos: number; // solo meses con costos cargados
  costos: number;
  resultado: number;
  margen: number | null;
  sesiones: number;
  costoPorSesion: number | null;
  ingresoPorSesion: number | null;
  mesesConCostos: number;
  mesesSinCostos: string[]; // meses del período con movimientos pero sin costos: no entran en el resultado
  costoMensualProm: number | null;
  sesionesMesProm: number | null; // promedio de sesiones por mes en los meses con costos
  equilibrioSesionesMes: number | null; // sesiones por mes necesarias para cubrir los costos
}

export function resumirResultado(serie: MesResultado[]): ResumenResultado {
  const comparables = serie.filter(mesConCostos);
  const ingresos = comparables.reduce((s, m) => s + m.ingresos, 0);
  const costos = comparables.reduce((s, m) => s + m.costos, 0);
  const sesiones = comparables.reduce((s, m) => s + m.sesiones, 0);
  const costoMensualProm = comparables.length ? costos / comparables.length : null;
  const ingresoPorSesion = sesiones ? ingresos / sesiones : null;
  return {
    ingresos,
    costos,
    resultado: ingresos - costos,
    margen: ingresos ? (ingresos - costos) / ingresos : null,
    sesiones,
    costoPorSesion: sesiones && costos ? costos / sesiones : null,
    ingresoPorSesion,
    mesesConCostos: comparables.length,
    mesesSinCostos: serie.filter(m => !mesConCostos(m) && (m.ingresos > 0 || m.sesiones > 0)).map(m => m.mes),
    costoMensualProm,
    sesionesMesProm: comparables.length ? sesiones / comparables.length : null,
    equilibrioSesionesMes: costoMensualProm !== null && ingresoPorSesion ? costoMensualProm / ingresoPorSesion : null,
  };
}

export const costosEnRango = (cs: CostoAnalizado[], serie: MesResultado[]) => {
  const meses = new Set(serie.map(m => m.mes));
  return cs.filter(c => meses.has(c.mes));
};

export interface FilaResultadoArea {
  id: string;
  ingresos: number;
  directos: number;
  comunes: number;
  resultado: number;
  margen: number | null;
}

// Resultado por área (solo meses con costos, igual que el resumen): costos directos (del área o de
// sus terapeutas; un terapeuta sin área cae en SIN_AREA) más los comunes repartidos según lo
// facturado en esos meses, sea cual sea la base de ingresos elegida.
export function resultadoPorArea(
  fs: FacturaAnalizada[],
  cs: CostoAnalizado[],
  serie: MesResultado[],
  base: BaseIngresos,
  areaPorTerapeuta: AreaPorTerapeuta,
): FilaResultadoArea[] {
  const comparables = serie.filter(mesConCostos);
  const meses = new Set(comparables.map(m => m.mes));
  const ingresos = new Map<string, number>();
  const facturado = new Map<string, number>();
  for (const f of fs) {
    const a = areaDe(areaPorTerapeuta, f.terapeutaId);
    const d = diaIngreso(f, base);
    if (d !== null && meses.has(mesDe(d))) ingresos.set(a, (ingresos.get(a) ?? 0) + f.monto);
    if (meses.has(mesDe(f.emision))) facturado.set(a, (facturado.get(a) ?? 0) + f.monto);
  }
  const directos = new Map<string, number>();
  let comunes = 0;
  for (const c of costosEnRango(cs, comparables)) {
    const a = c.areaId ?? (c.terapeutaId ? areaDe(areaPorTerapeuta, c.terapeutaId) : null);
    if (a === null) comunes += c.monto;
    else directos.set(a, (directos.get(a) ?? 0) + c.monto);
  }
  // Sin nada facturado no hay con qué repartir: los comunes quedan en "Sin área" para que el total cierre.
  const totalFacturado = [...facturado.values()].reduce((s, x) => s + x, 0);
  if (!totalFacturado && comunes) facturado.set(SIN_AREA, 1);
  const pesoTotal = totalFacturado || (comunes ? 1 : 0);
  const ids = new Set([...ingresos.keys(), ...directos.keys(), ...(comunes ? facturado.keys() : [])]);
  return [...ids].map(id => {
    const ing = ingresos.get(id) ?? 0;
    const dir = directos.get(id) ?? 0;
    const com = pesoTotal ? comunes * ((facturado.get(id) ?? 0) / pesoTotal) : 0;
    const res = ing - dir - com;
    return { id, ingresos: ing, directos: dir, comunes: com, resultado: res, margen: ing ? res / ing : null };
  }).sort((a, b) => (a.id === SIN_AREA ? 1 : b.id === SIN_AREA ? -1 : b.ingresos - a.ingresos));
}
