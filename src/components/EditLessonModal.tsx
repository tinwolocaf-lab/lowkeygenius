import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Sparkles, Plus, X } from 'lucide-react';

interface Lesson {
  title: string;
  objectives: string[];
}

interface EditLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson;
  onSave: (updatedLesson: Lesson) => void;
  onRegenerate?: (instructions?: string) => void;
}

export function EditLessonModal({
  isOpen,
  onClose,
  lesson,
  onSave,
  onRegenerate,
}: EditLessonModalProps) {
  const [title, setTitle] = useState(lesson.title);
  const [objectives, setObjectives] = useState<string[]>(lesson.objectives || []);
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [showRegenerateInput, setShowRegenerateInput] = useState(false);

  const handleSave = () => {
    onSave({
      title,
      objectives: objectives.filter(obj => obj.trim() !== ''),
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

  const addObjective = () => {
    setObjectives([...objectives, '']);
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...objectives];
    newObjectives[index] = value;
    setObjectives(newObjectives);
  };

  const removeObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Lesson" size="md">
      <div className="space-y-4">
        <div>
          <label className="block font-body font-semibold text-neutral-text mb-2">
            Lesson Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter lesson title"
            className="w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block font-body font-semibold text-neutral-text">
              Learning Objectives
            </label>
            <button
              onClick={addObjective}
              className="flex items-center gap-1 px-3 py-1 text-sm font-body font-semibold text-primary hover:bg-primary-light/20 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          <div className="space-y-2">
            {objectives.map((objective, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={objective}
                  onChange={(e) => updateObjective(index, e.target.value)}
                  placeholder="Enter learning objective"
                  className="flex-1"
                />
                <button
                  onClick={() => removeObjective(index)}
                  className="p-2 hover:bg-accent-red/10 text-accent-red rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
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
                  placeholder="e.g., Make objectives more specific, add practical examples, simplify..."
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
