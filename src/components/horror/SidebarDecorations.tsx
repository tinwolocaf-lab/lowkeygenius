import { useHorrorTheme } from '../../hooks/useHorrorTheme';

interface SidebarDecorationsProps {
  collapsed?: boolean;
}

/**
 * Horror-themed decorations specifically for the sidebar.
 * Displays skull and bat decorations that appear only when horror theme is active.
 * Respects prefers-reduced-motion for animations.
 * 
 * @param collapsed - Whether the sidebar is in collapsed state
 */
export function SidebarDecorations({ collapsed = false }: SidebarDecorationsProps) {
  const { isHorror } = useHorrorTheme();

  if (!isHorror) {
    return null;
  }

  return (
    <div className="sidebar-horror-decorations pointer-events-none">
      {/* Small bat decoration near the top */}
      <div 
        className={`absolute ${collapsed ? 'top-20 right-2' : 'top-20 right-4'} opacity-40 horror-sidebar-bat`}
        aria-hidden="true"
      >
        <svg 
          width={collapsed ? "16" : "24"} 
          height={collapsed ? "10" : "15"} 
          viewBox="0 0 24 15" 
          fill="currentColor"
          className="text-horror-blood"
        >
          <path d="M12 3c-1.5 0-2.5 1-3 2-1-2-3-3-5-3-1 0-2 0.5-2.5 1.5 0.5 0 1 0.2 1.5 0.5-0.5 0.5-1 1.2-1 2 0 1.5 1 2.5 2 3 0.5-0.5 1-0.8 1.5-1-0.3 0.8-0.5 1.5-0.5 2.5 0 1 0.3 2 1 2.5 0.5-1 1.2-1.8 2-2.5 0.5 1 1.5 2 3 2.5V15c0.3-0.2 0.7-0.3 1-0.5 0.3 0.2 0.7 0.3 1 0.5v-2.5c1.5-0.5 2.5-1.5 3-2.5 0.8 0.7 1.5 1.5 2 2.5 0.7-0.5 1-1.5 1-2.5 0-1-0.2-1.7-0.5-2.5 0.5 0.2 1 0.5 1.5 1 1-0.5 2-1.5 2-3 0-0.8-0.5-1.5-1-2 0.5-0.3 1-0.5 1.5-0.5C23 1.5 22 1 21 1c-2 0-4 1-5 3-0.5-1-1.5-2-3-2z" />
        </svg>
      </div>

      {/* Skull decoration at the bottom of nav */}
      <div 
        className={`absolute ${collapsed ? 'bottom-24 left-1/2 -translate-x-1/2' : 'bottom-24 left-6'} opacity-30 horror-sidebar-skull`}
        aria-hidden="true"
      >
        <svg 
          width={collapsed ? "20" : "28"} 
          height={collapsed ? "20" : "28"} 
          viewBox="0 0 24 24" 
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-horror-ghost"
        >
          {/* Skull outline */}
          <path d="M12 2C7 2 3 6 3 11c0 3 1.5 5.5 4 7v2c0 1 1 2 2 2h6c1 0 2-1 2-2v-2c2.5-1.5 4-4 4-7 0-5-4-9-9-9z" />
          {/* Left eye */}
          <circle cx="9" cy="10" r="2" fill="currentColor" />
          {/* Right eye */}
          <circle cx="15" cy="10" r="2" fill="currentColor" />
          {/* Nose */}
          <path d="M12 13v2" strokeLinecap="round" />
          {/* Teeth */}
          <path d="M9 17v2M12 17v2M15 17v2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Dripping effect on sidebar edge */}
      {!collapsed && (
        <div 
          className="absolute top-0 right-0 h-full w-1 overflow-hidden opacity-20"
          aria-hidden="true"
        >
          <div className="horror-sidebar-drip absolute top-10 w-1 h-8 bg-gradient-to-b from-horror-blood to-transparent rounded-b-full" />
          <div className="horror-sidebar-drip absolute top-32 w-1 h-12 bg-gradient-to-b from-horror-blood to-transparent rounded-b-full" style={{ animationDelay: '1s' }} />
          <div className="horror-sidebar-drip absolute top-56 w-1 h-6 bg-gradient-to-b from-horror-blood to-transparent rounded-b-full" style={{ animationDelay: '2s' }} />
        </div>
      )}
    </div>
  );
}
