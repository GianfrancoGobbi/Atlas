
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UserProfile, UserRole } from '../types'; // Using our UserProfile, UserRole
import type { User as SupabaseAuthUser, Session } from '@supabase/supabase-js'; // Actual Supabase User type
import { authService, SignUpCredentials, LoginCredentials } from '../services/authService'; // Import SignUpCredentials
import { profileService } from '../services/profileService';
import { Spinner } from '../components/shared/Spinner';

interface AuthContextType {
  user: SupabaseAuthUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseAuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [error, setError] = useState<Error | null>(null);

  console.log("[AuthProvider] Initializing. isLoading:", isLoading);

  const fetchUserProfile = useCallback(async (authUser: SupabaseAuthUser | null) => {
    console.log("[AuthProvider] fetchUserProfile called with authUser:", authUser);
    if (!authUser?.id) {
      console.log("[AuthProvider] fetchUserProfile: No authUser ID, setting profile and role to null.");
      setProfile(null);
      setRole(null);
      return;
    }

    console.log(`[AuthProvider] fetchUserProfile: Fetching profile for user ID: ${authUser.id}`);
    setProfile(null); // Clear previous profile
    setRole(null);    // Clear previous role
    // setError(null); // Clear previous error related to profile fetching

    try {
      const userProfile = await profileService.getProfileByUserId(authUser.id);
      console.log("[AuthProvider] fetchUserProfile: Profile fetched:", userProfile);
      if (userProfile) {
        setProfile(userProfile);
        setRole(userProfile.role);
        console.log("[AuthProvider] fetchUserProfile: Profile and role SET.", userProfile, userProfile.role);
      } else {
        console.warn(`[AuthProvider] fetchUserProfile: Profile not found for user ID: ${authUser.id}. This might be expected for new users.`);
        // setError(new Error(`Perfil no encontrado para el usuario.`)); // Optional: treat as error for context
      }
    } catch (e: any) {
      console.error(`[AuthProvider] fetchUserProfile: Error fetching profile for user ID: ${authUser.id}:`, e);
      setError(new Error(`Error al cargar perfil: ${e.message}`));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    console.log("[AuthProvider] useEffect for onAuthStateChange running. isMounted:", isMounted, "Initial isLoading state:", isLoading);
    // Initial isLoading is true by default, no need to set it again here unless there's a specific reason.

    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthProvider] === Raw Auth Event Received: ${event} === Session:`, session, "isMounted:", isMounted);
        
        if (!isMounted) {
          console.log("[AuthProvider] onAuthStateChange: Component unmounted, returning early.");
          return;
        }
        
        const authUser = session?.user ?? null;
        setUser(authUser); // Set Supabase user state immediately
        console.log("[AuthProvider] onAuthStateChange: Supabase user SET:", authUser);

        if (event === 'INITIAL_SESSION') {
          console.log("[AuthProvider] onAuthStateChange: Event INITIAL_SESSION.");
          try {
            if (authUser) {
              console.log("[AuthProvider] INITIAL_SESSION: User found. Initiating profile fetch (non-awaited).");
              fetchUserProfile(authUser); // Not awaited intentionally
            } else {
              console.log("[AuthProvider] INITIAL_SESSION: No user found. Clearing profile and role.");
              if (isMounted) {
                setProfile(null);
                setRole(null);
              }
            }
          } catch (initialSessionProcessingError) {
            if (isMounted) {
              console.error("[AuthProvider] INITIAL_SESSION: Error during synchronous processing (outside fetchUserProfile):", initialSessionProcessingError);
              setError(initialSessionProcessingError instanceof Error ? initialSessionProcessingError : new Error('Error desconocido procesando sesión inicial.'));
            }
          } finally {
            console.log("[AuthProvider] INITIAL_SESSION: Entering finally block. isMounted:", isMounted);
            if (isMounted) {
              console.log("[AuthProvider] INITIAL_SESSION: Setting isLoading to false.");
              setIsLoading(false);
            }
          }
        } else if (event === 'SIGNED_IN') {
          console.log("[AuthProvider] onAuthStateChange: Event SIGNED_IN.");
          try {
            if (authUser) {
              console.log("[AuthProvider] SIGNED_IN: User found. Initiating profile fetch (non-awaited).");
              fetchUserProfile(authUser); // NON-AWAYTED
              console.log("[AuthProvider] SIGNED_IN: Profile fetch initiated.");
            } else {
              console.log("[AuthProvider] SIGNED_IN: No user found (unexpected for SIGNED_IN). Clearing profile and role.");
               if(isMounted) { setProfile(null); setRole(null); }
            }
          } catch(signInError) {
             if (isMounted) {
                console.error("[AuthProvider] SIGNED_IN: Error during fetchUserProfile or subsequent logic:", signInError);
                setError(signInError instanceof Error ? signInError : new Error('Error desconocido durante el inicio de sesión.'));
             }
          } finally {
            console.log("[AuthProvider] SIGNED_IN: Entering finally block. Current isLoading:", isLoading, "isMounted:", isMounted);
            if(isMounted) { // Simplified: if mounted, ensure loading is false now.
              console.log("[AuthProvider] SIGNED_IN: Setting isLoading to false in finally.");
              setIsLoading(false);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("[AuthProvider] onAuthStateChange: Event SIGNED_OUT.");
          if (isMounted) {
            setProfile(null);
            setRole(null);
            setUser(null); // Also clear the Supabase user object
            setError(null); // Clear errors on logout
            console.log("[AuthProvider] SIGNED_OUT: Setting isLoading to false.");
            setIsLoading(false); 
          }
        } else if (event === 'USER_UPDATED') {
          console.log("[AuthProvider] onAuthStateChange: Event USER_UPDATED.");
          if (authUser && isMounted) { 
            console.log("[AuthProvider] USER_UPDATED: User data updated in Supabase. Re-fetching profile.");
            await fetchUserProfile(authUser); // Keep await here, as it's usually a specific action
          }
        }
        // Other events like TOKEN_REFRESHED, PASSWORD_RECOVERY could be logged or handled here.
      }
    );

    return () => {
      isMounted = false;
      console.log("[AuthProvider] useEffect cleanup. Unsubscribing from onAuthStateChange. isMounted set to false.");
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchUserProfile]); // fetchUserProfile is stable

  const login = useCallback(async (credentials: LoginCredentials) => {
    console.log("[AuthProvider] login called with credentials:", credentials.email);
    setError(null);
    // setIsLoading(true); // Handled by onAuthStateChange event flow
    try {
      await authService.login(credentials);
      console.log("[AuthProvider] login successful (authService.login completed). Waiting for SIGNED_IN event.");
      // Profile fetching and isLoading = false will be handled by SIGNED_IN
    } catch (e: any) {
      console.error("[AuthProvider] login error:", e);
      setError(e); 
      setIsLoading(false); // Ensure spinner stops if login itself fails before SIGNED_IN
      throw e;
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    console.log("[AuthProvider] signUp called for email:", credentials.email);
    setError(null);
    // setIsLoading(true); // Handled by onAuthStateChange event flow
    try {
      await authService.signUp(credentials);
      console.log("[AuthProvider] signUp successful (authService.signUp completed).");
      // If auto-confirm is on, SIGNED_IN will fire. If not, user confirms email.
      // isLoading will be handled by onAuthStateChange logic (e.g. INITIAL_SESSION or SIGNED_IN).
    } catch (e: any) {
      console.error("[AuthProvider] signUp error:", e);
      setError(e);
      setIsLoading(false); // Ensure spinner stops if signup itself fails
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    console.log("[AuthProvider] logout called.");
    setError(null);
    // setIsLoading(true); // SIGNED_OUT event will set isLoading to false
    try {
      await authService.logout();
      console.log("[AuthProvider] logout successful (authService.logout completed). Waiting for SIGNED_OUT event.");
    } catch (e: any) {
      console.error("[AuthProvider] logout error:", e);
      setError(e);
      // SIGNED_OUT might not fire if logout itself errors, so ensure isLoading is handled.
      setIsLoading(false); 
      throw e;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    console.log("[AuthProvider] refreshProfile called. Current Supabase user:", user);
    if (user) {
      setError(null); 
      // Potentially set isLoading to true if this is a blocking refresh action
      // setIsLoading(true); 
      await fetchUserProfile(user); 
      // setIsLoading(false);
      console.log("[AuthProvider] refreshProfile: Profile re-fetched.");
    } else {
      console.log("[AuthProvider] refreshProfile: No user to refresh profile for.");
    }
  }, [user, fetchUserProfile]);

  console.log("[AuthProvider] Rendering. isLoading:", isLoading, "User:", user, "Profile:", profile, "Role:", role, "Error:", error);

  return (
    <AuthContext.Provider value={{ user, profile, role, isLoading, error, login, signUp, logout, refreshProfile }}>
      {isLoading && (
         <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[100]" aria-live="assertive" aria-label="Cargando aplicación...">
           {/* The console.log previously here was removed to fix TypeScript error */}
           <Spinner size="lg" />
         </div>
      )}
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
