
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { SignUpForm } from '../components/auth/SignUpForm'; // Import SignUpForm
import { APP_NAME } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/shared/Logo'; // Import the Logo component
// import { Spinner } from '../components/shared/Spinner'; // Optional: if you want a spinner here during auth check

export const AuthPage: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const { user, isLoading: authIsLoading } = useAuth(); // Renamed to avoid potential naming conflicts
  const navigate = useNavigate();

  useEffect(() => {
    // If auth state is not loading and a user is present,
    // redirect them away from AuthPage (e.g., to the dashboard).
    if (!authIsLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authIsLoading, navigate]);

  const toggleView = () => setIsLoginView(!isLoginView);

  // If auth state is still loading, or if user is already logged in (and useEffect will redirect),
  // avoid rendering the login/signup form to prevent flicker or rendering an unnecessary page.
  if (authIsLoading || (!authIsLoading && user)) {
    // Optionally, show a full-page spinner while authIsLoading is true:
    // if (authIsLoading) {
    //   return (
    //     <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center">
    //       <Spinner size="lg" />
    //     </div>
    //   );
    // }
    return null; // Or a minimal loading indicator / blank page until redirect or content is ready
  }

  // If not loading and no user, render the AuthPage content
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <Logo className="h-12 w-auto" /> {/* Added Logo component */}
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-primary-dark"> {/* text-slate-900 to text-primary-dark */}
          {isLoginView ? `Bienvenido a ${APP_NAME}` : `Crea tu cuenta en ${APP_NAME}`}
        </h2>
        <p className="mt-2 text-center text-sm text-brand-gray"> {/* text-slate-600 to text-brand-gray */}
          {isLoginView ? 'Ingresa a tu cuenta para continuar.' : 'Completa el formulario para registrarte.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          {isLoginView ? <LoginForm /> : <SignUpForm onSignUpSuccess={() => setIsLoginView(true) /* Switch to login after successful signup message */ } />}
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-brand-gray">O</span> {/* text-gray-500 to text-brand-gray */}
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={toggleView}
                className="font-medium text-primary hover:text-primary-dark focus:outline-none focus:underline transition ease-in-out duration-150"
              >
                {isLoginView ? '¿No tienes una cuenta? Regístrate' : '¿Ya tienes una cuenta? Ingresa'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};