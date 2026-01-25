import { create } from 'zustand';
import type { ActiveCall, Transcription, CallStatus } from '../types/call.types';
import type { TranscriptMessage } from '../contexts/VoiceContext';

interface CallState {
  // Active call state
  activeCall: ActiveCall | null;
  callSid: string | null;
  transcriptions: Transcription[];

  // Standalone call duration (increments regardless of activeCall)
  callDuration: number;

  // Audio controls
  isMuted: boolean;
  isSpeakerOn: boolean;

  // WebSocket state
  isSocketConnected: boolean;
  socketError: string | null;

  // Actions
  setActiveCall: (call: ActiveCall | null) => void;
  setCallSid: (callSid: string | null) => void;
  updateCallStatus: (status: CallStatus) => void;
  addTranscription: (transcription: Transcription) => void;
  addTranscriptMessage: (message: TranscriptMessage) => void;
  clearTranscriptions: () => void;
  setMuted: (isMuted: boolean) => void;
  setSpeakerOn: (isSpeakerOn: boolean) => void;
  setSocketConnected: (connected: boolean) => void;
  setSocketError: (error: string | null) => void;
  incrementDuration: () => void;
  incrementCallDuration: () => void;
  resetCallDuration: () => void;
  resetCallState: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  activeCall: null,
  callSid: null,
  transcriptions: [],
  callDuration: 0,
  isMuted: false,
  isSpeakerOn: false,
  isSocketConnected: false,
  socketError: null,

  setActiveCall: (call) =>
    set({
      activeCall: call,
      callSid: call?.id ?? null,
      transcriptions: call?.transcriptions ?? [],
    }),

  setCallSid: (callSid) =>
    set({
      callSid,
    }),

  updateCallStatus: (status) =>
    set((state) => ({
      activeCall: state.activeCall
        ? { ...state.activeCall, status }
        : null,
    })),

  addTranscription: (transcription) =>
    set((state) => ({
      transcriptions: [...state.transcriptions, transcription],
      activeCall: state.activeCall
        ? {
            ...state.activeCall,
            transcriptions: [...state.activeCall.transcriptions, transcription],
          }
        : null,
    })),

  // Add transcript from WebSocket (TranscriptMessage format)
  addTranscriptMessage: (message: TranscriptMessage) => {
    const transcription: Transcription = {
      id: message.id,
      timestamp: message.timestamp,
      originalText: message.originalText,
      translatedText: message.translatedText,
      speaker: message.speaker,
      language: message.originalLanguage as any,
    };

    set((state) => ({
      transcriptions: [...state.transcriptions, transcription],
      activeCall: state.activeCall
        ? {
            ...state.activeCall,
            transcriptions: [...state.activeCall.transcriptions, transcription],
          }
        : null,
    }));
  },

  clearTranscriptions: () =>
    set({
      transcriptions: [],
    }),

  setMuted: (isMuted) =>
    set({
      isMuted,
    }),

  setSpeakerOn: (isSpeakerOn) =>
    set({
      isSpeakerOn,
    }),

  setSocketConnected: (connected) =>
    set({
      isSocketConnected: connected,
    }),

  setSocketError: (error) =>
    set({
      socketError: error,
    }),

  incrementDuration: () =>
    set((state) => ({
      activeCall: state.activeCall
        ? { ...state.activeCall, duration: state.activeCall.duration + 1 }
        : null,
    })),

  // Standalone duration increment - works regardless of activeCall state
  incrementCallDuration: () =>
    set((state) => ({
      callDuration: state.callDuration + 1,
    })),

  resetCallDuration: () =>
    set({ callDuration: 0 }),

  resetCallState: () =>
    set({
      activeCall: null,
      callSid: null,
      transcriptions: [],
      callDuration: 0,
      isMuted: false,
      isSpeakerOn: false,
      isSocketConnected: false,
      socketError: null,
    }),
}));
