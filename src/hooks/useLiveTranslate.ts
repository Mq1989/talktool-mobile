import { useEffect, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { useLiveTranslateStore } from '../store/liveTranslateStore';
import { liveTranslateService } from '../services/liveTranslate.service';
import { useAudioRecording } from './useAudioRecording';
import type { LanguageCode, ServerMessage, TranscriptItem } from '../types/liveTranslate.types';

/**
 * Main orchestration hook for Live Translate feature.
 * Connects the UI to the WebSocket service, handles audio recording,
 * and manages TTS playback.
 */
export function useLiveTranslate() {
  const {
    languageA,
    languageB,
    sessionState,
    activeSpeaker,
    setLanguageA,
    setLanguageB,
    swapLanguages,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    addTranscript,
    clearTranscripts,
    setAudioLevel,
    setActiveSpeaker,
    setError,
    reset,
  } = useLiveTranslateStore();

  // TTS playback queue
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const currentSoundRef = useRef<Audio.Sound | null>(null);

  // Handle sending audio chunks to the service
  const handleAudioChunk = useCallback((base64Audio: string) => {
    const speaker = useLiveTranslateStore.getState().activeSpeaker;
    liveTranslateService.sendAudioChunk(base64Audio, speaker);
  }, []);

  // Handle recording errors
  const handleRecordingError = useCallback((error: string) => {
    console.error('[useLiveTranslate] Recording error:', error);
    setError(error);
  }, [setError]);

  // Handle audio level updates from recording
  const handleAudioLevel = useCallback((level: number) => {
    setAudioLevel(level);
  }, [setAudioLevel]);

  // Audio recording hook
  const {
    isRecording,
    startRecording,
    stopRecording,
    requestPermissions,
  } = useAudioRecording({
    onAudioChunk: handleAudioChunk,
    onError: handleRecordingError,
    onAudioLevel: handleAudioLevel,
  });

  // Play audio from base64 data
  const playAudio = useCallback(async (base64Audio: string): Promise<void> => {
    try {
      // Create data URI from base64
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;

      // Unload any existing sound
      if (currentSoundRef.current) {
        await currentSoundRef.current.unloadAsync();
        currentSoundRef.current = null;
      }

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Create and play the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: dataUri },
        { shouldPlay: true }
      );
      currentSoundRef.current = sound;

      // Wait for playback to complete
      return new Promise((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            currentSoundRef.current = null;
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('[useLiveTranslate] Audio playback error:', error);
    }
  }, []);

  // Process audio queue
  const processAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;

    // Stop recording before TTS playback to prevent feedback loop
    await stopRecording();

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift();
      if (audioData) {
        await playAudio(audioData);
      }
    }

    isPlayingRef.current = false;

    // Resume recording after TTS playback if session is still active
    const state = useLiveTranslateStore.getState().sessionState;
    if (state === 'listening') {
      await startRecording();
    }
  }, [playAudio, stopRecording, startRecording]);

  // Queue audio for playback
  const queueAudioForPlayback = useCallback((audioData: string) => {
    audioQueueRef.current.push(audioData);
    processAudioQueue();
  }, [processAudioQueue]);

  // Handle incoming messages from the service
  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'session_started':
        startSession(message.payload.sessionId);
        break;

      case 'transcript':
        const transcript: TranscriptItem = {
          id: message.payload.id,
          timestamp: new Date(),
          speaker: message.payload.speaker,
          originalText: message.payload.originalText,
          translatedText: message.payload.translatedText,
          originalLanguage: message.payload.originalLanguage,
          targetLanguage: message.payload.targetLanguage,
          audioUrl: message.payload.audioUrl,
          audioData: message.payload.audioData,
        };
        addTranscript(transcript);

        // Auto-play TTS audio if available
        if (message.payload.audioData) {
          queueAudioForPlayback(message.payload.audioData);
        }
        break;

      case 'session_paused':
        pauseSession();
        break;

      case 'session_resumed':
        resumeSession();
        break;

      case 'session_ended':
        endSession();
        break;

      case 'error':
        setError(message.payload.message);
        break;
    }
  }, [startSession, pauseSession, resumeSession, endSession, addTranscript, setError, queueAudioForPlayback]);

  // Set up message listener on mount
  useEffect(() => {
    liveTranslateService.onMessage(handleMessage);

    return () => {
      // Cleanup on unmount
      liveTranslateService.disconnect();
      if (currentSoundRef.current) {
        currentSoundRef.current.unloadAsync();
      }
    };
  }, [handleMessage]);

  // Action handlers
  const handleStartSession = useCallback(async () => {
    if (languageA === languageB) {
      setError('Please select different languages for Person A and Person B');
      return;
    }

    // Request permissions first
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      setError('Microphone permission is required for live translation');
      return;
    }

    clearTranscripts();
    setError(null);

    // Start the WebSocket session
    liveTranslateService.startSession(languageA, languageB);

    // Start recording
    await startRecording();
  }, [languageA, languageB, clearTranscripts, setError, requestPermissions, startRecording]);

  const handlePauseSession = useCallback(async () => {
    liveTranslateService.pauseSession();
    await stopRecording();
    setAudioLevel(0);
  }, [stopRecording, setAudioLevel]);

  const handleResumeSession = useCallback(async () => {
    liveTranslateService.resumeSession();
    await startRecording();
  }, [startRecording]);

  const handleEndSession = useCallback(async () => {
    liveTranslateService.endSession();
    await stopRecording();
    setAudioLevel(0);

    // Clear audio queue
    audioQueueRef.current = [];
  }, [stopRecording, setAudioLevel]);

  const handleLanguageAChange = useCallback((language: LanguageCode) => {
    setLanguageA(language);
  }, [setLanguageA]);

  const handleLanguageBChange = useCallback((language: LanguageCode) => {
    setLanguageB(language);
  }, [setLanguageB]);

  const handleSwapLanguages = useCallback(() => {
    swapLanguages();
  }, [swapLanguages]);

  const handleActiveSpeakerChange = useCallback((speaker: 'person_a' | 'person_b') => {
    setActiveSpeaker(speaker);
  }, [setActiveSpeaker]);

  const handleReset = useCallback(async () => {
    liveTranslateService.disconnect();
    await stopRecording();
    setAudioLevel(0);
    audioQueueRef.current = [];
    reset();
  }, [reset, stopRecording, setAudioLevel]);

  return {
    // State
    languageA,
    languageB,
    sessionState,
    isRecording,
    activeSpeaker,

    // Actions
    handleStartSession,
    handlePauseSession,
    handleResumeSession,
    handleEndSession,
    handleLanguageAChange,
    handleLanguageBChange,
    handleSwapLanguages,
    handleActiveSpeakerChange,
    handleReset,
  };
}
