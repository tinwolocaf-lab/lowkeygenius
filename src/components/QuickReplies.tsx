import { Chip } from './Chip';

interface QuickRepliesProps {
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
}

export function QuickReplies({ options, onSelect }: QuickRepliesProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4 animate-fade-in">
      {options.map((option) => (
        <Chip
          key={option.value}
          onClick={() => onSelect(option.value)}
          variant="primary"
        >
          {option.label}
        </Chip>
      ))}
    </div>
  );
}
