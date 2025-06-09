
import { supabase } from '../lib/supabaseClient';
import { Area } from '../types';
import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

interface RawArea {
  id: string;
  nombre: string;
  descripcion?: string | null;
  referente_id?: string | null; // Added referente_id from DDL
  // Add other raw fields from DB if necessary, like created_at, updated_at
}

function mapRawAreaToArea(rawArea: RawArea | null): Area | null {
  if (!rawArea) return null;
  return {
    id: rawArea.id,
    nombre: rawArea.nombre,
    descripcion: rawArea.descripcion ?? undefined,
    referenteId: rawArea.referente_id ?? undefined, // Map referente_id
  };
}

export const areaService = {
  getAreas: async (): Promise<Area[]> => {
    const { data: rawData, error }: PostgrestResponse<RawArea> = await supabase
      .from('areas')
      .select('id, nombre, descripcion, referente_id') // Added referente_id
      .order('nombre', { ascending: true });

    if (error) {
      // console.error('Error fetching areas:', error);
      throw error;
    }
    return rawData 
      ? rawData
          .map(raw => mapRawAreaToArea(raw)!)
          .filter(area => area && area.id && typeof area.id === 'string' && area.id.trim() !== "") // Ensure valid, non-empty ID
      : [];
  },

  getAreaById: async (id: string): Promise<Area | null> => {
    if (!id || typeof id !== 'string' || id.trim() === "") {
        // console.warn('areaService.getAreaById: id is invalid (null, empty, or not a string).');
        return null;
    }
    const { data: rawData, error }: PostgrestSingleResponse<RawArea> = await supabase
      .from('areas')
      .select('id, nombre, descripcion, referente_id') // Added referente_id
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: "0 rows" is not an error for .single()
      // console.error(`Error fetching area with id ${id}:`, error);
      throw error;
    }
    return mapRawAreaToArea(rawData);
  },
};
