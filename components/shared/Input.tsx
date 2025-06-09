
import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  name: string; // Required for associating label and error messages
}

export const Input: React.FC<InputProps> = ({ label, error, name, type = 'text', ...props }) => {
  const baseInputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 text-brand-gray focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"; // text-slate-900 to text-brand-gray
  const errorInputClasses = "border-red-500 focus:border-red-500 focus:ring-red-500";

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-brand-gray"> {/* text-slate-700 to text-brand-gray */}
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        className={`${baseInputClasses} ${error ? errorInputClasses : ''}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};