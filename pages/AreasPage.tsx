
import React, { useEffect, useState } from 'react';
import { areaService } from '../services/areaService';
import { Area } from '../types';
import { Spinner } from '../components/shared/Spinner';
import { Alert } from '../components/shared/Alert';
import { Link } from 'react-router-dom';
import { Button } from '../components/shared/Button';

// Placeholder icon, can be customized or removed
const AreaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2.25 2.25 0 00-2.25 2.25v2.25a2.25 2.25 0 002.25 2.25h2.25a2.25 2.25 0 002.25-2.25v-2.25a2.25 2.25 0 00-2.25-2.25h-2.25z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 7.428a2.25 2.25 0 00-2.25 2.25v2.25a2.25 2.25 0 002.25 2.25h2.25a2.25 2.25 0 002.25-2.25V9.678a2.25 2.25 0 00-2.25-2.25h-2.25z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.572 7.428a2.25 2.25 0 00-2.25 2.25v2.25a2.25 2.25 0 002.25 2.25h2.25a2.25 2.25 0 002.25-2.25V9.678a2.25 2.25 0 00-2.25-2.25H4.572z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.572 15.428a2.25 2.25 0 00-2.25 2.25v2.25a2.25 2.25 0 002.25 2.25h2.25a2.25 2.25 0 002.25-2.25v-2.25a2.25 2.25 0 00-2.25-2.25H4.572z" />
  </svg>
);


export const AreasPage: React.FC = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAreas = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedAreas = await areaService.getAreas();
        setAreas(fetchedAreas);
      } catch (err: any) {
        setError(err.message || 'Error al cargar las áreas.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAreas();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold text-slate-800">Nuestras Áreas de Especialización</h1>
        <Link to="/dashboard">
          <Button variant="outline" size="sm">Volver al Dashboard</Button>
        </Link>
      </div>

      {areas.length === 0 && !isLoading && (
        <Alert type="info" message="No hay áreas de especialización definidas actualmente." />
      )}

      {areas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {areas.map((area) => (
            <Link key={area.id} to={`/areas/${area.id}`} className="block group">
              <div className="bg-white p-6 rounded-lg shadow-lg group-hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center h-full cursor-pointer">
                <AreaIcon />
                <h2 className="text-xl font-semibold text-primary mb-2 group-hover:text-primary-dark transition-colors">{area.nombre}</h2>
                <p className="text-slate-600 text-sm flex-grow">
                  {area.descripcion ? (area.descripcion.length > 100 ? area.descripcion.substring(0, 97) + '...' : area.descripcion) : 'Descripción no disponible.'}
                </p>
                <span className="mt-3 text-sm text-primary group-hover:underline">Ver más detalles</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};