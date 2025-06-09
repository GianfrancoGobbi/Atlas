
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

  const fetchUserProfile = useCallback(async (authUser: SupabaseAuthUser | null) => {
    if (!authUser?.id) {
      setProfile(null);
      setRole(null);
      return;
    }

    try {
      const userProfile = await profileService.getProfileByUserId(authUser.id);
      if (userProfile) {
        setProfile(userProfile);
        setRole(userProfile.role);
      } else {
        setProfile(null);
        setRole(null);
        // console.warn(`[fetchUserProfile] Profile not found for user ID: ${authUser.id}. This might be normal during sign-up or if DB trigger hasn't run.`);
      }
    } catch (e: any) {
      // console.error(`[fetchUserProfile] Error fetching profile for user ID: ${authUser.id}:`, e);
      setError(new Error(`Error al cargar perfil: ${e.message}`));
      setProfile(null);
      setRole(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    // setIsLoading(true) is already set by default.

    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) {
          return;
        }
        
        const authUser = session?.user ?? null;
        setUser(authUser); 

        if (event === 'INITIAL_SESSION') {
          if (authUser) {
            await fetchUserProfile(authUser); 
          } else {
            setProfile(null);
            setRole(null);
          }
          if (isMounted) {
            setIsLoading(false); 
          }
        } else if (event === 'SIGNED_IN') {
          if (authUser) {
            await fetchUserProfile(authUser); 
          } else {
             if(isMounted) { setProfile(null); setRole(null); }
          }
          // isLoading should already be false from INITIAL_SESSION or its own logic path.
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setProfile(null);
            setRole(null);
            setIsLoading(false); 
          }
        } else if (event === 'USER_UPDATED' && authUser) {
            await fetchUserProfile(authUser);
        }
      }
    );

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
      // User and profile will be updated by onAuthStateChange listener
    } catch (e: any) {
      setError(e); 
      throw e;
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    setError(null);
    try {
      await authService.signUp(credentials);
      // User and profile will be updated by onAuthStateChange listener,
      // or user will need to confirm email.
    } catch (e: any) {
      setError(e);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await authService.logout();
      // User, profile, role will be cleared by onAuthStateChange listener
    } catch (e: any) {
      setError(e);
      throw e;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user); 
    }
  }, [user, fetchUserProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, role, isLoading, error, login, signUp, logout, refreshProfile }}>
      {isLoading && (
         <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[100]" aria-live="assertive" aria-label="Cargando aplicación...">
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
