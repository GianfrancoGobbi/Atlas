import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../shared/Input';
import { Textarea } from '../shared/Textarea';
import { Button } from '../shared/Button';
import { Alert } from '../shared/Alert';
import { Factura, FacturaEstado, FacturaPaciente, UserProfile, ObraSocial, UserRole } from '../../types';
import { Spinner } from '../shared/Spinner';
import { profileService } from '../../services/profileService';
import { obraSocialService } from '../../services/obraSocialService';
import { FACTURA_ESTADOS } from '../../constants';

const FacturaPacienteSchema = z.object({
  pacienteId: z.string().min(1, "Debe seleccionar un paciente."),
  monto: z.coerce.number().min(0, "El monto debe ser positivo."),
  detalle: z.string().optional(),
});

const FacturaFormSchema = z.object({
  terapeutaId: z.string().min(1, "Debe seleccionar un terapeuta."),
  obraSocialId: z.string().min(1, "Debe seleccionar una obra social."),
  monto: z.coerce.number().min(0.01, "El monto total debe ser mayor a 0."),
  descripcion: z.string().optional(),
  estado: z.nativeEnum(FacturaEstado).default(FacturaEstado.IMPAGA), // Default a impaga
  pacientes: z.array(FacturaPacienteSchema).min(1, "Debe agregar al menos un paciente a la factura.").optional(), // Optional for initial load, validated later
}).refine(data => {
    if (!data.pacientes || data.pacientes.length === 0) return true; // Skip if no pacientes, main validation will catch it
    const sumOfPacientesMontos = data.pacientes.reduce((sum, p) => sum + p.monto, 0);
    // Use a small epsilon for float comparison
    return Math.abs(sumOfPacientesMontos - data.monto) < 0.01;
}, {
  message: "La suma de los montos de los pacientes debe ser igual al monto total de la factura.",
  path: ["monto"], // Show error near total monto or a general form error
});


export type FacturaFormInputs = z.infer<typeof FacturaFormSchema>;
export type FacturaPacienteFormInputs = z.infer<typeof FacturaPacienteSchema>;


interface FacturaFormProps {
  onSubmit: (data: FacturaFormInputs, pacientesData: FacturaPacienteFormInputs[]) => Promise<void>;
  onClose: () => void;
  isLoading: boolean; // Form submission loading state
  error?: string | null; // Form submission error
  // initialData?: Factura; // For editing later
  currentUserRole: UserRole;
  currentUserId?: string; // Logged-in therapist's ID
}

