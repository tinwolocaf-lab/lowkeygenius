import { Skull } from 'lucide-react';

interface ThemeSelectorProps {
  collapsed?: boolean;
}

export function ThemeSelector({ collapsed = false }: ThemeSelectorProps) {
  // Horror theme is the only theme - display as a static indicator
  return (
    <div className="relative">
      <div
        className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-5 py-4 rounded-2xl font-body font-bold text-neutral-text`}
        title={collapsed ? '🎃 Horror Theme' : undefined}
      >
        <Skull className={`${collapsed ? 'w-7 h-7' : 'w-5 h-5'} text-primary`} />
        {!collapsed && (
          <span className="flex-1 text-left">🎃 Horror</span>
        )}
      </div>
    </div>
  );
}
