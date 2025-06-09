
import React, { useEffect, useState, useContext } from 'react'; // Added useContext
import { useParams, Link } from 'react-router-dom';
import { areaService } from '../services/areaService';
import { profileService } from '../services/profileService';
import { Area, UserProfile } from '../types';
import { Spinner } from '../components/shared/Spinner';
import { Alert } from '../components/shared/Alert';
import { Button } from '../components/shared/Button';
import { WhatsAppContext } from '../contexts/WhatsAppContext'; // Import WhatsAppContext

// Placeholder icon for the detail page, can be customized
const DetailAreaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const UserIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const StarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1 text-secondary" fill="currentColor" viewBox="0 0 20 20" {...props}> {/* text-yellow-500 to text-secondary */}
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

// PhoneIcon component is no longer used in this file as per user request to remove phone display
// const PhoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
//   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" {...props}>
//     <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.308 1.154a11.034 11.034 0 005.378 5.378l1.154-2.308a1 1 0 011.21-.502l4.493 1.498A1 1 0 0119 15.72V19a2 2 0 01-2 2h-1a12.935 12.935 0 01-9.974-14.026A12.935 12.935 0 015 3H4a1 1 0 01-1-1z" />
//   </svg>
// );


export const AreaDetailPage: React.FC = () => {
  const { areaId } = useParams<{ areaId: string }>();
  const [area, setArea] = useState<Area | null>(null);
  const [therapists, setTherapists] = useState<UserProfile[]>([]);
  const [referenteProfile, setReferenteProfile] = useState<UserProfile | null>(null); // State kept for logic, not display
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const whatsAppContext = useContext(WhatsAppContext);
  if (!whatsAppContext) {
    // This should not happen if WhatsAppProvider wraps the app
    throw new Error("WhatsAppContext is not available");
  }
  const { setIsAreaPageActive, setAreaReferentePhone } = whatsAppContext;

  useEffect(() => {
    setIsAreaPageActive(true);
    return () => {
      setIsAreaPageActive(false);
      setAreaReferentePhone(null); // Clear phone when leaving page
    };
  }, [setIsAreaPageActive, setAreaReferentePhone]);


  useEffect(() => {
    if (!areaId) {
      setError('No se proporcionó un ID de área.');
      setIsLoading(false);
      setAreaReferentePhone(null);
      return;
    }

    const fetchAreaDetailsAndTherapists = async () => {
      setIsLoading(true);
      setError(null);
      setReferenteProfile(null);
      setAreaReferentePhone(null); // Clear while fetching

      try {
        const fetchedArea = await areaService.getAreaById(areaId);
        if (fetchedArea) {
          setArea(fetchedArea);
          
          const fetchedTherapists = await profileService.getTherapistsByAreaId(areaId);
          setTherapists(fetchedTherapists);

          if (fetchedArea.referenteId) {
            const profile = await profileService.getProfileByUserId(fetchedArea.referenteId);
            setReferenteProfile(profile); // Keep for logic, not for direct display of phone here
            setAreaReferentePhone(profile?.telefono || null); // Update context
          } else {
            setAreaReferentePhone(null); // No referente, so no phone
          }

        } else {
          setError('Área no encontrada.');
          setAreaReferentePhone(null);
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar los detalles del área y terapeutas.');
        setAreaReferentePhone(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAreaDetailsAndTherapists();
  }, [areaId, setAreaReferentePhone]); // Added setAreaReferentePhone to dependency array

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
        <div className="max-w-2xl mx-auto text-center py-8">
            <Alert type="error" message={error} />
            <div className="mt-6">
                <Link to="/">
                    <Button variant="primary">Volver a Inicio</Button>
                </Link>
            </div>
        </div>
    );
  }

  if (!area) {
    return <Alert type="info" message="No se encontraron detalles para esta área." />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow-xl rounded-lg p-6 md:p-8">
        <div className="flex flex-col items-center text-center">
          <DetailAreaIcon />
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-3">{area.nombre}</h1>
        </div>
        
        <div className="mt-6 prose prose-slate max-w-none text-brand-gray text-justify"> {/* text-slate-700 to text-brand-gray */}
          <p>{area.descripcion || 'No hay una descripción detallada disponible para esta área.'}</p>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <h2 className="text-2xl font-semibold text-primary-dark mb-4">Terapeutas en esta Área</h2> {/* text-slate-700 to text-primary-dark */}
          {therapists.length > 0 ? (
            <ul className="space-y-4">
              {therapists.map(therapist => {
                const isReferente = area.referenteId === therapist.id;
                // const referenteActual = isReferente ? referenteProfile : null; // Not used for direct display of phone

                return (
                  <li key={therapist.id} className="p-4 bg-slate-50 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <div className="flex items-center mb-2 sm:mb-0">
                        <UserIcon className="h-6 w-6 mr-3 text-primary" /> {/* Icon color to primary */}
                        <span className="text-lg font-medium text-brand-gray">{therapist.nombre} {therapist.apellido}</span> {/* text-slate-800 to text-brand-gray */}
                      </div>
                      {isReferente && (
                        <span className="flex items-center text-sm font-semibold text-secondary-dark bg-secondary-light px-3 py-1 rounded-full"> {/* text-yellow-700 bg-yellow-100 to text-secondary-dark bg-secondary-light */}
                          Referente Principal <StarIcon className="ml-1.5" />
                        </span>
                      )}
                    </div>
                    {therapist.especialidad && (
                        <p className="text-sm text-brand-gray mt-1 ml-9 sm:ml-9">{therapist.especialidad}</p> /* text-slate-600 to text-brand-gray */
                    )}
                    {/* The referente's phone number display is removed from here */}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-brand-gray">Actualmente no hay terapeutas asignados a esta área.</p> /* text-slate-600 to text-brand-gray */
          )}
           {!area.referenteId && therapists.length > 0 && (
             <p className="text-sm text-brand-gray mt-3">Nota: No se ha asignado un referente principal específico para esta área.</p> /* text-slate-500 to text-brand-gray */
           )}
        </div>

        <div className="mt-10 text-center">
          <Link to="/">
            <Button variant="outline">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                Volver a Inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};