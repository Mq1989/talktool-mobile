import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

// How often to send audio chunks (in ms)
// AssemblyAI streaming accepts 50-1000ms chunks, so we use the maximum for better context
const CHUNK_INTERVAL_MS = 1000;

interface UseAudioRecordingProps {
  onAudioChunk: (base64Audio: string) => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;
}

interface UseAudioRecordingReturn {
  isRecording: boolean;
  hasPermission: boolean | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}

export function useAudioRecording({
  onAudioChunk,
  onError,
  onAudioLevel,
}: UseAudioRecordingProps): UseAudioRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const chunkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(false);

  // Request microphone permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);

      if (granted) {
        // Configure audio mode for recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      }

      return granted;
    } catch (error) {
      console.error('[useAudioRecording] Permission request failed:', error);
      setHasPermission(false);
      return false;
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  // Clean up the current recording
  const cleanupRecording = useCallback(async () => {
    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
      recordingRef.current = null;
    }
  }, []);

  // Create and start a new recording segment
  const startRecordingSegment = useCallback(async (): Promise<void> => {
    if (!isActiveRef.current) return;

    try {
      // Clean up any existing recording
      await cleanupRecording();

      // Create new recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);

      // Set up status update for metering
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.metering !== undefined && onAudioLevel) {
          // Convert dB to 0-1 range (typical range is -60 to 0)
          const normalizedLevel = Math.max(0, Math.min(1, (status.metering + 60) / 60));
          onAudioLevel(normalizedLevel);
        }
      });

      await recording.startAsync();
      recordingRef.current = recording;
    } catch (error) {
      console.error('[useAudioRecording] Failed to start segment:', error);
      onError?.('Failed to start recording');
    }
  }, [cleanupRecording, onAudioLevel, onError]);

  // Stop current segment and send audio data
  const stopAndSendSegment = useCallback(async (): Promise<void> => {
    if (!recordingRef.current) return;

    try {
      const recording = recordingRef.current;
      recordingRef.current = null;

      // Stop the recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        // Read the file as base64
        // Using string 'base64' instead of FileSystem.EncodingType.Base64
        // for compatibility across expo-file-system versions
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });

        // Send the audio chunk
        onAudioChunk(base64Audio);

        // Clean up the file
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (error) {
      console.error('[useAudioRecording] Failed to process segment:', error);
    }
  }, [onAudioChunk]);

  // Main chunk loop - records segments and sends them
  const startChunkLoop = useCallback(() => {
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
    }

    chunkIntervalRef.current = setInterval(async () => {
      if (!isActiveRef.current) return;

      // Stop current segment and send it
      await stopAndSendSegment();

      // Start a new segment
      await startRecordingSegment();
    }, CHUNK_INTERVAL_MS);
  }, [stopAndSendSegment, startRecordingSegment]);

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    if (isRecording) return;

    if (!hasPermission) {
      const granted = await requestPermissions();
      if (!granted) {
        onError?.('Microphone permission not granted');
        return;
      }
    }

    try {
      isActiveRef.current = true;
      setIsRecording(true);

      // Start the first recording segment
      await startRecordingSegment();

      // Start the chunk loop
      startChunkLoop();

      console.log('[useAudioRecording] Recording started');
    } catch (error) {
      console.error('[useAudioRecording] Failed to start recording:', error);
      isActiveRef.current = false;
      setIsRecording(false);
      onError?.('Failed to start recording');
    }
  }, [isRecording, hasPermission, requestPermissions, startRecordingSegment, startChunkLoop, onError]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<void> => {
    isActiveRef.current = false;
    setIsRecording(false);

    // Clear the chunk interval
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    // Stop and send any remaining audio
    await stopAndSendSegment();

    // Reset audio mode
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      // Ignore
    }

    console.log('[useAudioRecording] Recording stopped');
  }, [stopAndSendSegment]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
      }
      cleanupRecording();
    };
  }, [cleanupRecording]);

  return {
    isRecording,
    hasPermission,
    startRecording,
    stopRecording,
    requestPermissions,
  };
}
