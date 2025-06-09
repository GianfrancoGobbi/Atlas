import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../shared/Input';
import { Textarea } from '../shared/Textarea';
import { Button } from '../shared/Button';
import { Alert } from '../shared/Alert';
import { ObraSocial } from '../../types';

const ObraSocialSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  descripcion: z.string().optional(),
  contacto: z.string().optional(),
});

export type ObraSocialFormInputs = z.infer<typeof ObraSocialSchema>;

interface ObraSocialFormProps {
  onSubmit: (data: ObraSocialFormInputs) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  error?: string | null;
  // initialData could be added for editing by Admins in the future
}

export const ObraSocialForm: React.FC<ObraSocialFormProps> = ({
  onSubmit,
  onClose,
  isLoading,
  error: submissionError,
}) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ObraSocialFormInputs>({
    resolver: zodResolver(ObraSocialSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      contacto: '',
    },
  });

  const handleFormSubmit: SubmitHandler<ObraSocialFormInputs> = async (data) => {
    const processedData = {
      ...data,
      descripcion: data.descripcion?.trim() === '' ? undefined : data.descripcion,
      contacto: data.contacto?.trim() === '' ? undefined : data.contacto,
    };
    await onSubmit(processedData);
    // Form reset can be handled by parent component after successful submission if needed
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <h3 className="text-2xl font-semibold mb-6 text-primary-dark">
        Agregar Nueva Obra Social
      </h3>
      {submissionError && <Alert type="error" message={submissionError} />}
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input
          label="Nombre"
          name="nombre"
          {...register("nombre")}
          error={errors.nombre?.message}
          placeholder="Ej: OSDE"
        />
        <Textarea
          label="Descripción (Opcional)"
          name="descripcion"
          {...register("descripcion")}
          error={errors.descripcion?.message}
          rows={3}
          placeholder="Detalles adicionales sobre la obra social..."
        />
        <Input
          label="Contacto (Teléfono, Email, etc. - Opcional)"
          name="contacto"
          {...register("contacto")}
          error={errors.contacto?.message}
          placeholder="Información de contacto"
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={isLoading}>
            {isLoading ? 'Agregando...' : 'Agregar Obra Social'}
          </Button>
        </div>
      </form>
    </div>
  );
};
