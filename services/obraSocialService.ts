import { supabase } from '../lib/supabaseClient';
import { ObraSocial } from '../types';
import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

// RawObraSocial reflects the structure from the 'obras_sociales' table
interface RawObraSocial {
  id: string;
  nombre: string;
  descripcion?: string | null;
  contacto?: string | null;
}

const SELECTED_OBRA_SOCIAL_FIELDS = 'id, nombre, descripcion, contacto';

function mapRawToObraSocial(raw: RawObraSocial): ObraSocial {
  return {
    id: raw.id,
    nombre: raw.nombre,
    descripcion: raw.descripcion ?? undefined,
    contacto: raw.contacto ?? undefined,
  };
}

function mapObraSocialToRawData(
  obraSocial: Omit<ObraSocial, 'id'>
): Omit<RawObraSocial, 'id'> {
  return {
    nombre: obraSocial.nombre,
    descripcion: obraSocial.descripcion,
    contacto: obraSocial.contacto,
  };
}

export const obraSocialService = {
  getObrasSociales: async (): Promise<ObraSocial[]> => {
    const { data: rawData, error }: PostgrestResponse<RawObraSocial> = await supabase
      .from('obras_sociales')
      .select(SELECTED_OBRA_SOCIAL_FIELDS)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error fetching obras sociales:', error);
      throw error;
    }
    return rawData ? rawData.map(mapRawToObraSocial) : [];
  },

  createObraSocial: async (
    obraSocialData: Omit<ObraSocial, 'id'>
  ): Promise<ObraSocial> => {
    if (!obraSocialData.nombre || obraSocialData.nombre.trim() === '') {
        throw new Error("El nombre de la obra social es requerido.");
    }
    const rawData = mapObraSocialToRawData(obraSocialData);

    const { data: createdRawData, error } = await supabase
      .from('obras_sociales')
      .insert(rawData)
      .select(SELECTED_OBRA_SOCIAL_FIELDS)
      .single();

    if (error) {
      console.error('Error creating obra social:', error);
      // Handle unique constraint violation for 'nombre' specifically if needed
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new Error(`Ya existe una obra social con el nombre "${obraSocialData.nombre}".`);
      }
      throw error;
    }
    if (!createdRawData) {
      throw new Error('La creación de la obra social no devolvió datos.');
    }
    return mapRawToObraSocial(createdRawData);
  },

  // No update or delete functions for therapists as per request.
  // These could be added later for Admin roles.
};
