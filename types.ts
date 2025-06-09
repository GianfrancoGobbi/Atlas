// Import Supabase types if needed, or rely on direct usage from @supabase/supabase-js
// For example: import type { User as SupabaseUser } from '@supabase/supabase-js';

export enum UserRole {
  PACIENTE = 'paciente',
  TERAPEUTA = 'terapeuta',
  ADMIN = 'admin',
}

// This User interface might represent the Supabase user object structure we care about.
// The actual Supabase User type from '@supabase/supabase-js' is more comprehensive.
export interface User { // Potentially redundant if using Supabase's User directly
  id: string;
  email: string | undefined;
  // Supabase User object might have more fields like app_metadata, user_metadata
}

export interface UserProfile {
  id: string; // Primary key of the usuarios_perfil table, (REFERENCES auth.users.id)
  userId: string; // Derived from 'id' for consistency in app logic, also REFERENCES auth.users.id
  nombre: string;
  apellido: string;
  telefono?: string;
  role: UserRole; // Mapped from 'rol' in DB
  fechaNacimiento?: string; // Mapped from 'fecha_nacimiento' in DB (DATE stored as ISO string)
  areaId?: string; // Mapped from 'area_id' in DB, For terapeutas
  especialidad?: string; // For terapeutas, this was in old UserProfile, but not in new DDL explicitly. Kept for now, assuming it might be part of therapist-specific logic elsewhere or a non-columnar attribute.
  activo?: boolean; // Mapped from 'activo' in DB
  createdAt: string; // Mapped from 'creado_en' in DB (Should be Date or ISOString)
  updatedAt?: string; // This column is not in the provided DDL for usuarios_perfil. Kept optional.
}

export interface Area {
  id: string;
  nombre: string;
  descripcion?: string;
  referenteId?: string; // Foreign key to usuarios_perfil.id for the main contact/therapist
}

export interface Turno {
  id:string;
  pacienteId: string;
  terapeutaId: string;
  // servicioId: string; // This field is in the DDL but was previously removed. Keeping it removed as per last user instruction/context. If it needs to be re-added, it should be based on DDL.
  fechaHoraInicio: string; // ISO string
  fechaHoraFin: string; // ISO string
  estado: 'pendiente' | 'confirmado' | 'cancelado' | 'finalizado'; // Aligned with DDL: 'confirmado' instead of 'programado', 'finalizado' instead of 'completado'
  notasPaciente?: string;
  notasTerapeuta?: string; // Part of clinical history
}

export interface Pago {
  id: string;
  turnoId: string;
  monto: number;
  metodoPago: 'tarjeta' | 'transferencia' | 'efectivo';
  estado: 'pendiente' | 'pagado' | 'reembolsado';
  fechaPago?: string; // ISO string
}

export interface HistorialClinicoEntry {
  id: string;
  turnoId: string;
  pacienteId: string;
  terapeutaId: string;
  fecha: string; // ISO string
  notas: string;
  archivosAdjuntos?: string[]; // URLs or identifiers
}

// Supabase specific types (simplified for mock, can be mostly replaced by actual Supabase types)
// This can be replaced by directly using `User` from `@supabase/supabase-js`
export type SupabaseAuthUser = import('@supabase/supabase-js').User;


// These custom response types are less needed if using Supabase's own response types
// like PostgrestSingleResponse<T> or PostgrestResponse<T>
export interface SupabaseQueryResponse<T> { // For SELECT queries that return multiple items
  data: T[] | null;
  error: Error | null; // More accurately PostgrestError
  count?: number | null;
}

export interface SupabaseSingleResponse<T> { // For SELECT queries with .single()
  data: T | null;
  error: Error | null; // More accurately PostgrestError
}

// SupabaseAuthResponse might not be needed if we handle {data, error} directly from Supabase calls.
export interface SupabaseAuthResponse {
  data: { user: SupabaseAuthUser | null; session: any | null; }; // Simplified session
  error: Error | null; // More accurately AuthError
}

export enum TareaEstado {
  A_REALIZAR = 'a_realizar',
  EN_CURSO = 'en_curso',
  COMPLETADA = 'completada',
}

export interface TareaTerapeuta {
  id: string;
  terapeutaId: string; // ID of the therapist to whom the task is ASSIGNED
  titulo: string;
  descripcion?: string;
  estado: TareaEstado;
  creadaEn: string; // ISO string for timestamp without time zone (likely from DB)
  fechaLimite?: string; // ISO string for timestamp without time zone (e.g., "YYYY-MM-DDTHH:MM:SS")
  // Populated client-side for display convenience
  terapeutaNombre: string; 
  // Optional: if we need to track creator separately in the future
  // creadoPorId?: string; 
  // creadoPorNombre?: string;
}

export interface ObraSocial {
  id: string;
  nombre: string;
  descripcion?: string;
  contacto?: string;
}

// Facturacion Types
export enum FacturaEstado {
  IMPAGA = 'impaga',
  PAGA = 'paga',
}

export interface FacturaPaciente {
  id: string;
  facturaId: string;
  pacienteId: string; // References auth.users.id (UserProfile.id)
  monto: number;
  detalle?: string;
  // For display purposes, populated client-side
  pacienteNombre?: string; 
}

export interface Factura {
  id: string;
  terapeutaId: string;
  obraSocialId: string;
  monto: number;
  estado: FacturaEstado;
  fechaGenerada: string; // timestamp without time zone, from DB
  fechaPago?: string | null; // timestamp without time zone, from DB
  descripcion?: string;
  // For display purposes, populated client-side
  terapeutaNombre?: string;
  obraSocialNombre?: string;
  // For creation and detail view, array of patient line items
  pacientes?: FacturaPaciente[]; 
}