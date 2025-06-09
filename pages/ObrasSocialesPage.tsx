import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ObraSocial, UserRole } from '../types'; // Import ObraSocial
import { obraSocialService } from '../services/obraSocialService';
import { ObrasSocialesTable } from '../components/obrasSociales/ObrasSocialesTable';
import { ObraSocialForm, ObraSocialFormInputs } from '../components/forms/ObraSocialForm';
import { Spinner } from '../components/shared/Spinner';
import { Alert } from '../components/shared/Alert';
import { Button } from '../components/shared/Button';

export const ObrasSocialesPage: React.FC = () => {
  const { role } = useAuth();
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [formIsSubmitting, setFormIsSubmitting] = useState<boolean>(false);
  const [formSubmissionError, setFormSubmissionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchObrasSociales = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const fetchedData = await obraSocialService.getObrasSociales();
      setObrasSociales(fetchedData);
    } catch (err: any) {
      setError(err.message || "Error al cargar las obras sociales.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === UserRole.TERAPEUTA || role === UserRole.ADMIN) { // Allow Admin access as well
      fetchObrasSociales();
    } else {
      setError("Acceso no autorizado.");
      setIsLoading(false);
    }
  }, [role, fetchObrasSociales]);

  const handleOpenCreateModal = () => {
    setFormSubmissionError(null);
    setSuccessMessage(null);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setFormSubmissionError(null);
  };

  const handleSubmitForm = async (data: ObraSocialFormInputs) => {
    setFormIsSubmitting(true);
    setFormSubmissionError(null);
    setSuccessMessage(null);
    try {
      // Explicitly construct the payload with the type expected by createObraSocial
      const payload: Omit<ObraSocial, 'id'> = {
        nombre: data.nombre, // data.nombre is string
        descripcion: data.descripcion, // data.descripcion is string | undefined
        contacto: data.contacto, // data.contacto is string | undefined
      };
      await obraSocialService.createObraSocial(payload);
      setSuccessMessage(`Obra social "${data.nombre}" agregada con éxito.`);
      handleCloseModal();
      fetchObrasSociales(); 
    } catch (e: any) {
      setFormSubmissionError(e.message || "Error al guardar la obra social.");
    } finally {
      setFormIsSubmitting(false);
    }
  };
  
  if (isLoading && obrasSociales.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !isLoading && obrasSociales.length === 0) { 
    return <Alert type="error" message={error} />;
  }
  
  if (role !== UserRole.TERAPEUTA && role !== UserRole.ADMIN && !isLoading) {
     return <Alert type="error" message="No tiene permisos para acceder a esta sección." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-primary-dark">Gestión de Obras Sociales</h1>
        { (role === UserRole.TERAPEUTA || role === UserRole.ADMIN) && (
            <Button onClick={handleOpenCreateModal} variant="primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Agregar Obra Social
            </Button>
        )}
      </div>

      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} /> }


      <ObrasSocialesTable
        obrasSociales={obrasSociales}
        isLoading={isLoading}
      />

      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
          role="dialog"
          aria-modal="true"
        >
          <ObraSocialForm
            onSubmit={handleSubmitForm}
            onClose={handleCloseModal}
            isLoading={formIsSubmitting}
            error={formSubmissionError}
          />
        </div>
      )}
    </div>
  );
};