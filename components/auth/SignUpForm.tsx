
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form'; // Changed import
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { Alert } from '../shared/Alert';
import { SignUpCredentials } from '../../services/authService';

const SignUpSchema = z.object({
  nombreCompleto: z.string().min(3, { message: "El nombre completo es requerido y debe tener al menos 3 caracteres." }),
  email: z.string().email({ message: "Email inválido." }),
  contrasena: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  confirmarContrasena: z.string().min(6, { message: "La confirmación de contraseña es requerida." }),
}).refine(data => data.contrasena === data.confirmarContrasena, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmarContrasena"], // Path to field to display the error
});

type SignUpFormInputs = z.infer<typeof SignUpSchema>;

interface SignUpFormProps {
  onSignUpSuccess?: () => void; // Optional: callback for successful signup
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSignUpSuccess }) => {
  const { signUp, isLoading } = useAuth(); // Removed authError as it's general
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<SignUpFormInputs>({ // Changed usage
    resolver: zodResolver(SignUpSchema),
    defaultValues: { 
      nombreCompleto: '',
      email: '',
      contrasena: '',
      confirmarContrasena: '',
    }
  });

  const onSubmit: SubmitHandler<SignUpFormInputs> = async (data) => { // Changed usage
    setFormMessage(null);
    const signUpData: SignUpCredentials = {
      nombreCompleto: data.nombreCompleto,
      email: data.email,
      contrasena: data.contrasena,
    };

    try {
      await signUp(signUpData);
      // Supabase handles email confirmation flows. 
      // If auto-confirmation is off, user needs to check email.
      // If auto-confirmation is on (dev), they might be logged in.
      setFormMessage({ type: 'success', text: '¡Registro exitoso! Si la confirmación por email está activada, por favor revisa tu correo para activar tu cuenta.' });
      if (onSignUpSuccess) onSignUpSuccess();
      // Potentially redirect or clear form here after a delay
    } catch (e: any) {
      setFormMessage({ type: 'error', text: e.message || "Error desconocido durante el registro." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {formMessage && <Alert type={formMessage.type} message={formMessage.text} onClose={() => setFormMessage(null)} />}
      
      <Input
        label="Nombre Completo"
        name="nombreCompleto"
        type="text"
        autoComplete="name"
        {...register("nombreCompleto")}
        error={errors.nombreCompleto?.message}
        placeholder="Tu nombre completo"
      />
      <Input
        label="Correo Electrónico"
        name="email"
        type="email"
        autoComplete="email"
        {...register("email")}
        error={errors.email?.message}
        placeholder="tu@email.com"
      />
      <Input
        label="Contraseña"
        name="contrasena"
        type="password"
        autoComplete="new-password"
        {...register("contrasena")}
        error={errors.contrasena?.message}
        placeholder="Crea una contraseña"
      />
      <Input
        label="Confirmar Contraseña"
        name="confirmarContrasena"
        type="password"
        autoComplete="new-password"
        {...register("confirmarContrasena")}
        error={errors.confirmarContrasena?.message}
        placeholder="Confirma tu contraseña"
      />
      <div>
        <Button type="submit" isLoading={isLoading} fullWidth={true}>
          {isLoading ? 'Registrando...' : 'Crear Cuenta'}
        </Button>
      </div>
    </form>
  );
};