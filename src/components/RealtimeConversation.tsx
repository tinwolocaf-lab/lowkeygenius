import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Mic, Square, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { VoiceOrb } from './VoiceOrb';
import { supabase } from '../lib/supabase';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface RealtimeConversationProps {
  onConversationComplete: (history: ConversationMessage[]) => void;
  onBack: () => void;
}

type ConversationState = 'idle' | 'listening' | 'processing' | 'speaking' | 'complete';

const MAX_VISIBLE_LINES = 4;

// Completion indicators from the profile-chat edge function
const COMPLETION_INDICATORS = [
  'I have a good understanding',
  'I now have enough information',
  'Thank you for sharing',
  'I have all the information I need',
  'That gives me a complete picture',
  'I understand your background well',
  'This is very helpful information',
];

function checkConversationComplete(text: string): boolean {
  const lowerText = text.toLowerCase();
  return COMPLETION_INDICATORS.some(indicator => 
    lowerText.includes(indicator.toLowerCase())
  );
}

export function RealtimeConversation({ onConversationComplete, onBack }: RealtimeConversationProps) {
  const [state, setState] = useState<ConversationState>('idle');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [recentTranscripts, setRecentTranscripts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const messagesRef = useRef<ConversationMessage[]>([]);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startListeningRef = useRef<() => Promise<void>>();

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Add transcript to recent list
  const addTranscript = useCallback((text: string, role: 'user' | 'assistant') => {
    const prefix = role === 'user' ? 'You: ' : 'AI: ';
    setRecentTranscripts(prev => {
      const newTranscripts = [...prev, prefix + text];
      return newTranscripts.slice(-MAX_VISIBLE_LINES);
    });

    const message: ConversationMessage = {
      role,
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  }, []);

  // Speak text using browser's Speech Synthesis
  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthRef.current = utterance;
        
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
          v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha'))
        ) || voices.find(v => v.lang.startsWith('en'));
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
        
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onend = () => {
          speechSynthRef.current = null;
          resolve();
        };

        utterance.onerror = () => {
          speechSynthRef.current = null;
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } else {
        resolve();
      }
    });
  }, []);

  // Update audio level visualization
  const updateAudioLevel = useCallback((): void => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(average / 255);
    }
    
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  // Process recorded audio
  const processAudio = useCallback(async (audioBlob: Blob): Promise<void> => {
    try {
      setState('processing');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const transcribeResponse = await supabase.functions.invoke('speech-to-text', {
        body: {
          audioBase64: base64Audio,
          mimeType: 'audio/webm',
        },
      });

      if (transcribeResponse.error) {
        throw new Error(transcribeResponse.error.message || 'Transcription failed');
      }

      const transcribeData = transcribeResponse.data as { success: boolean; transcription?: string; error?: string };

      if (!transcribeData.success || !transcribeData.transcription) {
        throw new Error(transcribeData.error || 'Failed to transcribe audio');
      }

      addTranscript(transcribeData.transcription, 'user');

      const chatResponse = await supabase.functions.invoke('profile-chat', {
        body: {
          message: transcribeData.transcription,
          conversationHistory: messagesRef.current,
        },
      });

      if (chatResponse.error) {
        throw new Error(chatResponse.error.message || 'Chat failed');
      }

      const chatData = chatResponse.data as { 
        success: boolean; 
        response?: string; 
        conversationComplete?: boolean;
        error?: string;
      };

      if (!chatData.success || !chatData.response) {
        throw new Error(chatData.error || 'Failed to get response');
      }

      addTranscript(chatData.response, 'assistant');

      setState('speaking');
      await speakText(chatData.response);

      if (chatData.conversationComplete || checkConversationComplete(chatData.response)) {
        setState('complete');
      } else {
        // Continue listening using ref to avoid circular dependency
        startListeningRef.current?.();
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to process audio');
      setState('idle');
    }
  }, [addTranscript, speakText]);

  // Start listening
  const startListening = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

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
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await processAudio(audioBlob);
        }
      };

      mediaRecorder.start(1000);
      setState('listening');

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check your browser permissions.');
      setState('idle');
    }
  }, [processAudio, updateAudioLevel]);

  // Keep startListeningRef in sync
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    setAudioLevel(0);
  }, []);

  // Start conversation
  const startConversation = useCallback(async () => {
    const greeting = "Hi! I'm here to learn about your background to help personalize your learning experience. Could you start by telling me about your educational background? What degrees, certifications, or courses have you completed?";
    addTranscript(greeting, 'assistant');

    setState('speaking');
    await speakText(greeting);
    
    startListening();
  }, [addTranscript, speakText, startListening]);

  // End conversation
  const endConversation = useCallback(() => {
    stopListening();
    
    if (speechSynthRef.current) {
      window.speechSynthesis.cancel();
    }

    setState('complete');
  }, [stopListening]);

  // Handle finish
  const handleFinish = () => {
    onConversationComplete(messages);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (speechSynthRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const isActive = state === 'listening' || state === 'processing' || state === 'speaking';

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
        <div className="flex-1">
          <h2 className="text-2xl font-display font-bold text-neutral-text">
            Voice Conversation
          </h2>
          <p className="text-neutral-text-muted font-body">
            Speak naturally with our AI assistant
          </p>
        </div>
      </div>

      {error && (
        <Card className="p-4 bg-accent-red/10 border-accent-red">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
            <p className="text-accent-red font-body">{error}</p>
          </div>
        </Card>
      )}

      <Card className="p-8 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
        {state === 'idle' && (
          <div className="text-center">
            <div className="mb-6">
              <VoiceOrb isListening={false} isSpeaking={false} audioLevel={0} />
            </div>
            <p className="text-neutral-text-muted font-body mb-6 max-w-md">
              Start a voice conversation with our AI assistant. 
              Just speak naturally and share your background.
            </p>
            <Button onClick={startConversation} size="lg" className="gap-2">
              <Mic className="w-5 h-5" />
              Start Conversation
            </Button>
          </div>
        )}

        {isActive && (
          <div className="w-full flex flex-col items-center">
            <div
              className="transition-transform duration-150 mb-8"
              style={{
                transform: `scale(${1 + Math.min(audioLevel * 2.5, 0.7)})`,
              }}
            >
              <VoiceOrb
                isListening={state === 'listening'}
                isSpeaking={state === 'speaking'}
                audioLevel={audioLevel}
              />
            </div>

            <div className="text-center mb-6">
              <p className="text-lg font-medium text-neutral-text">
                {state === 'listening' && 'Listening...'}
                {state === 'processing' && 'Processing...'}
                {state === 'speaking' && 'AI is speaking...'}
              </p>
              <p className="text-sm text-neutral-text-muted mt-1">
                {state === 'listening' && 'Speak naturally, then pause when done'}
                {state === 'processing' && 'Transcribing your speech'}
                {state === 'speaking' && 'Wait for the response to finish'}
              </p>
            </div>

            {recentTranscripts.length > 0 && (
              <div className="w-full max-w-lg bg-neutral-surface/50 rounded-xl p-4 mb-6">
                <div className="space-y-2">
                  {recentTranscripts.map((transcript, idx) => (
                    <p
                      key={idx}
                      className={`text-sm font-body transition-opacity duration-300 ${
                        idx === recentTranscripts.length - 1
                          ? 'text-neutral-text opacity-100'
                          : 'text-neutral-text-muted opacity-70'
                      }`}
                    >
                      {transcript}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {state === 'listening' && (
                <Button
                  onClick={stopListening}
                  size="lg"
                  className="gap-2 bg-accent-red hover:bg-accent-red/90"
                >
                  <Square className="w-5 h-5" />
                  Stop & Send
                </Button>
              )}
              
              {state !== 'listening' && (
                <Button
                  onClick={endConversation}
                  size="lg"
                  variant="secondary"
                  className="gap-2"
                >
                  End Conversation
                </Button>
              )}
            </div>
          </div>
        )}

        {state === 'complete' && (
          <div className="w-full flex flex-col items-center">
            <div className="mb-6">
              <VoiceOrb isListening={false} isSpeaking={false} audioLevel={0} />
            </div>

            <div className="text-center mb-6">
              <p className="text-lg font-medium text-neutral-text">
                Conversation Complete
              </p>
              <p className="text-sm text-neutral-text-muted mt-1">
                {messages.length} messages recorded
              </p>
            </div>

            {recentTranscripts.length > 0 && (
              <div className="w-full max-w-lg bg-neutral-surface/50 rounded-xl p-4 mb-6">
                <div className="space-y-2">
                  {recentTranscripts.map((transcript, idx) => (
                    <p
                      key={idx}
                      className="text-sm font-body text-neutral-text-muted"
                    >
                      {transcript}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleFinish}
              size="lg"
              className="gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Submit & Continue
            </Button>
          </div>
        )}
      </Card>

      <p className="text-xs text-neutral-text-muted text-center font-body">
        Your information will be anonymized before storage to protect your privacy.
      </p>
    </div>
  );
}
