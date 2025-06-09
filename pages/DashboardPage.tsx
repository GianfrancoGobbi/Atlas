
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { PatientDashboard } from '../components/dashboard/PatientDashboard';
import { TherapistDashboard } from '../components/dashboard/TherapistDashboard';
import { AdminDashboard } from '../components/dashboard/AdminDashboard';
import { Spinner } from '../components/shared/Spinner';
import { Alert } from '../components/shared/Alert';

export const DashboardPage: React.FC = () => {
  const { role, isLoading, error, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message={`Error al cargar el dashboard: ${error.message}`} />;
  }
  
  if (!profile && !role) { // If profile is essential for dashboard and not loaded
      return <Alert type="warning" message="No se pudo cargar la información del perfil para mostrar el dashboard." />;
  }

  switch (role) {
    case UserRole.PACIENTE:
      return <PatientDashboard />;
    case UserRole.TERAPEUTA:
      return <TherapistDashboard />;
    case UserRole.ADMIN:
      return <AdminDashboard />;
    default:
      return <Alert type="warning" message="Rol de usuario no reconocido o no asignado. Contacte al administrador." />;
  }
};
