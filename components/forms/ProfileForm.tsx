
import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form'; // Changed import
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserProfile, UserRole } from '../../types';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { Alert } from '../shared/Alert';
import { AREAS_EJEMPLO } from '../../constants'; // For therapist area selection

const ProfileSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido."),
  apellido: z.string().min(1, "El apellido es requerido."),
  telefono: z.string().optional().or(z.literal('')),
  fechaNacimiento: z.string().optional().or(z.literal('')).refine(val => {
    if (!val) return true; // Optional field
    // Basic validation for YYYY-MM-DD format and valid date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
    const date = new Date(val + 'T00:00:00Z'); // Interpret as UTC date
    return !isNaN(date.getTime());
  }, { message: "Fecha de nacimiento inválida (esperado YYYY-MM-DD)." }),
  // Fields specific to TERAPEUTA role
  areaId: z.string().optional(),
  especialidad: z.string().optional(),
  // 'activo' could be added here if admins/users can change it via this form
});

// Derive the type from the schema for form inputs
export type ProfileFormInputs = z.infer<typeof ProfileSchema>;


interface ProfileFormProps {
  profile: UserProfile; // Assumed to be non-null by ProfilePage logic
  onSubmit: (data: ProfileFormInputs) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ profile, onSubmit, isLoading, error: submissionError }) => {
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormInputs>({ // Changed usage
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      nombre: profile.nombre || '',
      apellido: profile.apellido || '',
      telefono: profile.telefono || '',
      fechaNacimiento: profile.fechaNacimiento || '', // Directly use YYYY-MM-DD string
      areaId: profile.areaId || '',
      especialidad: profile.especialidad || '',
    }
  });

  useEffect(() => {
    const valuesToReset: ProfileFormInputs = { 
      nombre: profile.nombre || '',
      apellido: profile.apellido || '',
      telefono: profile.telefono || undefined, 
      fechaNacimiento: profile.fechaNacimiento || undefined, // Directly use YYYY-MM-DD string or undefined
      areaId: profile.areaId || undefined, 
      especialidad: profile.especialidad || undefined, 
    };
    reset(valuesToReset);
  }, [profile, reset]); 

  const handleFormSubmit: SubmitHandler<ProfileFormInputs> = async (data) => { // Changed usage
    setFormMessage(null);
    try {
      const processedData: ProfileFormInputs = {
        ...data,
        telefono: data.telefono === '' ? undefined : data.telefono,
        // fechaNacimiento is already YYYY-MM-DD string or undefined due to schema and input type="date"
        fechaNacimiento: data.fechaNacimiento === '' ? undefined : data.fechaNacimiento,
        areaId: data.areaId === '' ? undefined : data.areaId,
        especialidad: data.especialidad === '' ? undefined : data.especialidad,
      };
      await onSubmit(processedData);
      setFormMessage({ type: 'success', text: 'Perfil actualizado con éxito.' });
    } catch (e: any) {
      setFormMessage({ type: 'error', text: e.message || 'Error al actualizar el perfil.' });
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 bg-white p-6 shadow rounded-lg">
      <h2 className="text-xl font-semibold text-primary">Editar Perfil</h2> {/* text-slate-700 to text-primary */}
      
      {formMessage && <Alert type={formMessage.type} message={formMessage.text} onClose={() => setFormMessage(null)} />}
      {submissionError && !formMessage && <Alert type="error" message={submissionError} />}

      <Input
        label="Nombre"
        name="nombre"
        {...register("nombre")}
        error={errors.nombre?.message}
      />
      <Input
        label="Apellido"
        name="apellido"
        {...register("apellido")}
        error={errors.apellido?.message}
      />
      <Input
        label="Teléfono (Opcional)"
        name="telefono"
        type="tel"
        {...register("telefono")}
        error={errors.telefono?.message}
      />
       <Input
        label="Fecha de Nacimiento (Opcional, YYYY-MM-DD)"
        name="fechaNacimiento"
        type="date" // HTML5 date input provides YYYY-MM-DD
        {...register("fechaNacimiento")}
        error={errors.fechaNacimiento?.message}
      />

      {profile.role === UserRole.TERAPEUTA && (
        <>
          <div className="mb-4">
            <label htmlFor="areaId" className="block text-sm font-medium text-brand-gray"> {/* text-slate-700 to text-brand-gray */}
              Área de Especialización
            </label>
            <select
              id="areaId"
              {...register("areaId")}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm text-brand-gray focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" // text-slate-900 to text-brand-gray
            >
              <option value="">Seleccione un área</option>
              {AREAS_EJEMPLO.map(area => (
                <option key={area.id} value={area.id}>{area.nombre}</option>
              ))}
            </select>
            {errors.areaId && <p className="mt-1 text-xs text-red-600">{errors.areaId.message}</p>}
          </div>

          <Input
            label="Especialidad (Ej: Terapia Cognitivo Conductual)"
            name="especialidad"
            {...register("especialidad")}
            error={errors.especialidad?.message}
          />
        </>
      )}

      <div className="flex justify-end">
        <Button type="submit" isLoading={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  );
};