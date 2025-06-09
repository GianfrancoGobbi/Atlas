
import { supabase } from '../lib/supabaseClient';
import { Turno, UserRole } from '../types';
import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

// RawTurno reflects the structure from the 'turnos' table (snake_case)
interface RawTurno {
  id: string;
  paciente_id: string;
  terapeuta_id: string;
  // servicio_id: string; 
  fecha_hora_inicio: string; // TIMESTAMPTZ (Supabase receives local time string, stores as UTC)
  fecha_hora_fin: string;    // TIMESTAMPTZ (Supabase receives local time string, stores as UTC)
  estado: 'pendiente' | 'confirmado' | 'cancelado' | 'finalizado'; 
  notas_paciente?: string | null;
  notas_terapeuta?: string | null;
}

function mapRawTurnoToTurno(raw: RawTurno): Turno {
  return {
    id: raw.id,
    pacienteId: raw.paciente_id,
    terapeutaId: raw.terapeuta_id,
    fechaHoraInicio: raw.fecha_hora_inicio, // This will be a UTC ISO string from Supabase
    fechaHoraFin: raw.fecha_hora_fin,       // This will be a UTC ISO string from Supabase
    estado: raw.estado,
    notasPaciente: raw.notas_paciente ?? undefined,
    notasTerapeuta: raw.notas_terapeuta ?? undefined,
  };
}

// Function to map Turno (camelCase for frontend) to RawTurno insert object (snake_case for DB)
// fechaHoraInicio/Fin are now local time strings (YYYY-MM-DDTHH:MM:SS)
function mapTurnoToRawTurnoData(turno: Omit<Turno, 'id'>): Omit<RawTurno, 'id' > { 
  return {
    paciente_id: turno.pacienteId,
    terapeuta_id: turno.terapeutaId,
    fecha_hora_inicio: turno.fechaHoraInicio, // Local time string e.g., "2023-10-26T10:00:00"
    fecha_hora_fin: turno.fechaHoraFin,       // Local time string e.g., "2023-10-26T11:00:00"
    estado: turno.estado,
    notas_paciente: turno.notasPaciente,
    notas_terapeuta: turno.notasTerapeuta,
  };
}

type UpdatableTurnoFields = 'estado' | 'notasTerapeuta' | 'notasPaciente' | 'fechaHoraInicio' | 'fechaHoraFin';
type RawUpdatableTurnoFields = 'estado' | 'notas_terapeuta' | 'notas_paciente' | 'fecha_hora_inicio' | 'fecha_hora_fin';


function mapTurnoUpdatesToRawTurnoUpdates(updates: Partial<Pick<Turno, UpdatableTurnoFields>>): Partial<Pick<RawTurno, RawUpdatableTurnoFields>> {
    const dbUpdates: Partial<Pick<RawTurno, RawUpdatableTurnoFields>> = {};
    if (updates.estado) dbUpdates.estado = updates.estado;
    if (updates.notasPaciente !== undefined) dbUpdates.notas_paciente = updates.notasPaciente;
    if (updates.notasTerapeuta !== undefined) dbUpdates.notas_terapeuta = updates.notasTerapeuta;
    // When updating, fechaHoraInicio/Fin are local time strings (YYYY-MM-DDTHH:MM:SS)
    if (updates.fechaHoraInicio) dbUpdates.fecha_hora_inicio = updates.fechaHoraInicio;
    if (updates.fechaHoraFin) dbUpdates.fecha_hora_fin = updates.fechaHoraFin;
    return dbUpdates;
}

const SELECTED_TURNO_FIELDS = 'id, paciente_id, terapeuta_id, fecha_hora_inicio, fecha_hora_fin, estado, notas_paciente, notas_terapeuta'; 

