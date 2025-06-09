
import React from 'react';

interface AlertProps {
  message: string;
  type: 'error' | 'success' | 'info' | 'warning';
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ message, type, onClose }) => {
  const baseClasses = 'p-4 rounded-md flex justify-between items-start';
  const typeClasses = {
    error: 'bg-red-100 border border-red-400 text-red-700',
    success: 'bg-green-100 border border-green-400 text-green-700',
    info: 'bg-blue-100 border border-blue-400 text-blue-700',
    warning: 'bg-yellow-100 border border-yellow-400 text-yellow-700',
  };

  const Icon = () => {
    switch(type) {
      case 'error': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
      case 'success': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />;
      case 'info': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
      case 'warning': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />;
      default: return null;
    }
  }

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><Icon /></svg>
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 -mr-1 -mt-1 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
          aria-label="Cerrar alerta"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
