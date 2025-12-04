import { useEffect, useState } from 'react';

interface HorrorLoadingAnimationProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function HorrorLoadingAnimation({ 
  size = 'md', 
  text = 'Summoning your content...' 
}: HorrorLoadingAnimationProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const dripSizes = {
    sm: { width: 4, heights: [8, 12, 6] },
    md: { width: 6, heights: [12, 18, 10] },
    lg: { width: 8, heights: [16, 24, 14] },
  };

  const { width: dripWidth, heights: dripHeights } = dripSizes[size];

  return (
    <div className="flex flex-col items-center justify-center p-8 my-6">
      {/* Pulsing skull container */}
      <div className={`relative ${sizeClasses[size]} mb-6`}>
        {/* Outer glow rings */}
        <div 
          className={`absolute inset-0 rounded-full bg-primary/20 ${
            prefersReducedMotion ? 'opacity-50' : 'animate-ping'
          }`}
          style={{ animationDuration: '2s' }}
        />
        <div 
          className={`absolute inset-2 rounded-full bg-primary/30 ${
            prefersReducedMotion ? 'opacity-40' : 'animate-ping'
          }`}
          style={{ animationDuration: '2s', animationDelay: '0.3s' }}
        />
        
        {/* Skull SVG */}
        <div className={`absolute inset-0 flex items-center justify-center ${
          prefersReducedMotion ? '' : 'animate-pulse'
        }`}>
          <svg
            viewBox="0 0 64 64"
            className="w-full h-full drop-shadow-lg"
            style={{ filter: 'drop-shadow(0 0 8px rgba(220, 20, 60, 0.5))' }}
          >
            {/* Skull shape */}
            <ellipse cx="32" cy="28" rx="22" ry="20" fill="#E8E8E8" />
            <ellipse cx="32" cy="28" rx="20" ry="18" fill="#D0D0D0" />
            
            {/* Eye sockets */}
            <ellipse cx="24" cy="26" rx="6" ry="7" fill="#0D0D0D" />
            <ellipse cx="40" cy="26" rx="6" ry="7" fill="#0D0D0D" />
            
            {/* Glowing eyes */}
            <ellipse 
              cx="24" 
              cy="26" 
              rx="3" 
              ry="3.5" 
              fill="#DC143C"
              className={prefersReducedMotion ? '' : 'animate-pulse'}
            />
            <ellipse 
              cx="40" 
              cy="26" 
              rx="3" 
              ry="3.5" 
              fill="#DC143C"
              className={prefersReducedMotion ? '' : 'animate-pulse'}
            />
            
            {/* Nose */}
            <path d="M32 32 L29 38 L35 38 Z" fill="#1A1A1A" />
            
            {/* Jaw */}
            <path 
              d="M14 36 Q14 52 32 52 Q50 52 50 36" 
              fill="#E8E8E8" 
              stroke="#D0D0D0" 
              strokeWidth="1"
            />
            
            {/* Teeth */}
            <rect x="20" y="42" width="4" height="6" rx="1" fill="#F5F5F5" />
            <rect x="26" y="42" width="4" height="6" rx="1" fill="#F5F5F5" />
            <rect x="32" y="42" width="4" height="6" rx="1" fill="#F5F5F5" />
            <rect x="38" y="42" width="4" height="6" rx="1" fill="#F5F5F5" />
          </svg>
        </div>

        {/* Blood drips from skull */}
        <div className="absolute -bottom-2 left-1/4 flex gap-3">
          {dripHeights.map((height, index) => (
            <div
              key={index}
              className={`rounded-b-full ${prefersReducedMotion ? '' : ''}`}
              style={{
                width: dripWidth,
                height: height,
                background: 'linear-gradient(to bottom, #DC143C 0%, #8B0000 50%, #4A0000 100%)',
                animation: prefersReducedMotion 
                  ? 'none' 
                  : `horror-loading-drip ${2 + index * 0.5}s ease-in-out infinite ${index * 0.3}s`,
                transformOrigin: 'top center',
              }}
            />
          ))}
        </div>
      </div>

      {/* Loading text */}
      <div className="text-center">
        <h3 
          className={`font-display ${textSizeClasses[size]} text-neutral-text mb-3 ${
            prefersReducedMotion ? '' : 'horror-text-glitch'
          }`}
          style={{ 
            fontFamily: 'var(--font-horror-display, inherit)',
            textShadow: '0 0 10px rgba(220, 20, 60, 0.3)'
          }}
        >
          {text}
        </h3>
        
        {/* Dripping dots */}
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 bg-primary rounded-full ${
                prefersReducedMotion ? 'opacity-70' : ''
              }`}
              style={{
                animation: prefersReducedMotion 
                  ? 'none' 
                  : `horror-dot-pulse 1.5s ease-in-out infinite ${i * 0.2}s`,
                boxShadow: '0 0 6px rgba(220, 20, 60, 0.5)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Inline keyframes for component-specific animations */}
      <style>{`
        @keyframes horror-loading-drip {
          0%, 100% {
            transform: scaleY(0.6);
            opacity: 0.6;
          }
          50% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        
        @keyframes horror-dot-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.3);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
