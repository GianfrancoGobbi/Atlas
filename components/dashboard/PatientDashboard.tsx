
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../shared/Button';
import { useAuth } from '../../hooks/useAuth';

// Placeholder icons (replace with actual icons e.g. from Heroicons)
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const UserCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export const PatientDashboard: React.FC = () => {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-semibold text-primary-dark">Bienvenido, {profile ? `${profile.nombre} ${profile.apellido}` : 'Paciente'}!</h1> {/* text-slate-800 to text-primary-dark */}
        <p className="mt-2 text-brand-gray">Este es tu panel de control. Desde aquí puedes gestionar tus turnos y tu información personal.</p> {/* text-slate-600 to text-brand-gray */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center text-center">
          <CalendarIcon />
          <h2 className="text-xl font-semibold text-primary mt-3">Mis Turnos</h2> {/* text-slate-700 to text-primary */}
          <p className="text-brand-gray mt-1 mb-4">Visualiza tus próximos turnos y tu historial de citas.</p> {/* text-slate-500 to text-brand-gray */}
          <Link to="/turnos">
            <Button variant="primary">Ver Mis Turnos</Button>
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6 flex flex-col items-center text-center">
          <UserCircleIcon />
          <h2 className="text-xl font-semibold text-primary mt-3">Mi Perfil</h2> {/* text-slate-700 to text-primary */}
          <p className="text-brand-gray mt-1 mb-4">Actualiza tu información personal y de contacto.</p> {/* text-slate-500 to text-brand-gray */}
          <Link to="/perfil">
            <Button variant="outline">Editar Perfil</Button>
          </Link>
        </div>
      </div>

      {/* Placeholder for upcoming appointments list */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-primary mb-4">Próximos Turnos</h2> {/* text-slate-700 to text-primary */}
        <div className="text-brand-gray"> {/* text-slate-500 to text-brand-gray */}
          {/* Replace with actual appointment data */}
          <p>No tienes turnos programados próximamente.</p>
          {/* Example Item:
          <div className="border-b py-3">
            <p className="font-medium">Consulta Psicológica con Dr. Terapeuta Ejemplo</p>
            <p className="text-sm">Fecha: Lunes, 15 de Julio 2024 - 10:00 AM</p>
          </div> 
          */}
        </div>
      </div>
    </div>
  );
};