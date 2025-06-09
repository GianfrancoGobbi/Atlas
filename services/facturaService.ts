import { supabase } from '../lib/supabaseClient';
import { Factura, FacturaPaciente, FacturaEstado, UserRole } from '../types';
import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import { formatTargetTimezoneDateTimeLocalToUTCISO, TARGET_TIMEZONE_IANA } from '../utils/timezones';


// Raw types reflecting DB structure
interface RawFactura {
  id: string;
  terapeuta_id: string;
  obra_social_id: string;
  monto: number;
  estado: FacturaEstado;
  fecha_generada: string; // timestamp without time zone
  fecha_pago?: string | null; // timestamp without time zone
  descripcion?: string | null;
}

interface RawFacturaPaciente {
  id: string;
  factura_id: string;
  paciente_id: string;
  monto: number;
  detalle?: string | null;
}

// Mappers
const mapRawToFactura = (raw: RawFactura, pacientes?: FacturaPaciente[]): Factura => ({
  id: raw.id,
  terapeutaId: raw.terapeuta_id,
  obraSocialId: raw.obra_social_id,
  monto: Number(raw.monto), // Ensure monto is number
  estado: raw.estado,
  fechaGenerada: raw.fecha_generada, // Comes as string from DB
  fechaPago: raw.fecha_pago ?? undefined, // Comes as string or null from DB
  descripcion: raw.descripcion ?? undefined,
  pacientes: pacientes || [], // Will be populated separately if needed
  // terapeutaNombre and obraSocialNombre will be populated by the page component
});

const mapRawToFacturaPaciente = (raw: RawFacturaPaciente): FacturaPaciente => ({
  id: raw.id,
  facturaId: raw.factura_id,
  pacienteId: raw.paciente_id,
  monto: Number(raw.monto), // Ensure monto is number
  detalle: raw.detalle ?? undefined,
  // pacienteNombre will be populated by the page component
});

