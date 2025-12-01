import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, RefreshCw, Calendar, MessageSquare, Mic, Type, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { useUserProfile } from '../hooks/useUserProfile';
import type { InputMethod } from '../types/database';

const INPUT_METHOD_LABELS: Record<InputMethod, { label: string; icon: typeof Type }> = {
  text: { label: 'Text Input', icon: Type },
  voice: { label: 'Voice Recording', icon: Mic },
  conversation: { label: 'AI Conversation', icon: MessageSquare },
};

export function ProfileSettings() {
  const navigate = useNavigate();
  const { profile, extractedContext, hasProfile, isLoading, error } = useUserProfile();
  const [showAnonymizedContent, setShowAnonymizedContent] = useState(false);

  const handleRedoOnboarding = () => {
    navigate('/profile-onboarding');
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <User className="w-6 h-6 text-primary" />
          <h2 className="font-display text-display-sm text-neutral-text">Learning Profile</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <User className="w-6 h-6 text-primary" />
          <h2 className="font-display text-display-sm text-neutral-text">Learning Profile</h2>
        </div>
        <p className="text-sm text-accent-red font-body mb-4">
          Failed to load profile: {error}
        </p>
        <Button variant="secondary" onClick={handleRedoOnboarding}>
          Create Profile
        </Button>
      </Card>
    );
  }

  if (!hasProfile || !profile || !extractedContext) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <User className="w-6 h-6 text-primary" />
          <h2 className="font-display text-display-sm text-neutral-text">Learning Profile</h2>
        </div>
        <p className="text-sm font-body text-neutral-text-muted mb-4">
          You haven't created a learning profile yet. Your profile helps personalize course generation to your background and interests.
        </p>
        <Button onClick={handleRedoOnboarding}>
          Create Profile
        </Button>
      </Card>
    );
  }

  const inputMethodInfo = INPUT_METHOD_LABELS[profile.input_method];
  const InputMethodIcon = inputMethodInfo.icon;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6 text-primary" />
          <h2 className="font-display text-display-sm text-neutral-text">Learning Profile</h2>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRedoOnboarding}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Update Profile
        </Button>
      </div>

      <div className="space-y-4">
        {/* Profile metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-neutral-text-muted">
          <div className="flex items-center gap-1.5">
            <InputMethodIcon className="w-4 h-4" />
            <span>{inputMethodInfo.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Created {new Date(profile.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Extracted context summary */}
        <div className="space-y-3 pt-2">
          {extractedContext.education && (
            <div>
              <h4 className="text-sm font-body font-medium text-neutral-text-muted mb-1">
                Education
              </h4>
              <p className="font-body text-neutral-text text-sm">
                {extractedContext.education}
              </p>
            </div>
          )}

          {extractedContext.experience && (
            <div>
              <h4 className="text-sm font-body font-medium text-neutral-text-muted mb-1">
                Experience
              </h4>
              <p className="font-body text-neutral-text text-sm">
                {extractedContext.experience}
              </p>
            </div>
          )}

          {extractedContext.interests && (
            <div>
              <h4 className="text-sm font-body font-medium text-neutral-text-muted mb-1">
                Interests
              </h4>
              <p className="font-body text-neutral-text text-sm">
                {extractedContext.interests}
              </p>
            </div>
          )}

          {extractedContext.expertise && extractedContext.expertise.length > 0 && (
            <div>
              <h4 className="text-sm font-body font-medium text-neutral-text-muted mb-1">
                Expertise
              </h4>
              <div className="flex flex-wrap gap-2">
                {extractedContext.expertise.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2.5 py-1 bg-primary-light/30 text-primary rounded-full text-xs font-body"
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
              <p className="font-body text-neutral-text text-sm">
                {extractedContext.learningStyle}
              </p>
            </div>
          )}
        </div>

        {/* Privacy notice */}
        <div className="flex items-start gap-2 p-3 bg-accent-green/10 rounded-xl mt-4">
          <Shield className="w-4 h-4 text-accent-green flex-shrink-0 mt-0.5" />
          <p className="text-xs text-neutral-text-muted font-body">
            Your personal information has been anonymized. Only learning-relevant data is stored.
          </p>
        </div>

        {/* Collapsible anonymized content */}
        <button
          onClick={() => setShowAnonymizedContent(!showAnonymizedContent)}
          className="flex items-center gap-1 text-xs text-neutral-text-muted hover:text-neutral-text transition-colors"
        >
          {showAnonymizedContent ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          {showAnonymizedContent ? 'Hide' : 'View'} anonymized content
        </button>

        {showAnonymizedContent && (
          <div className="p-3 bg-neutral-surface rounded-xl">
            <p className="text-xs font-body text-neutral-text whitespace-pre-wrap">
              {profile.anonymized_content}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
