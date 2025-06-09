import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Factura, FacturaEstado, UserRole, ObraSocial, UserProfile, FacturaPaciente } from '../types';
import { facturaService } from '../services/facturaService';
import { obraSocialService } from '../services/obraSocialService';
import { profileService } from '../services/profileService';
import { FacturasTable } from '../components/facturacion/FacturasTable';
import { FacturaForm, FacturaFormInputs, FacturaPacienteFormInputs } from '../components/forms/FacturaForm';
import { Spinner } from '../components/shared/Spinner';
import { Alert } from '../components/shared/Alert';
import { Button } from '../components/shared/Button';
import { ConfirmationModal } from '../components/shared/ConfirmationModal';
import { formatTargetTimezoneDateTimeLocalToUTCISO, TARGET_TIMEZONE_IANA } from '../utils/timezones';
import { FACTURA_ESTADOS } from '../constants'; // Added import for FACTURA_ESTADOS

export const FacturacionPage: React.FC = () => {
  const { user, profile: currentUserProfile, role: currentUserRole } = useAuth();
  
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [allObrasSociales, setAllObrasSociales] = useState<ObraSocial[]>([]);
  const [allTerapeutas, setAllTerapeutas] = useState<Pick<UserProfile, 'id' | 'nombre' | 'apellido'>[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  // const [facturaToEdit, setFacturaToEdit] = useState<Factura | null>(null); // For future editing
  
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [facturaToDeleteId, setFacturaToDeleteId] = useState<string | null>(null);
  
  const [formIsSubmitting, setFormIsSubmitting] = useState<boolean>(false);
  const [formSubmissionError, setFormSubmissionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentUserRole || !currentUserProfile?.id) {
      setError("Usuario no autenticado o perfil no disponible.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const [fetchedFacturas, fetchedObrasSociales, fetchedTerapeutas] = await Promise.all([
        facturaService.getFacturas(currentUserRole, currentUserProfile.id),
        obraSocialService.getObrasSociales(),
        currentUserRole === UserRole.ADMIN ? profileService.getAllTerapeutas() : Promise.resolve([])
      ]);

      setAllObrasSociales(fetchedObrasSociales);
      if (currentUserRole === UserRole.ADMIN) setAllTerapeutas(fetchedTerapeutas);

      const terapeutasMap = new Map((currentUserRole === UserRole.ADMIN ? fetchedTerapeutas : [currentUserProfile]).map(t => [t.id, `${t.nombre} ${t.apellido}`]));
      const obrasSocialesMap = new Map(fetchedObrasSociales.map(os => [os.id, os.nombre]));

      const augmentedFacturas = fetchedFacturas.map(f => ({
        ...f,
        terapeutaNombre: terapeutasMap.get(f.terapeutaId) || 'Desconocido',
        obraSocialNombre: obrasSocialesMap.get(f.obraSocialId) || 'Desconocida',
      }));
      setFacturas(augmentedFacturas);

    } catch (err: any) {
      setError(err.message || "Error al cargar los datos de facturación.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUserRole, currentUserProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateModal = () => {
    // setFacturaToEdit(null);
    setFormSubmissionError(null);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    // setFacturaToEdit(null);
    setFormSubmissionError(null);
  };

  const handleSubmitForm = async (
    facturaCoreData: Omit<FacturaFormInputs, 'pacientes'>, 
    pacientesData: FacturaPacienteFormInputs[]
  ) => {
    setFormIsSubmitting(true);
    setFormSubmissionError(null);
    setSuccessMessage(null);
    try {
      const payload: Omit<Factura, 'id' | 'fechaGenerada' | 'fechaPago' | 'terapeutaNombre' | 'obraSocialNombre' | 'pacientes'> = {
        terapeutaId: currentUserRole === UserRole.ADMIN ? facturaCoreData.terapeutaId : currentUserProfile!.id,
        obraSocialId: facturaCoreData.obraSocialId,
        monto: facturaCoreData.monto,
        estado: facturaCoreData.estado || FacturaEstado.IMPAGA, // Ensure default if not provided
        descripcion: facturaCoreData.descripcion,
      };
      
      const pacientesPayload: Omit<FacturaPaciente, 'id' | 'facturaId' | 'pacienteNombre'>[] = pacientesData.map(p => ({
          pacienteId: p.pacienteId,
          monto: p.monto,
          detalle: p.detalle,
      }));

      await facturaService.createFactura(payload, pacientesPayload);
      setSuccessMessage("Factura creada con éxito.");
      handleCloseModal();
      fetchData(); 
    } catch (e: any) {
      setFormSubmissionError(e.message || "Error al guardar la factura.");
    } finally {
      setFormIsSubmitting(false);
    }
  };

  const handleDeleteRequest = (id: string) => {
    setFacturaToDeleteId(id);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteFactura = async () => {
    if (!facturaToDeleteId) return;
    // Using formIsSubmitting for general loading state during async operations on this page
    setFormIsSubmitting(true); 
    setError(null);
    setSuccessMessage(null);
    try {
      await facturaService.deleteFactura(facturaToDeleteId);
      setSuccessMessage("Factura eliminada con éxito.");
      fetchData(); 
    } catch (e: any) {
      setError(e.message || "Error al eliminar la factura.");
    } finally {
      setFormIsSubmitting(false);
      setShowDeleteConfirmModal(false);
      setFacturaToDeleteId(null);
    }
  };

  const handleMarkAsPaid = async (facturaId: string, currentStatus: FacturaEstado) => {
    setFormIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const newStatus = currentStatus === FacturaEstado.IMPAGA ? FacturaEstado.PAGA : FacturaEstado.IMPAGA;
    let fechaPagoForUpdate: string | null = null;

    if (newStatus === FacturaEstado.PAGA) {
        // Get current date and time in YYYY-MM-DDTHH:MM format for Argentina
        const nowInArgentina = new Date(); // This is UTC, need to format for Argentina local
        const year = nowInArgentina.toLocaleString('en-US', {year: 'numeric', timeZone: TARGET_TIMEZONE_IANA});
        const month = nowInArgentina.toLocaleString('en-US', {month: '2-digit', timeZone: TARGET_TIMEZONE_IANA});
        const day = nowInArgentina.toLocaleString('en-US', {day: '2-digit', timeZone: TARGET_TIMEZONE_IANA});
        const hour = nowInArgentina.toLocaleString('en-US', {hour: '2-digit', hour12: false, timeZone: TARGET_TIMEZONE_IANA});
        const minute = nowInArgentina.toLocaleString('en-US', {minute: '2-digit', timeZone: TARGET_TIMEZONE_IANA});
        
        // The formatTargetTimezoneDateTimeLocalToUTCISO expects YYYY-MM-DDTHH:MM
        const localDateTimeStringForArgentina = `${year}-${month}-${day}T${hour}:${minute}`;
        fechaPagoForUpdate = formatTargetTimezoneDateTimeLocalToUTCISO(localDateTimeStringForArgentina, TARGET_TIMEZONE_IANA);
    }


    try {
      await facturaService.updateFacturaStatus(facturaId, newStatus, fechaPagoForUpdate);
      setSuccessMessage(`Factura marcada como ${FACTURA_ESTADOS[newStatus]}.`);
      fetchData();
    } catch (e: any) {
      setError(e.message || "Error al actualizar estado de la factura.");
    } finally {
      setFormIsSubmitting(false);
    }
  };
  
  if (isLoading && facturas.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !isLoading) { 
    return <Alert type="error" message={error} />;
  }
  
  if ((currentUserRole !== UserRole.TERAPEUTA && currentUserRole !== UserRole.ADMIN) && !isLoading) {
     return <Alert type="error" message="No tiene permisos para acceder a esta sección." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-primary-dark">Facturación</h1>
        <Button onClick={handleOpenCreateModal} variant="primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Nueva Factura
        </Button>
      </div>

      {successMessage && <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />}
      
      <FacturasTable
        facturas={facturas}
        onMarkAsPaid={handleMarkAsPaid}
        onDelete={handleDeleteRequest}
        isLoading={isLoading || formIsSubmitting} // Show loading in table if form is submitting and causing re-fetch
        currentUserRole={currentUserRole as UserRole} // currentUserRole is guaranteed by checks above
        currentUserId={currentUserProfile?.id}
      />

      {showCreateModal && currentUserProfile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
          role="dialog"
          aria-modal="true"
        >
          <FacturaForm
            onSubmit={handleSubmitForm}
            onClose={handleCloseModal}
            isLoading={formIsSubmitting}
            error={formSubmissionError}
            currentUserRole={currentUserRole as UserRole}
            currentUserId={currentUserProfile.id}
          />
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={confirmDeleteFactura}
        title="Confirmar Eliminación"
        message="¿Está seguro de que desea eliminar esta factura? Esta acción no se puede deshacer."
        confirmButtonText="Sí, Eliminar"
        confirmButtonVariant="danger"
        // Add isLoading state to confirm button if needed
      />
    </div>
  );
};