/**
 * Audio recorder for capturing microphone input
 */

import { audioContext, arrayBufferToBase64 } from './utils';
import { AudioRecordingWorklet, VolMeterWorklet } from './worklets';
import { createWorkletFromSrc } from './audioworklet-registry';

type EventCallback = (...args: unknown[]) => void;

export class AudioRecorder {
  private stream: MediaStream | undefined;
  private audioCtx: AudioContext | undefined;
  private source: MediaStreamAudioSourceNode | undefined;
  private recordingWorklet: AudioWorkletNode | undefined;
  private vuWorklet: AudioWorkletNode | undefined;
  private starting: Promise<void> | null = null;
  private events: Map<string, EventCallback[]> = new Map();

  public recording = false;

  constructor(public sampleRate = 16000) {}

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: unknown[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(...args));
    }
  }

  async start(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Could not request user media');
    }

    this.starting = this.initializeRecording();
    return this.starting;
  }

  private async initializeRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioCtx = await audioContext({ sampleRate: this.sampleRate });
      this.source = this.audioCtx.createMediaStreamSource(this.stream);

      const workletName = 'audio-recorder-worklet';
      const src = createWorkletFromSrc(workletName, AudioRecordingWorklet);

      await this.audioCtx.audioWorklet.addModule(src);
      this.recordingWorklet = new AudioWorkletNode(this.audioCtx, workletName);

      this.recordingWorklet.port.onmessage = (ev: MessageEvent) => {
        const arrayBuffer = ev.data.data.int16arrayBuffer;
        if (arrayBuffer) {
          const arrayBufferString = arrayBufferToBase64(arrayBuffer);
          this.emit('data', arrayBufferString);
        }
      };
      this.source.connect(this.recordingWorklet);

      // Volume meter worklet
      const vuWorkletName = 'vu-meter';
      await this.audioCtx.audioWorklet.addModule(
        createWorkletFromSrc(vuWorkletName, VolMeterWorklet)
      );
      this.vuWorklet = new AudioWorkletNode(this.audioCtx, vuWorkletName);
      this.vuWorklet.port.onmessage = (ev: MessageEvent) => {
        this.emit('volume', ev.data.volume);
      };

      this.source.connect(this.vuWorklet);
      this.recording = true;
      this.starting = null;
    } catch (err) {
      this.starting = null;
      throw err;
    }
  }

  stop(): void {
    const handleStop = () => {
      this.source?.disconnect();
      this.stream?.getTracks().forEach(track => track.stop());
      this.stream = undefined;
      this.recordingWorklet = undefined;
      this.vuWorklet = undefined;
      this.recording = false;
    };

    if (this.starting) {
      this.starting.then(handleStop);
      return;
    }
    handleStop();
  }
}
