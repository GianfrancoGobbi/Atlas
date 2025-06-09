
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { appointmentService } from '../services/appointmentService';
import { profileService } from '../services/profileService';
import { geminiService } from '../services/geminiService';
import { Turno, UserProfile, UserRole } from '../types';
import { Spinner } from '../components/shared/Spinner';
import { Alert } from '../components/shared/Alert';
import { Button } from '../components/shared/Button';
import { Textarea } from '../components/shared/Textarea';
import { ConfirmationModal } from '../components/shared/ConfirmationModal';
import { APPOINTMENT_STATUS_COLORS, USER_FRIENDLY_STATUS } from '../constants';
import { 
  TARGET_TIMEZONE_IANA, 
  formatUTCISOToDateTimeLocalInTargetTimezone, 
  formatTargetTimezoneDateTimeLocalToUTCISO 
} from '../utils/timezones';


const statusOptions: Turno['estado'][] = ['pendiente', 'confirmado', 'cancelado', 'finalizado'];

const displayLocaleStringOptions: Intl.DateTimeFormatOptions = { 
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
  hour: '2-digit', minute: '2-digit', timeZone: TARGET_TIMEZONE_IANA 
};
const displayTimeOnlyOptions: Intl.DateTimeFormatOptions = { 
  hour: '2-digit', minute: '2-digit', timeZone: TARGET_TIMEZONE_IANA 
};

