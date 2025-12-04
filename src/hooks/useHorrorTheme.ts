import { useTheme } from '../contexts/ThemeContext';

interface UseHorrorThemeReturn {
  isHorror: boolean;
  horrorClass: string;
}

/**
 * Custom hook that provides horror theme state and utility class.
 * Use this hook to conditionally render horror-specific elements.
 * 
 * @returns {UseHorrorThemeReturn} Object containing:
 *   - isHorror: boolean indicating if horror theme is active
 *   - horrorClass: CSS class string ('horror-active' when horror theme is active, empty otherwise)
 */
export function useHorrorTheme(): UseHorrorThemeReturn {
  const { theme } = useTheme();
  
  return {
    isHorror: theme === 'horror',
    horrorClass: theme === 'horror' ? 'horror-active' : '',
  };
}
