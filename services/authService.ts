
import { supabase } from '../lib/supabaseClient';
import { UserRole } from '../types'; // Ensure UserRole is imported
import type { AuthError, AuthResponse, Session, User } from '@supabase/supabase-js';

export interface LoginCredentials {
  email: string;
  contrasena: string;
}

export interface SignUpCredentials {
  nombreCompleto: string;
  email: string;
  contrasena: string;
  // You could add a default role here if your trigger doesn't set one,
  // or if you want to allow role selection during signup (more complex).
  // defaultRole?: UserRole; 
}

export const authService = {
  login: async ({ email, contrasena }: LoginCredentials): Promise<{ user: User; session: Session }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: contrasena, // Supabase expects 'password'
    });

    if (error) throw error;
    if (!data.user || !data.session) throw new Error("Login fallido: No hay usuario o sesión.");
    
    // Return user and session. The role will be fetched by useAuth hook using profileService.
    return { user: data.user, session: data.session };
  },

  signUp: async (credentials: SignUpCredentials): Promise<{ user: User; session: Session | null }> => {
    const { nombreCompleto, email, contrasena } = credentials;
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: contrasena,
      options: {
        data: {
          nombreCompleto: nombreCompleto,
          // Example: if you want to set a default role that your DB trigger can use.
          // default_role: UserRole.PACIENTE 
        }
      }
    });

    if (error) throw error;
    // Note: Supabase signUp might return a user without a session if email confirmation is enabled.
    // The session will be null until the email is confirmed.
    // If auto-confirm is on (dev), session should be present.
    if (!data.user) throw new Error("Registro fallido: No se pudo crear el usuario.");
    
    // data.session can be null if email confirmation is pending.
    return { user: data.user, session: data.session };
  },

  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange: (
    callback: (event: string, session: Session | null) => void
  ): { data: { subscription: any } } => { // 'any' for subscription to match Supabase type loosely
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return { data: { subscription } };
  },

  getCurrentSession: async (): Promise<Session | null> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error; // Or handle error differently, e.g., return null
    return data.session;
  },
};