export const AppointmentDetailPage: React.FC = () => {
  const { turnoId } = useParams<{ turnoId: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile, role: currentUserRole } = useAuth();

  const [appointment, setAppointment] = useState<Turno | null>(null);
  const [relatedProfile, setRelatedProfile] = useState<UserProfile | null>(null);

  const [annotations, setAnnotations] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<Turno['estado'] | ''>('');
  const [editableFechaHoraInicio, setEditableFechaHoraInicio] = useState<string>('');
  const [editableFechaHoraFin, setEditableFechaHoraFin] = useState<string>('');


  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchAppointmentDetails = useCallback(async () => {
    if (!turnoId || !currentUserRole || !currentUserProfile) return;
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setAiError(null);

    try {
      const fetchedAppointment = await appointmentService.getAppointmentById(turnoId);
      if (!fetchedAppointment) {
        setError("Turno no encontrado.");
        setIsLoading(false);
        return;
      }

      if (currentUserRole === UserRole.PACIENTE && fetchedAppointment.pacienteId !== currentUserProfile.id) {
          setError("No autorizado para ver este turno.");
          setAppointment(null);
          setIsLoading(false);
          return;
      }
      if (currentUserRole === UserRole.TERAPEUTA && fetchedAppointment.terapeutaId !== currentUserProfile.id) {
          setError("No autorizado para ver este turno.");
          setAppointment(null);
          setIsLoading(false);
          return;
      }

      setAppointment(fetchedAppointment);
      setSelectedStatus(fetchedAppointment.estado);
      setAnnotations(fetchedAppointment.notasTerapeuta || '');
      
      const formattedEditableStart = formatUTCISOToDateTimeLocalInTargetTimezone(fetchedAppointment.fechaHoraInicio, TARGET_TIMEZONE_IANA);
      const formattedEditableEnd = formatUTCISOToDateTimeLocalInTargetTimezone(fetchedAppointment.fechaHoraFin, TARGET_TIMEZONE_IANA);
      setEditableFechaHoraInicio(formattedEditableStart);
      setEditableFechaHoraFin(formattedEditableEnd);

      let profileToFetchId: string | null = null;
      if (currentUserRole === UserRole.TERAPEUTA) {
        profileToFetchId = fetchedAppointment.pacienteId;
      } else if (currentUserRole === UserRole.PACIENTE) {
        profileToFetchId = fetchedAppointment.terapeutaId;
      }

      if (profileToFetchId) {
        const fetchedRelatedProfile = await profileService.getProfileByUserId(profileToFetchId);
        setRelatedProfile(fetchedRelatedProfile);
      }

    } catch (e: any) {
      setError(e.message || "Error al cargar los detalles del turno.");
    } finally {
      setIsLoading(false);
    }
  }, [turnoId, currentUserRole, currentUserProfile]);

  useEffect(() => {
    fetchAppointmentDetails();
  }, [fetchAppointmentDetails]);

  const handleSaveChanges = async () => {
    if (!appointment || !turnoId || selectedStatus === '') return;
    if (currentUserRole !== UserRole.TERAPEUTA) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    setAiError(null);

    // editableFechaHoraInicio and editableFechaHoraFin are already local time strings from the input fields
    // formatTargetTimezoneDateTimeLocalToUTCISO will now format them as YYYY-MM-DDTHH:MM:SS (local time string)
    const newFechaHoraInicioLocalString = formatTargetTimezoneDateTimeLocalToUTCISO(editableFechaHoraInicio, TARGET_TIMEZONE_IANA);
    const newFechaHoraFinLocalString = formatTargetTimezoneDateTimeLocalToUTCISO(editableFechaHoraFin, TARGET_TIMEZONE_IANA);

    if (!newFechaHoraInicioLocalString || !newFechaHoraFinLocalString) {
        setError("Las fechas y horas de inicio o fin no son válidas. Verifique el formato.");
        setIsSaving(false);
        return;
    }
    
    // For comparison, create Date objects. These will be in system's local time if no 'Z' or offset.
    // However, comparison of YYYY-MM-DDTHH:MM strings is fine if they are in the same timezone context.
    // To be safe, parse them as if they are local to target timezone.
    const startDateForCompare = new Date(editableFechaHoraInicio); 
    const endDateForCompare = new Date(editableFechaHoraFin);


    if (endDateForCompare <= startDateForCompare) {
      setError("La fecha/hora de finalización debe ser posterior a la fecha/hora de inicio.");
      setIsSaving(false);
      return;
    }

    try {
      const updates: Partial<Pick<Turno, 'estado' | 'notasTerapeuta' | 'fechaHoraInicio' | 'fechaHoraFin'>> = {
        estado: selectedStatus as Turno['estado'],
        notasTerapeuta: annotations,
        fechaHoraInicio: newFechaHoraInicioLocalString, // Send local time string
        fechaHoraFin: newFechaHoraFinLocalString,     // Send local time string
      };
      // appointmentService needs to know these strings are local and Supabase will handle them
      const updatedAppointment = await appointmentService.updateAppointment(turnoId, updates);
      
      if (updatedAppointment) {
        // Refetch or update state based on potentially modified UTC values from DB
        // The updatedAppointment contains UTC strings from the DB after Supabase processed the local times
        setAppointment(updatedAppointment); 
        setSelectedStatus(updatedAppointment.estado);
        setAnnotations(updatedAppointment.notasTerapeuta || '');
        
        // Update input fields with formatted local time from the (now UTC) DB values
        const newFormattedEditableStart = formatUTCISOToDateTimeLocalInTargetTimezone(updatedAppointment.fechaHoraInicio, TARGET_TIMEZONE_IANA);
        const newFormattedEditableEnd = formatUTCISOToDateTimeLocalInTargetTimezone(updatedAppointment.fechaHoraFin, TARGET_TIMEZONE_IANA);
        setEditableFechaHoraInicio(newFormattedEditableStart);
        setEditableFechaHoraFin(newFormattedEditableEnd);
                
        setSuccessMessage("Turno actualizado con éxito.");
      } else {
        setError("Error al actualizar el turno: no se recibieron datos actualizados.");
      }
    } catch (e: any) {
      setError(e.message || "Error al guardar los cambios del turno.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnhanceWithAi = async () => {
    if (!geminiService.isAvailable()) {
      setAiError("El servicio de IA no está disponible. Verifique la configuración de la clave API.");
      return;
    }
    if (currentUserRole !== UserRole.TERAPEUTA || !annotations.trim()) return;

    setIsAiProcessing(true);
    setAiError(null);
    try {
      const enhancedNotes = await geminiService.enhanceClinicalNotes(annotations);
      setAnnotations(enhancedNotes);
    } catch (e: any) {
      setAiError(e.message || "Error al mejorar las notas con IA.");
      console.error("Error enhancing notes with AI:", e);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!turnoId) {
      setError("No se puede eliminar: ID de turno no disponible.");
      setShowDeleteConfirmModal(false);
      return;
    }
    if (currentUserRole !== UserRole.TERAPEUTA) {
      setError("No tiene permisos para eliminar este turno.");
      setShowDeleteConfirmModal(false);
      return;
    }

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await appointmentService.deleteAppointment(turnoId);
      setSuccessMessage("Turno eliminado con éxito. Redirigiendo...");
      setTimeout(() => navigate('/turnos'), 2000); 
    } catch (e: any)
     {
      setError(e.message || "Error al eliminar el turno.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmModal(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
         <Alert type="error" message={error} />
         <div className="mt-4">
            <Link to="/turnos">
              <Button variant="outline">Volver a Turnos</Button>
            </Link>
          </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert type="warning" message="Turno no encontrado o no tiene permiso para verlo." />
        <div className="mt-4">
            <Link to="/turnos">
              <Button variant="outline">Volver a Turnos</Button>
            </Link>
        </div>
      </div>
    );
  }
  
  const statusColorInfo = APPOINTMENT_STATUS_COLORS[appointment.estado];

  const displayFechaHoraInicioFull = new Date(appointment.fechaHoraInicio).toLocaleString('es-ES', displayLocaleStringOptions);
  const displayFechaHoraFinTimeOnly = new Date(appointment.fechaHoraFin).toLocaleString('es-ES', displayTimeOnlyOptions);


  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-primary-dark">Detalle del Turno</h1> {/* text-slate-800 to text-primary-dark */}
        <Link to="/turnos">
          <Button variant="outline" size="sm">Volver a Turnos</Button>
        </Link>
      </div>

      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}
      
      <div className="bg-white shadow-xl rounded-lg p-6">
        <div className={`mb-4 p-3 rounded-md ${statusColorInfo?.bgClass || 'bg-slate-100'} ${statusColorInfo?.textClass || 'text-brand-gray'} border ${statusColorInfo?.borderClass || 'border-slate-300'}`}>
          <p className="font-semibold text-lg">
            Estado: {USER_FRIENDLY_STATUS[appointment.estado] || appointment.estado}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <p className="font-medium text-slate-500">Fecha y Hora:</p> {/* Keep slate-500 for secondary info label color or use lighter brand-gray */}
            <p className="text-brand-gray font-semibold">{displayFechaHoraInicioFull} - {displayFechaHoraFinTimeOnly}</p> {/* text-slate-700 to text-brand-gray */}
          </div>
          
          {currentUserRole === UserRole.TERAPEUTA && relatedProfile && (
            <div>
              <p className="font-medium text-slate-500">Paciente:</p>
              <p className="text-brand-gray">{`${relatedProfile.nombre} ${relatedProfile.apellido}`}</p> {/* text-slate-700 to text-brand-gray */}
            </div>
          )}
          {currentUserRole === UserRole.PACIENTE && relatedProfile && (
             <div>
              <p className="font-medium text-slate-500">Terapeuta:</p>
              <p className="text-brand-gray">{`${relatedProfile.nombre} ${relatedProfile.apellido}`}</p> {/* text-slate-700 to text-brand-gray */}
              {relatedProfile.especialidad && <p className="text-xs text-slate-500">{relatedProfile.especialidad}</p>}
            </div>
          )}
        </div>

        {appointment.notasPaciente && currentUserRole === UserRole.TERAPEUTA && (
          <div className="mt-4">
            <p className="font-medium text-slate-500">Notas del Paciente (al reservar):</p>
            <p className="text-brand-gray bg-slate-50 p-2 rounded border border-slate-200 whitespace-pre-wrap">{appointment.notasPaciente}</p> {/* text-slate-700 to text-brand-gray */}
          </div>
        )}
      </div>

      {currentUserRole === UserRole.TERAPEUTA && (
        <div className="bg-white shadow-xl rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-primary">Gestionar Turno</h2> {/* text-slate-700 to text-primary */}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="fechaHoraInicio" className="block text-sm font-medium text-brand-gray mb-1"> {/* text-slate-700 to text-brand-gray */}
                    Inicio del Turno (en {TARGET_TIMEZONE_IANA.replace(/_/g,' ')})
                </label>
                <input
                    type="datetime-local"
                    id="fechaHoraInicio"
                    name="fechaHoraInicio"
                    value={editableFechaHoraInicio}
                    onChange={(e) => setEditableFechaHoraInicio(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 text-brand-gray focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" /* text-slate-900 to text-brand-gray */
                />
            </div>
            <div>
                <label htmlFor="fechaHoraFin" className="block text-sm font-medium text-brand-gray mb-1"> {/* text-slate-700 to text-brand-gray */}
                    Fin del Turno (en {TARGET_TIMEZONE_IANA.replace(/_/g,' ')})
                </label>
                <input
                    type="datetime-local"
                    id="fechaHoraFin"
                    name="fechaHoraFin"
                    value={editableFechaHoraFin}
                    onChange={(e) => setEditableFechaHoraFin(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 text-brand-gray focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" /* text-slate-900 to text-brand-gray */
                />
            </div>
          </div>


          <div>
            <label htmlFor="status" className="block text-sm font-medium text-brand-gray mb-1">Cambiar Estado</label> {/* text-slate-700 to text-brand-gray */}
            <select
              id="status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as Turno['estado'])}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm text-brand-gray focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" // text-slate-900 to text-brand-gray
            >
              <option value="" disabled>Seleccione un estado</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{USER_FRIENDLY_STATUS[status] || status}</option>
              ))}
            </select>
          </div>

          <Textarea
            label="Notas del Terapeuta (Historial Clínico)"
            name="annotations"
            value={annotations}
            onChange={(e) => setAnnotations(e.target.value)}
            rows={6}
            placeholder="Añada sus notas sobre la sesión aquí..."
          />
          
          {aiError && <Alert type="error" message={aiError} onClose={() => setAiError(null)} />}
          {geminiService.isAvailable() && (
            <Button 
                onClick={handleEnhanceWithAi} 
                variant="outline" 
                size="sm" 
                isLoading={isAiProcessing}
                disabled={!annotations.trim()}
                className="flex items-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor"> {/* Icon color to primary */}
                    <path fillRule="evenodd" d="M17.293 5.293a1 1 0 011.414 1.414l-8.5 8.5a1 1 0 01-1.414 0l-4.5-4.5a1 1 0 011.414-1.414L10 12.586l7.293-7.293zM10 2a1 1 0 00-1 1v1.586l-1.707-1.707a1 1 0 00-1.414 1.414L7.586 6H6a1 1 0 000 2h1.586l-1.707 1.707a1 1 0 001.414 1.414L9 9.414V11a1 1 0 002 0V9.414l1.707 1.707a1 1 0 001.414-1.414L12.414 8H14a1 1 0 000-2h-1.586l1.707-1.707a1 1 0 00-1.414-1.414L11 4.586V3a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {isAiProcessing ? 'Procesando con IA...' : 'Mejorar Notas con IA'}
            </Button>
          )}

          <div className="flex justify-between items-center pt-4">
            <Button 
              onClick={() => setShowDeleteConfirmModal(true)} 
              variant="danger" 
              isLoading={isDeleting}
            >
              Eliminar Turno
            </Button>
            <Button 
              onClick={handleSaveChanges} 
              variant="primary" 
              isLoading={isSaving}
            >
              Guardar Cambios
            </Button>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={handleDeleteAppointment}
        title="Confirmar Eliminación"
        message="¿Está seguro de que desea eliminar este turno? Esta acción no se puede deshacer."
        confirmButtonText="Sí, Eliminar"
        confirmButtonVariant="danger"
      />

    </div>
  );
};