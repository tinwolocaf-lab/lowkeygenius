import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className = '', onClick, hover = false }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl p-6 shadow-soft ${
        hover ? 'hover:shadow-tile hover:scale-[1.02] transition-all duration-200 cursor-pointer' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
