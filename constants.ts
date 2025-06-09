
import { UserRole, Turno } from './types'; // Added Turno

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