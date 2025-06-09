
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../shared/Button';
import { useAuth } from '../../hooks/useAuth';

// Placeholder icons
const ClipboardListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const CogIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;


export const TherapistDashboard: React.FC = () => {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-semibold text-primary-dark">Bienvenido/a, {profile ? `${profile.nombre} ${profile.apellido}` : 'Terapeuta'}!</h1> {/* text-slate-800 to text-primary-dark */}
        <p className="mt-2 text-brand-gray">Gestiona tus turnos, servicios y pacientes.</p> {/* text-slate-600 to text-brand-gray */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/turnos" className="bg-white shadow rounded-lg p-6 flex flex-col items-center text-center hover:shadow-xl transition-shadow">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <h2 className="text-xl font-semibold text-primary mt-3">Mis Turnos</h2> {/* text-slate-700 to text-primary */}
          <p className="text-brand-gray mt-1">Ver y gestionar calendario de turnos.</p> {/* text-slate-500 to text-brand-gray */}
        </Link>
        
        {/* Placeholder for Services Management - requires dedicated page and logic */}
        <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center text-center">
          <CogIcon/>
          <h2 className="text-xl font-semibold text-primary mt-3">Mis Servicios</h2> {/* text-slate-700 to text-primary */}
          <p className="text-brand-gray mt-1 mb-3">Administrar los servicios que ofreces.</p> {/* text-slate-500 to text-brand-gray */}
          <Button variant="outline" size="sm" onClick={() => alert('Funcionalidad de "Mis Servicios" por implementar.')}>Gestionar Servicios</Button>
        </div>

        {/* Placeholder for Clinical History - requires dedicated page and logic */}
        <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center text-center">
          <ClipboardListIcon/>
          <h2 className="text-xl font-semibold text-primary mt-3">Historial Clínico</h2> {/* text-slate-700 to text-primary */}
          <p className="text-brand-gray mt-1 mb-3">Acceder y actualizar historiales.</p> {/* text-slate-500 to text-brand-gray */}
          <Button variant="outline" size="sm" onClick={() => alert('Funcionalidad de "Historial Clínico" por implementar.')}>Ver Historiales</Button>
        </div>
      </div>

      {/* Placeholder for today's appointments or alerts */}
      <div className="bg-white shadow rounded-lg p-6 mt-8">
        <h2 className="text-xl font-semibold text-primary mb-4">Turnos para Hoy</h2> {/* text-slate-700 to text-primary */}
        <p className="text-brand-gray">No hay turnos programados para hoy (datos de ejemplo).</p> {/* text-slate-500 to text-brand-gray */}
      </div>
    </div>
  );
};