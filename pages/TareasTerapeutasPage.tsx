
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { TareaTerapeuta, UserProfile, UserRole, TareaEstado } from '../types';
import { tareaTerapeutaService } from '../services/tareaTerapeutaService';
import { profileService } from '../services/profileService';
import { TareasTable } from '../components/tareas/TareasTable';
import { TareaTerapeutaForm, TareaTerapeutaFormInputs } from '../components/forms/TareaTerapeutaForm';
import { Spinner } from '../components/shared/Spinner';
import { Alert } from '../components/shared/Alert';
import { Button } from '../components/shared/Button';
import { ConfirmationModal } from '../components/shared/ConfirmationModal';

export const TareasTerapeutasPage: React.FC = () => {
  const { profile: currentUserProfile, role } = useAuth();
  const [tareas, setTareas] = useState<TareaTerapeuta[]>([]);
  // This will store all therapist profiles for the assignment dropdown and for display names
  const [allTerapeutas, setAllTerapeutas] = useState<Pick<UserProfile, 'id' | 'nombre' | 'apellido'>[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [taskToEdit, setTaskToEdit] = useState<TareaTerapeuta | null>(null);
  
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  
  const [formIsSubmitting, setFormIsSubmitting] = useState<boolean>(false);
  const [formSubmissionError, setFormSubmissionError] = useState<string | null>(null);

  const fetchTareasAndProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedTareasRaw, fetchedAllTerapeutas] = await Promise.all([
        tareaTerapeutaService.getTareasTerapeutas(),
        profileService.getAllTerapeutas() 
      ]);

      setAllTerapeutas(fetchedAllTerapeutas);
      const terapeutasMap = new Map(fetchedAllTerapeutas.map(t => [t.id, t]));

      const augmentedTareas = fetchedTareasRaw.map(tarea => ({
        ...tarea,
        terapeutaNombre: terapeutasMap.get(tarea.terapeutaId) 
          ? `${terapeutasMap.get(tarea.terapeutaId)!.nombre} ${terapeutasMap.get(tarea.terapeutaId)!.apellido}`
          : 'Terapeuta Desconocido'
      }));
      setTareas(augmentedTareas);

    } catch (err: any) {
      setError(err.message || "Error al cargar datos de tareas o terapeutas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === UserRole.TERAPEUTA) {
      fetchTareasAndProfiles();
    } else {
      setError("Acceso no autorizado.");
      setIsLoading(false);
    }
  }, [role, fetchTareasAndProfiles]);

  const handleOpenCreateModal = () => {
    setTaskToEdit(null);
    setFormSubmissionError(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (tarea: TareaTerapeuta) => {
    setTaskToEdit(tarea);
    setFormSubmissionError(null);
    setShowEditModal(true);
  };

  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setTaskToEdit(null);
    setFormSubmissionError(null);
  };

  const handleSubmitForm = async (data: TareaTerapeutaFormInputs) => {
    if (!currentUserProfile) {
      setFormSubmissionError("Perfil de usuario no encontrado.");
      return;
    }
    setFormIsSubmitting(true);
    setFormSubmissionError(null);
    try {
      const taskPayload = {
        ...data, // Includes terapeutaId (assignee), titulo, descripcion, estado
        fechaLimite: data.fechaLimite ? data.fechaLimite : undefined, // Service handles null for DB
      };

      if (taskToEdit) { 
        await tareaTerapeutaService.updateTareaTerapeuta(taskToEdit.id, taskPayload);
      } else { 
        // For creation, TareaTerapeutaFormInputs is compatible with Omit<TareaTerapeuta, 'id'|'creadaEn'|'terapeutaNombre'>
        // as terapeutaId is present.
        await tareaTerapeutaService.createTareaTerapeuta(taskPayload as Omit<TareaTerapeuta, 'id' | 'creadaEn' | 'terapeutaNombre'>);
      }
      handleCloseModals();
      fetchTareasAndProfiles(); 
    } catch (e: any) {
      setFormSubmissionError(e.message || "Error al guardar la tarea.");
    } finally {
      setFormIsSubmitting(false);
    }
  };

  const handleDeleteRequest = (id: string) => {
    setTaskToDeleteId(id);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDeleteId) return;
    setFormIsSubmitting(true); 
    setError(null);
    try {
      await tareaTerapeutaService.deleteTareaTerapeuta(taskToDeleteId);
      fetchTareasAndProfiles(); 
    } catch (e: any) {
      setError(e.message || "Error al eliminar la tarea.");
    } finally {
      setFormIsSubmitting(false);
      setShowDeleteConfirmModal(false);
      setTaskToDeleteId(null);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !isLoading) { 
    return <Alert type="error" message={error} />;
  }
  
  if (role !== UserRole.TERAPEUTA && !isLoading) {
     return <Alert type="error" message="No tiene permisos para acceder a esta sección." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-primary-dark">Gestión de Tareas del Equipo</h1>
        <Button onClick={handleOpenCreateModal} variant="primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Crear Tarea
        </Button>
      </div>

      <TareasTable
        tareas={tareas}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteRequest}
        isLoading={isLoading}
        currentUserId={currentUserProfile?.id || null} // currentUserId is used for delete confirmation logic
      />

      {(showCreateModal || showEditModal) && currentUserProfile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModals(); }}
          role="dialog"
          aria-modal="true"
        >
          <TareaTerapeutaForm
            onSubmit={handleSubmitForm}
            onClose={handleCloseModals}
            initialData={taskToEdit}
            isLoading={formIsSubmitting}
            error={formSubmissionError}
            currentTherapistId={currentUserProfile.id}
            allTerapeutas={allTerapeutas}
          />
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={confirmDeleteTask}
        title="Confirmar Eliminación"
        message="¿Está seguro de que desea eliminar esta tarea? Esta acción no se puede deshacer."
        confirmButtonText="Sí, Eliminar"
        confirmButtonVariant="danger"
      />
    </div>
  );
};