import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthPage } from '../pages/AuthPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AppointmentsPage } from '../pages/AppointmentsPage';
import { AppointmentDetailPage } from '../pages/AppointmentDetailPage'; 
import { NotFoundPage } from '../pages/NotFoundPage';
import { LandingPage } from '../pages/LandingPage'; // Corrected/Confirmed: Relative path
// import { AreasPage } from '../pages/AreasPage'; // AreasPage is being removed
import { AreaDetailPage } from '../pages/AreaDetailPage'; // Import AreaDetailPage
import { TareasTerapeutasPage } from '../pages/TareasTerapeutasPage'; // Import TareasTerapeutasPage
import { ObrasSocialesPage } from '../pages/ObrasSocialesPage'; // Import ObrasSocialesPage
import { FacturacionPage } from '../pages/FacturacionPage'; // Import FacturacionPage
import { ProtectedRoute } from './ProtectedRoute';
import { MainLayout } from '../components/layout/MainLayout';
import { PublicLayout } from '../components/layout/PublicLayout'; // Import PublicLayout
import { UserRole } from '../types';
// Import other pages as needed e.g. ServicesPage, PaymentsPage for specific roles

export const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} /> {/* Default route is LandingPage */}
        <Route path="/login" element={<AuthPage />} />
        
        {/* Public Routes with Navbar */}
        <Route element={<PublicLayout />}>
          {/* <Route path="/areas" element={<AreasPage />} /> Route for AreasPage removed */}
          <Route path="/areas/:areaId" element={<AreaDetailPage />} />
        </Route>
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}> {/* Layout for authenticated users */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/turnos" element={<AppointmentsPage />} />
            <Route path="/turnos/:turnoId" element={<AppointmentDetailPage />} />
            
            {/* Therapist specific routes */}
            <Route element={<ProtectedRoute allowedRoles={[UserRole.TERAPEUTA, UserRole.ADMIN]} />}> {/* Admin can also access these therapist routes */}
                <Route path="/tareas-equipo" element={<TareasTerapeutasPage />} />
                <Route path="/obras-sociales" element={<ObrasSocialesPage />} />
                <Route path="/facturacion" element={<FacturacionPage />} />
                {/* 
                  Example of other role-specific routes:
                  <Route path="/servicios" element={<ServicesManagementPage />} />
                  <Route path="/historial-clinico" element={<ClinicalHistoryPage />} />
                */}
            </Route>
            
            {/* 
              Admin specific routes (example)
              <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
                <Route path="/admin/usuarios" element={<UserManagementPage />} />
              </Route>
            */}
            {/* Removed redirect from / to /dashboard, as / is now landing */}
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  );
};