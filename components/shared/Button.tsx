
import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition ease-in-out duration-150';

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
    secondary: 'bg-secondary text-brand-gray hover:bg-secondary-dark focus:ring-secondary', // Updated to use brand secondary colors
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500', // Remains semantic
    outline: 'border border-primary text-primary hover:bg-primary-light hover:text-white focus:ring-primary', // Good use of brand primary
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  const widthStyle = fullWidth ? 'w-full' : '';

  const getSpinnerColor = () => {
    if (variant === 'primary' || variant === 'danger') {
      return 'text-white';
    }
    if (variant === 'outline') {
      return 'text-primary';
    }
    // Default for secondary or any other variant
    return 'text-brand-gray';
  };

  return (
    <button
      type="button"
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <Spinner size="sm" color={getSpinnerColor()} /> : children}
    </button>
  );
};
