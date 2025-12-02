import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export type Theme = 'pink-light' | 'blue-light' | 'pink-dark' | 'blue-dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme-preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [theme, setThemeState] = useState<Theme>('blue-light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeTheme = async () => {
      try {
        let initialTheme: Theme = 'blue-light';

        if (user && profile?.theme_preference) {
          initialTheme = profile.theme_preference as Theme;
        } else {
          const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
          if (savedTheme && isValidTheme(savedTheme)) {
            initialTheme = savedTheme as Theme;
          }
        }

        setThemeState(initialTheme);
        applyThemeToDOM(initialTheme);
      } catch (error) {
        console.error('Error initializing theme:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeTheme();
  }, [user, profile?.theme_preference]);

  useEffect(() => {
    if (!user && profile === null) {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && isValidTheme(savedTheme)) {
        setThemeState(savedTheme as Theme);
        applyThemeToDOM(savedTheme as Theme);
      }
    }
  }, [user, profile]);

  const setTheme = async (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      applyThemeToDOM(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ theme_preference: newTheme })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating theme in database:', error);
        }
      }
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  };

  const value = {
    theme,
    setTheme,
    loading,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

function isValidTheme(theme: string): boolean {
  return ['pink-light', 'blue-light', 'pink-dark', 'blue-dark'].includes(theme);
}

function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;

  root.classList.remove('theme-pink-light', 'theme-blue-light', 'theme-pink-dark', 'theme-blue-dark');

  if (theme !== 'blue-light') {
    root.classList.add(`theme-${theme}`);
  }

  if (theme.includes('dark')) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
