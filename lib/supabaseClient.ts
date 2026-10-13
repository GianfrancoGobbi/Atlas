
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Credenciales públicas del frontend. Se definen en .env.local (local) y en las
// variables de entorno de Netlify (producción). Ver .env.example.
// Nunca usar acá la secret key: todo lo que empieza con VITE_ queda en el bundle.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_PUBLISHABLE_KEY. Ver .env.example.");
}

// Create and export the Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabasePublishableKey);

// Note: The original mock data and listener logic have been removed.
// The actual Supabase client handles its own state and event listeners.
// For example, supabase.auth.onAuthStateChange is now the correct way to listen for auth events.
