
import React, { useState, useMemo, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form'; // Changed import
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { Alert } from '../shared/Alert';
import { Turno, UserProfile } from '../../types'; 
import { profileService } from '../../services/profileService';
import { appointmentService } from '../../services/appointmentService';
import { Spinner } from '../shared/Spinner';
import { TARGET_TIMEZONE_IANA, formatTargetTimezoneDateTimeLocalToUTCISO, getLocalDateObjectForTargetTimezone, formatUTCISOToDateTimeLocalInTargetTimezone } from '../../utils/timezones';


// Helper to get today's date in YYYY-MM-DD format for TARGET_TIMEZONE_IANA
const getTodayDateStringInTargetTimezone = (): string => {
  const today = getLocalDateObjectForTargetTimezone(TARGET_TIMEZONE_IANA);
  const year = today.getFullYear(); 
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to get a sensible initial time for booking
const getInitialTimeForBooking = (dateString: string): string => {
  const todayString = getTodayDateStringInTargetTimezone();
  const defaultBookingTime = '09:00'; 

  if (dateString === todayString) {
    const nowInTarget = getLocalDateObjectForTargetTimezone(TARGET_TIMEZONE_IANA);
    let h = nowInTarget.getHours(); 
    let m = nowInTarget.getMinutes(); 

    if (m < 25) { 
      m = 30; 
    } else { 
      m = 0; 
      h += 1;
    }
    
    if (h >= 19) { 
      return defaultBookingTime;
    }
    if (h < 8) { 
      return '08:00';
    }
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  
  return defaultBookingTime; 
};


const BookingSchema = z.object({
  pacienteId: z.string().min(1, "Debe seleccionar un paciente."),
  fecha: z.string().min(1, "La fecha es requerida.").refine(val => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
    const [year, month, day] = val.split('-').map(Number);
    const date = new Date(year, month - 1, day); 
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }, { message: "Fecha inválida." }),
  hora: z.string().min(1, "La hora es requerida.").regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Formato de hora inválido (HH:MM)." }),
  duracionMinutos: z.coerce.number().min(15, "La duración debe ser al menos 15 minutos.").max(240, "La duración no puede exceder 240 minutos."),
  recurrence: z.enum(['single', 'weekly', 'biweekly']),
});

type BookingFormInputs = z.infer<typeof BookingSchema>;

interface BookingFormProps {
  therapistId: string;
  existingAppointments: Turno[];
  onBookAppointments: (newAppointments: Turno[]) => void;
  onClose: () => void;
  initialDate?: string; 
}

export const BookingForm: React.FC<BookingFormProps> = ({ therapistId, existingAppointments, onBookAppointments, onClose, initialDate }) => {
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [patients, setPatients] = useState<Pick<UserProfile, 'id' | 'nombre' | 'apellido'>[]>([]);
  
  const effectiveInitialDate = initialDate || getTodayDateStringInTargetTimezone();

  const { register, handleSubmit, formState: { errors }, setValue, control, watch } = useForm<BookingFormInputs>({ // Changed usage
    resolver: zodResolver(BookingSchema),
    defaultValues: {
      pacienteId: '', 
      recurrence: 'single',
      fecha: effectiveInitialDate,
      duracionMinutos: 60, 
      hora: getInitialTimeForBooking(effectiveInitialDate),
    }
  });

  const selectedFechaForRecurrenceInfo = watch('fecha', effectiveInitialDate);


  useEffect(() => {
    const newFecha = initialDate || getTodayDateStringInTargetTimezone();
    setValue('fecha', newFecha);
    setValue('hora', getInitialTimeForBooking(newFecha));
  }, [initialDate, setValue]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const fetchedPatients = await profileService.getPacientes(); 
        setPatients(fetchedPatients);
      } catch (error: any) {
        setFormError(`Error cargando datos para el formulario: ${error.message}`);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, []);


  const checkConflict = (newStartTimeLocalString: string, newEndTimeLocalString: string): boolean => {
    // newStartTimeLocalString and newEndTimeLocalString are YYYY-MM-DDTHH:MM:SS in TARGET_TIMEZONE_IANA
    // Convert new local time strings to YYYY-MM-DDTHH:MM for comparison format used by utility
    const newStartLocalShort = newStartTimeLocalString.substring(0, 16); // YYYY-MM-DDTHH:MM
    const newEndLocalShort = newEndTimeLocalString.substring(0, 16);   // YYYY-MM-DDTHH:MM

    const therapistAppointments = existingAppointments.filter(ea => ea.terapeutaId === therapistId);

    return therapistAppointments.some(existing => {
      // formatUTCISOToDateTimeLocalInTargetTimezone returns YYYY-MM-DDTHH:MM (Argentina Local)
      const existingStartLocalShort = formatUTCISOToDateTimeLocalInTargetTimezone(existing.fechaHoraInicio, TARGET_TIMEZONE_IANA);
      const existingEndLocalShort = formatUTCISOToDateTimeLocalInTargetTimezone(existing.fechaHoraFin, TARGET_TIMEZONE_IANA);

      // Check for invalid formatted strings from utility
      if (!existingStartLocalShort || !existingEndLocalShort) {
        console.warn(`Could not format existing appointment times (ID: ${existing.id}) for conflict check. Start: ${existing.fechaHoraInicio}, End: ${existing.fechaHoraFin}`);
        // Depending on desired strictness, you might treat this as a potential conflict or log and skip.
        // For safety, let's assume it could be a conflict if formatting fails, though ideally it shouldn't.
        return true; 
      }

      // Standard interval overlap condition: (StartA < EndB) and (EndA > StartB)
      // All times are now YYYY-MM-DDTHH:MM strings in Argentina local time.
      // String comparison works for ISO-like formats.
      return newStartLocalShort < existingEndLocalShort && newEndLocalShort > existingStartLocalShort;
    });
  };

  const onSubmit: SubmitHandler<BookingFormInputs> = async (data) => { // Changed usage
    setFormError(null);
    
    const initialStartTimeLocalInputStr = `${data.fecha}T${data.hora}`; // e.g., "2023-10-26T10:00"
    
    // This now returns YYYY-MM-DDTHH:MM:SS (local time string)
    const initialStartTimeLocalDBFormattedStr = formatTargetTimezoneDateTimeLocalToUTCISO(initialStartTimeLocalInputStr, TARGET_TIMEZONE_IANA);
    
    if (!initialStartTimeLocalDBFormattedStr) {
        setFormError("Fecha u hora de inicio inválida.");
        return;
    }

    const numDuracionMinutos = Number(data.duracionMinutos);
    if (isNaN(numDuracionMinutos)) {
        setFormError("La duración en minutos no es un número válido.");
        return;
    }

    let appointmentsToCreate: Omit<Turno, 'id'>[] = [];
    const recurrenceYearInTargetTimezone = parseInt(data.fecha.substring(0,4));

    // For recurrence, work with Date objects representing local time in TARGET_TIMEZONE_IANA
    const [year, month, day] = data.fecha.split('-').map(Number);
    const [hour, minute] = data.hora.split(':').map(Number);
    let currentIterLocalDate = new Date(year, month - 1, day, hour, minute); // Local Date in system TZ, but components are for TARGET_TIMEZONE_IANA


    if (data.recurrence === 'single') {
      const endTimeLocalDate = new Date(currentIterLocalDate.getTime() + numDuracionMinutos * 60000);
      const startTimeLocalForDB = formatTargetTimezoneDateTimeLocalToUTCISO(`${data.fecha}T${data.hora}`, TARGET_TIMEZONE_IANA);
      const endTimeLocalForDB = formatTargetTimezoneDateTimeLocalToUTCISO(
          `${endTimeLocalDate.getFullYear()}-${(endTimeLocalDate.getMonth() + 1).toString().padStart(2, '0')}-${endTimeLocalDate.getDate().toString().padStart(2, '0')}T${endTimeLocalDate.getHours().toString().padStart(2, '0')}:${endTimeLocalDate.getMinutes().toString().padStart(2, '0')}`, 
          TARGET_TIMEZONE_IANA
      );

      if (checkConflict(startTimeLocalForDB, endTimeLocalForDB)) {
        setFormError(`Conflicto de horario para el ${new Date(currentIterLocalDate).toLocaleString('es-ES', {dateStyle: 'short', timeStyle: 'short', timeZone: TARGET_TIMEZONE_IANA })}. Por favor, elija otra hora.`);
        return;
      }
      appointmentsToCreate.push({
        pacienteId: data.pacienteId,
        terapeutaId: therapistId,
        fechaHoraInicio: startTimeLocalForDB, // Send local time string
        fechaHoraFin: endTimeLocalForDB,       // Send local time string
        estado: 'pendiente', 
      });
    } else { 
      const stepDays = data.recurrence === 'weekly' ? 7 : 14;

      while (currentIterLocalDate.getFullYear() === recurrenceYearInTargetTimezone) {
        const currentIterEndTimeLocalDate = new Date(currentIterLocalDate.getTime() + numDuracionMinutos * 60000);
        
        const currentIterStartTimeLocalForDB = formatTargetTimezoneDateTimeLocalToUTCISO(
            `${currentIterLocalDate.getFullYear()}-${(currentIterLocalDate.getMonth() + 1).toString().padStart(2, '0')}-${currentIterLocalDate.getDate().toString().padStart(2, '0')}T${currentIterLocalDate.getHours().toString().padStart(2, '0')}:${currentIterLocalDate.getMinutes().toString().padStart(2, '0')}`,
            TARGET_TIMEZONE_IANA
        );
        const currentIterEndTimeLocalForDB = formatTargetTimezoneDateTimeLocalToUTCISO(
            `${currentIterEndTimeLocalDate.getFullYear()}-${(currentIterEndTimeLocalDate.getMonth() + 1).toString().padStart(2, '0')}-${currentIterEndTimeLocalDate.getDate().toString().padStart(2, '0')}T${currentIterEndTimeLocalDate.getHours().toString().padStart(2, '0')}:${currentIterEndTimeLocalDate.getMinutes().toString().padStart(2, '0')}`,
            TARGET_TIMEZONE_IANA
        );

        if (checkConflict(currentIterStartTimeLocalForDB, currentIterEndTimeLocalForDB)) {
          const displayDateTime = currentIterLocalDate.toLocaleString('es-ES', {dateStyle: 'short', timeStyle: 'short', timeZone: TARGET_TIMEZONE_IANA });
          setFormError(`Conflicto de horario para el ${displayDateTime} en la serie recurrente. No se agendarán turnos a partir de esta fecha.`);
          if (appointmentsToCreate.length > 0) break; 
          return; 
        }
        appointmentsToCreate.push({
          pacienteId: data.pacienteId,
          terapeutaId: therapistId,
          fechaHoraInicio: currentIterStartTimeLocalForDB, // Send local time string
          fechaHoraFin: currentIterEndTimeLocalForDB,       // Send local time string
          estado: 'pendiente',
        });
        
        currentIterLocalDate.setDate(currentIterLocalDate.getDate() + stepDays);
      }
      
      if (appointmentsToCreate.length === 0 && !formError) {
        setFormError("No se generaron turnos para la recurrencia. Verifique la fecha de inicio.");
        return;
      }
    }
    
    if (appointmentsToCreate.length > 0) {
        try {
            // appointmentService.createTurnos expects fechaHoraInicio/Fin to be the strings that Supabase will receive.
            // These are now local time strings (YYYY-MM-DDTHH:MM:SS).
            const bookedAppointments = await appointmentService.createTurnos(appointmentsToCreate);
            onBookAppointments(bookedAppointments); // bookedAppointments will have UTC strings from DB
        } catch (error: any) {
            setFormError(`Error al guardar los turnos: ${error.message}`);
        }
    } else if (!formError) {
        setFormError("No se pudieron generar turnos. Revise los parámetros.");
    }
  };

  if (isLoadingData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  
  const recurrenceYearDisplay = selectedFechaForRecurrenceInfo 
    ? new Date(selectedFechaForRecurrenceInfo + "T00:00:00").toLocaleDateString('es-ES', { year: 'numeric', timeZone: TARGET_TIMEZONE_IANA }) 
    : getLocalDateObjectForTargetTimezone(TARGET_TIMEZONE_IANA).getFullYear().toString();


  return (
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <h3 id="booking-modal-title" className="text-2xl font-semibold mb-6 text-primary-dark">Agendar Nuevo Turno</h3> {/* text-slate-800 to text-primary-dark */}
      {formError && <Alert type="error" message={formError} onClose={() => setFormError(null)} />}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="pacienteId" className="block text-sm font-medium text-brand-gray mb-1">Paciente</label> {/* text-slate-700 to text-brand-gray */}
          <select
            id="pacienteId"
            {...register("pacienteId")}
            className={`mt-1 block w-full px-3 py-2 bg-white border ${errors.pacienteId ? 'border-red-500' : 'border-slate-300'} rounded-md text-sm shadow-sm placeholder-slate-400 text-brand-gray focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary`} // text-slate-900 to text-brand-gray
          >
            <option value="">Seleccione un paciente</option>
            {patients.map(p => <option key={p.id} value={p.id}>{`${p.nombre} ${p.apellido}`}</option>)}
          </select>
          {errors.pacienteId && <p className="mt-1 text-xs text-red-600">{errors.pacienteId.message}</p>}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Fecha" type="date" name="fecha" {...register("fecha")} error={errors.fecha?.message} className="sm:col-span-2"/>
          <Input 
            label="Hora" 
            type="time" 
            name="hora" 
            step="1800" 
            {...register("hora")} 
            error={errors.hora?.message} 
          />
        </div>
        
        <Input
          label="Duración (minutos)"
          type="number"
          step="15"
          {...register("duracionMinutos")}
          error={errors.duracionMinutos?.message}
        />

        <div>
          <label className="block text-sm font-medium text-brand-gray mb-1">Recurrencia</label> {/* text-slate-700 to text-brand-gray */}
          <div className="flex items-center space-x-4 mt-2 flex-wrap">
            {(['single', 'weekly', 'biweekly'] as const).map((value) => (
              <label key={value} className="flex items-center space-x-2 text-sm text-brand-gray mb-2 sm:mb-0"> {/* text-slate-700 to text-brand-gray */}
                <input
                  type="radio"
                  value={value}
                  {...register("recurrence")}
                  className="focus:ring-primary h-4 w-4 text-primary border-slate-300"
                />
                <span>
                  {value === 'single' ? 'Una vez' : 
                   value === 'weekly' ? `Semanalmente (hasta fin de ${recurrenceYearDisplay})` :
                   `Quincenalmente (hasta fin de ${recurrenceYearDisplay})`}
                </span>
              </label>
            ))}
          </div>
          {errors.recurrence && <p className="mt-1 text-xs text-red-600">{errors.recurrence.message}</p>}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Agendar Turno(s)</Button>
        </div>
      </form>
    </div>
  );
};