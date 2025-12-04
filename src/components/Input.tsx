import React from 'react';
import { useHorrorTheme } from '../hooks/useHorrorTheme';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  labelClassName?: string;
}

export function Input({ label, error, className = '', labelClassName = '', ...props }: InputProps) {
  const { isHorror } = useHorrorTheme();

  // Horror theme applies blood-red focus states and eerie styling
  const horrorInputStyles = isHorror
    ? `focus:border-[var(--horror-blood-drip-color)] focus:shadow-[0_0_15px_rgba(139,0,0,0.4)] placeholder:text-neutral-text-muted/70 border-[var(--color-neutral-border)] ${error ? 'animate-[horror-shake_0.5s_ease-in-out]' : ''}`
    : '';

  const horrorLabelStyles = isHorror
    ? 'text-neutral-text'
    : '';

  return (
    <div className="w-full">
      {label && (
        <label className={`block font-body font-bold text-neutral-text mb-2 ${horrorLabelStyles} ${labelClassName}`}>
          {label}
        </label>
      )}
      <input
        className={`w-full px-5 py-4 rounded-xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary focus:bg-neutral-bg focus:shadow-soft transition-all ${error ? 'border-accent-red focus:border-accent-red' : ''
          } ${horrorInputStyles} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-accent-red font-body font-semibold">{error}</p>
      )}
    </div>
  );
}
