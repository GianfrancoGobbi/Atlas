// Análisis por área: el área de cada factura y cada turno es la de su terapeuta.
import {
  AreaPorTerapeuta, AreaRaw, areaDe, cobranzaPorMes, diaAIso, FacturaAnalizada, Rango, ResumenCobranza, resumirCobranza,
  resumirTurnos, SIN_AREA, TurnoAnalizado,
} from './reportes';

export const NOMBRE_SIN_AREA = 'Sin área asignada';
export const CLAVE_OTRAS = 'otras_areas';

// Paleta categórica validada (skill dataviz). El color sigue al área según el orden alfabético de su id,
// así no cambia con los filtros ni con el ranking.
export const COLORES_AREA = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];

export const nombreArea = (areas: AreaRaw[], id: string): string =>
  id === SIN_AREA ? NOMBRE_SIN_AREA : areas.find(a => a.id === id)?.nombre ?? 'Área';

// Posición fija de cada área en la paleta (null si no hay color propio: sin área o más allá del sexto).
export function slotsDeArea(areas: AreaRaw[]): Map<string, number> {
  const ids = [...new Set(areas.map(a => a.id))].sort();
  return new Map(ids.slice(0, COLORES_AREA.length).map((id, i) => [id, i]));
}

export interface FilaArea extends ResumenCobranza {
  id: string;
  nombre: string;
  pctTotal: number | null; // de lo facturado en el período
  porSesion: number | null;
  turnos: number;
  pctFinalizados: number | null;
  pctCancelados: number | null;
  pacientes: number; // distintos, con algún turno finalizado
}

const agrupar = <T>(xs: T[], clave: (x: T) => string): Map<string, T[]> => {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = clave(x);
    const g = m.get(k);
    if (g) g.push(x); else m.set(k, [x]);
  }
  return m;
};

// Una fila por área con actividad (facturas o turnos) en el período, de mayor a menor facturación.
export function resumenPorArea(
  fs: FacturaAnalizada[],
  ts: TurnoAnalizado[],
  areas: AreaRaw[],
  mapa: AreaPorTerapeuta,
  hoy: number,
): FilaArea[] {
  const facturasPorArea = agrupar(fs, f => areaDe(mapa, f.terapeutaId));
  const turnosPorArea = agrupar(ts, t => areaDe(mapa, t.terapeutaId));
  const total = fs.reduce((s, f) => s + f.monto, 0);
  const ids = new Set([...facturasPorArea.keys(), ...turnosPorArea.keys()]);
  return [...ids]
    .map(id => {
      const c = resumirCobranza(facturasPorArea.get(id) ?? []);
      const turnos = turnosPorArea.get(id) ?? [];
      const t = resumirTurnos(turnos, hoy);
      const pacientes = new Set(turnos.filter(x => x.estado === 'finalizado' && x.pacienteId).map(x => x.pacienteId)).size;
      return {
        id,
        nombre: nombreArea(areas, id),
        ...c,
        pctTotal: total ? c.facturado / total : null,
        porSesion: c.sesiones ? c.facturado / c.sesiones : null,
        turnos: t.total,
        pctFinalizados: t.pctFinalizados,
        pctCancelados: t.pctCancelados,
        pacientes,
      };
    })
    .sort((a, b) => b.facturado - a.facturado || (a.id === SIN_AREA ? 1 : b.id === SIN_AREA ? -1 : a.nombre.localeCompare(b.nombre, 'es')));
}

export interface SerieArea { clave: string; etiqueta: string; color: string; ids: string[] }

// Series del gráfico mensual: cada área con color propio en el orden fijo de la paleta;
// las que no tienen color se juntan en "Otras áreas" y "Sin área asignada" va al final, atenuada.
export function seriesDeAreas(activas: string[], areas: AreaRaw[], colorOtras: string, colorSinArea: string): SerieArea[] {
  const slots = slotsDeArea(areas);
  const conColor = activas.filter(id => slots.has(id)).sort((a, b) => slots.get(a)! - slots.get(b)!);
  const otras = activas.filter(id => id !== SIN_AREA && !slots.has(id));
  const series: SerieArea[] = conColor.map(id => ({ clave: id, etiqueta: nombreArea(areas, id), color: COLORES_AREA[slots.get(id)!], ids: [id] }));
  if (otras.length) series.push({ clave: CLAVE_OTRAS, etiqueta: 'Otras áreas', color: colorOtras, ids: otras });
  if (activas.includes(SIN_AREA)) series.push({ clave: SIN_AREA, etiqueta: NOMBRE_SIN_AREA, color: colorSinArea, ids: [SIN_AREA] });
  return series;
}

export type MesArea = { mes: string; total: number } & Record<string, number | string>;

// Facturado por mes (de emisión) y por serie; incluye los meses sin facturas del rango.
export function facturacionMensualPorArea(fs: FacturaAnalizada[], series: SerieArea[], mapa: AreaPorTerapeuta, rango: Rango): MesArea[] {
  const serieDe = new Map(series.flatMap(s => s.ids.map(id => [id, s.clave] as const)));
  const meses = new Map<string, MesArea>(
    cobranzaPorMes(fs, rango).map(m => [m.mes, { mes: m.mes, total: 0, ...Object.fromEntries(series.map(s => [s.clave, 0])) } as MesArea]),
  );
  for (const f of fs) {
    const fila = meses.get(diaAIso(f.emision).slice(0, 7));
    const clave = serieDe.get(areaDe(mapa, f.terapeutaId));
    if (!fila || !clave) continue;
    fila[clave] = (fila[clave] as number) + f.monto;
    fila.total += f.monto;
  }
  return [...meses.values()];
}
