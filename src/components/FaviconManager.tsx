import { useFaviconSwitch } from '../hooks/useFaviconSwitch';

/**
 * Component that manages favicon switching based on the active theme.
 * This component renders nothing but handles favicon updates as a side effect.
 * Should be placed inside ThemeProvider context.
 */
export function FaviconManager(): null {
  useFaviconSwitch();
  return null;
}
