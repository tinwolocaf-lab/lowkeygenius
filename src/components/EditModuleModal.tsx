import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Sparkles } from 'lucide-react';

interface Module {
  title: string;
  description: string;
  lessons: Array<{
    title: string;
    objectives: string[];
  }>;
}

interface EditModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: Module;
  onSave: (updatedModule: Module) => void;
  onRegenerate?: (instructions?: string) => void;
}

export function EditModuleModal({
  isOpen,
  onClose,
  module,
  onSave,
  onRegenerate,
}: EditModuleModalProps) {
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description);
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [showRegenerateInput, setShowRegenerateInput] = useState(false);

  const handleSave = () => {
    onSave({
      ...module,
      title,
      description,
    });
    onClose();
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(regenerateInstructions || undefined);
      setRegenerateInstructions('');
      setShowRegenerateInput(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Module" size="md">
      <div className="space-y-4">
        <div>
          <label className="block font-body font-semibold text-neutral-text mb-2">
            Module Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter module title"
            className="w-full"
          />
        </div>

        <div>
          <label className="block font-body font-semibold text-neutral-text mb-2">
            Module Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter module description"
            rows={4}
            className="w-full px-4 py-3 rounded-xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary focus:bg-neutral-bg transition-all resize-none"
          />
        </div>

        {onRegenerate && (
          <div className="pt-4 border-t-2 border-neutral-border">
            {!showRegenerateInput ? (
              <Button
                variant="secondary"
                onClick={() => setShowRegenerateInput(true)}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Regenerate with AI
              </Button>
            ) : (
              <div className="space-y-3">
                <label className="block font-body font-semibold text-neutral-text">
                  AI Regeneration Instructions (optional)
                </label>
                <textarea
                  value={regenerateInstructions}
                  onChange={(e) => setRegenerateInstructions(e.target.value)}
                  placeholder="e.g., Make it more detailed, focus on practical applications, simplify the language..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary focus:bg-neutral-bg transition-all resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleRegenerate}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Regenerate
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowRegenerateInput(false);
                      setRegenerateInstructions('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
