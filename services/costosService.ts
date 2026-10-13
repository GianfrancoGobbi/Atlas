import { supabase } from '../lib/supabaseClient';

// Costos de la clínica (solo administración: lo garantiza el RLS de la tabla).

export const CATEGORIAS_COSTO = [
  { id: 'alquiler', etiqueta: 'Alquiler' },
  { id: 'honorarios', etiqueta: 'Honorarios' },
  { id: 'sueldos', etiqueta: 'Sueldos y cargas' },
  { id: 'servicios', etiqueta: 'Servicios' },
  { id: 'insumos', etiqueta: 'Insumos' },
  { id: 'impuestos', etiqueta: 'Impuestos y tasas' },
  { id: 'administracion', etiqueta: 'Administración' },
  { id: 'marketing', etiqueta: 'Marketing' },
  { id: 'mantenimiento', etiqueta: 'Mantenimiento' },
  { id: 'otros', etiqueta: 'Otros' },
] as const;

export type CategoriaCosto = typeof CATEGORIAS_COSTO[number]['id'];
export const etiquetaCategoria = (id: string) => CATEGORIAS_COSTO.find(c => c.id === id)?.etiqueta ?? id;

export interface CostoRaw {
  id: string;
  mes: string; // AAAA-MM-01
  categoria: CategoriaCosto;
  descripcion: string;
  monto: number | string;
  area_id: string | null;
  terapeuta_id: string | null;
  recurrente: boolean;
}

export type NuevoCosto = Omit<CostoRaw, 'id'>;

const COLUMNAS = 'id, mes, categoria, descripcion, monto, area_id, terapeuta_id, recurrente';
const PAGINA = 1000;

export const costosService = {
  listar: async (): Promise<CostoRaw[]> => {
    const filas: CostoRaw[] = [];
    for (let desde = 0; ; desde += PAGINA) {
      const { data, error } = await supabase.from('costos').select(COLUMNAS).order('mes').order('id').range(desde, desde + PAGINA - 1);
      if (error) throw error;
      filas.push(...((data ?? []) as CostoRaw[]));
      if (!data || data.length < PAGINA) return filas;
    }
  },

  crear: async (c: NuevoCosto): Promise<CostoRaw> => {
    const { data, error } = await supabase.from('costos').insert(c).select(COLUMNAS).single();
    if (error) throw error;
    return data as CostoRaw;
  },

  actualizar: async (id: string, cambios: Partial<NuevoCosto>): Promise<CostoRaw> => {
    const { data, error } = await supabase.from('costos').update(cambios).eq('id', id).select(COLUMNAS).single();
    if (error) throw error;
    return data as CostoRaw;
  },

  borrar: async (id: string): Promise<void> => {
    const { error } = await supabase.from('costos').delete().eq('id', id);
    if (error) throw error;
  },

  // Copia los costos recurrentes de un mes al siguiente, sin duplicar los que ya estén cargados.
  copiarRecurrentes: async (desdeMes: string, haciaMes: string): Promise<number> => {
    const { data: origen, error: e1 } = await supabase.from('costos').select(COLUMNAS).eq('mes', desdeMes).eq('recurrente', true);
    if (e1) throw e1;
    const { data: destino, error: e2 } = await supabase.from('costos').select(COLUMNAS).eq('mes', haciaMes);
    if (e2) throw e2;
    const clave = (c: CostoRaw) => [c.categoria, c.descripcion.trim().toLowerCase(), c.area_id ?? '', c.terapeuta_id ?? ''].join('|');
    const yaCargados = new Set((destino as CostoRaw[]).map(clave));
    const nuevos = (origen as CostoRaw[])
      .filter(c => !yaCargados.has(clave(c)))
      .map(({ id: _id, ...c }) => ({ ...c, mes: haciaMes }));
    if (!nuevos.length) return 0;
    const { error } = await supabase.from('costos').insert(nuevos);
    if (error) throw error;
    return nuevos.length;
  },
};
