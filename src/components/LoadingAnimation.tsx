import { Sparkles, BookOpen, Lightbulb, Zap } from 'lucide-react';

interface LoadingAnimationProps {
  message?: string;
}

export function LoadingAnimation({ message = 'Generating your course...' }: LoadingAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 my-6">
      <div className="relative w-32 h-32 mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping"></div>
        <div className="absolute inset-2 rounded-full bg-primary/20 animate-ping" style={{ animationDelay: '0.2s' }}></div>
        <div className="absolute inset-4 rounded-full bg-primary/30 animate-ping" style={{ animationDelay: '0.4s' }}></div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-tile animate-bounce-soft">
            <Sparkles className="w-12 h-12 text-white animate-pulse" />
          </div>
        </div>

        <div className="absolute -top-2 -right-2 bg-accent-yellow rounded-full p-2 shadow-soft animate-bounce" style={{ animationDelay: '0.1s' }}>
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div className="absolute -bottom-2 -left-2 bg-accent-green rounded-full p-2 shadow-soft animate-bounce" style={{ animationDelay: '0.3s' }}>
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="absolute top-1/2 -right-3 bg-secondary rounded-full p-2 shadow-soft animate-bounce" style={{ animationDelay: '0.5s' }}>
          <BookOpen className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="text-center">
        <h3 className="font-display text-display-sm text-neutral-text mb-2 animate-pulse">
          {message}
        </h3>
        <div className="flex items-center justify-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
}
