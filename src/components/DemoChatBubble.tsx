import { User } from 'lucide-react';

interface DemoChatBubbleProps {
  type: 'assistant' | 'user';
  content: string;
  animate?: boolean;
}

export function DemoChatBubble({ type, content, animate = true }: DemoChatBubbleProps) {
  if (type === 'assistant') {
    return (
      <div className={`flex gap-3 mb-4 ${animate ? 'animate-fade-in' : ''}`}>
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-soft overflow-hidden">
            <img src="/favicon.png" alt="AI" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="flex-1 bg-neutral-bg rounded-2xl rounded-tl-md p-3 shadow-soft max-w-[80%]">
          <p className="font-body text-sm text-neutral-text whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 mb-4 justify-end ${animate ? 'animate-fade-in' : ''}`}>
      <div className="flex-1 bg-gradient-to-br from-primary to-primary-dark rounded-2xl rounded-tr-md p-3 shadow-soft max-w-[80%] ml-auto">
        <p className="font-body text-sm text-white whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shadow-soft">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
}
