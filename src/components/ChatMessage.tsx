import { User } from 'lucide-react';

interface ChatMessageProps {
  type: 'assistant' | 'user' | 'system';
  content: string;
}

export function ChatMessage({ type, content }: ChatMessageProps) {
  if (type === 'assistant') {
    return (
      <div className="flex gap-4 mb-6 animate-fade-in">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-soft overflow-hidden">
            <img src="/favicon.png" alt="AI" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="flex-1 bg-neutral-bg rounded-3xl rounded-tl-lg p-5 shadow-soft max-w-2xl">
          <p className="font-body text-base text-neutral-text whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>
      </div>
    );
  }

  if (type === 'user') {
    return (
      <div className="flex gap-4 mb-6 justify-end animate-fade-in">
        <div className="flex-1 bg-gradient-to-br from-primary to-primary-dark rounded-3xl rounded-tr-lg p-5 shadow-soft max-w-2xl">
          <p className="font-body text-base text-white whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shadow-soft">
            <User className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-6 animate-fade-in">
      <div className="bg-neutral-surface border-2 border-neutral-border rounded-2xl px-5 py-3 max-w-2xl shadow-soft">
        <p className="font-body text-sm text-neutral-text-muted text-center font-semibold">{content}</p>
      </div>
    </div>
  );
}
