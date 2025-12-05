import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Mic, Square } from 'lucide-react';
import { ChatMessage } from '../components/ChatMessage';
import { QuickReplies } from '../components/QuickReplies';
import { AttachmentsPanel } from '../components/AttachmentsPanel';
import { LoadingAnimation } from '../components/LoadingAnimation';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useSubscription } from '../hooks/useSubscription';
import { useHorrorTheme } from '../hooks/useHorrorTheme';
import { supabase } from '../lib/supabase';
import { generateCourseOutline } from '../lib/api';
import toast from 'react-hot-toast';
import type { Message, OnboardingData, Attachment } from '../types/onboarding';
import type { ExtractedContext } from '../types/database';

type OnboardingStep =
  | 'welcome'
  | 'topic'
  | 'materials'
  | 'attachments'
  | 'degree'
  | 'experience'
  | 'languages'
  | 'interests'
  | 'level'
  | 'intensity'
  | 'summary';

export function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasProfile, extractedContext, isLoading: isProfileLoading } = useUserProfile();
  const { 
    canCreateCourse, 
    isLoading: isSubscriptionLoading, 
    coursesUsed, 
    coursesLimit, 
    planType,
    activeGenerationCourse,
    blockingReason,
  } = useSubscription();
  const { isHorror } = useHorrorTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    topic: '',
    useMaterials: false,
    attachments: [],
    background: {},
    level: null,
    intensity: null,
  });
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Store profile context for course generation (Requirements 1.3, 1.4)
  const profileContextRef = useRef<ExtractedContext | null>(null);
  
  useEffect(() => {
    if (extractedContext) {
      profileContextRef.current = extractedContext;
    }
  }, [extractedContext]);

  // Redirect to profile onboarding if user has no profile (Requirements 1.1)
  useEffect(() => {
    if (!isProfileLoading && !hasProfile) {
      navigate('/profile-onboarding', { replace: true });
    }
  }, [isProfileLoading, hasProfile, navigate]);

  const navigateToActiveCourse = useCallback(() => {
    if (!activeGenerationCourse) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const path =
      activeGenerationCourse.status === 'generating_lessons'
        ? `/courses/${activeGenerationCourse.id}/generate`
        : `/courses/${activeGenerationCourse.id}/outline`;

    navigate(path, { replace: true });
  }, [activeGenerationCourse, navigate]);

  // Redirect to dashboard if quota exceeded or blocked by active generation (Requirements 1.3, 3.2)
  useEffect(() => {
    if (!isSubscriptionLoading && !canCreateCourse) {
      if (blockingReason === 'active_generation') {
        toast.error('Finish your current course before starting another.');
        navigateToActiveCourse();
      } else {
        toast.error(
          `Course limit reached (${coursesUsed}/${coursesLimit === Infinity ? '∞' : coursesLimit} on ${planType} plan). Please upgrade to create more courses.`,
          { duration: 5000 }
        );
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isSubscriptionLoading, canCreateCourse, coursesUsed, coursesLimit, planType, navigate, blockingReason, navigateToActiveCourse]);

  const addMessage = useCallback((type: 'assistant' | 'user' | 'system', content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, type, content, timestamp: new Date() },
    ]);
  }, []);

  const addAssistantMessage = useCallback((content: string) => addMessage('assistant', content), [addMessage]);
  const addUserMessage = useCallback((content: string) => addMessage('user', content), [addMessage]);
  const addSystemMessage = useCallback((content: string) => addMessage('system', content), [addMessage]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      addAssistantMessage("Hi! I'm your AI course designer. Let's create an amazing personalized course for you!");
      setTimeout(() => {
        addAssistantMessage("What would you like to learn about?");
        setStep('topic');
      }, 1000);
    }
  }, [addAssistantMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const message = inputValue.trim();
    addUserMessage(message);
    setInputValue('');

    handleStep(message);
  };

  const handleQuickReply = (value: string, label?: string) => {
    addUserMessage(label || value);
    setShowQuickReplies(false);
    handleStep(value);
  };

  const handleStep = (response: string) => {
    switch (step) {
      case 'topic':
        setData((prev) => ({ ...prev, topic: response }));
        setTimeout(() => {
          addAssistantMessage("Great choice! Would you like to provide your own learning materials (PDFs, URLs, documents) or let the AI generate everything?");
          setShowQuickReplies(true);
          setStep('materials');
        }, 500);
        break;

      case 'materials': {
        const useMaterials = response === 'with-materials';
        setData((prev) => ({ ...prev, useMaterials }));

        if (useMaterials) {
          setTimeout(() => {
            addAssistantMessage("Perfect! You can upload files, add URLs, or paste text. Take your time to add all your materials.");
            setShowAttachments(true);
            setStep('attachments');
          }, 500);
        } else {
          setTimeout(() => {
            proceedToBackground();
          }, 500);
        }
        break;
      }

      case 'attachments':
        setShowAttachments(false);
        addSystemMessage(`${data.attachments.length} material(s) added`);
        setTimeout(() => {
          proceedToBackground();
        }, 500);
        break;

      case 'degree':
        setData((prev) => ({ ...prev, background: { ...prev.background, degree: response } }));
        setTimeout(() => {
          addAssistantMessage("What's your experience level with this topic or related fields?");
          setStep('experience');
        }, 500);
        break;

      case 'experience':
        setData((prev) => ({ ...prev, background: { ...prev.background, experience: response } }));
        setTimeout(() => {
          addAssistantMessage("Any specific interests or goals that should shape this course?");
          setStep('interests');
        }, 500);
        break;

      case 'interests':
        setData((prev) => ({ ...prev, background: { ...prev.background, interests: response } }));
        setTimeout(() => {
          addAssistantMessage("Perfect! Now, what level should this course be?");
          setShowQuickReplies(true);
          setStep('level');
        }, 500);
        break;

      case 'level': {
        const level = response as 'beginner' | 'intermediate' | 'advanced' | 'expert';
        setData((prev) => ({ ...prev, level }));
        setTimeout(() => {
          addAssistantMessage("Last question! How deep should we go?");
          setShowQuickReplies(true);
          setStep('intensity');
        }, 500);
        break;
      }

      case 'intensity': {
        const intensity = response as 'short' | 'standard' | 'deep';
        setData((prev) => ({ ...prev, intensity }));
        setTimeout(() => {
          showSummary(intensity);
        }, 500);
        break;
      }
    }
  };

  const proceedToBackground = () => {
    // Skip background questions if user has a profile (Requirements 1.3, 1.4)
    if (hasProfile && profileContextRef.current) {
      addAssistantMessage("I already have your background from your profile. Let's continue with course settings!");
      setTimeout(() => {
        addAssistantMessage("What level should this course be?");
        setShowQuickReplies(true);
        setStep('level');
      }, 500);
      return;
    }
    
    addAssistantMessage("Now let me learn a bit about you to personalize the course. What's your educational background?");
    setStep('degree');
  };

  const showSummary = (intensity: string) => {
    addAssistantMessage("Excellent! Here's what we're creating:");

    setTimeout(() => {
      const summary = `📚 Course: ${data.topic}\n🎯 Level: ${data.level}\n⏱️ Intensity: ${intensity}\n${data.attachments.length > 0 ? `📎 Materials: ${data.attachments.length} attached\n` : ''}👤 Background: ${data.background.degree || 'Not specified'}`;
      addSystemMessage(summary);

      setTimeout(() => {
        addAssistantMessage("Ready to generate your personalized course?");
        setShowQuickReplies(true);
        setStep('summary');
      }, 1000);
    }, 500);
  };

  const handleGenerate = async () => {
    addUserMessage("Yes, let's create it!");
    setGenerating(true);

    try {
      addAssistantMessage("Creating your course and generating the outline... This will take a moment.");

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare materials for storage (full content)
      const materialsForStorage = data.attachments
        .filter(att => att.content && att.content.length > 0)
        .map(att => ({
          title: att.title,
          content: att.content,
        }));

      // Send content summary for outline generation (up to 10k chars per material)
      const materials = data.attachments.map(att => ({
        title: att.title,
        summary: att.content?.substring(0, 10000),
      }));

      // Backend now creates the course record after quota validation passes
      // This prevents orphaned courses when quota check fails (Requirements 2.1, 2.2, 2.3)
      const result = await generateCourseOutline({
        topic: data.topic,
        level: data.level!,
        intensity: data.intensity!,
        background: data.background,
        materials: materials.length > 0 ? materials : undefined,
        materialsForStorage: materialsForStorage.length > 0 ? materialsForStorage : undefined,
        profileContext: profileContextRef.current || undefined,
      });

      // The API now returns courseId along with the outline
      const courseId = result.courseId;

      if (!courseId) {
        throw new Error('Course creation failed - no course ID returned. Please try again.');
      }

      addAssistantMessage("Perfect! Your course outline is ready. Let's review it!");

      setTimeout(() => {
        navigate(`/courses/${courseId}/outline`);
      }, 1500);
    } catch (error) {
      console.error('Error generating course:', error);

      let errorMessage = "Oops! Something went wrong. Please try again.";

      const errorWithMessage = error as { message?: string };
      if (errorWithMessage?.message && errorWithMessage.message.includes('Gemini API error')) {
        try {
          const geminiError = JSON.parse(errorWithMessage.message.replace('Gemini API error: ', ''));
          if (geminiError?.error?.code === 429) {
            errorMessage = "AI service rate limit reached. Please wait a moment and try again, or check your API quota.";
          } else if (geminiError?.error?.message) {
            errorMessage = `AI service error: ${geminiError.error.message.split('\n')[0]}`;
          }
        } catch {
          if (errorWithMessage.message.includes('429') || errorWithMessage.message.includes('quota')) {
            errorMessage = "AI service rate limit reached. Please wait a moment and try again.";
          }
        }
      } else if (errorWithMessage?.message) {
        errorMessage = `Error: ${errorWithMessage.message}`;
      }

      addAssistantMessage(errorMessage);
      setGenerating(false);
    }
  };

  const handleAddAttachment = (attachment: Omit<Attachment, 'id'>) => {
    const newAttachment: Attachment = {
      ...attachment,
      id: Date.now().toString(),
    };
    setData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, newAttachment],
    }));
  };

  const handleRemoveAttachment = (id: string) => {
    setData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== id),
    }));
  };

  const handleContinueFromAttachments = () => {
    handleStep('continue');
  };

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = 5 * 24; // 5 lines * ~24px line height
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue, adjustTextareaHeight]);

  // Voice recording functions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      addAssistantMessage("Could not access microphone. Please check your browser permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);
    }
  }, [isRecording]);

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const response = await supabase.functions.invoke('speech-to-text', {
        body: {
          audioBase64: base64Audio,
          mimeType: 'audio/webm',
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Transcription failed');
      }

      const responseData = response.data as { success: boolean; transcription?: string; error?: string };

      if (!responseData.success || !responseData.transcription) {
        throw new Error(responseData.error || 'Failed to transcribe audio');
      }

      setInputValue(responseData.transcription);
      setIsTranscribing(false);
    } catch (err) {
      console.error('Transcription error:', err);
      addAssistantMessage("Failed to transcribe audio. Please try again or type your response.");
      setIsTranscribing(false);
    }
  };

  // Show loading while checking profile and subscription status
  if (isProfileLoading || isSubscriptionLoading) {
    return (
      <div className="min-h-screen bg-neutral-surface flex items-center justify-center">
        <LoadingAnimation message="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-surface flex flex-col">
      <header className={`bg-neutral-bg border-b shadow-soft p-4 flex items-center gap-4 ${isHorror ? 'border-primary-dark horror-header' : 'border-neutral-border'}`}>
        <button
          onClick={() => navigate('/dashboard')}
          className={`p-3 hover:bg-neutral-surface rounded-2xl transition-all active:scale-95 ${isHorror ? 'horror-glitch' : ''}`}
        >
          <ArrowLeft className="w-6 h-6 text-neutral-text" />
        </button>
        <h1 className={`font-display font-bold text-2xl text-neutral-text ${isHorror ? 'horror-text-glitch' : ''}`}>
          {isHorror ? 'Summon Grimoire' : 'Create Course'}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {messages.map((message) => (
            <ChatMessage key={message.id} type={message.type} content={message.content} />
          ))}

          {generating && (
            <LoadingAnimation message="Creating your personalized course..." />
          )}

          {showQuickReplies && step === 'materials' && (
            <QuickReplies
              options={[
                { label: 'AI Only', value: 'ai-only' },
                { label: 'Add My Materials', value: 'with-materials' },
              ]}
              onSelect={(value) => handleQuickReply(value, value === 'ai-only' ? 'AI Only' : 'Add My Materials')}
            />
          )}

          {showQuickReplies && step === 'level' && (
            <QuickReplies
              options={[
                { label: 'Beginner', value: 'beginner' },
                { label: 'Intermediate', value: 'intermediate' },
                { label: 'Advanced', value: 'advanced' },
                { label: 'Expert', value: 'expert' },
              ]}
              onSelect={(value) => handleQuickReply(value, value.charAt(0).toUpperCase() + value.slice(1))}
            />
          )}

          {showQuickReplies && step === 'intensity' && (
            <QuickReplies
              options={[
                { label: 'Short Overview', value: 'short' },
                { label: 'Standard Course', value: 'standard' },
                { label: 'Deep Dive', value: 'deep' },
              ]}
              onSelect={(value) => {
                const labels = { short: 'Short Overview', standard: 'Standard Course', deep: 'Deep Dive' };
                handleQuickReply(value, labels[value as keyof typeof labels]);
              }}
            />
          )}

          {showQuickReplies && step === 'summary' && (
            <QuickReplies
              options={[
                { label: "Yes, let's create it!", value: 'yes' },
                { label: 'Start Over', value: 'no' },
              ]}
              onSelect={(value) => {
                if (value === 'yes') {
                  handleGenerate();
                } else {
                  window.location.reload();
                }
              }}
            />
          )}

          {showAttachments && (
            <div>
              <AttachmentsPanel
                attachments={data.attachments}
                onAddAttachment={handleAddAttachment}
                onRemoveAttachment={handleRemoveAttachment}
              />
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleContinueFromAttachments}
                  className="px-8 py-4 bg-accent-green text-white rounded-2xl font-body font-bold hover:brightness-110 transition-all shadow-button active:scale-95 active:translate-y-1"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {!showQuickReplies && !showAttachments && step !== 'welcome' && (
        <div className={`bg-neutral-bg border-t-2 p-4 shadow-soft ${isHorror ? 'border-primary-dark' : 'border-neutral-border'}`}>
          <div className="max-w-4xl mx-auto flex gap-3 items-end">
            {/* Voice input button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={`p-4 rounded-2xl transition-all active:scale-95 ${
                isRecording 
                  ? 'bg-accent-red text-white animate-pulse' 
                  : 'hover:bg-neutral-surface'
              } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? (
                <Square className="w-5 h-5" />
              ) : isTranscribing ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Mic className="w-5 h-5 text-neutral-text-muted" />
              )}
            </button>
            {/* Auto-expanding textarea */}
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your answer..."
              rows={1}
              className="flex-1 px-5 py-4 rounded-2xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary focus:bg-neutral-bg focus:shadow-soft transition-all resize-none overflow-hidden"
              style={{ minHeight: '56px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isRecording || isTranscribing}
              className={`p-4 bg-primary text-white rounded-2xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-button active:scale-95 active:translate-y-1 ${isHorror ? 'horror-blood-drip horror-glitch' : ''}`}
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
