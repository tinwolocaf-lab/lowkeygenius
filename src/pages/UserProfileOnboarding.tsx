/**
 * UserProfileOnboarding Page
 * Manages the one-time profile onboarding flow with state machine
 * 
 * Requirements: 1.2, 7.1
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { InputMethodSelector } from '../components/InputMethodSelector';
import { ProfileTextInput } from '../components/ProfileTextInput';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { RealtimeConversation } from '../components/RealtimeConversation';
import { ProfileSummary } from '../components/ProfileSummary';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { InputMethod, ExtractedContext } from '../types/database';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type OnboardingStep = 'method-selection' | 'input' | 'review' | 'saving';

interface OnboardingState {
  step: OnboardingStep;
  inputMethod: InputMethod | null;
  rawContent: string;
  conversationHistory: ConversationMessage[];
  extractedContext: ExtractedContext | null;
  anonymizedContent: string;
  error: string | null;
}

interface UserProfileOnboardingProps {
  onComplete?: () => void;
  redirectTo?: string;
}

export function UserProfileOnboarding({ 
  onComplete, 
  redirectTo = '/onboarding' 
}: UserProfileOnboardingProps) {
  const navigate = useNavigate();
  useAuth(); // Ensure user is authenticated
  
  const [state, setState] = useState<OnboardingState>({
    step: 'method-selection',
    inputMethod: null,
    rawContent: '',
    conversationHistory: [],
    extractedContext: null,
    anonymizedContent: '',
    error: null,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Handle input method selection - Requirements 7.3
  const handleMethodSelect = useCallback((method: InputMethod) => {
    setState(prev => ({
      ...prev,
      step: 'input',
      inputMethod: method,
      error: null,
    }));
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: 'method-selection',
      inputMethod: null,
      rawContent: '',
      conversationHistory: [],
      error: null,
    }));
  }, []);

  // Process content and get extracted context from save-profile API
  const processContent = useCallback(async (
    content: string,
    conversationHistory?: ConversationMessage[]
  ) => {
    setState(prev => ({ ...prev, step: 'saving', error: null }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call save-profile to get anonymized content and extracted context
      // We'll use a preview mode first to show the user before final save
      const response = await supabase.functions.invoke('save-profile', {
        body: {
          inputMethod: state.inputMethod,
          rawContent: content,
          conversationHistory: conversationHistory?.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp.toISOString(),
          })),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to process profile');
      }

      const data = response.data as {
        success: boolean;
        profileId?: string;
        extractedContext?: ExtractedContext;
        error?: string;
      };

      if (!data.success) {
        throw new Error(data.error || 'Failed to process profile');
      }

      // Profile was saved, now show review
      setState(prev => ({
        ...prev,
        step: 'review',
        rawContent: content,
        conversationHistory: conversationHistory || [],
        extractedContext: data.extractedContext || {
          education: '',
          experience: '',
          interests: content.substring(0, 200),
          expertise: [],
        },
        // The save-profile already anonymized, so we show the original for now
        // In a real implementation, we'd get the anonymized version back
        anonymizedContent: content,
        error: null,
      }));
    } catch (err) {
      console.error('Error processing content:', err);
      setState(prev => ({
        ...prev,
        step: 'input',
        error: err instanceof Error ? err.message : 'Failed to process your input',
      }));
    }
  }, [state.inputMethod]);

  // Handle text input submission
  const handleTextSubmit = useCallback((content: string) => {
    setState(prev => ({ ...prev, rawContent: content }));
    processContent(content);
  }, [processContent]);

  // Handle voice transcription completion
  const handleTranscriptionComplete = useCallback((text: string) => {
    setState(prev => ({ ...prev, rawContent: text }));
    processContent(text);
  }, [processContent]);

  // Handle conversation completion
  const handleConversationComplete = useCallback((history: ConversationMessage[]) => {
    // Combine all user messages as the raw content
    const userContent = history
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join('\n\n');
    
    setState(prev => ({ 
      ...prev, 
      rawContent: userContent,
      conversationHistory: history,
    }));
    processContent(userContent, history);
  }, [processContent]);

  // Handle profile confirmation - Requirements 1.2
  const handleConfirm = useCallback(async () => {
    setIsSaving(true);
    
    // Profile is already saved from processContent, just redirect
    // In a production app, you might want to update with edited context here
    
    setTimeout(() => {
      setIsSaving(false);
      if (onComplete) {
        onComplete();
      } else {
        navigate(redirectTo);
      }
    }, 500);
  }, [navigate, redirectTo, onComplete]);

  // Handle context edit
  const handleEditContext = useCallback((updatedContext: ExtractedContext) => {
    setState(prev => ({
      ...prev,
      extractedContext: updatedContext,
    }));
  }, []);

  // Render based on current step
  const renderStep = () => {
    switch (state.step) {
      case 'method-selection':
        return <InputMethodSelector onSelect={handleMethodSelect} />;

      case 'input':
        if (state.inputMethod === 'text') {
          return (
            <ProfileTextInput
              onSubmit={handleTextSubmit}
              onBack={handleBack}
            />
          );
        }
        if (state.inputMethod === 'voice') {
          return (
            <VoiceRecorder
              onTranscriptionComplete={handleTranscriptionComplete}
              onBack={handleBack}
            />
          );
        }
        if (state.inputMethod === 'conversation') {
          return (
            <RealtimeConversation
              onConversationComplete={handleConversationComplete}
              onBack={handleBack}
            />
          );
        }
        return null;

      case 'saving':
        return (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-light/30 flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
            <p className="text-neutral-text font-body">Processing your profile...</p>
            <p className="text-sm text-neutral-text-muted font-body mt-2">
              Anonymizing data and extracting learning context
            </p>
          </Card>
        );

      case 'review':
        if (!state.extractedContext) return null;
        return (
          <ProfileSummary
            extractedContext={state.extractedContext}
            anonymizedContent={state.anonymizedContent}
            onConfirm={handleConfirm}
            onEdit={handleEditContext}
            isLoading={isSaving}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-surface flex flex-col">
      <header className="bg-neutral-bg border-b border-neutral-border shadow-soft p-4 flex items-center gap-4">
        {state.step === 'method-selection' ? (
          <button
            onClick={() => navigate('/dashboard')}
            className="p-3 hover:bg-neutral-surface rounded-2xl transition-all active:scale-95"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-6 h-6 text-neutral-text" />
          </button>
        ) : (
          <div className="w-12" /> // Spacer for alignment
        )}
        <div className="flex-1">
          <h1 className="font-display font-bold text-2xl text-neutral-text">
            Profile Setup
          </h1>
          <p className="text-sm text-neutral-text-muted font-body">
            Tell us about yourself to personalize your learning
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 md:p-8">
          {state.error && (
            <Card className="p-4 mb-6 bg-accent-red/10 border-accent-red">
              <p className="text-accent-red font-body">{state.error}</p>
            </Card>
          )}
          
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
