import { create } from 'zustand';
import type { LanguageCode } from '../utils/languages';
import type { SessionState, TranscriptItem, Speaker } from '../types/liveTranslate.types';

interface LiveTranslateState {
  // Configuration
  languageA: LanguageCode;
  languageB: LanguageCode;

  // Session
  sessionState: SessionState;
  sessionId: string | null;
  transcripts: TranscriptItem[];

  // Audio
  audioLevel: number;
  isPlayingAudio: boolean;
  currentSpeaker: Speaker | null;

  // Manual speaker selection
  activeSpeaker: Speaker;

  // Error handling
  error: string | null;

  // Actions
  setLanguageA: (language: LanguageCode) => void;
  setLanguageB: (language: LanguageCode) => void;
  setLanguages: (languageA: LanguageCode, languageB: LanguageCode) => void;
  swapLanguages: () => void;

  startSession: (sessionId: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;

  addTranscript: (transcript: TranscriptItem) => void;
  clearTranscripts: () => void;

  setAudioLevel: (level: number) => void;
  setIsPlayingAudio: (isPlaying: boolean) => void;
  setCurrentSpeaker: (speaker: Speaker | null) => void;
  setActiveSpeaker: (speaker: Speaker) => void;

  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  languageA: 'EN_US' as LanguageCode,
  languageB: 'ES_US' as LanguageCode,
  sessionState: 'idle' as SessionState,
  sessionId: null,
  transcripts: [],
  audioLevel: 0,
  isPlayingAudio: false,
  currentSpeaker: null,
  activeSpeaker: 'person_a' as Speaker,
  error: null,
};

export const useLiveTranslateStore = create<LiveTranslateState>((set, get) => ({
  ...initialState,

  setLanguageA: (language) =>
    set({ languageA: language }),

  setLanguageB: (language) =>
    set({ languageB: language }),

  setLanguages: (languageA, languageB) =>
    set({ languageA, languageB }),

  swapLanguages: () =>
    set((state) => ({
      languageA: state.languageB,
      languageB: state.languageA,
    })),

  startSession: (sessionId) =>
    set({
      sessionState: 'listening',
      sessionId,
      error: null,
    }),

  pauseSession: () =>
    set({ sessionState: 'paused' }),

  resumeSession: () =>
    set({ sessionState: 'listening' }),

  endSession: () =>
    set({
      sessionState: 'idle',
      sessionId: null,
      audioLevel: 0,
      currentSpeaker: null,
    }),

  addTranscript: (transcript) =>
    set((state) => ({
      transcripts: [...state.transcripts, transcript],
    })),

  clearTranscripts: () =>
    set({ transcripts: [] }),

  setAudioLevel: (level) =>
    set({ audioLevel: level }),

  setIsPlayingAudio: (isPlaying) =>
    set({ isPlayingAudio: isPlaying }),

  setCurrentSpeaker: (speaker) =>
    set({ currentSpeaker: speaker }),

  setActiveSpeaker: (speaker) =>
    set({ activeSpeaker: speaker }),

  setError: (error) =>
    set({ error }),

  reset: () =>
    set(initialState),
}));
