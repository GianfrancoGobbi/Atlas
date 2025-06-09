
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
          console.warn(`Unmapped key in mapUserProfileToDbSchema: ${key}`);
      }
    }
  }
  return dbUpdates;
}


export const profileService = {
  // authUserId is the id from auth.users table
  getProfileByUserId: async (authUserId: string): Promise<UserProfile | null> => {
    if (!authUserId || typeof authUserId !== 'string' || authUserId.trim() === "") {
        console.warn('profileService.getProfileByUserId: authUserId is invalid.');
        return null;
    }
    console.log(`[profileService] Attempting to fetch profile for authUserId: ${authUserId}`);

    const PROFILE_FETCH_TIMEOUT = 10000; // 10 seconds

    try {
      const supabaseQuery = supabase
        .from('usuarios_perfil')
        .select(RAW_PROFILE_SELECT_COLUMNS)
        .eq('id', authUserId) // Query on 'id' column of 'usuarios_perfil'
        .single();

      const timeoutPromise = new Promise<PostgrestSingleResponse<RawUserProfile>>((_, reject) =>
        setTimeout(() => reject(new Error(`Profile fetch timed out after ${PROFILE_FETCH_TIMEOUT / 1000} seconds`)), PROFILE_FETCH_TIMEOUT)
      );
      
      // Race the Supabase query against the timeout
      const { data: rawData, error }: PostgrestSingleResponse<RawUserProfile> = await Promise.race([
        supabaseQuery,
        timeoutPromise
      ]);

      if (error && error.message.includes('timed out')) {
        console.error(`[profileService] Timeout fetching profile for authUserId: ${authUserId}. Error: ${error.message}`);
        // Optionally, re-throw or handle as a specific timeout error that AuthProvider can catch.
        // For now, returning null will allow the UI to unblock.
        return null;
      }
      
      if (error && error.code !== 'PGRST116') { // PGRST116: "0 rows" is not an error for .single()
        console.error('[profileService] Error fetching profile:', error.message, error.details, error.hint);
        throw error; // Re-throw other errors
      }
      if (error && error.code === 'PGRST116') {
        console.warn(`[profileService] No profile found for authUserId: ${authUserId} (PGRST116), returning null.`);
      }
      if (!rawData && !error) { // Should be covered by PGRST116 or timeout
          console.warn(`[profileService] No profile data returned for authUserId: ${authUserId}, but no error. Returning null.`);
      }
      console.log(`[profileService] Raw profile data for ${authUserId}:`, rawData);
      return mapRawProfileToUserProfile(rawData);

    } catch (e: any) {
      // This will catch errors from Promise.race (like the timeout error) or other unexpected errors
      console.error(`[profileService] Exception during getProfileByUserId for ${authUserId}:`, e.message);
      if (e.message.includes('timed out')) {
         // Already logged, ensure null is returned or throw if a specific error type is preferred
      } else {
        // Rethrow other unexpected errors if necessary, or handle them
        // For now, returning null to unblock UI.
      }
      return null; 
    }
  },

  // profileId is the 'id' (PK) of the 'usuarios_perfil' record to update.
  updateProfile: async (profileId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> => {
    const dbUpdates = mapUserProfileToDbSchema(updates);

    if (Object.keys(dbUpdates).length === 0) {
      console.warn('[profileService.updateProfile] No valid fields to update. Fetching current profile instead.');
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
      console.error('[profileService.updateProfile] Error updating profile:', error.message, error.details, error.hint);
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
      console.error('[profileService.getPacientes] Error fetching pacientes:', error);
      throw error;
    }
    return rawData || [];
  },

  getTherapistsByAreaId: async (areaId: string): Promise<UserProfile[]> => {
    if (!areaId || typeof areaId !== 'string' || areaId.trim() === "") {
      console.warn('profileService.getTherapistsByAreaId: areaId is invalid.');
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
      console.error('[profileService.getTherapistsByAreaId] Error fetching therapists by area:', error);
      throw error;
    }
    return rawData ? rawData.map(raw => mapRawProfileToUserProfile(raw)!).filter(Boolean) as UserProfile[] : [];
  },

 getAllTerapeutas: async (): Promise<Pick<UserProfile, 'id' | 'nombre' | 'apellido'>[]> => {
    const { data: rawData, error }: PostgrestResponse<Pick<RawUserProfile, 'id' | 'nombre' | 'apellido' | 'rol' | 'activo'>> = await supabase
      .from('usuarios_perfil')
      .select('id, nombre, apellido, rol, activo')
      .eq('rol', UserRole.TERAPEUTA)
      .eq('activo', true)
      .order('apellido', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) {
      console.error('[profileService.getAllTerapeutas] Error fetching therapists:', error);
      throw error;
    }
    return (rawData || []).map(t => ({ id: t.id, nombre: t.nombre, apellido: t.apellido }));
  },
};