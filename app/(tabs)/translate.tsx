import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useLiveTranslateStore } from '../../src/store/liveTranslateStore';
import { useLiveTranslate } from '../../src/hooks/useLiveTranslate';
import {
  LanguagePairSelector,
  LiveTranscriptDisplay,
  SessionControls,
  AudioLevelIndicator,
  SpeakerToggle,
} from '../../src/components/translate';

export default function TranslateScreen() {
  const insets = useSafeAreaInsets();
  const {
    languageA,
    languageB,
    sessionState,
    transcripts,
    audioLevel,
    error,
  } = useLiveTranslateStore();

  const {
    isRecording,
    activeSpeaker,
    handleStartSession,
    handlePauseSession,
    handleResumeSession,
    handleEndSession,
    handleLanguageAChange,
    handleLanguageBChange,
    handleSwapLanguages,
    handleActiveSpeakerChange,
  } = useLiveTranslate();

  const isIdle = sessionState === 'idle';
  const isListening = sessionState === 'listening';
  const isPaused = sessionState === 'paused';

  // Determine status text and color
  const getStatusInfo = () => {
    if (isListening && isRecording) {
      return { text: 'Recording', dotStyle: styles.statusDotRecording };
    }
    if (isListening) {
      return { text: 'Listening', dotStyle: styles.statusDotActive };
    }
    if (isPaused) {
      return { text: 'Paused', dotStyle: styles.statusDotPaused };
    }
    return { text: '', dotStyle: styles.statusDot };
  };

  const statusInfo = getStatusInfo();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.light} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : spacing.md }]}>
        <Text style={styles.headerTitle}>Live Translate</Text>
        {!isIdle && (
          <View style={[
            styles.statusBadge,
            isRecording && styles.statusBadgeRecording,
          ]}>
            <View style={[styles.statusDot, statusInfo.dotStyle]} />
            <Text style={[
              styles.statusText,
              isRecording && styles.statusTextRecording,
            ]}>
              {statusInfo.text}
            </Text>
          </View>
        )}
      </View>

      {/* Language Pair Selector */}
      <LanguagePairSelector
        languageA={languageA}
        languageB={languageB}
        onLanguageAChange={handleLanguageAChange}
        onLanguageBChange={handleLanguageBChange}
        onSwap={handleSwapLanguages}
        disabled={!isIdle}
      />

      {/* Recording Indicator Banner */}
      {isRecording && (
        <View style={styles.recordingBanner}>
          <View style={styles.recordingDotPulse} />
          <Text style={styles.recordingBannerText}>
            Select who is speaking, then speak into the mic
          </Text>
        </View>
      )}

      {/* Speaker Toggle */}
      {!isIdle && (
        <SpeakerToggle
          activeSpeaker={activeSpeaker}
          languageA={languageA}
          languageB={languageB}
          onSpeakerChange={handleActiveSpeakerChange}
          disabled={isIdle}
        />
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Transcript Display */}
      <LiveTranscriptDisplay
        transcripts={transcripts}
        languageA={languageA}
        languageB={languageB}
      />

      {/* Audio Level Indicator */}
      {(isListening || isPaused) && (
        <AudioLevelIndicator
          level={audioLevel}
          isActive={isListening && isRecording}
        />
      )}

      {/* Session Controls */}
      <View style={styles.controlsContainer}>
        <SessionControls
          sessionState={sessionState}
          onStart={handleStartSession}
          onPause={handlePauseSession}
          onResume={handleResumeSession}
          onStop={handleEndSession}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusBadgeRecording: {
    backgroundColor: colors.semantic.error[50],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray[400],
    marginRight: spacing.xs,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  statusDotPaused: {
    backgroundColor: colors.warning,
  },
  statusDotRecording: {
    backgroundColor: colors.semantic.error[500],
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[600],
  },
  statusTextRecording: {
    color: colors.semantic.error[700],
  },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.semantic.error[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.semantic.error[100],
  },
  recordingDotPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.semantic.error[500],
    marginRight: spacing.sm,
  },
  recordingBannerText: {
    fontSize: typography.fontSize.sm,
    color: colors.semantic.error[700],
    textAlign: 'center',
    flex: 1,
  },
  errorContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.semantic.error[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.semantic.error[500],
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.semantic.error[700],
  },
  controlsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + 80, // Extra padding for tab bar
  },
});
