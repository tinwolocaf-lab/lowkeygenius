import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface VoiceNoteInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'transcribing';

export function VoiceNoteInput({ onTranscription, disabled }: VoiceNoteInputProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const response = await supabase.functions.invoke<{
        success: boolean;
        transcription?: string;
        error?: string;
      }>('speech-to-text', {
        body: {
          audioBase64: base64Audio,
          mimeType: 'audio/webm',
        },
      });

      // Check for function invocation error or response error
      if (response.error) {
        // Try to get error from response data if available
        const errorMsg = response.data?.error || response.error.message || 'Transcription failed';
        throw new Error(errorMsg);
      }

      if (!response.data?.success || !response.data?.transcription) {
        throw new Error(response.data?.error || 'Failed to transcribe audio');
      }

      onTranscription(response.data.transcription);
      toast.success('Voice transcribed');
    } catch (err) {
      console.error('Transcription error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to transcribe';
      toast.error(errorMessage);
    } finally {
      setState('idle');
      setDuration(0);
    }
  }, [onTranscription]);

  const startRecording = useCallback(async () => {
    try {
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
        stream.getTracks().forEach((track) => track.stop());

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start(1000);
      setState('recording');
      setDuration(0);

      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast.error('Could not access microphone. Please check permissions.');
    }
  }, [transcribeAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('transcribing');
    }
  }, [state]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (state === 'transcribing') {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-text-muted">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Transcribing...</span>
      </div>
    );
  }

  if (state === 'recording') {
    return (
      <button
        type="button"
        onClick={stopRecording}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm transition-colors"
      >
        <Square className="w-4 h-4" />
        <span>{formatDuration(duration)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-surface hover:bg-neutral-border text-neutral-text-muted text-sm transition-colors disabled:opacity-50"
      title="Record voice note"
    >
      <Mic className="w-4 h-4" />
      <span>Voice</span>
    </button>
  );
}
