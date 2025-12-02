import { Link2, Mail } from 'lucide-react';

interface AccountLinkDialogProps {
  isOpen: boolean;
  email: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AccountLinkDialog({
  isOpen,
  email,
  onConfirm,
  onCancel,
}: AccountLinkDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-bg rounded-2xl shadow-tile max-w-md w-full p-6 animate-fade-in">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-primary-light/30 flex items-center justify-center flex-shrink-0">
            <Link2 className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg font-bold text-neutral-text mb-1">
              Account Already Exists
            </h3>
            <p className="font-body text-sm text-neutral-text-muted">
              An account with this email already exists.
            </p>
          </div>
        </div>

        <div className="bg-neutral-surface rounded-xl p-4 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <Mail className="w-5 h-5 text-neutral-text-muted" />
            <span className="font-body text-sm font-medium text-neutral-text">
              {email}
            </span>
          </div>
          <p className="font-body text-sm text-neutral-text-muted">
            By continuing, your Google account will be linked to your existing email account. 
            You'll be able to sign in using either method in the future.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-neutral-border font-body font-bold text-neutral-text hover:bg-neutral-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-xl font-body font-bold text-white bg-primary hover:brightness-110 transition-all"
          >
            Link Accounts
          </button>
        </div>
      </div>
    </div>
  );
}
