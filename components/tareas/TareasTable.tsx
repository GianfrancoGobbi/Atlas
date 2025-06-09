import React from 'react';
import { TareaTerapeuta, TareaEstado, UserProfile } from '../../types';
import { Button } from '../shared/Button';
import { TAREA_ESTADOS, TAREA_ESTADO_COLORES } from '../../constants';
import { TARGET_TIMEZONE_IANA } from '../../utils/timezones';

interface TareasTableProps {
  tareas: TareaTerapeuta[]; // Assumes TareaTerapeuta includes terapeutaNombre
  onEdit: (tarea: TareaTerapeuta) => void;
  onDelete: (tareaId: string) => void;
  isLoading?: boolean;
  currentUserId: string | null; // Still useful for context, e.g. highlighting own tasks if desired
}

export const TareasTable: React.FC<TareasTableProps> = ({
  tareas,
  onEdit,
  onDelete,
  isLoading,
  currentUserId, 
}) => {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      // Handles timestamps that might have a space instead of 'T'
      const date = new Date(dateString.replace(" ", "T")); 
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        timeZone: TARGET_TIMEZONE_IANA 
      });
    } catch (e) {
      return 'Fecha inválida';
    }
  };
  
  const formatCreationDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
        // Assuming creadaEn comes as UTC or a string that new Date() can parse.
        // Adding "Z" if it's a local-like timestamp from DB intended as UTC.
        // If it's already a full ISO string with Z, this won't harm.
        const dateInput = dateString.includes('T') || dateString.includes(' ') ? dateString.replace(" ", "T") : dateString + "T00:00:00";
        const date = new Date(dateInput.endsWith("Z") ? dateInput : dateInput + "Z");

        if (isNaN(date.getTime())) return 'Fecha inválida';
         return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            timeZone: TARGET_TIMEZONE_IANA 
        });
    } catch(e) {
        return "Fecha inválida";
    }
  };

  if (isLoading && tareas.length === 0) {
    return <p className="text-center text-brand-gray py-4">Cargando tareas...</p>;
  }

  if (tareas.length === 0) {
    return <p className="text-center text-brand-gray py-4">No hay tareas para mostrar.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Título</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Asignada a</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Estado</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Fecha Límite</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Creada En</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-gray uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {tareas.map((tarea) => {
            const estadoInfo = TAREA_ESTADO_COLORES[tarea.estado];
            const isAssignedToCurrentUser = tarea.terapeutaId === currentUserId;
            return (
              <tr key={tarea.id} className={`hover:bg-slate-50 transition-colors ${isAssignedToCurrentUser ? 'bg-primary-light/30' : ''}`}>
                <td className="px-6 py-4 whitespace-normal text-sm font-medium text-primary-dark break-words max-w-xs">
                  {tarea.titulo}
                  {tarea.descripcion && (
                     <p className="text-xs text-slate-500 mt-1 truncate" title={tarea.descripcion}>
                        {tarea.descripcion.length > 70 ? tarea.descripcion.substring(0, 67) + '...' : tarea.descripcion }
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray">{tarea.terapeutaNombre}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoInfo.bgClass} ${estadoInfo.textClass}`}>
                    {TAREA_ESTADOS[tarea.estado]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray">{formatDate(tarea.fechaLimite)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray">{formatCreationDate(tarea.creadaEn)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(tarea)}>
                    Editar
                  </Button>
                  {/* As per user: "todas pueden... borrar" */}
                  <Button variant="danger" size="sm" onClick={() => onDelete(tarea.id)}>
                      Eliminar
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};