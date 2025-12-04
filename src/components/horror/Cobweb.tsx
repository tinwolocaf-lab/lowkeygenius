interface CobwebProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'sm' | 'md' | 'lg';
  opacity?: number;
}

const sizeMap = {
  sm: 80,
  md: 120,
  lg: 160,
};

const positionStyles: Record<CobwebProps['position'], React.CSSProperties> = {
  'top-left': { top: 0, left: 0, transform: 'rotate(0deg)' },
  'top-right': { top: 0, right: 0, transform: 'rotate(90deg)' },
  'bottom-left': { bottom: 0, left: 0, transform: 'rotate(-90deg)' },
  'bottom-right': { bottom: 0, right: 0, transform: 'rotate(180deg)' },
};

/**
 * Decorative cobweb SVG component for horror theme.
 * Renders in corner positions with configurable size and opacity.
 */
export function Cobweb({ position, size = 'md', opacity = 0.6 }: CobwebProps) {
  const dimension = sizeMap[size];
  const style: React.CSSProperties = {
    ...positionStyles[position],
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 40,
    opacity,
  };

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 100 100"
      style={style}
      aria-hidden="true"
    >
      {/* Main radial threads from corner */}
      <g stroke="rgba(232, 232, 232, 0.4)" strokeWidth="0.5" fill="none">
        {/* Radial lines from origin (0,0) */}
        <line x1="0" y1="0" x2="100" y2="0" />
        <line x1="0" y1="0" x2="100" y2="25" />
        <line x1="0" y1="0" x2="100" y2="50" />
        <line x1="0" y1="0" x2="100" y2="75" />
        <line x1="0" y1="0" x2="100" y2="100" />
        <line x1="0" y1="0" x2="75" y2="100" />
        <line x1="0" y1="0" x2="50" y2="100" />
        <line x1="0" y1="0" x2="25" y2="100" />
        <line x1="0" y1="0" x2="0" y2="100" />
        
        {/* Spiral/connecting threads */}
        <path d="M 20 0 Q 18 8 0 20" />
        <path d="M 40 0 Q 35 18 0 40" />
        <path d="M 60 0 Q 50 28 0 60" />
        <path d="M 80 0 Q 65 38 0 80" />
        <path d="M 100 0 Q 80 48 0 100" />
        
        {/* Additional web detail curves */}
        <path d="M 30 0 Q 28 12 20 20 Q 12 28 0 30" />
        <path d="M 50 0 Q 45 22 35 35 Q 22 45 0 50" />
        <path d="M 70 0 Q 62 32 50 50 Q 32 62 0 70" />
        <path d="M 90 0 Q 78 42 65 65 Q 42 78 0 90" />
        
        {/* Inner detail threads */}
        <path d="M 15 0 Q 14 6 10 10 Q 6 14 0 15" />
        <path d="M 25 0 Q 23 10 17 17 Q 10 23 0 25" />
        <path d="M 35 0 Q 32 14 25 25 Q 14 32 0 35" />
        <path d="M 45 0 Q 40 20 32 32 Q 20 40 0 45" />
        <path d="M 55 0 Q 48 25 40 40 Q 25 48 0 55" />
      </g>
      
      {/* Small dew drops / highlights */}
      <g fill="rgba(232, 232, 232, 0.3)">
        <circle cx="20" cy="5" r="1" />
        <circle cx="40" cy="10" r="1" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="30" cy="30" r="1.5" />
        <circle cx="50" cy="25" r="1" />
        <circle cx="25" cy="50" r="1" />
        <circle cx="60" cy="40" r="1" />
        <circle cx="40" cy="60" r="1" />
      </g>
    </svg>
  );
}