// Service
export const facturaService = {
  getFacturas: async (
    currentUserRole: UserRole,
    currentUserId?: string
  ): Promise<Omit<Factura, 'terapeutaNombre' | 'obraSocialNombre' | 'pacientes'>[]> => {
    let query = supabase
      .from('facturas')
      .select<string, RawFactura>('id, terapeuta_id, obra_social_id, monto, estado, fecha_generada, fecha_pago, descripcion');

    if (currentUserRole === UserRole.TERAPEUTA && currentUserId) {
      query = query.eq('terapeuta_id', currentUserId);
    } else if (currentUserRole !== UserRole.ADMIN) {
      // Non-admin, non-therapist (e.g. patient) should not see invoices this way
      return [];
    }
    // Admin sees all

    query = query.order('fecha_generada', { ascending: false });

    const { data: rawData, error }: PostgrestResponse<RawFactura> = await query;

    if (error) {
      console.error('Error fetching facturas:', error);
      throw error;
    }
    return rawData ? rawData.map(raw => mapRawToFactura(raw)) : [];
  },
  
  getFacturaWithPacientes: async (facturaId: string): Promise<Factura | null> => {
    const { data: rawFactura, error: facturaError } = await supabase
      .from('facturas')
      .select<string, RawFactura>('id, terapeuta_id, obra_social_id, monto, estado, fecha_generada, fecha_pago, descripcion')
      .eq('id', facturaId)
      .single();

    if (facturaError && facturaError.code !== 'PGRST116') {
        console.error(`Error fetching factura ${facturaId}:`, facturaError);
        throw facturaError;
    }
    if (!rawFactura) return null;

    const { data: rawPacientes, error: pacientesError } = await supabase
        .from('factura_pacientes')
        .select<string, RawFacturaPaciente>('id, factura_id, paciente_id, monto, detalle')
        .eq('factura_id', facturaId);
    
    if (pacientesError) {
        console.error(`Error fetching factura_pacientes for factura ${facturaId}:`, pacientesError);
        // Decide if you want to throw or return factura without pacientes
        throw pacientesError;
    }
    
    const pacientes = rawPacientes ? rawPacientes.map(mapRawToFacturaPaciente) : [];
    return mapRawToFactura(rawFactura, pacientes);
  },


  createFactura: async (
    facturaData: Omit<Factura, 'id' | 'fechaGenerada' | 'fechaPago' | 'terapeutaNombre' | 'obraSocialNombre' | 'pacientes'>,
    pacientesData: Omit<FacturaPaciente, 'id' | 'facturaId' | 'pacienteNombre'>[]
  ): Promise<Factura> => {
    
    const facturaToInsert = {
      terapeuta_id: facturaData.terapeutaId,
      obra_social_id: facturaData.obraSocialId,
      monto: facturaData.monto,
      estado: facturaData.estado,
      descripcion: facturaData.descripcion,
      // fecha_generada is set by DB default
    };

    const { data: createdRawFactura, error: facturaError } = await supabase
      .from('facturas')
      .insert(facturaToInsert)
      .select<string, RawFactura>('id, terapeuta_id, obra_social_id, monto, estado, fecha_generada, fecha_pago, descripcion')
      .single();

    if (facturaError) {
      console.error('Error creating factura:', facturaError);
      throw facturaError;
    }
    if (!createdRawFactura) {
      throw new Error('Factura creation did not return data.');
    }

    const createdFacturaId = createdRawFactura.id;
    let createdFacturaPacientes: FacturaPaciente[] = [];

    if (pacientesData && pacientesData.length > 0) {
      const facturaPacientesToInsert = pacientesData.map(fp => ({
        factura_id: createdFacturaId,
        paciente_id: fp.pacienteId,
        monto: fp.monto,
        detalle: fp.detalle,
      }));

      const { data: createdRawPacientes, error: pacientesError } = await supabase
        .from('factura_pacientes')
        .insert(facturaPacientesToInsert)
        .select<string, RawFacturaPaciente>('id, factura_id, paciente_id, monto, detalle');
      
      if (pacientesError) {
        console.error('Error creating factura_pacientes items:', pacientesError);
        // Potentially delete the created factura if patient items fail? Complex without transactions.
        // For now, throw error and admin might need to clean up.
        throw pacientesError;
      }
      if (createdRawPacientes) {
        createdFacturaPacientes = createdRawPacientes.map(mapRawToFacturaPaciente);
      }
    }
    
    return mapRawToFactura(createdRawFactura, createdFacturaPacientes);
  },

  updateFacturaStatus: async (facturaId: string, newStatus: FacturaEstado, fechaPago?: string | null): Promise<Factura | null> => {
    const updates: Partial<RawFactura> = { estado: newStatus };
    if (newStatus === FacturaEstado.PAGA) {
      updates.fecha_pago = fechaPago || formatTargetTimezoneDateTimeLocalToUTCISO(new Date().toISOString().substring(0,16), TARGET_TIMEZONE_IANA); // Default to now if not provided, formatted correctly
    } else {
      updates.fecha_pago = null; // Clear fecha_pago if not 'PAGA'
    }

    const { data: updatedRawFactura, error } = await supabase
      .from('facturas')
      .update(updates)
      .eq('id', facturaId)
      .select<string, RawFactura>('id, terapeuta_id, obra_social_id, monto, estado, fecha_generada, fecha_pago, descripcion')
      .single();

    if (error) {
      console.error(`Error updating factura ${facturaId} status:`, error);
      throw error;
    }
    return updatedRawFactura ? mapRawToFactura(updatedRawFactura) : null;
  },

  deleteFactura: async (facturaId: string): Promise<void> => {
    // Assuming ON DELETE CASCADE is set for factura_pacientes.factura_id FK.
    // If not, delete from factura_pacientes first:
    // const { error: pacienteError } = await supabase.from('factura_pacientes').delete().eq('factura_id', facturaId);
    // if (pacienteError) throw pacienteError;
    
    const { error } = await supabase
      .from('facturas')
      .delete()
      .eq('id', facturaId);

    if (error) {
      console.error(`Error deleting factura ${facturaId}:`, error);
      throw error;
    }
  },
};