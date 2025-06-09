
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form'; // Changed import
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { Alert } from '../shared/Alert';
import type { LoginCredentials } from '../../services/authService'; // Import type for clarity

const LoginSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  contrasena: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

type LoginFormInputs = z.infer<typeof LoginSchema>;

export const LoginForm: React.FC = () => {
  const { login, isLoading, error: authErrorHook } = useAuth(); // Renamed to avoid conflict
  const [formError, setFormError] = useState<string | null>(null); // For specific form submission errors

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({ // Changed usage
    resolver: zodResolver(LoginSchema),
    defaultValues: { 
      email: '',
      contrasena: '',
    }
  });

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => { // Changed usage
    setFormError(null); // Clear previous form-specific error
    try {
      // Explicitly create the LoginCredentials object.
      // Zod validation ensures data.email and data.contrasena are strings.
      // Non-null assertions (!) tell TypeScript this, resolving the type error.
      await login({
        email: data.email!,
        contrasena: data.contrasena!,
      });
      // Navigation will be handled by ProtectedRoute or similar logic in App.tsx / router
    } catch (e: any) {
      // The error is already set in useAuth hook (authErrorHook) if it's an auth-level error.
      // If login itself throws something specific or you want to show it distinctly:
      // setFormError(e.message || "Error desconocido durante el inicio de sesión.");
      // No need to setFormError here if authErrorHook from useAuth already covers it.
    }
  };

  // Display authErrorHook if it exists, otherwise formError (though formError is less likely to be set if relying on useAuth for error state)
  const displayError = authErrorHook?.message || formError;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {displayError && <Alert type="error" message={displayError} onClose={() => { /* Clear authErrorHook via context if needed, or setFormError(null) */ }} />}
      
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
        autoComplete="current-password"
        {...register("contrasena")}
        error={errors.contrasena?.message}
        placeholder="Tu contraseña"
      />
      <div>
        <Button type="submit" isLoading={isLoading} fullWidth={true}>
          {isLoading ? 'Ingresando...' : 'Ingresar'}
        </Button>
      </div>
      {/* The link to toggle to SignUpForm is now in AuthPage.tsx */}
    </form>
  );
};
