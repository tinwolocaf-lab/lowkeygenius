import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useHorrorTheme } from '../hooks/useHorrorTheme';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const { isHorror } = useHorrorTheme();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  // Horror theme backdrop and modal styling
  const horrorBackdropStyles = isHorror 
    ? 'bg-black/70 backdrop-blur-md' 
    : 'bg-black/50 backdrop-blur-sm';
  
  const horrorModalStyles = isHorror 
    ? 'border-[var(--horror-blood-drip-color)] shadow-[0_0_40px_rgba(139,0,0,0.5)] horror-blood-drip' 
    : '';

  const horrorHeaderStyles = isHorror 
    ? 'border-[var(--horror-blood-drip-color)]' 
    : '';

  const horrorCloseButtonStyles = isHorror 
    ? 'hover:bg-primary/20 horror-glitch' 
    : 'hover:bg-neutral-surface';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 ${horrorBackdropStyles}`}
        onClick={onClose}
      />
      <div
        className={`relative bg-neutral-bg rounded-2xl shadow-xl border-2 border-neutral-border w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col ${horrorModalStyles}`}
      >
        <div className={`flex items-center justify-between p-6 border-b-2 border-neutral-border ${horrorHeaderStyles}`}>
          <h2 className="font-display text-xl font-bold text-neutral-text">{title}</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${horrorCloseButtonStyles}`}
          >
            <X className="w-5 h-5 text-neutral-text-muted" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
