import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { LanguageCode, languages } from '../../utils/languages';
import type { TranscriptItem } from '../../types/liveTranslate.types';

interface LiveTranscriptDisplayProps {
  transcripts: TranscriptItem[];
  languageA: LanguageCode;
  languageB: LanguageCode;
}

interface TranscriptBubbleProps {
  item: TranscriptItem;
  isPersonA: boolean;
  index: number;
}

function TranscriptBubble({ item, isPersonA, index }: TranscriptBubbleProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isPersonA ? -20 : 20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: 50,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const originalLang = languages[item.originalLanguage];
  const targetLang = languages[item.targetLanguage];

  return (
    <Animated.View
      style={[
        styles.bubbleContainer,
        isPersonA ? styles.bubbleContainerLeft : styles.bubbleContainerRight,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isPersonA ? styles.bubbleLeft : styles.bubbleRight,
        ]}
      >
        {/* Original text */}
        <View style={styles.textSection}>
          <View style={styles.languageTag}>
            <Text style={styles.languageTagFlag}>{originalLang?.flag}</Text>
            <Text style={styles.languageTagText}>Original</Text>
          </View>
          <Text style={[
            styles.originalText,
            isPersonA ? styles.textLeft : styles.textRight,
          ]}>
            {item.originalText}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Translated text */}
        <View style={styles.textSection}>
          <View style={styles.languageTag}>
            <Text style={styles.languageTagFlag}>{targetLang?.flag}</Text>
            <Text style={styles.languageTagText}>Translation</Text>
          </View>
          <Text style={[
            styles.translatedText,
            isPersonA ? styles.textLeft : styles.textRight,
          ]}>
            {item.translatedText}
          </Text>
        </View>

        {/* Timestamp */}
        <Text style={[
          styles.timestamp,
          isPersonA ? styles.timestampLeft : styles.timestampRight,
        ]}>
          {formatTime(item.timestamp)}
        </Text>
      </View>
    </Animated.View>
  );
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LiveTranscriptDisplay({
  transcripts,
  languageA,
  languageB,
}: LiveTranscriptDisplayProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new transcripts are added
  useEffect(() => {
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
          <Ionicons name="mic-outline" size={30} color={colors.primary[500]} />
        </View>
        <Text style={styles.emptyTitle}>Ready to translate</Text>
        <Text style={styles.emptyDescription}>
          Start a session and speak into the device.{'\n'}
          Transcriptions will appear here.
        </Text>

        {/* Language pair indicator */}
        <View style={styles.languageHint}>
          <View style={styles.languageHintItem}>
            <Text style={styles.languageHintFlag}>
              {languages[languageA]?.flag}
            </Text>
            <Text style={styles.languageHintText}>Person A</Text>
          </View>
          <Ionicons name="swap-horizontal" size={16} color={colors.gray[400]} style={styles.languageHintArrow} />
          <View style={styles.languageHintItem}>
            <Text style={styles.languageHintFlag}>
              {languages[languageB]?.flag}
            </Text>
            <Text style={styles.languageHintText}>Person B</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {transcripts.map((item, index) => (
        <TranscriptBubble
          key={item.id}
          item={item}
          isPersonA={item.speaker === 'person_a'}
          index={index}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 24,
  },
  languageHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  languageHintItem: {
    alignItems: 'center',
  },
  languageHintFlag: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  languageHintText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    fontWeight: typography.fontWeight.medium,
  },
  languageHintArrow: {
    fontSize: 20,
    color: colors.gray[400],
  },
  bubbleContainer: {
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  bubbleContainerLeft: {
    alignSelf: 'flex-start',
  },
  bubbleContainerRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
  },
  bubbleLeft: {
    backgroundColor: colors.primary[50],
    borderBottomLeftRadius: borderRadius.sm,
  },
  bubbleRight: {
    backgroundColor: colors.indigo[50],
    borderBottomRightRadius: borderRadius.sm,
  },
  textSection: {
    marginBottom: spacing.xs,
  },
  languageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  languageTagFlag: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  languageTagText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase',
  },
  originalText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
    fontWeight: typography.fontWeight.medium,
    lineHeight: 22,
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'left',
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.sm,
  },
  translatedText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
    lineHeight: 22,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
    marginTop: spacing.sm,
  },
  timestampLeft: {
    textAlign: 'left',
  },
  timestampRight: {
    textAlign: 'right',
  },
});
