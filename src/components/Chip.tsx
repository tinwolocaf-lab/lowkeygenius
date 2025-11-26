import React from 'react';

interface ChipProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'primary';
}

export function Chip({ children, selected = false, onClick, variant = 'default' }: ChipProps) {
  const baseStyles = 'inline-flex items-center px-6 py-3 rounded-pill font-body font-bold text-sm transition-all duration-200 cursor-pointer active:scale-95 shadow-soft';

  const variantStyles = {
    default: selected
      ? 'bg-primary text-white shadow-tile'
      : 'bg-white border-2 border-neutral-border text-neutral-text hover:border-primary hover:bg-primary-light/20',
    primary: 'bg-primary-light text-primary hover:bg-primary hover:text-white border-2 border-primary-light hover:border-primary',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
