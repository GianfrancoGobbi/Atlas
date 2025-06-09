
import { UserRole, Turno, TareaEstado, FacturaEstado } from './types'; // Added TareaEstado, FacturaEstado

export const ROLES = {
  PACIENTE: UserRole.PACIENTE,
  TERAPEUTA: UserRole.TERAPEUTA,
  ADMIN: UserRole.ADMIN,
};

export const APP_NAME = "Atlas";

// Example areas - in a real app, these would come from the database
export const AREAS_EJEMPLO = [
  { id: 'psicologia', nombre: 'Psicología' },
  { id: 'fonoaudiologia', nombre: 'Fonoaudiología' },
  { id: 'terapia_ocupacional', nombre: 'Terapia Ocupacional' },
];

export const MOCKED_THERAPIST_USER_ID = 'terapeuta-mock-id';
export const MOCKED_PATIENT_USER_ID = 'paciente-mock-id';
export const MOCKED_ADMIN_USER_ID = 'admin-mock-id';

interface StatusColorInfo {
  textClass: string;
  bgClass: string;
  borderClass: string;
  dotClass: string;
  blockBgClass: string;
  blockTextClass: string;
}

export const APPOINTMENT_STATUS_COLORS: Record<Turno['estado'], StatusColorInfo> = {
  pendiente: {
    textClass: 'text-secondary-dark', // Use darker shade of secondary for text
    bgClass: 'bg-secondary-light',    // Use light shade of secondary for background
    borderClass: 'border-secondary',  // Use secondary for border
    dotClass: 'bg-secondary',         // Use secondary for dot
    blockBgClass: 'bg-secondary',     // Use secondary for block background
    blockTextClass: 'text-brand-gray', // Use brand-gray for text on secondary block for contrast
  },
  confirmado: {
    textClass: 'text-green-800', // Keep semantic green for confirmed
    bgClass: 'bg-green-100',
    borderClass: 'border-green-400',
    dotClass: 'bg-green-500',
    blockBgClass: 'bg-green-500',
    blockTextClass: 'text-white',
  },
  cancelado: {
    textClass: 'text-red-800', // Keep semantic red for cancelled
    bgClass: 'bg-red-100',
    borderClass: 'border-red-400',
    dotClass: 'bg-red-500',
    blockBgClass: 'bg-red-500',
    blockTextClass: 'text-white',
  },
  finalizado: {
    textClass: 'text-brand-gray',     // Use brand-gray for text
    bgClass: 'bg-slate-100',          // Subtle slate background
    borderClass: 'border-slate-300',  // Subtle slate border
    dotClass: 'bg-brand-gray',        // Use brand-gray for dot
    blockBgClass: 'bg-brand-gray',    // Use brand-gray for block background
    blockTextClass: 'text-white',     // White text on brand-gray block
  },
};

export const USER_FRIENDLY_STATUS: Record<Turno['estado'], string> = {
    pendiente: 'Pendiente',
    confirmado: 'Confirmado',
    cancelado: 'Cancelado',
    finalizado: 'Finalizado',
};

// Constants for Tareas Terapeutas
export const TAREA_ESTADOS: Record<TareaEstado, string> = {
  [TareaEstado.A_REALIZAR]: 'A Realizar',
  [TareaEstado.EN_CURSO]: 'En Curso',
  [TareaEstado.COMPLETADA]: 'Completada',
};

interface TareaStatusColorInfo {
  textClass: string;
  bgClass: string;
  // Add other style properties if needed, like borderClass or dotClass
}

export const TAREA_ESTADO_COLORES: Record<TareaEstado, TareaStatusColorInfo> = {
  [TareaEstado.A_REALIZAR]: {
    textClass: 'text-yellow-800',
    bgClass: 'bg-yellow-100',
  },
  [TareaEstado.EN_CURSO]: {
    textClass: 'text-blue-800',
    bgClass: 'bg-blue-100',
  },
  [TareaEstado.COMPLETADA]: {
    textClass: 'text-green-800',
    bgClass: 'bg-green-100',
  },
};

// Constants for Facturas
export const FACTURA_ESTADOS: Record<FacturaEstado, string> = {
  [FacturaEstado.IMPAGA]: 'Impaga',
  [FacturaEstado.PAGA]: 'Paga',
};

interface FacturaStatusColorInfo {
  textClass: string;
  bgClass: string;
  // Add other style properties if needed
}

export const FACTURA_ESTADO_COLORES: Record<FacturaEstado, FacturaStatusColorInfo> = {
  [FacturaEstado.IMPAGA]: {
    textClass: 'text-red-800', // Similar to 'cancelado' or 'danger'
    bgClass: 'bg-red-100',
  },
  [FacturaEstado.PAGA]: {
    textClass: 'text-green-800', // Similar to 'confirmado' or 'success'
    bgClass: 'bg-green-100',
  },
};