import { useEffect, useState } from 'react';

interface FogEffectProps {
  intensity?: 'light' | 'medium' | 'heavy';
}

const intensityOpacity = {
  light: 0.03,
  medium: 0.06,
  heavy: 0.1,
};

/**
 * CSS-based animated fog overlay for horror theme.
 * Creates a subtle, drifting fog effect across the screen.
 * Respects prefers-reduced-motion for accessibility.
 */
export function FogEffect({ intensity = 'medium' }: FogEffectProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const opacity = intensityOpacity[intensity];

  // If user prefers reduced motion, render static fog without animation
  const animationStyle = prefersReducedMotion
    ? {}
    : {
        animation: 'fogDrift 60s linear infinite',
      };

  return (
    <>
      <style>
        {`
          @keyframes fogDrift {
            0% {
              transform: translateX(-10%) translateY(0);
            }
            50% {
              transform: translateX(10%) translateY(-5%);
            }
            100% {
              transform: translateX(-10%) translateY(0);
            }
          }
          
          @keyframes fogDrift2 {
            0% {
              transform: translateX(10%) translateY(-5%);
            }
            50% {
              transform: translateX(-10%) translateY(5%);
            }
            100% {
              transform: translateX(10%) translateY(-5%);
            }
          }
        `}
      </style>
      <div
        className="fixed inset-0 pointer-events-none z-30 overflow-hidden"
        aria-hidden="true"
      >
        {/* Primary fog layer */}
        <div
          style={{
            position: 'absolute',
            inset: '-20%',
            background: `
              radial-gradient(ellipse 80% 40% at 20% 80%, rgba(139, 0, 139, ${opacity}) 0%, transparent 70%),
              radial-gradient(ellipse 60% 50% at 80% 20%, rgba(139, 0, 139, ${opacity * 0.8}) 0%, transparent 60%),
              radial-gradient(ellipse 100% 60% at 50% 100%, rgba(139, 0, 139, ${opacity * 0.6}) 0%, transparent 50%)
            `,
            ...animationStyle,
          }}
        />
        {/* Secondary fog layer for depth */}
        <div
          style={{
            position: 'absolute',
            inset: '-20%',
            background: `
              radial-gradient(ellipse 70% 35% at 70% 70%, rgba(220, 20, 60, ${opacity * 0.5}) 0%, transparent 60%),
              radial-gradient(ellipse 50% 40% at 30% 30%, rgba(75, 0, 130, ${opacity * 0.4}) 0%, transparent 50%)
            `,
            ...(prefersReducedMotion
              ? {}
              : {
                  animation: 'fogDrift2 80s linear infinite',
                }),
          }}
        />
      </div>
    </>
  );
}