export const FacturaForm: React.FC<FacturaFormProps> = ({
  onSubmit,
  onClose,
  isLoading: isSubmitting,
  error: submissionError,
  currentUserRole,
  currentUserId,
}) => {
  const [allTerapeutas, setAllTerapeutas] = useState<Pick<UserProfile, 'id' | 'nombre' | 'apellido'>[]>([]);
  const [allPacientes, setAllPacientes] = useState<Pick<UserProfile, 'id' | 'nombre' | 'apellido'>[]>([]);
  const [allObrasSociales, setAllObrasSociales] = useState<ObraSocial[]>([]);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true); // For fetching dropdown data
  const [dataFetchError, setDataFetchError] = useState<string | null>(null);

  const { control, register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FacturaFormInputs>({
    resolver: zodResolver(FacturaFormSchema),
    defaultValues: {
      terapeutaId: currentUserRole === UserRole.TERAPEUTA && currentUserId ? currentUserId : '',
      obraSocialId: '',
      monto: 0,
      descripcion: '',
      estado: FacturaEstado.IMPAGA,
      pacientes: [{ pacienteId: '', monto: 0, detalle: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "pacientes",
  });

  const pacientesArray = watch("pacientes");
  const montoTotal = watch("monto");

  // Auto-calculate total monto from pacientes if desired, or validate against it.
  // Here, we validate that sum(pacientes.monto) === montoTotal (as per schema refine)
  // Alternatively, if montoTotal should be sum of pacientes, update it:
  useEffect(() => {
    if (pacientesArray) {
      const sum = pacientesArray.reduce((acc, current) => acc + (Number(current.monto) || 0), 0);
       // Uncomment below to auto-update total monto
       // if (Math.abs(sum - montoTotal) > 0.01) {
       //    setValue('monto', sum, { shouldValidate: true });
       // }
    }
  }, [pacientesArray, setValue, montoTotal]);


  useEffect(() => {
    const fetchData = async () => {
      setIsDataLoading(true);
      setDataFetchError(null);
      try {
        const [terapeutas, pacientes, obrasSociales] = await Promise.all([
          currentUserRole === UserRole.ADMIN ? profileService.getAllTerapeutas() : Promise.resolve([]),
          profileService.getPacientes(), 
          obraSocialService.getObrasSociales(),
        ]);
        if (currentUserRole === UserRole.ADMIN) setAllTerapeutas(terapeutas);
        setAllPacientes(pacientes);
        setAllObrasSociales(obrasSociales);
      } catch (err: any) {
        setDataFetchError("Error al cargar datos necesarios para el formulario: " + err.message);
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchData();
  }, [currentUserRole]);

  const handleFormSubmit: SubmitHandler<FacturaFormInputs> = (data) => {
    const { pacientes, ...facturaCoreData } = data;
    onSubmit(facturaCoreData, pacientes || []);
  };

  if (isDataLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (dataFetchError) {
     return (
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
            <Alert type="error" message={dataFetchError} />
            <div className="mt-4 flex justify-end">
                <Button type="button" variant="outline" onClick={onClose}>Cerrar</Button>
            </div>
        </div>
     );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <h3 className="text-2xl font-semibold mb-6 text-primary-dark">
        Nueva Factura
      </h3>
      {submissionError && <Alert type="error" message={submissionError} onClose={() => { /* clear error in parent */ }} />}
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {currentUserRole === UserRole.ADMIN && (
          <div>
            <label htmlFor="terapeutaId" className="block text-sm font-medium text-brand-gray mb-1">Terapeuta</label>
            <select
              id="terapeutaId"
              {...register("terapeutaId")}
              className={`mt-1 block w-full px-3 py-2 bg-white border ${errors.terapeutaId ? 'border-red-500' : 'border-slate-300'} rounded-md text-sm shadow-sm text-brand-gray focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary`}
            >
              <option value="">Seleccione un terapeuta</option>
              {allTerapeutas.map(t => <option key={t.id} value={t.id}>{`${t.nombre} ${t.apellido}`}</option>)}
            </select>
            {errors.terapeutaId && <p className="mt-1 text-xs text-red-600">{errors.terapeutaId.message}</p>}
          </div>
        )}

        <div>
          <label htmlFor="obraSocialId" className="block text-sm font-medium text-brand-gray mb-1">Obra Social</label>
          <select
            id="obraSocialId"
            {...register("obraSocialId")}
            className={`mt-1 block w-full px-3 py-2 bg-white border ${errors.obraSocialId ? 'border-red-500' : 'border-slate-300'} rounded-md text-sm shadow-sm text-brand-gray focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary`}
          >
            <option value="">Seleccione una obra social</option>
            {allObrasSociales.map(os => <option key={os.id} value={os.id}>{os.nombre}</option>)}
          </select>
          {errors.obraSocialId && <p className="mt-1 text-xs text-red-600">{errors.obraSocialId.message}</p>}
        </div>

        <Input
          label="Monto Total de Factura"
          type="number"
          step="0.01"
          name="monto"
          {...register("monto")}
          error={errors.monto?.message}
        />

        <Textarea
          label="Descripción General (Opcional)"
          name="descripcion"
          {...register("descripcion")}
          error={errors.descripcion?.message}
          rows={2}
        />
        
        {/* Pacientes Involucrados */}
        <div className="space-y-4 pt-3 border-t mt-4">
          <h4 className="text-lg font-medium text-primary">Pacientes Incluidos</h4>
          {fields.map((field, index) => (
            <div key={field.id} className="p-3 border rounded-md space-y-3 bg-slate-50/50">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-brand-gray">Paciente #{index + 1}</p>
                {fields.length > 1 && (
                  <Button type="button" variant="danger" size="sm" onClick={() => remove(index)}>
                    Quitar
                  </Button>
                )}
              </div>
              <div>
                <label htmlFor={`pacientes.${index}.pacienteId`} className="block text-xs font-medium text-brand-gray mb-0.5">Seleccionar Paciente</label>
                <select
                  id={`pacientes.${index}.pacienteId`}
                  {...register(`pacientes.${index}.pacienteId`)}
                  className={`mt-0.5 block w-full px-2.5 py-1.5 bg-white border ${errors.pacientes?.[index]?.pacienteId ? 'border-red-500' : 'border-slate-300'} rounded-md text-sm shadow-sm text-brand-gray focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary`}
                >
                  <option value="">Seleccione un paciente</option>
                  {allPacientes.map(p => <option key={p.id} value={p.id}>{`${p.nombre} ${p.apellido}`}</option>)}
                </select>
                {errors.pacientes?.[index]?.pacienteId && <p className="mt-0.5 text-xs text-red-600">{errors.pacientes?.[index]?.pacienteId?.message}</p>}
              </div>
              <Input
                label="Monto para este paciente"
                type="number"
                step="0.01"
                name={`pacientes.${index}.monto`}
                {...register(`pacientes.${index}.monto`)}
                error={errors.pacientes?.[index]?.monto?.message}
                className="py-1.5 text-sm"
              />
              <Textarea
                label="Detalle para este paciente (Opcional)"
                name={`pacientes.${index}.detalle`}
                {...register(`pacientes.${index}.detalle`)}
                error={errors.pacientes?.[index]?.detalle?.message}
                rows={2}
                 className="py-1.5 text-sm"
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => append({ pacienteId: '', monto: 0, detalle: '' })}>
            + Agregar Paciente
          </Button>
          {errors.pacientes?.message && <p className="mt-1 text-xs text-red-600">{errors.pacientes.message}</p>}
          {errors.pacientes?.root?.message && <p className="mt-1 text-xs text-red-600">{errors.pacientes.root.message}</p>}


        </div>


        <div className="flex justify-end space-x-3 pt-5 border-t mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar Factura'}
          </Button>
        </div>
      </form>
    </div>
  );
};