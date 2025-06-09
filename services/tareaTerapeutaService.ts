import { supabase } from '../lib/supabaseClient';
import { TareaTerapeuta, TareaEstado } from '../types';
import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

// RawTareaTerapeuta reflects the structure from the 'tareas_terapeutas' table (snake_case)
interface RawTareaTerapeuta {
  id: string;
  terapeuta_id: string; // This is the ASSIGNED therapist ID
  titulo: string;
  descripcion?: string | null;
  estado: TareaEstado; // DB stores 'a_realizar', 'en_curso', 'completada'
  creada_en: string; // timestamp without time zone
  fecha_limite?: string | null; // timestamp without time zone (YYYY-MM-DDTHH:MM:SS)
}

const SELECTED_TAREA_FIELDS = 'id, terapeuta_id, titulo, descripcion, estado, creada_en, fecha_limite';

function mapRawTareaToTareaTerapeuta(raw: RawTareaTerapeuta): Omit<TareaTerapeuta, 'terapeutaNombre'> {
  return {
    id: raw.id,
    terapeutaId: raw.terapeuta_id,
    titulo: raw.titulo,
    descripcion: raw.descripcion ?? undefined,
    estado: raw.estado,
    creadaEn: raw.creada_en, // This is a string from DB
    fechaLimite: raw.fecha_limite ?? undefined, // This is a string from DB (e.g. "YYYY-MM-DD HH:MM:SS")
  };
}

// Function to map TareaTerapeuta (camelCase) to RawTareaTerapeuta insert/update object (snake_case)
function mapTareaToRawTareaData(
  tarea: Partial<Omit<TareaTerapeuta, 'id' | 'creadaEn' | 'terapeutaNombre'>>
): Partial<Omit<RawTareaTerapeuta, 'id' | 'creada_en'>> {
  const rawData: Partial<Omit<RawTareaTerapeuta, 'id' | 'creada_en'>> = {};
  // terapeutaId is crucial for assignment
  if (tarea.terapeutaId) rawData.terapeuta_id = tarea.terapeutaId;
  if (tarea.titulo) rawData.titulo = tarea.titulo;
  
  if (tarea.descripcion === null) rawData.descripcion = null;
  else if (tarea.descripcion !== undefined) rawData.descripcion = tarea.descripcion;
  
  if (tarea.estado) rawData.estado = tarea.estado;
  
  if (tarea.fechaLimite === null) rawData.fecha_limite = null;
  else if (tarea.fechaLimite !== undefined) rawData.fecha_limite = tarea.fechaLimite; // Expects "YYYY-MM-DDTHH:MM" or "YYYY-MM-DDTHH:MM:SS"

  return rawData;
}


export const tareaTerapeutaService = {
  getTareasTerapeutas: async (): Promise<Omit<TareaTerapeuta, 'terapeutaNombre'>[]> => {
    const { data: rawData, error }: PostgrestResponse<RawTareaTerapeuta> = await supabase
      .from('tareas_terapeutas')
      .select(SELECTED_TAREA_FIELDS)
      .order('creada_en', { ascending: false });

    if (error) {
      console.error('Error fetching tareas terapeutas:', error);
      throw error;
    }
    return rawData ? rawData.map(mapRawTareaToTareaTerapeuta) : [];
  },

  getTareaTerapeutaById: async (id: string): Promise<Omit<TareaTerapeuta, 'terapeutaNombre'> | null> => {
    const { data: rawData, error }: PostgrestSingleResponse<RawTareaTerapeuta> = await supabase
      .from('tareas_terapeutas')
      .select(SELECTED_TAREA_FIELDS)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: "0 rows" is not an error for .single()
      console.error(`Error fetching tarea by ID ${id}:`, error);
      throw error;
    }
    if (!rawData) return null;
    return mapRawTareaToTareaTerapeuta(rawData);
  },

  getTareasByTerapeutaId: async (
    terapeutaId: string, 
    options?: { limit?: number; excludeEstados?: TareaEstado[] }
  ): Promise<Omit<TareaTerapeuta, 'terapeutaNombre'>[]> => {
    let query = supabase
      .from('tareas_terapeutas')
      .select(SELECTED_TAREA_FIELDS)
      .eq('terapeuta_id', terapeutaId);

    if (options?.excludeEstados && options.excludeEstados.length > 0) {
      query = query.not('estado', 'in', `(${options.excludeEstados.join(',')})`);
    }
    
    query = query.order('fecha_limite', { ascending: true, nullsFirst: false })
                 .order('creada_en', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const { data: rawData, error }: PostgrestResponse<RawTareaTerapeuta> = await query;

    if (error) {
      console.error(`Error fetching tareas for terapeuta ID ${terapeutaId}:`, error);
      throw error;
    }
    return rawData ? rawData.map(mapRawTareaToTareaTerapeuta) : [];
  },

  createTareaTerapeuta: async (
    tareaData: Omit<TareaTerapeuta, 'id' | 'creadaEn' | 'terapeutaNombre'>
  ): Promise<Omit<TareaTerapeuta, 'terapeutaNombre'>> => {
    // terapeutaId (assignee) is now part of tareaData and expected to be set
    if (!tareaData.terapeutaId) {
      throw new Error("terapeutaId (asignado a) es requerido para crear una tarea.");
    }
    const rawTareaData = mapTareaToRawTareaData(tareaData);
    
    const { data: createdRawData, error } = await supabase
      .from('tareas_terapeutas')
      .insert(rawTareaData as Omit<RawTareaTerapeuta, 'id' | 'creada_en'>)
      .select(SELECTED_TAREA_FIELDS)
      .single();

    if (error) {
      console.error('Error creating tarea terapeuta:', error);
      throw error;
    }
    if (!createdRawData) {
      throw new Error('Tarea creation did not return data.');
    }
    return mapRawTareaToTareaTerapeuta(createdRawData);
  },

  updateTareaTerapeuta: async (
    id: string,
    updates: Partial<Omit<TareaTerapeuta, 'id' | 'creadaEn' | 'terapeutaNombre'>> // Can update terapeutaId (reassign)
  ): Promise<Omit<TareaTerapeuta, 'terapeutaNombre'> | null> => {
    const dbUpdates = mapTareaToRawTareaData(updates);

    if (Object.keys(dbUpdates).length === 0) {
      return tareaTerapeutaService.getTareaTerapeutaById(id);
    }

    const { data: updatedRawData, error }: PostgrestSingleResponse<RawTareaTerapeuta> = await supabase
      .from('tareas_terapeutas')
      .update(dbUpdates)
      .eq('id', id)
      .select(SELECTED_TAREA_FIELDS)
      .single();

    if (error) {
      console.error(`Error updating tarea ${id}:`, error);
      throw error;
    }
    if (!updatedRawData) return null;
    return mapRawTareaToTareaTerapeuta(updatedRawData);
  },

  deleteTareaTerapeuta: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('tareas_terapeutas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting tarea ${id}:`, error);
      throw error;
    }
  },
};