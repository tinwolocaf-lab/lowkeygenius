import { useEffect, useState, useMemo } from 'react';

interface FloatingBatsProps {
  count?: number;
}

interface BatConfig {
  id: number;
  size: number;
  startX: number;
  startY: number;
  duration: number;
  delay: number;
  path: 'path1' | 'path2' | 'path3';
}

/**
 * Animated bat silhouettes that float across the screen.
 * Creates random floating animation paths for each bat.
 * Respects prefers-reduced-motion for accessibility.
 */
export function FloatingBats({ count = 5 }: FloatingBatsProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Generate random bat configurations
  const bats = useMemo<BatConfig[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      size: 15 + Math.random() * 20,
      startX: Math.random() * 100,
      startY: Math.random() * 60 + 10,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 10,
      path: (['path1', 'path2', 'path3'] as const)[Math.floor(Math.random() * 3)],
    }));
  }, [count]);

  // Don't render animated bats if user prefers reduced motion
  // Instead, show static bats at fixed positions
  if (prefersReducedMotion) {
    return (
      <div
        className="fixed inset-0 pointer-events-none z-30 overflow-hidden"
        aria-hidden="true"
      >
        {bats.slice(0, 3).map((bat) => (
          <div
            key={bat.id}
            style={{
              position: 'absolute',
              left: `${bat.startX}%`,
              top: `${bat.startY}%`,
              opacity: 0.4,
            }}
          >
            <BatSVG size={bat.size} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes batFly1 {
            0% { transform: translate(0, 0) rotate(0deg); }
            25% { transform: translate(30vw, -10vh) rotate(-5deg); }
            50% { transform: translate(60vw, 5vh) rotate(5deg); }
            75% { transform: translate(90vw, -5vh) rotate(-3deg); }
            100% { transform: translate(120vw, 0) rotate(0deg); }
          }
          
          @keyframes batFly2 {
            0% { transform: translate(0, 0) rotate(0deg); }
            20% { transform: translate(20vw, 15vh) rotate(8deg); }
            40% { transform: translate(50vw, -10vh) rotate(-5deg); }
            60% { transform: translate(70vw, 10vh) rotate(3deg); }
            80% { transform: translate(100vw, -5vh) rotate(-8deg); }
            100% { transform: translate(120vw, 5vh) rotate(0deg); }
          }
          
          @keyframes batFly3 {
            0% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(40vw, -15vh) rotate(-10deg); }
            66% { transform: translate(80vw, 10vh) rotate(10deg); }
            100% { transform: translate(120vw, -5vh) rotate(0deg); }
          }
          
          @keyframes batWing {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(0.7); }
          }
        `}
      </style>
      <div
        className="fixed inset-0 pointer-events-none z-30 overflow-hidden"
        aria-hidden="true"
      >
        {bats.map((bat) => (
          <div
            key={bat.id}
            style={{
              position: 'absolute',
              left: `${bat.startX - 20}%`,
              top: `${bat.startY}%`,
              animation: `batFly${bat.path.slice(-1)} ${bat.duration}s linear ${bat.delay}s infinite`,
              opacity: 0.5,
            }}
          >
            <BatSVG size={bat.size} animated />
          </div>
        ))}
      </div>
    </>
  );
}

interface BatSVGProps {
  size: number;
  animated?: boolean;
}

function BatSVG({ size, animated = false }: BatSVGProps) {
  const wingStyle: React.CSSProperties = animated
    ? { animation: 'batWing 0.15s ease-in-out infinite', transformOrigin: 'center' }
    : {};

  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 50 30"
      fill="currentColor"
      className="text-neutral-text"
      style={{ opacity: 0.8 }}
    >
      {/* Left wing */}
      <path
        d="M25 15 Q15 5 5 10 Q8 15 5 20 Q15 18 20 15 Z"
        style={wingStyle}
      />
      {/* Right wing */}
      <path
        d="M25 15 Q35 5 45 10 Q42 15 45 20 Q35 18 30 15 Z"
        style={wingStyle}
      />
      {/* Body */}
      <ellipse cx="25" cy="15" rx="4" ry="6" />
      {/* Head */}
      <circle cx="25" cy="8" r="3" />
      {/* Ears */}
      <path d="M22 6 L21 3 L23 5 Z" />
      <path d="M28 6 L29 3 L27 5 Z" />
    </svg>
  );
}
