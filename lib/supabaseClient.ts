
import { createClient, SupabaseClient } from '@supabase/supabase-js';
// Types are still useful for Supabase interactions, even if credentials are hardcoded.
// import { UserProfile, UserRole, SupabaseAuthUser, SupabaseAuthResponse, SupabaseQueryResponse, SupabaseSingleResponse } from '../types';

// Hardcoded Supabase credentials
const supabaseUrl = "https://qqmktunqunvvnohknnyi.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbWt0dW5xdW52dm5vaGtubnlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNjk2NjIsImV4cCI6MjA2NDg0NTY2Mn0._iPUHDpppNC_YRHZAP1j-tpWidGnjLqfnw3euwpxIhU";

if (!supabaseUrl || !supabaseAnonKey) {
  // This check is technically redundant now with hardcoding, but good for belt-and-suspenders
  // or if someone accidentally removes the hardcoded values.
  throw new Error("Supabase URL and Anon Key are required.");
}

// Create and export the Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Note: The original mock data and listener logic have been removed.
// The actual Supabase client handles its own state and event listeners.
// For example, supabase.auth.onAuthStateChange is now the correct way to listen for auth events.
