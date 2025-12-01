/**
 * Gemini Live API Client Wrapper (Voice-Only)
 * For real-time voice conversation with Gemini
 */

import { base64ToArrayBuffer } from '../audio/utils';

type EventCallback = (...args: unknown[]) => void;

interface LiveConnectConfig {
  systemInstruction?: string;
  responseModalities?: string[];
}

interface MediaChunk {
  mimeType: string;
  data: string;
}

interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface ServerContent {
  modelTurn?: {
    parts?: Part[];
  };
  interrupted?: boolean;
  turnComplete?: boolean;
}

interface ServerMessage {
  setupComplete?: boolean;
  serverContent?: ServerContent;
}

export interface LiveClientOptions {
  apiKey: string;
}

export class GenAILiveClient {
  private apiKey: string;
  private ws: WebSocket | null = null;
  private events: Map<string, EventCallback[]> = new Map();
  private _status: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  private _model: string | null = null;
  private config: LiveConnectConfig | null = null;

  get status() {
    return this._status;
  }

  get model() {
    return this._model;
  }

  constructor(options: LiveClientOptions) {
    this.apiKey = options.apiKey;
  }

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

  async connect(model: string, config: LiveConnectConfig): Promise<boolean> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return false;
    }

    this._status = 'connecting';
    this.config = config;
    this._model = model;

    return new Promise((resolve, reject) => {
      try {
        // Connect to Gemini Live API via WebSocket
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[GenAILiveClient] WebSocket connected');
          this.emit('open');

          // Send setup message
          const setupMessage = {
            setup: {
              model: model,
              generationConfig: {
                responseModalities: config.responseModalities || ['AUDIO'],
              },
              systemInstruction: config.systemInstruction
                ? { parts: [{ text: config.systemInstruction }] }
                : undefined,
            },
          };

          this.ws?.send(JSON.stringify(setupMessage));
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as ServerMessage;
            this.handleMessage(data);

            if (data.setupComplete) {
              this._status = 'connected';
              resolve(true);
            }
          } catch (err) {
            console.error('[GenAILiveClient] Error parsing message:', err);
          }
        };

        this.ws.onerror = (event) => {
          console.error('[GenAILiveClient] WebSocket error:', event);
          this.emit('error', event);
          if (this._status === 'connecting') {
            reject(new Error('WebSocket connection failed'));
          }
        };

        this.ws.onclose = (event) => {
          console.log('[GenAILiveClient] WebSocket closed:', event.reason);
          this._status = 'disconnected';
          this.emit('close', event);
        };
      } catch (err) {
        this._status = 'disconnected';
        reject(err);
      }
    });
  }

  private handleMessage(message: ServerMessage): void {
    if (message.setupComplete) {
      console.log('[GenAILiveClient] Setup complete');
      this.emit('setupcomplete');
      return;
    }

    if (message.serverContent) {
      const { serverContent } = message;

      if (serverContent.interrupted) {
        console.log('[GenAILiveClient] Interrupted');
        this.emit('interrupted');
        return;
      }

      if (serverContent.turnComplete) {
        console.log('[GenAILiveClient] Turn complete');
        this.emit('turncomplete');
      }

      if (serverContent.modelTurn?.parts) {
        const parts = serverContent.modelTurn.parts;

        // Extract audio parts
        const audioParts = parts.filter(
          p => p.inlineData && p.inlineData.mimeType?.startsWith('audio/pcm')
        );

        // Extract text parts
        const textParts = parts.filter(p => p.text);

        // Emit audio data
        audioParts.forEach(part => {
          if (part.inlineData?.data) {
            const data = base64ToArrayBuffer(part.inlineData.data);
            this.emit('audio', data);
          }
        });

        // Emit text content
        if (textParts.length > 0) {
          this.emit('content', { modelTurn: { parts: textParts } });
        }
      }
    }
  }

  sendRealtimeInput(chunks: MediaChunk[]): void {
    if (!this.ws || this._status !== 'connected') {
      return;
    }

    const audioChunks = chunks.filter(ch => ch.mimeType.includes('audio'));

    for (const chunk of audioChunks) {
      const message = {
        realtimeInput: {
          mediaChunks: [chunk],
        },
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  send(parts: Part | Part[], turnComplete = true): void {
    if (!this.ws || this._status !== 'connected') {
      return;
    }

    const partsArray = Array.isArray(parts) ? parts : [parts];
    const message = {
      clientContent: {
        turns: [{ role: 'user', parts: partsArray }],
        turnComplete,
      },
    };
    this.ws.send(JSON.stringify(message));
  }

  disconnect(): boolean {
    if (!this.ws) {
      return false;
    }

    this.ws.close();
    this.ws = null;
    this._status = 'disconnected';
    return true;
  }
}
