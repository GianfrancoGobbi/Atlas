import { supabase } from '../lib/supabaseClient';
import type { AreaRaw, FacturaRaw, ObraSocialRaw, PersonaRaw, TurnoRaw } from '../utils/reportes';

// Datos de los tableros. El RLS de Supabase decide qué filas llegan:
// administración recibe todo el consultorio y cada terapeuta solo lo suyo.

const PAGINA = 1000; // tope de filas por pedido de la API de Supabase

async function traerTodo<T>(tabla: string, columnas: string): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from(tabla)
      .select(columnas)
      .order('id')
      .range(desde, desde + PAGINA - 1);
    if (error) throw error;
    filas.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGINA) return filas;
  }
}

export interface DatosTableros {
  facturas: FacturaRaw[];
  obrasSociales: ObraSocialRaw[];
  turnos: TurnoRaw[];
  terapeutas: PersonaRaw[];
  areas: AreaRaw[];
}

export const reportesService = {
  cargar: async (): Promise<DatosTableros> => {
    const [facturas, obrasSociales, turnos, terapeutas, areas] = await Promise.all([
      traerTodo<FacturaRaw>('facturas', 'id, terapeuta_id, obra_social_id, monto, estado, fecha_generada, fecha_pago, sesiones'),
      traerTodo<ObraSocialRaw>('obras_sociales', 'id, nombre, dias_vencimiento'),
      traerTodo<TurnoRaw>('turnos', 'id, terapeuta_id, fecha_hora_inicio, fecha_hora_fin, estado, inicio_real, fin_real'),
      supabase
        .from('usuarios_perfil')
        .select('id, nombre, apellido, area_id')
        .in('rol', ['terapeuta', 'admin', 'super_admin'])
        .then(({ data, error }) => {
          if (error) throw error;
          return (data ?? []) as PersonaRaw[];
        }),
      supabase.from('areas').select('id, nombre').order('nombre').then(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as AreaRaw[];
      }),
    ]);
    return { facturas, obrasSociales, turnos, terapeutas, areas };
  },
};
