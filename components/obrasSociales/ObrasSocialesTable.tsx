import React from 'react';
import { ObraSocial } from '../../types';
// No Button import needed if therapists cannot edit/delete

interface ObrasSocialesTableProps {
  obrasSociales: ObraSocial[];
  isLoading?: boolean;
}

export const ObrasSocialesTable: React.FC<ObrasSocialesTableProps> = ({
  obrasSociales,
  isLoading,
}) => {
  if (isLoading && obrasSociales.length === 0) {
    return <p className="text-center text-brand-gray py-4">Cargando obras sociales...</p>;
  }

  if (obrasSociales.length === 0) {
    return <p className="text-center text-brand-gray py-4">No hay obras sociales para mostrar.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Nombre</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Descripción</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Contacto</th>
            {/* No "Acciones" column for therapists */}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {obrasSociales.map((os) => (
            <tr key={os.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-dark">{os.nombre}</td>
              <td className="px-6 py-4 whitespace-normal text-sm text-brand-gray break-words max-w-md">
                {os.descripcion || <span className="text-slate-400">N/A</span>}
              </td>
              <td className="px-6 py-4 whitespace-normal text-sm text-brand-gray break-words max-w-xs">
                {os.contacto || <span className="text-slate-400">N/A</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
