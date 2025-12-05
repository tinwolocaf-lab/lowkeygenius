import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const FAVICON_DEFAULT = '/favicon.png';
const FAVICON_HORROR = '/favicon-horror.svg';

/**
 * Custom hook that switches the favicon based on the active theme.
 * When horror theme is active, displays a spooky skull favicon.
 * When any other theme is active, displays the default Lowkeygenius favicon.
 * 
 * This hook should be called once at the app root level.
 */
export function useFaviconSwitch(): void {
  const { theme } = useTheme();

  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    
    if (!favicon) {
      // Create favicon link if it doesn't exist
      const newFavicon = document.createElement('link');
      newFavicon.rel = 'icon';
      newFavicon.type = theme === 'horror' ? 'image/svg+xml' : 'image/png';
      newFavicon.href = theme === 'horror' ? FAVICON_HORROR : FAVICON_DEFAULT;
      document.head.appendChild(newFavicon);
      return;
    }

    // Update existing favicon
    if (theme === 'horror') {
      favicon.type = 'image/svg+xml';
      favicon.href = FAVICON_HORROR;
    } else {
      favicon.type = 'image/png';
      favicon.href = FAVICON_DEFAULT;
    }
  }, [theme]);
}

/**
 * Returns the appropriate favicon path for a given theme.
 * Useful for SSR or preloading scenarios.
 */
export function getFaviconForTheme(theme: string): string {
  return theme === 'horror' ? FAVICON_HORROR : FAVICON_DEFAULT;
}
