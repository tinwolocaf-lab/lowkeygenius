import { AlertTriangle, Trash2, CheckCircle, HelpCircle } from 'lucide-react';

type ConfirmVariant = 'danger' | 'warning' | 'success' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<ConfirmVariant, { icon: typeof AlertTriangle; color: string; bgColor: string }> = {
  danger: { icon: Trash2, color: 'text-accent-red', bgColor: 'bg-accent-red/10' },
  warning: { icon: AlertTriangle, color: 'text-accent-orange', bgColor: 'bg-accent-orange/10' },
  success: { icon: CheckCircle, color: 'text-accent-green', bgColor: 'bg-accent-green/10' },
  info: { icon: HelpCircle, color: 'text-primary', bgColor: 'bg-primary-light/30' },
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;

  const confirmButtonClass = variant === 'danger' 
    ? 'bg-accent-red hover:brightness-110' 
    : variant === 'warning'
    ? 'bg-accent-orange hover:brightness-110'
    : variant === 'success'
    ? 'bg-accent-green hover:brightness-110'
    : 'bg-primary hover:brightness-110';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-bg rounded-2xl shadow-tile max-w-sm w-full p-6 animate-fade-in">
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-bold text-neutral-text mb-1">{title}</h3>
            <p className="font-body text-sm text-neutral-text-muted">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-neutral-border font-body font-bold text-neutral-text hover:bg-neutral-surface transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 rounded-xl font-body font-bold text-white transition-all ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
