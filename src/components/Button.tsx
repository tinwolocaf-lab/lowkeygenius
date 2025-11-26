import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-display font-bold transition-all duration-200 active:scale-95 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:active:translate-y-0';

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-dark shadow-button hover:shadow-button-hover',
    secondary: 'bg-white text-primary border-3 border-neutral-border hover:border-primary-light hover:bg-primary-light/10 shadow-soft',
    ghost: 'bg-transparent text-primary hover:bg-primary-light/30',
    success: 'bg-accent-green text-white hover:brightness-110 shadow-button hover:shadow-button-hover',
    warning: 'bg-accent-yellow text-neutral-text hover:brightness-110 shadow-button hover:shadow-button-hover',
  };

  const sizeStyles = {
    sm: 'px-5 py-2.5 text-sm rounded-xl',
    md: 'px-7 py-4 text-base rounded-2xl',
    lg: 'px-10 py-5 text-lg rounded-2xl',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