export const appointmentService = {
  getAppointmentsByUserId: async (userId: string, role: UserRole): Promise<Turno[]> => {
    let query = supabase.from('turnos').select<string, RawTurno>(SELECTED_TURNO_FIELDS); 

    if (role === UserRole.PACIENTE) {
      query = query.eq('paciente_id', userId);
    } else if (role === UserRole.TERAPEUTA) {
      query = query.eq('terapeuta_id', userId);
    } else {
      return [];
    }

    const { data: rawData, error }: PostgrestResponse<RawTurno> = await query
        .order('fecha_hora_inicio', { ascending: true });

    if (error) {
      // console.error('Error fetching appointments:', error);
      throw error;
    }
    return rawData ? rawData.map(mapRawTurnoToTurno) : [];
  },

  getAppointmentById: async (turnoId: string): Promise<Turno | null> => {
    const { data: rawData, error }: PostgrestSingleResponse<RawTurno> = await supabase
      .from('turnos')
      .select(SELECTED_TURNO_FIELDS)
      .eq('id', turnoId)
      .single();
  
    if (error && error.code !== 'PGRST116') { 
      // console.error(`Error fetching appointment by ID ${turnoId}:`, error);
      throw error;
    }
    if (!rawData) return null;
    return mapRawTurnoToTurno(rawData);
  },

  createTurnos: async (turnosData: Omit<Turno, 'id'>[]): Promise<Turno[]> => {
    if (!turnosData || turnosData.length === 0) {
      return [];
    }
    // turnosData contains fechaHoraInicio/Fin as local time strings.
    const rawTurnosData = turnosData.map(mapTurnoToRawTurnoData);

    const { data: createdRawData, error }: PostgrestResponse<RawTurno> = await supabase
      .from('turnos')
      .insert(rawTurnosData)
      .select(SELECTED_TURNO_FIELDS);

    if (error) {
      // console.error('Error creating appointments:', error);
      throw error;
    }
    // createdRawData will have fechaHoraInicio/Fin as UTC ISO strings from DB.
    return createdRawData ? createdRawData.map(mapRawTurnoToTurno) : [];
  },
  
  createAppointment: async (turnoData: Omit<Turno, 'id'>): Promise<Turno> => {
    // turnoData contains fechaHoraInicio/Fin as local time strings.
    const rawTurnoData = mapTurnoToRawTurnoData(turnoData);
    const { data: createdRawData, error } = await supabase
        .from('turnos')
        .insert(rawTurnoData)
        .select(SELECTED_TURNO_FIELDS)
        .single();
    
    if (error) {
        // console.error('Error creating single appointment:', error);
        throw error;
    }
    if (!createdRawData) {
        throw new Error('Appointment creation did not return data.');
    }
    // mapRawTurnoToTurno converts UTC strings from DB to Turno type.
    return mapRawTurnoToTurno(createdRawData as RawTurno); 
  },

  updateAppointment: async (turnoId: string, updates: Partial<Pick<Turno, UpdatableTurnoFields>>): Promise<Turno | null> => {
    // updates contains fechaHoraInicio/Fin as local time strings if they are being updated.
    const dbUpdates = mapTurnoUpdatesToRawTurnoUpdates(updates);

    if (Object.keys(dbUpdates).length === 0) {
        return appointmentService.getAppointmentById(turnoId);
    }

    const { data: updatedRawData, error }: PostgrestSingleResponse<RawTurno> = await supabase
        .from('turnos')
        .update(dbUpdates) // dbUpdates contains local time strings for date fields
        .eq('id', turnoId)
        .select(SELECTED_TURNO_FIELDS)
        .single();

    if (error) {
        // console.error(`Error updating appointment ${turnoId}:`, error);
        throw error;
    }
    if (!updatedRawData) return null;
    // updatedRawData will have UTC strings from DB. mapRawTurnoToTurno handles this.
    return mapRawTurnoToTurno(updatedRawData);
  },

  deleteAppointment: async (turnoId: string): Promise<void> => {
    if (!turnoId) {
      // console.error('appointmentService.deleteAppointment: turnoId is null or empty. Aborting delete.');
      throw new Error('turnoId cannot be null or empty for deletion.');
    }
    
    const { error } = await supabase
      .from('turnos')
      .delete()
      .eq('id', turnoId);

    if (error) {
      // console.error(`appointmentService.deleteAppointment: Error deleting appointment ${turnoId} from Supabase:`, error);
      throw error;
    }
  },
};
