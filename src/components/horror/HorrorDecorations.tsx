import { useHorrorTheme } from '../../hooks/useHorrorTheme';
import { Cobweb } from './Cobweb';
import { FogEffect } from './FogEffect';
import { FloatingBats } from './FloatingBats';

interface HorrorDecorationsProps {
  children?: React.ReactNode;
}

/**
 * Wrapper component that renders horror-specific decorative elements.
 * Only renders decorations when the horror theme is active.
 * Combines Cobweb, FogEffect, and FloatingBats components.
 */
export function HorrorDecorations({ children }: HorrorDecorationsProps) {
  const { isHorror } = useHorrorTheme();

  // Don't render any decorations if horror theme is not active
  if (!isHorror) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Fog effect in background */}
      <FogEffect intensity="light" />
      
      {/* Cobwebs in corners */}
      <Cobweb position="top-left" size="lg" opacity={0.5} />
      <Cobweb position="top-right" size="md" opacity={0.4} />
      <Cobweb position="bottom-left" size="sm" opacity={0.3} />
      
      {/* Floating bats */}
      <FloatingBats count={4} />
      
      {children}
    </>
  );
}
