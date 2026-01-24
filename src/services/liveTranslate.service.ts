/**
 * Live Translate WebSocket Service
 *
 * Connects to the live-trans backend for real-time translation.
 */

import type {
  LanguageCode,
  ServerMessage,
  LiveTranslateService,
} from '../types/liveTranslate.types';
import { LIVE_TRANS_WS_URL, WS_RECONNECT_INTERVAL_MS, MAX_WS_RECONNECT_ATTEMPTS } from '../utils/constants';

class RealLiveTranslateService implements LiveTranslateService {
  private ws: WebSocket | null = null;
  private messageCallback: ((message: ServerMessage) => void) | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingLanguageA: LanguageCode | null = null;
  private pendingLanguageB: LanguageCode | null = null;
  private shouldReconnect = false;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[LiveTranslate] Already connected');
      return;
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      console.log('[LiveTranslate] Connection in progress');
      return;
    }

    this.shouldReconnect = true;
    this.establishConnection();
  }

  private establishConnection(): void {
    try {
      console.log(`[LiveTranslate] Connecting to ${LIVE_TRANS_WS_URL}`);
      this.ws = new WebSocket(LIVE_TRANS_WS_URL);

      this.ws.onopen = () => {
        console.log('[LiveTranslate] Connected');
        this.reconnectAttempts = 0;

        // If we had a pending session start, send it now
        if (this.pendingLanguageA && this.pendingLanguageB) {
          this.sendStartSession(this.pendingLanguageA, this.pendingLanguageB);
          this.pendingLanguageA = null;
          this.pendingLanguageB = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as ServerMessage;
          console.log('[LiveTranslate] Received:', message.type);

          if (this.messageCallback) {
            this.messageCallback(message);
          }
        } catch (error) {
          console.error('[LiveTranslate] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[LiveTranslate] WebSocket error:', error);
      };

      this.ws.onclose = (event) => {
        console.log(`[LiveTranslate] Disconnected: ${event.code} - ${event.reason}`);
        this.ws = null;

        // Attempt to reconnect if we should
        if (this.shouldReconnect && this.reconnectAttempts < MAX_WS_RECONNECT_ATTEMPTS) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('[LiveTranslate] Failed to create WebSocket:', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = WS_RECONNECT_INTERVAL_MS * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    console.log(`[LiveTranslate] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.establishConnection();
    }, delay);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.pendingLanguageA = null;
    this.pendingLanguageB = null;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log('[LiveTranslate] Disconnected');
  }

  startSession(languageA: LanguageCode, languageB: LanguageCode): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Store pending session start and connect
      this.pendingLanguageA = languageA;
      this.pendingLanguageB = languageB;
      this.connect();
      return;
    }

    this.sendStartSession(languageA, languageB);
  }

  private sendStartSession(languageA: LanguageCode, languageB: LanguageCode): void {
    this.send({
      type: 'start_session',
      languageA,
      languageB,
    });
    console.log('[LiveTranslate] Session starting...', { languageA, languageB });
  }

  pauseSession(): void {
    this.send({ type: 'pause_session' });
    console.log('[LiveTranslate] Pausing session');
  }

  resumeSession(): void {
    this.send({ type: 'resume_session' });
    console.log('[LiveTranslate] Resuming session');
  }

  endSession(): void {
    this.send({ type: 'end_session' });
    console.log('[LiveTranslate] Ending session');
  }

  sendAudioChunk(audioData: string, speaker?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Send audio chunk to the server with optional speaker selection
    this.send({
      type: 'audio_chunk',
      data: audioData,
      speaker: speaker || null,
    });
  }

  onMessage(callback: (message: ServerMessage) => void): void {
    this.messageCallback = callback;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[LiveTranslate] Cannot send - not connected');
    }
  }
}

// Singleton instance
export const liveTranslateService = new RealLiveTranslateService();
