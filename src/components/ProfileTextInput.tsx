import { useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

const MIN_CHAR_COUNT = 10;

const GUIDED_PROMPTS = [
  'What is your educational background? (degrees, certifications, courses)',
  'What is your current role and professional experience?',
  'What skills or technologies are you familiar with?',
  'What topics are you interested in learning about?',
  'How do you prefer to learn? (videos, reading, hands-on projects)',
];

interface ProfileTextInputProps {
  onSubmit: (content: string) => void;
  onBack: () => void;
}

export function ProfileTextInput({ onSubmit, onBack }: ProfileTextInputProps) {
  const [content, setContent] = useState('');

  const charCount = content.length;
  const isValid = charCount >= MIN_CHAR_COUNT;

  const handleSubmit = () => {
    if (isValid) {
      onSubmit(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.metaKey && isValid) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-neutral-surface transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-text-muted" />
        </button>
        <div>
          <h2 className="text-2xl font-display font-bold text-neutral-text">
            Tell us about yourself
          </h2>
          <p className="text-neutral-text-muted font-body">
            Share your background to help us personalize your learning experience.
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <h3 className="font-display font-semibold text-neutral-text mb-2">
            Consider including:
          </h3>
          <ul className="space-y-1">
            {GUIDED_PROMPTS.map((prompt, index) => (
              <li key={index} className="text-sm text-neutral-text-muted font-body flex items-start gap-2">
                <span className="text-primary">•</span>
                {prompt}
              </li>
            ))}
          </ul>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Start typing here..."
          className="w-full h-48 px-4 py-3 rounded-xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary focus:bg-neutral-bg focus:shadow-soft transition-all resize-none"
          aria-label="Background information"
        />

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm font-body">
            <span className={charCount < MIN_CHAR_COUNT ? 'text-accent-red' : 'text-neutral-text-muted'}>
              {charCount}
            </span>
            <span className="text-neutral-text-muted"> / {MIN_CHAR_COUNT} minimum characters</span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Submit
          </Button>
        </div>

        {!isValid && charCount > 0 && (
          <p className="mt-2 text-sm text-accent-red font-body">
            Please enter at least {MIN_CHAR_COUNT} characters to continue.
          </p>
        )}
      </Card>

      <p className="text-xs text-neutral-text-muted text-center font-body">
        Your information will be anonymized before storage to protect your privacy.
      </p>
    </div>
  );
}
