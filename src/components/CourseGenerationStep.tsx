import { CheckCircle2, Loader2 } from 'lucide-react';

interface CourseGenerationStepProps {
  lessonNumber: number;
  lessonTitle: string;
  status: 'pending' | 'generating' | 'completed';
  animate?: boolean;
}

export function CourseGenerationStep({ lessonNumber, lessonTitle, status, animate = true }: CourseGenerationStepProps) {
  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-xl ${animate ? 'animate-fade-in' : ''} ${status === 'generating' ? 'bg-primary/10' : ''}`}>
      <div className="flex-shrink-0">
        {status === 'completed' && (
          <div className="w-6 h-6 rounded-full bg-accent-green flex items-center justify-center animate-scale-in">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        )}
        {status === 'generating' && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
        )}
        {status === 'pending' && (
          <div className="w-6 h-6 rounded-full border-2 border-neutral-border" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-body text-sm ${status === 'completed' ? 'text-neutral-text-muted line-through' : 'text-neutral-text'}`}>
          Lesson {lessonNumber}: {lessonTitle}
        </p>
      </div>
      {status === 'generating' && (
        <div className="flex-shrink-0">
          <div className="flex gap-1">
            <div className="w-1 h-4 bg-primary rounded-full animate-pulse" />
            <div className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
            <div className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      )}
    </div>
  );
}
