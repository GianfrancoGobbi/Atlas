
import { supabase } from '../lib/supabaseClient';
import { UserProfile, UserRole } from '../types'; // UserProfile uses camelCase
import type { PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';

// Define the raw select string for DB columns based on provided DDL
// 'id' is PK of usuarios_perfil and FK to auth.users.id
// 'updated_at' is NOT in the DDL, so it's not selected.
const RAW_PROFILE_SELECT_COLUMNS = `
  id,
  rol,
  nombre,
  apellido,
  telefono,
  fecha_nacimiento,
  area_id,
  especialidad, 
  activo,
  creado_en
`;
// Note: 'especialidad' was kept in RAW_PROFILE_SELECT_COLUMNS. If it's not a DB column, remove it.
// Assuming 'especialidad' might still exist as a column from a previous schema version or is handled differently.
// If 'especialidad' is NOT a column in 'usuarios_perfil', it should be removed from here to avoid SQL errors.


// Interface for the raw data structure from Supabase
// Reflects the column names as selected in RAW_PROFILE_SELECT_COLUMNS
interface RawUserProfile {
  id: string;
  rol: UserRole; // DB stores 'paciente', 'terapeuta', 'admin'
  nombre: string;
  apellido: string;
  telefono?: string | null;
  fecha_nacimiento?: string | null; // DATE from DB
  area_id?: string | null;
  especialidad?: string | null; // If not a column, this will be null/undefined.
  activo?: boolean | null;
  creado_en: string; // timestamp from DB
  // updated_at is not selected as it's not in the provided DDL
}

// Helper function to map RawUserProfile to UserProfile (camelCase)
function mapRawProfileToUserProfile(rawProfile: RawUserProfile | null): UserProfile | null {
  if (!rawProfile) {
    return null;
  }
  return {
    id: rawProfile.id, // PK of usuarios_perfil
    userId: rawProfile.id, // FK to auth.users.id (same as usuarios_perfil.id)
    nombre: rawProfile.nombre,
    apellido: rawProfile.apellido,
    telefono: rawProfile.telefono ?? undefined,
    role: rawProfile.rol, // Direct mapping as UserRole enum values match DB
    fechaNacimiento: rawProfile.fecha_nacimiento ?? undefined,
    areaId: rawProfile.area_id ?? undefined,
    especialidad: rawProfile.especialidad ?? undefined, // Handle if not a column
    activo: rawProfile.activo ?? undefined, // Default to undefined if null
    createdAt: rawProfile.creado_en,
    updatedAt: undefined, // Not selected from DB based on DDL
  };
}

// Maps UserProfile (camelCase) keys to database column names (snake_case) for UPDATE.
function mapUserProfileToDbSchema(updates: Partial<UserProfile>): Record<string, any> {
  const dbUpdates: Record<string, any> = {};
  for (const key in updates) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      const value = (updates as any)[key];
      
      // Skip undefined values, so they don't overwrite existing data with null in DB
      // unless explicitly set to null.
      if (value === undefined) {
        continue;
      }

      switch (key as keyof UserProfile) {
        case 'id':
        case 'userId':
        case 'createdAt':
        case 'updatedAt':
          // These fields are not directly updatable or managed by DB
          break;
        case 'nombre':
          dbUpdates['nombre'] = value;
          break;
        case 'apellido':
          dbUpdates['apellido'] = value;
          break;
        case 'telefono':
          dbUpdates['telefono'] = value;
          break;
        case 'role':
          dbUpdates['rol'] = value;
          break;
        case 'fechaNacimiento':
          dbUpdates['fecha_nacimiento'] = value; // Ensure this is DATE format for DB
          break;
        case 'areaId':
          dbUpdates['area_id'] = value;
          break;
        case 'especialidad': 
          dbUpdates['especialidad'] = value; // If 'especialidad' is a column
          break;
        case 'activo':
          dbUpdates['activo'] = value;
          break;
        default:
          // This default case can be removed if all UserProfile keys are explicitly handled
          // console.warn(`Unmapped key in mapUserProfileToDbSchema: ${key}`);
      }
    }
  }
  return dbUpdates;
}


export const profileService = {
  // authUserId is the id from auth.users table
  getProfileByUserId: async (authUserId: string): Promise<UserProfile | null> => {
    if (!authUserId || typeof authUserId !== 'string' || authUserId.trim() === "") {
        // console.warn('profileService.getProfileByUserId: authUserId is invalid.');
        return null;
    }
    const { data: rawData, error }: PostgrestSingleResponse<RawUserProfile> = await supabase
      .from('usuarios_perfil')
      .select(RAW_PROFILE_SELECT_COLUMNS)
      .eq('id', authUserId) // Query on 'id' column of 'usuarios_perfil'
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: "0 rows" is not an error for .single()
      // console.error('Error fetching profile:', error.message, error.details, error.hint);
      throw error;
    }
    return mapRawProfileToUserProfile(rawData);
  },

  // profileId is the 'id' (PK) of the 'usuarios_perfil' record to update.
  updateProfile: async (profileId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> => {
    const dbUpdates = mapUserProfileToDbSchema(updates);

    if (Object.keys(dbUpdates).length === 0) {
      // No valid fields to update, fetch and return current profile.
      const currentProfile = await profileService.getProfileByUserId(profileId);
      return currentProfile;
    }

    const { data: rawData, error }: PostgrestSingleResponse<RawUserProfile> = await supabase
      .from('usuarios_perfil')
      .update(dbUpdates)
      .eq('id', profileId) // 'id' is the primary key of 'usuarios_perfil'
      .select(RAW_PROFILE_SELECT_COLUMNS)
      .single();

    if (error) {
      // console.error('Error updating profile:', error.message, error.details, error.hint);
      throw error;
    }
    return mapRawProfileToUserProfile(rawData);
  },

  getPacientes: async (): Promise<Pick<UserProfile, 'id' | 'nombre' | 'apellido'>[]> => {
    // Fetch users with role 'paciente' who are active
    const { data: rawData, error }: PostgrestResponse<Pick<RawUserProfile, 'id' | 'nombre' | 'apellido'>> = await supabase
      .from('usuarios_perfil')
      .select('id, nombre, apellido')
      .eq('rol', UserRole.PACIENTE)
      .eq('activo', true) // Assuming you only want to list active patients for new bookings
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      // console.error('Error fetching pacientes:', error);
      throw error;
    }
    // No full mapping needed as we selected camelCase like fields directly in a simplified way
    // For full UserProfile, mapping would be needed if snake_case fields were selected.
    // Here, we specifically select 'id', 'nombre', 'apellido'.
    return rawData || [];
  },

  getTherapistsByAreaId: async (areaId: string): Promise<UserProfile[]> => {
    if (!areaId || typeof areaId !== 'string' || areaId.trim() === "") {
      // console.warn('profileService.getTherapistsByAreaId: areaId is invalid.');
      return [];
    }
    const { data: rawData, error }: PostgrestResponse<RawUserProfile> = await supabase
      .from('usuarios_perfil')
      .select(RAW_PROFILE_SELECT_COLUMNS)
      .eq('rol', UserRole.TERAPEUTA)
      .eq('activo', true)
      .eq('area_id', areaId) // Filter by area_id
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      // console.error('Error fetching therapists by area:', error);
      throw error;
    }
    return rawData ? rawData.map(raw => mapRawProfileToUserProfile(raw)!).filter(Boolean) as UserProfile[] : [];
  },
};
