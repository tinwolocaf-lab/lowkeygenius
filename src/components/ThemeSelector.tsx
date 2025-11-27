import { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme, Theme } from '../contexts/ThemeContext';

interface ThemeOption {
  value: Theme;
  label: string;
  colors: {
    primary: string;
    secondary: string;
  };
}

const themeOptions: ThemeOption[] = [
  {
    value: 'pink-light',
    label: 'Pink Light',
    colors: { primary: '#FF6DAA', secondary: '#1CB0F6' },
  },
  {
    value: 'blue-light',
    label: 'Blue Light',
    colors: { primary: '#1CB0F6', secondary: '#FF6DAA' },
  },
  {
    value: 'pink-dark',
    label: 'Pink Dark',
    colors: { primary: '#FF6DAA', secondary: '#1CB0F6' },
  },
  {
    value: 'blue-dark',
    label: 'Blue Dark',
    colors: { primary: '#1CB0F6', secondary: '#FF6DAA' },
  },
];

interface ThemeSelectorProps {
  collapsed?: boolean;
}

export function ThemeSelector({ collapsed = false }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentTheme = themeOptions.find((option) => option.value === theme);

  const handleThemeChange = async (newTheme: Theme) => {
    await setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-5 py-4 rounded-2xl font-body font-bold text-neutral-text hover:bg-primary-light/20 hover:scale-[1.02] transition-all`}
        title={collapsed ? 'Change Theme' : undefined}
        aria-label="Change theme"
        aria-expanded={isOpen}
      >
        <Palette className={collapsed ? 'w-7 h-7' : 'w-5 h-5'} />
        {!collapsed && (
          <span className="flex-1 text-left">Theme</span>
        )}
        {!collapsed && (
          <div className="flex gap-1">
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: currentTheme?.colors.primary }}
            />
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: currentTheme?.colors.secondary }}
            />
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute ${collapsed ? 'left-full ml-2' : 'left-0'} bottom-0 z-50 bg-white rounded-2xl shadow-tile border-2 border-neutral-border overflow-hidden animate-scale-in min-w-[240px]`}
        >
          <div className="p-2">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleThemeChange(option.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-primary-light/20 ${
                  theme === option.value ? 'bg-primary-light/30' : ''
                }`}
              >
                <div className="flex gap-1">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: option.colors.primary }}
                  />
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: option.colors.secondary }}
                  />
                </div>
                <span className="flex-1 text-left font-body font-bold text-neutral-text">
                  {option.label}
                </span>
                {theme === option.value && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
