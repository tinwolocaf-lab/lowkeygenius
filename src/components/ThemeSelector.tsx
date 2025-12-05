import { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme, Theme } from '../contexts/ThemeContext';

interface ThemeOption {
  value: Theme;
  label: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: 'blue-light',
    label: 'Blue Light',
  },
  {
    value: 'pink-light',
    label: 'Pink Light',
  },
  {
    value: 'blue-dark',
    label: 'Blue Dark',
  },
  {
    value: 'pink-dark',
    label: 'Pink Dark',
  },
  {
    value: 'horror',
    label: '🎃 Horror',
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

  const handleThemeChange = async (newTheme: Theme) => {
    await setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-5 py-4 rounded-2xl font-body font-bold text-neutral-text hover:bg-neutral-surface hover:scale-[1.02] transition-all`}
        title={collapsed ? 'Change Theme' : undefined}
        aria-label="Change theme"
        aria-expanded={isOpen}
      >
        <Palette className={collapsed ? 'w-7 h-7' : 'w-5 h-5'} />
        {!collapsed && (
          <span className="flex-1 text-left">Theme</span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute ${collapsed ? 'left-full ml-2' : 'left-0'} top-full mt-2 z-[60] bg-neutral-bg rounded-2xl shadow-tile border-2 border-neutral-border overflow-hidden animate-scale-in min-w-[240px]`}
        >
          <div className="p-2">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleThemeChange(option.value)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all hover:bg-neutral-surface ${
                  theme === option.value ? 'bg-neutral-surface' : ''
                }`}
              >
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
