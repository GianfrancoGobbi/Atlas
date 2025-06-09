
import React from 'react';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonVariant?: 'primary' | 'danger';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirmar',
  cancelButtonText = 'Cancelar',
  confirmButtonVariant = 'primary',
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
        <h3 id="confirmation-modal-title" className="text-xl font-semibold mb-4 text-slate-800">
          {title}
        </h3>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            {cancelButtonText}
          </Button>
          <Button variant={confirmButtonVariant} onClick={onConfirm}>
            {confirmButtonText}
          </Button>
        </div>
      </div>
    </div>
  );
};
