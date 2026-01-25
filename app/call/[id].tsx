import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingSpinner } from '../../src/components/ui';
import {
  CallTimer,
  CallControls,
  TranscriptionDisplay,
} from '../../src/components/call';
import { useCallStore } from '../../src/store/callStore';
import { useVoice } from '../../src/contexts/VoiceContext';
import { useCalls, useCallDetail } from '../../src/hooks/useCalls';
import {
  useDisplaySocket,
  DisplayTranscript,
  CallEndEvent,
  TranslationState,
} from '../../src/hooks/useDisplaySocket';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { getLanguageFlag } from '../../src/utils/languages';

type CallDisplayStatus = 'connecting' | 'ringing' | 'active' | 'ended';

export default function ActiveCallScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Local state for display transcripts
  const [displayTranscripts, setDisplayTranscripts] = useState<DisplayTranscript[]>([]);
  const [callEnded, setCallEnded] = useState(false);
  const [endReason, setEndReason] = useState<string | null>(null);

  const {
    activeCall,
    isMuted,
    isSpeakerOn,
    setMuted,
    setSpeakerOn,
    setSocketConnected,
    setSocketError,
    callDuration,
    incrementCallDuration,
    resetCallDuration,
    resetCallState,
  } = useCallStore();

  const {
    callState,
    callSid,
    hangUp,
    toggleMute,
    toggleSpeaker,
    isMuted: voiceMuted,
    endCallFromServer,
  } = useVoice();

  const { endCall, isEndingCall } = useCalls();
  const { data: callDetail, isLoading } = useCallDetail(id ?? '');

  // WebSocket handlers
  const handleTranscript = useCallback((transcript: DisplayTranscript) => {
    console.log('[ActiveCallScreen] handleTranscript called:', transcript.from, transcript.original?.substring(0, 30));
    setDisplayTranscripts(prev => {
      const newTranscripts = [...prev, transcript];
      console.log('[ActiveCallScreen] Updating displayTranscripts, new count:', newTranscripts.length);
      return newTranscripts;
    });
  }, []);

  const handleCallEnd = useCallback((event: CallEndEvent) => {
    console.log('[ActiveCallScreen] Call ended from server:', event.reason);
    setCallEnded(true);
    setEndReason(event.reason);
    endCallFromServer();
    // Navigate after showing ended state - don't reset duration immediately so user can see final time
    setTimeout(() => {
      resetCallDuration();
      resetCallState();
      router.replace('/(tabs)/calls');
    }, 2000);
  }, [resetCallState, resetCallDuration, router, endCallFromServer]);

  const handleTranslationStateChange = useCallback((state: TranslationState) => {
    console.log('Translation state changed:', state);
  }, []);

  const handleSocketError = useCallback((error: string) => {
    setSocketError(error);
  }, [setSocketError]);

  const handleCallAnswered = useCallback(() => {
    console.log('[ActiveCallScreen] Call answered by remote party');
  }, []);

  // Connect to display WebSocket
  const {
    isConnected,
    isJoined,
    error: wsError,
    translationState,
    toggleTranslation,
  } = useDisplaySocket({
    callSid: id ?? callSid,
    onTranscript: handleTranscript,
    onCallEnd: handleCallEnd,
    onCallAnswered: handleCallAnswered,
    onTranslationStateChange: handleTranslationStateChange,
    onError: handleSocketError,
  });

  // Track socket connection state
  useEffect(() => {
    setSocketConnected(isConnected && isJoined);
  }, [isConnected, isJoined, setSocketConnected]);

  useEffect(() => {
    setSocketError(wsError);
  }, [wsError, setSocketError]);

  // Timer interval for active calls
  // Timer starts when: Twilio SDK reports active OR display WS is joined (fallback for iOS)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const isActive = callState === 'active' || activeCall?.status === 'active' || isJoined;
    if (isActive && !callEnded) {
      interval = setInterval(() => {
        incrementCallDuration();
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState, activeCall?.status, incrementCallDuration, callEnded, isJoined]);

  // Handle call state changes from Twilio SDK
  useEffect(() => {
    if (callState === 'ended' && !callEnded) {
      setCallEnded(true);
      setTimeout(() => {
        resetCallDuration();
        resetCallState();
        router.replace('/(tabs)/calls');
      }, 2000);
    }
  }, [callState, callEnded, router, resetCallState, resetCallDuration]);

  // Debug: Log whenever displayTranscripts changes
  useEffect(() => {
    console.log('[ActiveCallScreen] displayTranscripts updated, count:', displayTranscripts.length);
    if (displayTranscripts.length > 0) {
      console.log('[ActiveCallScreen] Latest transcript:', displayTranscripts[displayTranscripts.length - 1]);
    }
  }, [displayTranscripts]);

  const handleEndCall = () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            try {
              await hangUp();
              if (id) {
                endCall(id);
              }
            } catch (err) {
              console.error('Error ending call:', err);
            }
            endCallFromServer();
            setCallEnded(true);
            setTimeout(() => {
              resetCallDuration();
              resetCallState();
              router.replace('/(tabs)/calls');
            }, 1000);
          },
        },
      ]
    );
  };

  const handleMuteToggle = () => {
    toggleMute();
    setMuted(!voiceMuted);
  };

  const handleSpeakerToggle = () => {
    toggleSpeaker();
    setSpeakerOn(!isSpeakerOn);
  };

  const handleTranslationToggle = () => {
    if (translationState) {
      toggleTranslation(!translationState.isTranslating);
    }
  };

  if (isLoading && !activeCall && callState === 'idle') {
    return <LoadingSpinner fullScreen message="Loading call..." />;
  }

  const call = activeCall ?? callDetail;
  // Use standalone callDuration (works even when activeCall is null), fallback to activeCall.duration
  const duration = callDuration || activeCall?.duration || 0;

  // Determine display status
  let displayStatus: CallDisplayStatus = 'connecting';
  if (callEnded) {
    displayStatus = 'ended';
  } else if (callState === 'active' || isJoined) {
    displayStatus = 'active';
  } else if (callState === 'ringing') {
    displayStatus = 'ringing';
  }

  // Compute UI-friendly values from call data
  const fromLang = call?.fromLanguage ?? (call as any)?.repLang ?? translationState?.srcLang ?? 'en-US';
  const toLang = call?.toLanguage ?? (call as any)?.customerLang ?? translationState?.dstLang ?? 'es-MX';
  const callPhone = call?.phoneNumber ?? (call as any)?.from ?? (call as any)?.to ?? '';
  const callContact = call?.contactName ?? callPhone ?? 'Unknown';
  const callInitial = callContact?.[0]?.toUpperCase() ?? '?';

  // Get language flags (normalize to uppercase for lookup)
  const fromFlag = getLanguageFlag(fromLang.toUpperCase().replace('-', '_'));
  const toFlag = getLanguageFlag(toLang.toUpperCase().replace('-', '_'));

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Header */}
      <View style={styles.header}>
        {/* Status indicator */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot,
            displayStatus === 'active' && styles.statusActive,
            displayStatus === 'ringing' && styles.statusRinging,
            displayStatus === 'connecting' && styles.statusConnecting,
            displayStatus === 'ended' && styles.statusEnded,
          ]} />
          <Text style={[
            styles.statusText,
            displayStatus === 'active' && styles.statusTextActive,
            displayStatus === 'ended' && styles.statusTextEnded,
          ]}>
            {displayStatus === 'connecting' && 'Connecting...'}
            {displayStatus === 'ringing' && 'Ringing...'}
            {displayStatus === 'active' && 'Call in progress'}
            {displayStatus === 'ended' && `Call ended${endReason ? ` (${endReason.replace('-', ' ')})` : ''}`}
          </Text>
        </View>

        {/* Language indicator */}
        <View style={styles.languageIndicator}>
          <Text style={styles.languageFlag}>{fromFlag}</Text>
          <Text style={styles.languageArrow}>→</Text>
          <Text style={styles.languageFlag}>{toFlag}</Text>
          {displayTranscripts.length > 0 && (
            <Text style={styles.messageCount}>{displayTranscripts.length} messages</Text>
          )}
        </View>
      </View>

      {/* Debug: WebSocket Status Indicator */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          WS: {isConnected ? '✅' : '❌'} Joined: {isJoined ? '✅' : '❌'} Msgs: {displayTranscripts.length}
        </Text>
      </View>

      {/* Caller Info */}
      <View style={styles.callerInfo}>
        <View style={[
          styles.callerAvatar,
          displayStatus === 'active' && styles.avatarActive,
          displayStatus === 'ringing' && styles.avatarRinging,
        ]}>
          <Text style={styles.callerInitial}>{callInitial}</Text>
        </View>
        <Text style={styles.callerName}>{callContact}</Text>
        {call?.contactName && callPhone && (
          <Text style={styles.callerPhone}>{callPhone}</Text>
        )}
      </View>

      {/* Timer */}
      <CallTimer duration={duration} status={displayStatus} />

      {/* Translation Toggle */}
      {translationState && displayStatus === 'active' && (
        <TouchableOpacity
          style={[
            styles.translationToggle,
            translationState.isTranslating && styles.translationToggleActive,
          ]}
          onPress={handleTranslationToggle}
        >
          <Text style={styles.translationToggleIcon}>🌐</Text>
          <Text style={[
            styles.translationToggleText,
            translationState.isTranslating && styles.translationToggleTextActive,
          ]}>
            {translationState.isTranslating ? 'Translation On' : 'Translation Off'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Transcription Display */}
      <View style={styles.transcriptionContainer}>
        {wsError && !isConnected && (
          <View style={styles.wsErrorBanner}>
            <Text style={styles.wsErrorText}>Transcript unavailable</Text>
          </View>
        )}
        <TranscriptionDisplay
          key={`transcripts-${displayTranscripts.length}`}
          transcripts={displayTranscripts}
          isTranslating={translationState?.isTranslating ?? true}
        />
      </View>

      {/* Call Controls */}
      {!callEnded && (
        <View style={styles.controlsContainer}>
          <CallControls
            isMuted={isMuted}
            isSpeakerOn={isSpeakerOn}
            onMuteToggle={handleMuteToggle}
            onSpeakerToggle={handleSpeakerToggle}
            onEndCall={handleEndCall}
          />
        </View>
      )}

      {/* Ending Overlay */}
      {isEndingCall && (
        <View style={styles.endingOverlay}>
          <LoadingSpinner message="Ending call..." />
        </View>
      )}

      {/* Call Ended Overlay */}
      {callEnded && (
        <View style={styles.endedOverlay}>
          <View style={styles.endedIcon}>
            <Text style={styles.endedIconText}>✓</Text>
          </View>
          <Text style={styles.endedTitle}>Call Ended</Text>
          <Text style={styles.endedSubtitle}>Redirecting to calls...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
    backgroundColor: colors.gray[400],
  },
  statusActive: {
    backgroundColor: colors.success,
  },
  statusRinging: {
    backgroundColor: colors.warning,
  },
  statusConnecting: {
    backgroundColor: colors.warning,
  },
  statusEnded: {
    backgroundColor: colors.gray[400],
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontWeight: typography.fontWeight.medium,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextEnded: {
    color: colors.gray[500],
  },
  languageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageFlag: {
    fontSize: 18,
  },
  languageArrow: {
    marginHorizontal: spacing.xs,
    color: colors.gray[400],
    fontSize: typography.fontSize.sm,
  },
  messageCount: {
    marginLeft: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },

  // Debug container
  debugContainer: {
    backgroundColor: colors.gray[100],
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  debugText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    fontFamily: 'monospace',
    textAlign: 'center',
  },

  // Caller Info
  callerInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  callerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarActive: {
    backgroundColor: colors.semantic.success[100],
    borderColor: colors.success,
  },
  avatarRinging: {
    backgroundColor: colors.semantic.warning[100],
    borderColor: colors.warning,
  },
  callerInitial: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  callerName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
  },
  callerPhone: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },

  // Translation Toggle
  translationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    marginBottom: spacing.sm,
  },
  translationToggleActive: {
    backgroundColor: colors.primary[100],
  },
  translationToggleIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  translationToggleText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontWeight: typography.fontWeight.medium,
  },
  translationToggleTextActive: {
    color: colors.primary[700],
  },

  // Transcription Container
  transcriptionContainer: {
    flex: 1,
    backgroundColor: colors.gray[50],
    marginHorizontal: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  wsErrorBanner: {
    backgroundColor: colors.semantic.error[50],
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.semantic.error[100],
  },
  wsErrorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },

  // Controls
  controlsContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingBottom: spacing.lg,
  },

  // Overlays
  endingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  endedIconText: {
    fontSize: 28,
    color: '#fff',
  },
  endedTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  endedSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
  },
});
