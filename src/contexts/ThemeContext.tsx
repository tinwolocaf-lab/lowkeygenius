import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export type Theme = 'horror';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme-preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [theme, setThemeState] = useState<Theme>('horror');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Horror is the only theme, always use it
        const initialTheme: Theme = 'horror';

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
    // Always apply horror theme
    applyThemeToDOM('horror');
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
  return theme === 'horror';
}

function applyThemeToDOM(_theme: Theme) {
  const root = document.documentElement;

  // Remove any old theme classes and apply horror
  root.classList.remove('theme-horror');
  root.classList.add('theme-horror');

  // Horror theme is always dark
  root.classList.add('dark');
}
