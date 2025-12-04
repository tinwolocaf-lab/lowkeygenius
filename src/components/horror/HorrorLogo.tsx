import { useHorrorTheme } from '../../hooks/useHorrorTheme';

type LogoSize = 'sm' | 'md' | 'lg';

interface HorrorLogoProps {
  size?: LogoSize;
  showText?: boolean;
  className?: string;
}

const sizeClasses: Record<LogoSize, { icon: string; text: string }> = {
  sm: { icon: 'w-8 h-8', text: 'text-lg' },
  md: { icon: 'w-10 h-10', text: 'text-xl' },
  lg: { icon: 'w-12 h-12', text: 'text-2xl' },
};

/**
 * Horror-styled variant of the Progent logo.
 * Displays a spooky version with blood drip effects and horror styling.
 * Only renders horror styling when horror theme is active.
 * 
 * @param size - Size variant: 'sm', 'md', or 'lg'
 * @param showText - Whether to show the "Progent" text alongside the logo
 * @param className - Additional CSS classes
 */
export function HorrorLogo({ size = 'md', showText = false, className = '' }: HorrorLogoProps) {
  const { isHorror } = useHorrorTheme();
  const sizeConfig = sizeClasses[size];

  if (!isHorror) {
    // Return regular logo when not in horror theme
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img 
          src="/logo.png" 
          alt="Progent" 
          className={`object-contain ${sizeConfig.icon}`} 
        />
        {showText && (
          <span className={`font-display font-bold text-primary ${sizeConfig.text}`}>
            Progent
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 horror-logo ${className}`}>
      {/* Horror logo container with effects */}
      <div className="horror-logo-icon relative">
        {/* Main logo with horror filter */}
        <img 
          src="/logo.png" 
          alt="Progent" 
          className={`object-contain ${sizeConfig.icon} horror-logo-image`}
          style={{
            filter: 'hue-rotate(-30deg) saturate(1.5) brightness(0.9)',
          }}
        />
        
        {/* Blood drip effect overlay */}
        <div className="horror-logo-drip absolute -bottom-1 left-1/2 -translate-x-1/2">
          <svg 
            width="20" 
            height="12" 
            viewBox="0 0 20 12" 
            className="horror-drip-svg"
          >
            <defs>
              <linearGradient id="bloodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--horror-blood-dark, #8B0000)" />
                <stop offset="100%" stopColor="var(--horror-blood, #DC143C)" />
              </linearGradient>
            </defs>
            {/* Multiple drip drops */}
            <ellipse cx="5" cy="3" rx="2" ry="3" fill="url(#bloodGradient)" className="horror-drip-1" />
            <ellipse cx="10" cy="5" rx="2.5" ry="5" fill="url(#bloodGradient)" className="horror-drip-2" />
            <ellipse cx="15" cy="2" rx="1.5" ry="2" fill="url(#bloodGradient)" className="horror-drip-3" />
          </svg>
        </div>

        {/* Subtle glow effect */}
        <div 
          className="absolute inset-0 rounded-full opacity-30 pointer-events-none"
          style={{
            boxShadow: '0 0 15px var(--horror-blood, #DC143C)',
          }}
        />
      </div>

      {showText && (
        <span 
          className={`font-horror-display font-bold ${sizeConfig.text} horror-logo-text`}
          style={{
            color: 'var(--horror-blood, #DC143C)',
            textShadow: '0 0 10px var(--horror-blood-dark, #8B0000), 2px 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          Progent
        </span>
      )}
    </div>
  );
}
