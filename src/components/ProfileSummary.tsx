import { useState } from 'react';
import { Edit2, Check, Shield } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import type { ExtractedContext } from '../types/database';

interface ProfileSummaryProps {
  extractedContext: ExtractedContext;
  anonymizedContent: string;
  onConfirm: () => void;
  onEdit: (updatedContext: ExtractedContext) => void;
  isLoading?: boolean;
}

export function ProfileSummary({
  extractedContext,
  anonymizedContent,
  onConfirm,
  onEdit,
  isLoading = false,
}: ProfileSummaryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContext, setEditedContext] = useState<ExtractedContext>(extractedContext);

  const handleSaveEdit = () => {
    onEdit(editedContext);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContext(extractedContext);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-display font-bold text-neutral-text mb-2">
          Review Your Profile
        </h2>
        <p className="text-neutral-text-muted font-body">
          Here's what we extracted from your input. You can edit before saving.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-neutral-text">
            Extracted Information
          </h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-body font-medium text-neutral-text mb-1">
                Education
              </label>
              <textarea
                value={editedContext.education}
                onChange={(e) => setEditedContext({ ...editedContext, education: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text focus:outline-none focus:border-primary transition-all resize-none"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-neutral-text mb-1">
                Experience
              </label>
              <textarea
                value={editedContext.experience}
                onChange={(e) => setEditedContext({ ...editedContext, experience: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text focus:outline-none focus:border-primary transition-all resize-none"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-neutral-text mb-1">
                Interests
              </label>
              <textarea
                value={editedContext.interests}
                onChange={(e) => setEditedContext({ ...editedContext, interests: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text focus:outline-none focus:border-primary transition-all resize-none"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-neutral-text mb-1">
                Expertise (comma-separated)
              </label>
              <input
                type="text"
                value={editedContext.expertise.join(', ')}
                onChange={(e) => setEditedContext({
                  ...editedContext,
                  expertise: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                })}
                className="w-full px-4 py-2 rounded-xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-body font-medium text-neutral-text mb-1">
                Learning Style (optional)
              </label>
              <input
                type="text"
                value={editedContext.learningStyle || ''}
                onChange={(e) => setEditedContext({ ...editedContext, learningStyle: e.target.value || undefined })}
                placeholder="e.g., visual, hands-on, reading"
                className="w-full px-4 py-2 rounded-xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="secondary" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-body font-medium text-neutral-text-muted mb-1">
                Education
              </h4>
              <p className="font-body text-neutral-text">
                {extractedContext.education || 'Not specified'}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-body font-medium text-neutral-text-muted mb-1">
                Experience
              </h4>
              <p className="font-body text-neutral-text">
                {extractedContext.experience || 'Not specified'}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-body font-medium text-neutral-text-muted mb-1">
                Interests
              </h4>
              <p className="font-body text-neutral-text">
                {extractedContext.interests || 'Not specified'}
              </p>
            </div>

            {extractedContext.expertise.length > 0 && (
              <div>
                <h4 className="text-sm font-body font-medium text-neutral-text-muted mb-1">
                  Expertise
                </h4>
                <div className="flex flex-wrap gap-2">
                  {extractedContext.expertise.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary-light/30 text-primary rounded-full text-sm font-body"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {extractedContext.learningStyle && (
              <div>
                <h4 className="text-sm font-body font-medium text-neutral-text-muted mb-1">
                  Learning Style
                </h4>
                <p className="font-body text-neutral-text">
                  {extractedContext.learningStyle}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Anonymization Notice - Requirements 5.4 */}
      <Card className="p-4 bg-accent-green/10 border-accent-green/30">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-display font-semibold text-neutral-text mb-1">
              Privacy Protected
            </h4>
            <p className="text-sm text-neutral-text-muted font-body">
              Your personal information (names, emails, phone numbers) has been automatically 
              removed from your profile. Only anonymized learning-relevant information is stored.
            </p>
          </div>
        </div>
      </Card>

      {/* Raw Content Preview (collapsed) */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-neutral-text-muted font-body hover:text-neutral-text transition-colors">
          View anonymized content
        </summary>
        <Card className="mt-2 p-4 bg-neutral-surface">
          <p className="text-sm font-body text-neutral-text whitespace-pre-wrap">
            {anonymizedContent}
          </p>
        </Card>
      </details>

      <div className="flex justify-center pt-4">
        <Button
          onClick={onConfirm}
          disabled={isLoading || isEditing}
          size="lg"
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Confirm & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
