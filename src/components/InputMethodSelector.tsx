import { Type, Mic, MessageCircle } from 'lucide-react';
import { Card } from './Card';
import type { InputMethod } from '../types/database';

interface InputMethodOption {
  method: InputMethod;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface InputMethodSelectorProps {
  onSelect: (method: InputMethod) => void;
}

const INPUT_METHOD_OPTIONS: InputMethodOption[] = [
  {
    method: 'text',
    title: 'Type Your Background',
    description: 'Write about your education, experience, and learning goals at your own pace.',
    icon: <Type className="w-8 h-8" />,
  },
  {
    method: 'voice',
    title: 'Voice Recording',
    description: 'Record your voice and we\'ll transcribe it for you. Great for hands-free input.',
    icon: <Mic className="w-8 h-8" />,
  },
  {
    method: 'conversation',
    title: 'Real-time Conversation',
    description: 'Have a natural dialogue with our AI assistant to share your background.',
    icon: <MessageCircle className="w-8 h-8" />,
  },
];

export function InputMethodSelector({ onSelect }: InputMethodSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-bold text-neutral-text mb-2">
          How would you like to share your background?
        </h2>
        <p className="text-neutral-text-muted font-body">
          Choose the method that works best for you. This helps us personalize your learning experience.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {INPUT_METHOD_OPTIONS.map((option) => (
          <Card
            key={option.method}
            hover
            onClick={() => onSelect(option.method)}
            className="flex flex-col items-center text-center p-8 group"
          >
            <div className="w-16 h-16 rounded-full bg-primary-light/30 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
              {option.icon}
            </div>
            <h3 className="font-display font-bold text-lg text-neutral-text mb-2">
              {option.title}
            </h3>
            <p className="text-sm text-neutral-text-muted font-body">
              {option.description}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
