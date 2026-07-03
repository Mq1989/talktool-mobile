import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import type { DisplayTranscript } from '../../hooks/useDisplaySocket';

interface TranscriptionDisplayProps {
  transcripts: DisplayTranscript[];
  isTranslating?: boolean;
}

/**
 * Format time from timestamp string or epoch ms
 */
function formatTime(timestamp: string | number): string {
  if (typeof timestamp === 'number') {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  // If it's already a formatted string, extract just the time
  const date = new Date(timestamp);
  if (!isNaN(date.getTime())) {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  // Return original if it's already formatted time
  return timestamp;
}

/**
 * Individual transcript message bubble
 * Rep (You) messages on right, Customer messages on left
 */
function TranscriptBubble({
  transcript,
  isNew,
  showTranslation
}: {
  transcript: DisplayTranscript;
  isNew: boolean;
  showTranslation: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(isNew ? 20 : 0)).current;

  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNew, fadeAnim, slideAnim]);

  const isRep = transcript.from === 'rep';
  const hasTranslation = showTranslation && transcript.translation && transcript.translation !== transcript.original;
  const displayTime = formatTime(transcript.time || transcript.timestamp);

  return (
    <Animated.View
      style={[
        styles.messageContainer,
        isRep ? styles.repContainer : styles.customerContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Time and speaker label */}
      <View style={[styles.messageHeader, isRep && styles.repHeader]}>
        <Text style={styles.timeLabel}>{displayTime}</Text>
        <Text style={styles.speakerLabel}>{isRep ? 'You' : 'Caller'}</Text>
      </View>

      {/* Original message bubble */}
      <View style={[
        styles.bubble,
        isRep ? styles.repBubble : styles.customerBubble,
      ]}>
        <Text style={[
          styles.bubbleText,
          isRep ? styles.repText : styles.customerText,
        ]}>
          {transcript.original || transcript.text}
        </Text>
      </View>

      {/* Translation bubble (if translation enabled and available) */}
      {hasTranslation && (
        <View style={[
          styles.translationBubble,
          isRep ? styles.repTranslationBubble : styles.customerTranslationBubble,
        ]}>
          <View style={styles.translationHeader}>
            <Ionicons name="language" size={11} color={colors.primary[600]} style={styles.globeIcon} />
            <Text style={styles.translatedLabel}>TRANSLATED</Text>
          </View>
          <Text style={styles.translationText}>
            {transcript.translation}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

export function TranscriptionDisplay({
  transcripts,
  isTranslating = true
}: TranscriptionDisplayProps) {
  // DEBUG: Log what the component actually receives
  console.log('[TranscriptionDisplay] Render - transcripts.length:', transcripts.length);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new transcripts arrive
    if (transcripts.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [transcripts.length]);

  if (transcripts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="chatbubbles-outline" size={30} color={colors.primary[500]} />
        </View>
        <Text style={styles.emptyTitle}>Live Transcription</Text>
        <Text style={styles.emptyText}>
          Transcripts will appear here as you speak...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {transcripts.map((transcript, index) => (
        <TranscriptBubble
          key={transcript.id}
          transcript={transcript}
          isNew={index === transcripts.length - 1}
          showTranslation={isTranslating}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[400],
    textAlign: 'center',
  },

  // Message container
  messageContainer: {
    marginBottom: spacing.lg,
    maxWidth: '88%',
  },
  repContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  customerContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },

  // Message header (time + speaker)
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  repHeader: {
    flexDirection: 'row-reverse',
  },
  timeLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
  },
  speakerLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[600],
  },

  // Original message bubble
  bubble: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    maxWidth: '100%',
  },
  repBubble: {
    backgroundColor: colors.primary[600],
    borderBottomRightRadius: 4,
  },
  customerBubble: {
    backgroundColor: colors.gray[100],
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: typography.fontSize.base,
    lineHeight: 22,
  },
  repText: {
    color: '#fff',
  },
  customerText: {
    color: colors.gray[800],
  },

  // Translation bubble
  translationBubble: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    maxWidth: '100%',
  },
  repTranslationBubble: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
  },
  customerTranslationBubble: {
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
  },
  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  globeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  translatedLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[600],
    letterSpacing: 0.5,
  },
  translationText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[700],
    lineHeight: 20,
  },
});
