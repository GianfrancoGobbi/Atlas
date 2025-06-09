import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../shared/Button';
import { useAuth } from '../../hooks/useAuth';
import { TareaTerapeuta, TareaEstado } from '../../types';
import { tareaTerapeutaService } from '../../services/tareaTerapeutaService';
import { profileService } from '../../services/profileService'; // For fetching therapist names if needed for tasks
import { Spinner } from '../shared/Spinner';
import { TAREA_ESTADOS, TAREA_ESTADO_COLORES } from '../../constants';
import { TARGET_TIMEZONE_IANA } from '../../utils/timezones';

// Placeholder icons
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const TasksIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const HealthInsuranceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;


const formatDateForDashboard = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString.replace(" ", "T"));
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleDateString('es-ES', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: TARGET_TIMEZONE_IANA
      });
    } catch (e) {
      return 'Fecha inválida';
    }
};


export const TherapistDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [assignedTasks, setAssignedTasks] = useState<TareaTerapeuta[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(true);
  const [taskError, setTaskError] = useState<string | null>(null);

  const allTerapeutasMemo = useMemo(() => new Map<string, { nombre: string, apellido: string }>(), []);


  useEffect(() => {
    if (profile?.id) {
      const fetchTasks = async () => {
        setIsLoadingTasks(true);
        setTaskError(null);
        try {
          // Fetch tasks assigned to the current therapist, excluding completed ones, limit to 5
          const rawTasks = await tareaTerapeutaService.getTareasByTerapeutaId(profile.id, {
            limit: 5,
            excludeEstados: [TareaEstado.COMPLETADA],
          });

          // Fetch all therapist profiles to map names (could be optimized by fetching only needed ones or caching)
          if (allTerapeutasMemo.size === 0) { // Fetch only if map is empty
            const terapeutasProfiles = await profileService.getAllTerapeutas();
            terapeutasProfiles.forEach(t => allTerapeutasMemo.set(t.id, { nombre: t.nombre, apellido: t.apellido }));
          }
          
          const tasksWithNames = rawTasks.map(task => ({
            ...task,
            terapeutaNombre: allTerapeutasMemo.get(task.terapeutaId)
              ? `${allTerapeutasMemo.get(task.terapeutaId)!.nombre} ${allTerapeutasMemo.get(task.terapeutaId)!.apellido}`
              : 'Desconocido'
          }));

          setAssignedTasks(tasksWithNames);
        } catch (error: any) {
          setTaskError("Error al cargar tareas asignadas: " + error.message);
        } finally {
          setIsLoadingTasks(false);
        }
      };
      fetchTasks();
    }
  }, [profile, allTerapeutasMemo]);

  return (
    <div className="space-y-8">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-semibold text-primary-dark">Bienvenido/a, {profile ? `${profile.nombre} ${profile.apellido}` : 'Terapeuta'}!</h1>
        <p className="mt-2 text-brand-gray">Gestiona tus turnos y tareas colaborativas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> {/* Changed to md:grid-cols-3 */}
        <Link to="/turnos" className="bg-white shadow rounded-lg p-6 flex flex-col items-center text-center hover:shadow-xl transition-shadow">
          <CalendarIcon />
          <h2 className="text-xl font-semibold text-primary mt-3">Mis Turnos</h2>
          <p className="text-brand-gray mt-1">Ver y gestionar calendario de turnos.</p>
        </Link>
        
        <Link to="/tareas-equipo" className="bg-white shadow rounded-lg p-6 flex flex-col items-center text-center hover:shadow-xl transition-shadow">
          <TasksIcon />
          <h2 className="text-xl font-semibold text-primary mt-3">Tareas de Equipo</h2>
          <p className="text-brand-gray mt-1">Colaborar en tareas y proyectos.</p>
        </Link>

        <Link to="/obras-sociales" className="bg-white shadow rounded-lg p-6 flex flex-col items-center text-center hover:shadow-xl transition-shadow">
          <HealthInsuranceIcon />
          <h2 className="text-xl font-semibold text-primary mt-3">Obras Sociales</h2>
          <p className="text-brand-gray mt-1">Consultar y agregar obras sociales.</p>
        </Link>
      </div>

      {/* Assigned Tasks Section */}
      <div className="bg-white shadow rounded-lg p-6 mt-8">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-primary">Mis Tareas Pendientes</h2>
            <Link to="/tareas-equipo">
                 <Button variant="outline" size="sm">Ver Todas</Button>
            </Link>
        </div>
        {isLoadingTasks && <div className="flex justify-center py-4"><Spinner /></div>}
        {taskError && <p className="text-red-600">{taskError}</p>}
        {!isLoadingTasks && !taskError && assignedTasks.length === 0 && (
          <p className="text-brand-gray">No tienes tareas pendientes asignadas.</p>
        )}
        {!isLoadingTasks && !taskError && assignedTasks.length > 0 && (
          <ul className="space-y-3">
            {assignedTasks.map(task => (
              <li key={task.id} className="p-3 border rounded-md hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start">
                    <h3 className="font-medium text-primary-dark truncate pr-2" title={task.titulo}>{task.titulo}</h3>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${TAREA_ESTADO_COLORES[task.estado].bgClass} ${TAREA_ESTADO_COLORES[task.estado].textClass}`}>
                        {TAREA_ESTADOS[task.estado]}
                    </span>
                </div>
                {task.descripcion && <p className="text-sm text-slate-500 mt-1 truncate" title={task.descripcion}>{task.descripcion}</p>}
                <p className="text-xs text-brand-gray mt-1">
                  Límite: {formatDateForDashboard(task.fechaLimite)}
                  {/* If we track creator separately and it's different from assignee: 
                      (task.creadoPorId && task.creadoPorId !== task.terapeutaId && task.creadoPorNombre) && 
                      ` - Creada por: ${task.creadoPorNombre}` 
                  */}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Placeholder for today's appointments or alerts */}
      <div className="bg-white shadow rounded-lg p-6 mt-8">
        <h2 className="text-xl font-semibold text-primary mb-4">Turnos para Hoy</h2>
        <p className="text-brand-gray">No hay turnos programados para hoy (datos de ejemplo).</p>
      </div>
    </div>
  );
};
