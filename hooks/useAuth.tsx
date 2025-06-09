
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
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true: determining initial auth state
  const [error, setError] = useState<Error | null>(null);

  const fetchUserProfile = useCallback(async (authUser: SupabaseAuthUser | null) => {
    if (authUser?.id) {
      try {
        const userProfile = await profileService.getProfileByUserId(authUser.id);
        if (userProfile) {
          setProfile(userProfile);
          setRole(userProfile.role);
        } else {
          setProfile(null);
          setRole(null);
          console.warn('Perfil de usuario no encontrado para el ID:', authUser.id, 'Esto puede ser normal si el registro requiere confirmación por email y el perfil se crea post-confirmación, o si el trigger de la BD aún no se ha ejecutado.');
        }
      } catch (e: any) {
        setError(new Error(`Error al cargar perfil: ${e.message}`));
        setProfile(null);
        setRole(null);
      }
    } else {
      setProfile(null);
      setRole(null);
    }
  }, []); // Assuming profileService is stable

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    // Initialize user and profile to null to ensure clean state before listener confirms.
    setUser(null);
    setProfile(null);
    setRole(null);

    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        // Log auth events for debugging persistence issues
        console.log('[Auth Event]', { event, sessionId: session?.user?.id, userEmail: session?.user?.email, hasSession: !!session });

        const authUser = session?.user ?? null;
        setUser(authUser);

        if (authUser) {
          // fetchUserProfile handles its own errors and sets context error if needed
          await fetchUserProfile(authUser);
        } else {
          setProfile(null);
          setRole(null);
        }

        // Set loading to false only after the initial state is determined (INITIAL_SESSION)
        // or a definitive sign-in/sign-out occurs.
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setIsLoading(false);
        }
      }
    );

    // The explicit authService.getCurrentSession() call has been removed.
    // The onAuthStateChange listener with its INITIAL_SESSION event is responsible
    // for restoring the session from localStorage.

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchUserProfile]); 

  const login = useCallback(async (credentials: LoginCredentials) => {
    setError(null);
    try {
      await authService.login(credentials);
      // onAuthStateChange will handle setting user, profile, role, and isLoading.
    } catch (e: any) {
      setError(e); // Set error in context for global display if needed
      throw e; // Re-throw for form-level error handling
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    setError(null);
    try {
      await authService.signUp(credentials);
      // onAuthStateChange will handle new user state if auto-confirmation is on.
    } catch (e: any) {
      setError(e);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await authService.logout();
      // onAuthStateChange handles setting user, profile, role to null and isLoading.
    } catch (e: any) {
      setError(e);
      throw e;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      // setError(null); // Keep existing errors unless specifically cleared by this action
      // setIsLoading(true); // Let fetchUserProfile manage its own micro-loading if needed, or rely on global
      try {
        await fetchUserProfile(user);
      } catch (e: any) { // This catch might be redundant if fetchUserProfile sets error
        setError(new Error(`Error al refrescar perfil: ${e.message}`));
      } finally {
        // setIsLoading(false);
      }
    }
  }, [user, fetchUserProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, role, isLoading, error, login, signUp, logout, refreshProfile }}>
      {isLoading && ( // Show a global spinner if isLoading is true (e.g. initial auth check)
         <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[100]">
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
