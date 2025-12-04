import React from 'react';
import { useHorrorTheme } from '../hooks/useHorrorTheme';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className = '', onClick, hover = false }: CardProps) {
  const { isHorror } = useHorrorTheme();

  // Horror theme adds eerie shadow effects and blood-red border styling
  const horrorStyles = isHorror 
    ? 'card horror-blood-drip border-[var(--horror-blood-drip-color)] shadow-[0_0_20px_rgba(139,0,0,0.3)] hover:shadow-[0_0_30px_rgba(139,0,139,0.4)]' 
    : '';

  return (
    <div
      className={`bg-neutral-bg rounded-2xl p-6 shadow-soft border border-neutral-border ${
        hover ? 'hover:shadow-tile hover:scale-[1.02] transition-all duration-200 cursor-pointer' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${horrorStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
