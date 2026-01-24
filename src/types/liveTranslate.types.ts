import type { LanguageCode } from '../utils/languages';

// Re-export LanguageCode for convenience
export type { LanguageCode } from '../utils/languages';

/**
 * Session states for live translation
 */
export type SessionState = 'idle' | 'listening' | 'paused';

/**
 * Identifies which person is speaking
 */
export type Speaker = 'person_a' | 'person_b';

/**
 * A single transcript item in the conversation
 */
export interface TranscriptItem {
  id: string;
  timestamp: Date;
  speaker: Speaker;
  originalText: string;
  translatedText: string;
  originalLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  audioUrl?: string;
  audioData?: string; // Base64-encoded MP3 audio from TTS
}

/**
 * WebSocket message types - Client to Server
 */
export interface AudioChunkMessage {
  type: 'audio_chunk';
  payload: {
    audioData: string; // base64 encoded
    speaker: Speaker;
  };
}

export interface StartSessionMessage {
  type: 'start_session';
  payload: {
    languageA: LanguageCode;
    languageB: LanguageCode;
  };
}

export interface PauseSessionMessage {
  type: 'pause_session';
}

export interface ResumeSessionMessage {
  type: 'resume_session';
}

export interface EndSessionMessage {
  type: 'end_session';
}

export type ClientMessage =
  | AudioChunkMessage
  | StartSessionMessage
  | PauseSessionMessage
  | ResumeSessionMessage
  | EndSessionMessage;

/**
 * WebSocket message types - Server to Client
 */
export interface SessionStartedMessage {
  type: 'session_started';
  payload: {
    sessionId: string;
  };
}

export interface LiveTranscriptMessage {
  type: 'transcript';
  payload: {
    id: string;
    originalText: string;
    translatedText: string;
    speaker: Speaker;
    originalLanguage: LanguageCode;
    targetLanguage: LanguageCode;
    audioUrl?: string;
    audioData?: string; // Base64-encoded MP3 audio from TTS
  };
}

export interface SessionPausedMessage {
  type: 'session_paused';
}

export interface SessionResumedMessage {
  type: 'session_resumed';
}

export interface SessionEndedMessage {
  type: 'session_ended';
}

export interface ErrorMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
  };
}

export type ServerMessage =
  | SessionStartedMessage
  | LiveTranscriptMessage
  | SessionPausedMessage
  | SessionResumedMessage
  | SessionEndedMessage
  | ErrorMessage;

/**
 * Live translate service interface
 */
export interface LiveTranslateService {
  connect: () => void;
  disconnect: () => void;
  startSession: (languageA: LanguageCode, languageB: LanguageCode) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  sendAudioChunk: (audioData: string, speaker?: string) => void;
  onMessage: (callback: (message: ServerMessage) => void) => void;
  isConnected: () => boolean;
}
