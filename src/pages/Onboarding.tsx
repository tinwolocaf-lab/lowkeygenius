import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Paperclip, ArrowLeft } from 'lucide-react';
import { ChatMessage } from '../components/ChatMessage';
import { QuickReplies } from '../components/QuickReplies';
import { AttachmentsPanel } from '../components/AttachmentsPanel';
import { LoadingAnimation } from '../components/LoadingAnimation';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { generateCourseOutline } from '../lib/api';
import type { Message, OnboardingData, Attachment } from '../types/onboarding';

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

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      addAssistantMessage("Hi! I'm your AI course designer. Let's create an amazing personalized course for you!");
      setTimeout(() => {
        addAssistantMessage("What would you like to learn about?");
        setStep('topic');
      }, 1000);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (type: 'assistant' | 'user' | 'system', content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, type, content, timestamp: new Date() },
    ]);
  };

  const addAssistantMessage = (content: string) => addMessage('assistant', content);
  const addUserMessage = (content: string) => addMessage('user', content);
  const addSystemMessage = (content: string) => addMessage('system', content);

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

      case 'materials':
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

      case 'level':
        const level = response as 'beginner' | 'intermediate' | 'advanced' | 'expert';
        setData((prev) => ({ ...prev, level }));
        setTimeout(() => {
          addAssistantMessage("Last question! How deep should we go?");
          setShowQuickReplies(true);
          setStep('intensity');
        }, 500);
        break;

      case 'intensity':
        const intensity = response as 'short' | 'standard' | 'deep';
        setData((prev) => ({ ...prev, intensity }));
        setTimeout(() => {
          showSummary(intensity);
        }, 500);
        break;
    }
  };

  const proceedToBackground = () => {
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

      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert({
          owner_id: user.id,
          title: `${data.topic}`,
          description: `A ${data.level} level course on ${data.topic}`,
          topic: data.topic,
          level: data.level!,
          intensity: data.intensity!,
          status: 'draft_outline',
        })
        .select()
        .single();

      if (courseError) {
        throw courseError;
      }

      const materials = data.attachments.map(att => ({
        title: att.title,
        summary: att.content?.substring(0, 500),
      }));

      const outline = await generateCourseOutline({
        topic: data.topic,
        level: data.level!,
        intensity: data.intensity!,
        background: data.background,
        materials: materials.length > 0 ? materials : undefined,
      });

      const { error: updateError } = await supabase
        .from('courses')
        .update({
          outline_json: outline,
          estimated_duration_hours: outline.estimatedDurationHours,
          status: 'ready',
        })
        .eq('id', course.id);

      if (updateError) {
        throw updateError;
      }

      addAssistantMessage("Perfect! Your course outline is ready. Let's review it!");

      setTimeout(() => {
        navigate(`/courses/${course.id}/outline`);
      }, 1500);
    } catch (error: any) {
      console.error('Error generating course:', error);

      let errorMessage = "Oops! Something went wrong. Please try again.";

      if (error?.message && error.message.includes('Gemini API error')) {
        try {
          const geminiError = JSON.parse(error.message.replace('Gemini API error: ', ''));
          if (geminiError?.error?.code === 429) {
            errorMessage = "AI service rate limit reached. Please wait a moment and try again, or check your API quota.";
          } else if (geminiError?.error?.message) {
            errorMessage = `AI service error: ${geminiError.error.message.split('\n')[0]}`;
          }
        } catch (parseError) {
          if (error.message.includes('429') || error.message.includes('quota')) {
            errorMessage = "AI service rate limit reached. Please wait a moment and try again.";
          }
        }
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
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

  return (
    <div className="min-h-screen bg-neutral-surface flex flex-col">
      <header className="bg-neutral-bg border-b border-neutral-border shadow-soft p-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-3 hover:bg-neutral-surface rounded-2xl transition-all active:scale-95"
        >
          <ArrowLeft className="w-6 h-6 text-neutral-text" />
        </button>
        <h1 className="font-display font-bold text-2xl text-neutral-text">Create Course</h1>
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
        <div className="bg-neutral-bg border-t-2 border-neutral-border p-4 shadow-soft">
          <div className="max-w-4xl mx-auto flex gap-3">
            <button className="p-4 hover:bg-neutral-surface rounded-2xl transition-all active:scale-95">
              <Paperclip className="w-5 h-5 text-neutral-text-muted" />
            </button>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your answer..."
              className="flex-1 px-5 py-4 rounded-2xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary focus:bg-neutral-bg focus:shadow-soft transition-all"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="p-4 bg-primary text-white rounded-2xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-button active:scale-95 active:translate-y-1"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
