// Colores y formatos de los gráficos. Paletas validadas con el validador de dataviz
// contra la superficie blanca de las tarjetas (ver commit de los tableros).

export const tema = {
  superficie: '#ffffff',
  tinta: '#0b0b0b',
  tinta2: '#52514e',
  tenue: '#898781',
  grilla: '#e1e0d9',
  base: '#c3c2b7',
  serie: '#2a78d6', // serie única
  atenuado: '#c3c2b7', // de-énfasis
  // Estados de cobranza: paleta de estados (fija), siempre con ícono y etiqueta.
  estados: {
    en_plazo: '#0ca30c',
    con_atraso: '#fab219',
    pendiente: '#2a78d6',
    vencida: '#d03b3b',
  },
  // Rampa ordinal (antigüedad de la deuda), validada con --ordinal.
  ordinal: ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#0d366b'],
  // Rampa secuencial (mapa de calor), de casi cero a máximo.
  secuencial: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'],
};

export const GAP = 2; // espacio en color de superficie entre marcas que se tocan
export const RADIO = 4; // extremo redondeado de las barras

const moneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const monedaCompacta = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', notation: 'compact', maximumFractionDigits: 1,
});
const entero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const nombreMes = new Intl.DateTimeFormat('es-AR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const fechaCorta = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

export const fmt = {
  moneda: (n: number) => moneda.format(n),
  monedaCompacta: (n: number) => monedaCompacta.format(n),
  entero: (n: number) => entero.format(n),
  decimal: (n: number) => decimal.format(n),
  pct: (x: number | null) => (x === null ? '—' : `${entero.format(x * 100)} %`),
  dias: (n: number | null) => (n === null ? '—' : `${decimal.format(n)} d`),
  mes: (mes: string) => nombreMes.format(new Date(`${mes}-01T00:00:00Z`)).replace('.', ''),
  fecha: (dia: number) => fechaCorta.format(new Date(dia * 86_400_000)),
};

// Máximo "redondo" para el eje y sus marcas (0, 25, 50, 75, 100…).
export function escalaLinda(max: number, marcas = 4): { tope: number; ticks: number[] } {
  if (max <= 0) return { tope: 1, ticks: [0] };
  const paso0 = max / marcas;
  const mag = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map(m => m * mag).find(p => p >= paso0) ?? 10 * mag;
  const tope = Math.ceil(max / paso) * paso;
  return { tope, ticks: Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso) };
}

// Barra vertical: extremo superior redondeado, recta contra la base.
export function pathColumna(x: number, y: number, w: number, h: number, r = RADIO): string {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

// Barra horizontal: extremo derecho redondeado, recta contra la base.
export function pathBarra(x: number, y: number, w: number, h: number, r = RADIO): string {
  const rr = Math.max(0, Math.min(r, h / 2, w));
  return `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`;
}
