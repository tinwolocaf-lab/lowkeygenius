import { User } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoice: 'male' | 'female';
  onVoiceChange: (voice: 'male' | 'female') => void;
  disabled?: boolean;
}

interface VoiceOption {
  value: 'male' | 'female';
  label: string;
}

const voiceOptions: VoiceOption[] = [
  { value: 'male', label: 'Male Voice' },
  { value: 'female', label: 'Female Voice' },
];

export function VoiceSelector({
  selectedVoice,
  onVoiceChange,
  disabled = false,
}: VoiceSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="font-display font-bold text-neutral-text">
        Select Voice
      </label>
      <div className="flex gap-4">
        {voiceOptions.map((option) => {
          const isSelected = selectedVoice === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !disabled && onVoiceChange(option.value)}
              disabled={disabled}
              className={`
                flex items-center gap-3 px-6 py-4 rounded-2xl font-body font-bold text-sm
                transition-all duration-200 cursor-pointer
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
                ${
                  isSelected
                    ? 'bg-primary text-white shadow-tile border-2 border-primary'
                    : 'bg-white border-2 border-neutral-border text-neutral-text hover:border-primary hover:bg-primary-light/20'
                }
                ${disabled && !isSelected ? 'hover:border-neutral-border hover:bg-white' : ''}
              `}
              aria-pressed={isSelected}
              aria-label={`Select ${option.label}`}
            >
              <User className="w-5 h-5" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
