import { fmt } from '../components/charts/tema';

// Variación entre un valor actual y uno de referencia, lista para mostrar.
// `bueno` dice si el cambio es favorable (según si subir es bueno para esa métrica); null = sin cambio.
export interface Delta { texto: string; bueno: boolean | null }

const flecha = (d: number) => (d > 0 ? '▲' : d < 0 ? '▼' : '=');
const calificar = (d: number, subirEsBueno: boolean) => (d === 0 ? null : (d > 0) === subirEsBueno);

// Montos y cantidades: variación porcentual.
export function deltaPct(actual: number | null, anterior: number | null, subirEsBueno = true): Delta | undefined {
  if (actual === null || anterior === null || anterior === 0) return undefined;
  const d = Math.round(((actual - anterior) / Math.abs(anterior)) * 100); // en puntos enteros, para que flecha y texto coincidan
  return { texto: `${flecha(d)} ${fmt.entero(Math.abs(d))} %`, bueno: calificar(d, subirEsBueno) };
}

// Porcentajes: diferencia en puntos porcentuales.
export function deltaPuntos(actual: number | null, anterior: number | null, subirEsBueno = true): Delta | undefined {
  if (actual === null || anterior === null) return undefined;
  const d = Math.round((actual - anterior) * 100);
  return { texto: `${flecha(d)} ${fmt.entero(Math.abs(d))} pts`, bueno: calificar(d, subirEsBueno) };
}

// Promedios con unidad (días, minutos): diferencia absoluta.
export function deltaValor(actual: number | null, anterior: number | null, unidad: string, subirEsBueno = false): Delta | undefined {
  if (actual === null || anterior === null) return undefined;
  const d = Math.round((actual - anterior) * 10) / 10;
  return { texto: `${flecha(d)} ${fmt.decimal(Math.abs(d))} ${unidad}`, bueno: calificar(d, subirEsBueno) };
}

export const claseDelta = (d: Delta) =>
  d.bueno === true ? 'text-green-700' : d.bueno === false ? 'text-red-600' : 'text-slate-500';
