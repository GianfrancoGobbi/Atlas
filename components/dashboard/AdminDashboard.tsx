
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../shared/Button';
import { useAuth } from '../../hooks/useAuth';

// Placeholder icons
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 016-6h6a6 6 0 016 6v1h-3" /></svg>;
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const CogIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;


export const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-semibold text-primary-dark">Panel de Administración</h1> {/* text-slate-800 to text-primary-dark */}
        <p className="mt-2 text-brand-gray">Bienvenido/a, {profile ? `${profile.nombre} ${profile.apellido}` : 'Admin'}. Gestiona la plataforma.</p> {/* text-slate-600 to text-brand-gray */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder for User Management */}
        <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center text-center">
          <UsersIcon />
          <h2 className="text-xl font-semibold text-primary mt-3">Gestión de Usuarios</h2> {/* text-slate-700 to text-primary */}
          <p className="text-brand-gray mt-1 mb-3">Administrar pacientes y terapeutas.</p> {/* text-slate-500 to text-brand-gray */}
          <Button variant="primary" onClick={() => alert('Funcionalidad de "Gestión de Usuarios" por implementar.')}>Administrar Usuarios</Button>
        </div>

        {/* Placeholder for System Configuration */}
        <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center text-center">
          <CogIcon />
          <h2 className="text-xl font-semibold text-primary mt-3">Configuración</h2> {/* text-slate-700 to text-primary */}
          <p className="text-brand-gray mt-1 mb-3">Ajustes generales del sistema (áreas, etc.).</p> {/* text-slate-500 to text-brand-gray */}
          <Button variant="outline" onClick={() => alert('Funcionalidad de "Configuración" por implementar.')}>Ir a Configuración</Button>
        </div>
        
        {/* Placeholder for Reports/Analytics */}
        <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center text-center">
          <ChartBarIcon />
          <h2 className="text-xl font-semibold text-primary mt-3">Reportes</h2> {/* text-slate-700 to text-primary */}
          <p className="text-brand-gray mt-1 mb-3">Ver estadísticas y reportes de la plataforma.</p> {/* text-slate-500 to text-brand-gray */}
          <Button variant="outline" onClick={() => alert('Funcionalidad de "Reportes" por implementar.')}>Ver Reportes</Button>
        </div>
      </div>
      
      {/* Additional admin specific information or quick actions */}
      <div className="bg-white shadow rounded-lg p-6 mt-8">
        <h2 className="text-xl font-semibold text-primary mb-4">Actividad Reciente</h2> {/* text-slate-700 to text-primary */}
        <p className="text-brand-gray">No hay actividad reciente para mostrar (datos de ejemplo).</p> {/* text-slate-500 to text-brand-gray */}
      </div>
    </div>
  );
};