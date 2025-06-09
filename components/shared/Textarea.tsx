
import React, { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  name: string;
  // Allow specific textarea attributes like 'rows' to be passed through
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, name, ...props }) => {
  const baseTextareaClasses = "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 text-brand-gray focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none"; // text-slate-900 to text-brand-gray
  const errorTextareaClasses = "border-red-500 focus:border-red-500 focus:ring-red-500";

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-brand-gray"> {/* text-slate-700 to text-brand-gray */}
          {label}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        rows={props.rows || 4} // Default to 4 rows if not specified
        className={`${baseTextareaClasses} ${error ? errorTextareaClasses : ''} ${props.className || ''}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};