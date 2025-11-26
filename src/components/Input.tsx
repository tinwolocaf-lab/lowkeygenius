import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block font-body font-bold text-neutral-text mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-5 py-4 rounded-xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary focus:bg-white focus:shadow-soft transition-all ${
          error ? 'border-accent-red focus:border-accent-red' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-accent-red font-body font-semibold">{error}</p>
      )}
    </div>
  );
}
