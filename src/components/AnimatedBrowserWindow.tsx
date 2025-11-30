import { X, Minus, Square } from 'lucide-react';
import { ReactNode } from 'react';

interface AnimatedBrowserWindowProps {
  children: ReactNode;
  url?: string;
}

export function AnimatedBrowserWindow({ children, url = 'learnself.ai/create' }: AnimatedBrowserWindowProps) {
  return (
    <div className="w-full h-full bg-neutral-surface rounded-2xl shadow-2xl overflow-hidden border border-neutral-border">
      <div className="bg-neutral-bg border-b border-neutral-border px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-red opacity-60" />
          <div className="w-3 h-3 rounded-full bg-accent-yellow opacity-60" />
          <div className="w-3 h-3 rounded-full bg-accent-green opacity-60" />
        </div>

        <div className="flex-1 flex items-center gap-2 px-4">
          <div className="flex-1 bg-neutral-surface border border-neutral-border rounded-lg px-3 py-1.5">
            <span className="font-body text-xs text-neutral-text-muted">{url}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-40">
          <button className="p-1 hover:bg-neutral-surface rounded transition-colors">
            <Minus className="w-3 h-3 text-neutral-text-muted" />
          </button>
          <button className="p-1 hover:bg-neutral-surface rounded transition-colors">
            <Square className="w-3 h-3 text-neutral-text-muted" />
          </button>
          <button className="p-1 hover:bg-neutral-surface rounded transition-colors">
            <X className="w-3 h-3 text-neutral-text-muted" />
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-48px)] overflow-hidden bg-neutral-surface">
        {children}
      </div>
    </div>
  );
}
