
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { profileService } from '../services/profileService';
import { UserProfile } from '../types';
import { Spinner } from '../components/shared/Spinner';
import { Alert } from '../components/shared/Alert';
import { ProfileForm, ProfileFormInputs } from '../components/forms/ProfileForm'; 
import { TARGET_TIMEZONE_IANA } from '../utils/timezones'; // Import for consistency

export const ProfilePage: React.FC = () => {
  const { user, profile: authProfile, isLoading: authLoading, error: authError, role, refreshProfile } = useAuth();
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authProfile) {
      setLocalProfile(authProfile);
    } else if (user && !authProfile && !authLoading && !authError) {
      setIsLoading(true); 
      profileService.getProfileByUserId(user.id)
        .then(fetchedProfile => {
          if (fetchedProfile) {
            setLocalProfile(fetchedProfile);
          } else {
            setError("No se pudo cargar el perfil localmente.");
          }
        })
        .catch(err => setError(`Error cargando perfil local: ${err.message}`))
        .finally(() => setIsLoading(false));
    }
  }, [authProfile, user, authLoading, authError]);


  const handleSubmit = async (data: ProfileFormInputs) => {
    if (!localProfile?.id) {
      setError("ID de perfil no encontrado para actualizar.");
      return;
    }
    setIsLoading(true); 
    setError(null);
    setSuccessMessage(null);
    try {
      const updatePayload: Partial<UserProfile> = {
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono,
        fechaNacimiento: data.fechaNacimiento, 
        areaId: data.areaId,
        especialidad: data.especialidad,
      };

      const updatedProfileData = await profileService.updateProfile(localProfile.id, updatePayload);
      if (updatedProfileData) {
        setLocalProfile(updatedProfileData); 
        await refreshProfile(); 
        setSuccessMessage('Perfil actualizado correctamente.');
      } else {
        setError('No se pudo actualizar el perfil. La respuesta no contenía datos.');
      }
    } catch (e: any) {
      setError(e.message || 'Ocurrió un error al actualizar el perfil.');
    } finally {
      setIsLoading(false); 
    }
  };

  if (authLoading && !localProfile) { 
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (authError) {
    return <Alert type="error" message={`Error de autenticación o carga de perfil: ${authError.message}`} />;
  }

  if (!localProfile) {
    return <Alert type="warning" message="Perfil no disponible. Por favor, intente más tarde o contacte soporte." />;
  }
  
  // fechaNacimiento is stored as YYYY-MM-DD.
  // When displaying, interpret this YYYY-MM-DD as a date in TARGET_TIMEZONE_IANA.
  // By creating the Date object as `new Date(localProfile.fechaNacimiento + 'T00:00:00')`,
  // we are saying this is midnight *in the system's local timezone*.
  // If we want to ensure it's displayed as that date *in Argentina*, we should pass TARGET_TIMEZONE_IANA.
  // However, for date-only, `YYYY-MM-DD` often implies "that day, regardless of timezone nuances for time parts".
  // Using `timeZone: 'UTC'` with `YYYY-MM-DDTHH:MM:SSZ` input is safe for getting the date part as intended.
  // For `YYYY-MM-DD` only, and to align with "everything Argentina time", using `TARGET_TIMEZONE_IANA` is fine.
  const displayFechaNacimiento = localProfile.fechaNacimiento 
    ? new Date(localProfile.fechaNacimiento + 'T00:00:00Z').toLocaleDateString('es-ES', { // Using 'T00:00:00Z' explicitly makes it UTC midnight.
        year: 'numeric', month: 'long', day: 'numeric', 
        timeZone: TARGET_TIMEZONE_IANA // Display this UTC date as it would appear in Argentina (should be same date part).
      })
    : 'No especificada';


  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold text-primary-dark mb-6">Mi Perfil</h1> {/* text-slate-800 to text-primary-dark */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}
      
      <ProfileForm 
        profile={localProfile} 
        onSubmit={handleSubmit} 
        isLoading={isLoading}
      />
      
      <div className="mt-8 bg-white p-6 shadow rounded-lg">
        <h3 className="text-lg font-medium text-primary mb-2">Información de la Cuenta</h3> {/* text-slate-700 to text-primary */}
        <p className="mt-1 text-sm text-brand-gray"><strong>Email:</strong> {user?.email}</p> {/* text-slate-600 to text-brand-gray */}
        <p className="text-sm text-brand-gray"><strong>Rol:</strong> {role ? (role.charAt(0).toUpperCase() + role.slice(1)) : 'No asignado'}</p> {/* text-slate-600 to text-brand-gray */}
        {localProfile.fechaNacimiento && <p className="text-sm text-brand-gray"><strong>Fecha de Nacimiento:</strong> {displayFechaNacimiento}</p>} {/* text-slate-600 to text-brand-gray */}
        {localProfile.activo !== undefined && <p className="text-sm text-brand-gray"><strong>Activo:</strong> {localProfile.activo ? 'Sí' : 'No'}</p>} {/* text-slate-600 to text-brand-gray */}
        {user?.id && <p className="text-xs text-slate-400 mt-1">ID de Usuario (auth.users.id): {user.id}</p>}
        {localProfile.id && <p className="text-xs text-slate-400">ID de Perfil (usuarios_perfil.id): {localProfile.id}</p>}
      </div>
    </div>
  );
};