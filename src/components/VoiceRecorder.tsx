import { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Mic, Square, RefreshCw, Send, Edit2 } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { supabase } from '../lib/supabase';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onBack: () => void;
}

type RecorderState = 'idle' | 'recording' | 'transcribing' | 'review';

export function VoiceRecorder({ onTranscriptionComplete, onBack }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [transcription, setTranscription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start(1000);
      setState('recording');
      setRecordingDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check your browser permissions and try again.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('transcribing');
    }
  }, [state]);

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

      const data = response.data as { success: boolean; transcription?: string; error?: string };

      if (!data.success || !data.transcription) {
        throw new Error(data.error || 'Failed to transcribe audio');
      }

      setTranscription(data.transcription);
      setState('review');
    } catch (err) {
      console.error('Transcription error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to transcribe audio';
      setError(errorMessage);
      setState('idle');
    }
  };

  const handleRetry = () => {
    setTranscription('');
    setError(null);
    setState('idle');
    setRecordingDuration(0);
  };

  const handleSubmit = () => {
    if (transcription.trim()) {
      onTranscriptionComplete(transcription);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
        <div>
          <h2 className="text-2xl font-display font-bold text-neutral-text">
            Voice Recording
          </h2>
          <p className="text-neutral-text-muted font-body">
            Record your voice and we'll transcribe it for you.
          </p>
        </div>
      </div>

      {error && (
        <Card className="p-4 bg-accent-red/10 border-accent-red">
          <p className="text-accent-red font-body">{error}</p>
          <Button variant="ghost" size="sm" onClick={handleRetry} className="mt-2">
            Try Again
          </Button>
        </Card>
      )}

      {state === 'idle' && !error && (
        <Card className="p-8 text-center">
          <div className="mb-6">
            <p className="text-neutral-text-muted font-body mb-4">
              Click the button below to start recording. Share your educational background, 
              experience, and learning goals.
            </p>
          </div>
          <Button onClick={startRecording} size="lg" className="flex items-center gap-2 mx-auto">
            <Mic className="w-5 h-5" />
            Start Recording
          </Button>
        </Card>
      )}

      {state === 'recording' && (
        <Card className="p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 rounded-full bg-accent-red/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-accent-red flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-2xl font-display font-bold text-neutral-text">
              {formatDuration(recordingDuration)}
            </p>
            <p className="text-neutral-text-muted font-body">Recording...</p>
          </div>
          <Button onClick={stopRecording} variant="warning" size="lg" className="flex items-center gap-2 mx-auto">
            <Square className="w-5 h-5" />
            Stop Recording
          </Button>
        </Card>
      )}

      {state === 'transcribing' && (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-light/30 flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
          <p className="text-neutral-text font-body">Transcribing your recording...</p>
        </Card>
      )}

      {state === 'review' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-neutral-text">
              Review Your Transcription
            </h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              {isEditing ? 'Done Editing' : 'Edit'}
            </button>
          </div>

          {isEditing ? (
            <textarea
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              className="w-full h-48 px-4 py-3 rounded-xl border-2 border-neutral-border bg-neutral-surface font-body text-neutral-text focus:outline-none focus:border-primary focus:bg-white focus:shadow-soft transition-all resize-none"
            />
          ) : (
            <div className="p-4 rounded-xl bg-neutral-surface border border-neutral-border min-h-[120px]">
              <p className="font-body text-neutral-text whitespace-pre-wrap">{transcription}</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <Button variant="secondary" onClick={handleRetry} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Record Again
            </Button>
            <Button onClick={handleSubmit} disabled={!transcription.trim()} className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Submit
            </Button>
          </div>
        </Card>
      )}

      <p className="text-xs text-neutral-text-muted text-center font-body">
        Your information will be anonymized before storage to protect your privacy.
      </p>
    </div>
  );
}
