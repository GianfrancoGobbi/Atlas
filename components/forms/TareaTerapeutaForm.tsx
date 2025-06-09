import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../shared/Input';
import { Textarea } from '../shared/Textarea';
import { Button } from '../shared/Button';
import { Alert } from '../shared/Alert';
import { TareaTerapeuta, TareaEstado, UserProfile } from '../../types';
import { TAREA_ESTADOS } from '../../constants';
import { formatUTCISOToDateTimeLocalInTargetTimezone, formatTargetTimezoneDateTimeLocalToUTCISO, TARGET_TIMEZONE_IANA, getLocalDateObjectForTargetTimezone } from '../../utils/timezones';
import { profileService } from '../../services/profileService';
import { Spinner } from '../shared/Spinner';

const TareaTerapeutaSchema = z.object({
  terapeutaId: z.string().min(1, "Debe asignar la tarea a un terapeuta."),
  titulo: z.string().min(3, "El título debe tener al menos 3 caracteres."),
  descripcion: z.string().optional(),
  estado: z.nativeEnum(TareaEstado),
  fechaLimite: z.string().optional().nullable().refine(val => {
    if (!val) return true; 
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val);
  }, { message: "Formato de fecha límite inválido (YYYY-MM-DDTHH:MM)." }),
});

export type TareaTerapeutaFormInputs = z.infer<typeof TareaTerapeutaSchema>;

interface TareaTerapeutaFormProps {
  onSubmit: (data: TareaTerapeutaFormInputs) => Promise<void>;
  onClose: () => void;
  initialData?: TareaTerapeuta | null; // TareaTerapeuta will have terapeutaNombre
  isLoading: boolean;
  error?: string | null;
  currentTherapistId: string; 
  allTerapeutas: Pick<UserProfile, 'id' | 'nombre' | 'apellido'>[];
}

export const TareaTerapeutaForm: React.FC<TareaTerapeutaFormProps> = ({
  onSubmit,
  onClose,
  initialData,
  isLoading,
  error: submissionError,
  currentTherapistId,
  allTerapeutas,
}) => {

  const formatFechaLimiteForInput = (dbTimestamp?: string | null): string => {
    if (!dbTimestamp) return '';
    const datePart = dbTimestamp.substring(0, 10);
    const timePart = dbTimestamp.substring(11, 16);
    if (datePart && timePart && (dbTimestamp.includes("T") || dbTimestamp.includes(" "))) {
        return `${datePart}T${timePart}`;
    }
    return '';
  };
  
  const defaultInitialDate = () => {
    const today = getLocalDateObjectForTargetTimezone(TARGET_TIMEZONE_IANA);
    today.setDate(today.getDate() + 1); 
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}T17:00`; 
  };

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<TareaTerapeutaFormInputs>({
    resolver: zodResolver(TareaTerapeutaSchema),
    defaultValues: {
      terapeutaId: initialData?.terapeutaId || currentTherapistId,
      titulo: initialData?.titulo || '',
      descripcion: initialData?.descripcion || '',
      estado: initialData?.estado || TareaEstado.A_REALIZAR,
      fechaLimite: initialData?.fechaLimite ? formatFechaLimiteForInput(initialData.fechaLimite) : defaultInitialDate(),
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        terapeutaId: initialData.terapeutaId,
        titulo: initialData.titulo,
        descripcion: initialData.descripcion || '',
        estado: initialData.estado,
        fechaLimite: initialData.fechaLimite ? formatFechaLimiteForInput(initialData.fechaLimite) : defaultInitialDate(),
      });
    } else {
      reset({
        terapeutaId: currentTherapistId, // Default to current user when creating
        titulo: '',
        descripcion: '',
        estado: TareaEstado.A_REALIZAR,
        fechaLimite: defaultInitialDate(),
      });
    }
  }, [initialData, reset, currentTherapistId]);

  const handleFormSubmit: SubmitHandler<TareaTerapeutaFormInputs> = async (data) => {
    const processedData = {
      ...data,
      fechaLimite: data.fechaLimite ? data.fechaLimite : null, 
    };
    await onSubmit(processedData);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <h3 className="text-2xl font-semibold mb-6 text-primary-dark">
        {initialData ? 'Editar Tarea' : 'Crear Nueva Tarea'}
      </h3>
      {submissionError && <Alert type="error" message={submissionError} />}
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label htmlFor="terapeutaId" className="block text-sm font-medium text-brand-gray mb-1">
            Asignar a Terapeuta
          </label>
          <select
            id="terapeutaId"
            {...register("terapeutaId")}
            className={`mt-1 block w-full px-3 py-2 bg-white border ${errors.terapeutaId ? 'border-red-500' : 'border-slate-300'} rounded-md text-sm shadow-sm text-brand-gray focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary`}
          >
            <option value="">Seleccione un terapeuta</option>
            {allTerapeutas.map(t => (
              <option key={t.id} value={t.id}>
                {`${t.nombre} ${t.apellido}`}
              </option>
            ))}
          </select>
          {errors.terapeutaId && <p className="mt-1 text-xs text-red-600">{errors.terapeutaId.message}</p>}
        </div>

        <Input
          label="Título"
          name="titulo"
          {...register("titulo")}
          error={errors.titulo?.message}
          placeholder="Ej: Preparar informe para reunión de equipo"
        />
        <Textarea
          label="Descripción (Opcional)"
          name="descripcion"
          {...register("descripcion")}
          error={errors.descripcion?.message}
          rows={3}
          placeholder="Añada detalles adicionales sobre la tarea..."
        />
        <div>
          <label htmlFor="estado" className="block text-sm font-medium text-brand-gray mb-1">
            Estado
          </label>
          <select
            id="estado"
            {...register("estado")}
            className={`mt-1 block w-full px-3 py-2 bg-white border ${errors.estado ? 'border-red-500' : 'border-slate-300'} rounded-md text-sm shadow-sm text-brand-gray focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary`}
          >
            {Object.values(TareaEstado).map(estadoValue => (
              <option key={estadoValue} value={estadoValue}>
                {TAREA_ESTADOS[estadoValue]}
              </option>
            ))}
          </select>
          {errors.estado && <p className="mt-1 text-xs text-red-600">{errors.estado.message}</p>}
        </div>
        <Input
          label="Fecha Límite (Opcional)"
          name="fechaLimite"
          type="datetime-local"
          {...register("fechaLimite")}
          error={errors.fechaLimite?.message}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={isLoading}>
            {isLoading ? (initialData ? 'Guardando...' : 'Creando...') : (initialData ? 'Guardar Cambios' : 'Crear Tarea')}
          </Button>
        </div>
      </form>
    </div>
  );
};