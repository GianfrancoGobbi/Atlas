
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/shared/Button';
import { Logo } from '../components/shared/Logo';
import { APP_NAME } from '../constants';
import { Area } from '../types';
import { areaService } from '../services/areaService';
import { Spinner } from '../components/shared/Spinner';
import { Alert } from '../components/shared/Alert';

// --- Icon Definitions ---
const FonoaudiologiaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
);
const PsicologiaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const PedagogiaTerapeuticaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" {...props}><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
);
const PsicopedagogiaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M14.33 13.645l.28-.224a1.641 1.641 0 00-2.228-2.228l-.224.28m-1.732 2.164a2.83 2.83 0 013.248-4.018M12 6V3.459A2.25 2.25 0 0114.25 1.2h.035A2.25 2.25 0 0116.5 3.459V6" /></svg>
);
const IntegracionEscolarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);
const DefaultAreaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12.586A2 2 0 0021 18.414V12a2 2 0 00-2-2H7l-4 4z" />
    </svg>
);

const areaIconMap: Record<string, React.ReactNode> = {
  "Fonoaudiología": <FonoaudiologiaIcon />,
  "Psicología": <PsicologiaIcon />,
  "Pedagogía Terapéutica": <PedagogiaTerapeuticaIcon />,
  "Psicopedagogía": <PsicopedagogiaIcon />,
  "Integración Escolar": <IntegracionEscolarIcon />,
};
// --- End Icon Definitions ---

const LocationMarkerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
  </svg>
);

interface AreaCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
}

const AreaCard: React.FC<AreaCardProps> = ({ icon, title, description }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
    {icon && <div className="text-primary mb-4 flex justify-center">{icon}</div>}
    <h3 className="text-xl font-semibold text-primary-dark mb-2 text-center">{title}</h3> {/* text-slate-800 to text-primary-dark */}
    <p className="text-brand-gray text-sm text-center flex-grow">{description ? (description.length > 150 ? description.substring(0, 147) + '...' : description) : 'Descripción detallada próximamente.'}</p> {/* text-slate-600 to text-brand-gray */}
    <span className="mt-4 text-sm font-medium text-primary group-hover:underline text-center">
      Ver más detalles
    </span>
  </div>
);

export const LandingPage: React.FC = () => {
  const [fetchedAreas, setFetchedAreas] = useState<Area[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState<boolean>(true);
  const [areasError, setAreasError] = useState<string | null>(null);

  useEffect(() => {
    const loadAreas = async () => {
      setIsLoadingAreas(true);
      setAreasError(null);
      try {
        const areas = await areaService.getAreas();
        setFetchedAreas(areas);
      } catch (err: any) {
        setAreasError(err.message || 'No se pudieron cargar las áreas.');
        // console.error("Error fetching areas for landing page:", err);
      } finally {
        setIsLoadingAreas(false);
      }
    };
    loadAreas();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero Section */}
      <header className="bg-gradient-to-r from-primary-light via-primary to-primary-dark text-white py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Logo className="h-24 w-auto mx-auto mb-6 animate-pulse-logo" title={`${APP_NAME} - Centro Terapéutico`} />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Bienvenidos a {APP_NAME}
          </h1>
          <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto">
            Tu centro de terapias en Mendoza. Ofrecemos un espacio de contención y profesionalismo para acompañarte en tu desarrollo y bienestar.
          </p>
          <div className="mt-10">
            <Link to="/login">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-slate-100"> {/* Consider changing variant if secondary button style is updated*/}
                Acceder a Mi Cuenta
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* About Us Section */}
        <section id="about" className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-primary-dark tracking-tight sm:text-4xl"> {/* text-slate-800 to text-primary-dark */}
                Sobre Nosotros
              </h2>
              <p className="mt-4 text-lg text-brand-gray max-w-3xl mx-auto"> {/* text-slate-600 to text-brand-gray */}
                En {APP_NAME}, creemos en un abordaje integral y personalizado para cada individuo. Nuestro equipo de profesionales está comprometido con brindar la más alta calidad de atención en un ambiente cálido y seguro, fomentando el bienestar y el desarrollo pleno de quienes nos eligen.
              </p>
            </div>
          </div>
        </section>

        {/* Areas Section */}
        <section id="areas" className="py-16 md:py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-primary-dark tracking-tight sm:text-4xl"> {/* text-slate-800 to text-primary-dark */}
                Nuestras Áreas de Especialización
              </h2>
              <p className="mt-4 text-lg text-brand-gray max-w-3xl mx-auto"> {/* text-slate-600 to text-brand-gray */}
                Explora las áreas en las que nuestro equipo multidisciplinario puede ofrecerte apoyo y acompañamiento.
              </p>
            </div>
            {isLoadingAreas && (
              <div className="flex justify-center"> <Spinner size="lg" /></div>
            )}
            {areasError && (
              <Alert type="error" message={`Error al cargar las áreas: ${areasError}`} />
            )}
            {!isLoadingAreas && !areasError && fetchedAreas.length === 0 && (
              <Alert type="info" message="Actualmente no hay áreas de especialización para mostrar." />
            )}
            {!isLoadingAreas && !areasError && fetchedAreas.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {fetchedAreas.map((area) => (
                  <Link key={area.id} to={`/areas/${area.id}`} className="block group h-full">
                    <AreaCard
                      title={area.nombre}
                      description={area.descripcion || 'Descripción no disponible.'}
                      icon={areaIconMap[area.nombre] || <DefaultAreaIcon />}
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Location/Contact Section */}
        <section id="contact" className="py-16 md:py-24 bg-primary-light">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-primary-dark tracking-tight sm:text-4xl"> {/* text-slate-800 to text-primary-dark */}
                Encuéntranos en Mendoza
              </h2>
              <p className="mt-4 text-lg text-brand-gray max-w-3xl mx-auto"> {/* text-slate-700 to text-brand-gray */}
                Estamos ubicados en Severo del Castillo 5039, Mendoza. Listos para recibirte.
              </p>
            </div>
            <div className="mt-12 bg-white shadow-xl rounded-lg p-8 md:p-12 max-w-3xl mx-auto">
              <div className="flex flex-col items-center text-center mb-8 text-brand-gray"> {/* text-slate-700 to text-brand-gray */}
                <div className="flex items-center">
                  <LocationMarkerIcon className="h-8 w-8 text-primary flex-shrink-0 mr-3" />
                  <div>
                    <h4 className="font-semibold text-lg">Dirección</h4>
                    <p>Severo del Castillo 5039</p>
                    <p>Mendoza, Argentina</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <iframe
                  src="https://maps.google.com/maps?q=Severo%20del%20Castillo%205039%2C%20Mendoza%2C%20Argentina&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="350"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación del Consultorio en Google Maps"
                ></iframe>
              </div>
              
              <div className="mt-10 text-center">
                <Link to="/login">
                    <Button size="lg" variant="primary">
                        Solicitar Turno o Consultar
                    </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-brand-gray text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; {new Date().getFullYear()} {APP_NAME}. Todos los derechos reservados.</p>
          <p className="text-sm opacity-75">Diseñado con ♥ para el bienestar.</p>
        </div>
      </footer>
    </div>
  );
};
