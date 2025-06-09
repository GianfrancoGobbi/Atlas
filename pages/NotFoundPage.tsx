
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/shared/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center text-center py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-6xl font-extrabold text-primary tracking-tight sm:text-7xl">
        404
      </h1>
      <p className="mt-2 text-3xl font-bold text-slate-800 tracking-tight sm:text-4xl">
        Página no encontrada.
      </p>
      <p className="mt-3 text-base text-slate-600 max-w-md">
        Lo sentimos, no pudimos encontrar la página que estás buscando.
        Quizás escribiste mal la URL o la página ha sido movida.
      </p>
      <div className="mt-10">
        <Link to="/dashboard">
          <Button variant="primary" size="lg">
            Volver al Inicio
          </Button>
        </Link>
      </div>
    </div>
  );
};
