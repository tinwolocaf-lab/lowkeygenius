import { useEffect, useState } from 'react';
import { useHorrorTheme } from '../../hooks/useHorrorTheme';

/**
 * A ghostly figure that occasionally floats across the screen.
 * Only appears when horror theme is active.
 * Respects prefers-reduced-motion.
 */
export function Ghost() {
    const { isHorror } = useHorrorTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: '50%', left: '-10%' });
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        if (!isHorror || prefersReducedMotion) return;

        // Randomly trigger ghost appearance
        const scheduleGhost = () => {
            const delay = Math.random() * 20000 + 10000; // 10-30 seconds
            return setTimeout(() => {
                // Random start position (always starts off-screen left)
                const top = Math.random() * 80 + 10; // 10-90% height
                setPosition({ top: `${top}%`, left: '-10%' });
                setIsVisible(true);

                // Hide after animation completes
                setTimeout(() => {
                    setIsVisible(false);
                    scheduleGhost(); // Schedule next appearance
                }, 15000); // Duration matches CSS animation
            }, delay);
        };

        const timer = scheduleGhost();
        return () => clearTimeout(timer);
    }, [isHorror, prefersReducedMotion]);

    if (!isHorror || !isVisible || prefersReducedMotion) return null;

    return (
        <>
            <style>
                {`
          @keyframes ghostFloat {
            0% { transform: translateX(0) translateY(0) scale(0.8); opacity: 0; }
            10% { opacity: 0.4; }
            25% { transform: translateX(30vw) translateY(-5vh) scale(1); }
            50% { transform: translateX(60vw) translateY(5vh) scale(0.9); opacity: 0.3; }
            75% { transform: translateX(90vw) translateY(-5vh) scale(1.1); }
            90% { opacity: 0.4; }
            100% { transform: translateX(120vw) translateY(0) scale(0.8); opacity: 0; }
          }
        `}
            </style>
            <div
                className="fixed pointer-events-none z-20 text-neutral-text/10"
                style={{
                    top: position.top,
                    left: position.left,
                    animation: 'ghostFloat 15s linear forwards',
                    filter: 'blur(2px)',
                }}
                aria-hidden="true"
            >
                <svg width="100" height="120" viewBox="0 0 100 120" fill="currentColor">
                    <path d="M50 10 C 25 10, 10 35, 10 60 C 10 85, 10 110, 20 110 C 25 110, 30 100, 35 105 C 40 110, 45 110, 50 105 C 55 100, 60 100, 65 105 C 70 110, 75 110, 80 105 C 85 100, 90 110, 90 60 C 90 35, 75 10, 50 10 Z" />
                    <circle cx="35" cy="45" r="5" fill="#000" opacity="0.5" />
                    <circle cx="65" cy="45" r="5" fill="#000" opacity="0.5" />
                    <ellipse cx="50" cy="65" rx="5" ry="8" fill="#000" opacity="0.3" />
                </svg>
            </div>
        </>
    );
}
