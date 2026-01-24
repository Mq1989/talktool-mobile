import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { getLanguageName } from '../../utils/languages';
import type { Speaker, LanguageCode } from '../../types/liveTranslate.types';

interface SpeakerToggleProps {
  activeSpeaker: Speaker;
  languageA: LanguageCode;
  languageB: LanguageCode;
  onSpeakerChange: (speaker: Speaker) => void;
  disabled?: boolean;
}

export function SpeakerToggle({
  activeSpeaker,
  languageA,
  languageB,
  onSpeakerChange,
  disabled = false,
}: SpeakerToggleProps) {
  const handlePress = (speaker: Speaker) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSpeakerChange(speaker);
  };

  const languageAName = getLanguageName(languageA);
  const languageBName = getLanguageName(languageB);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Who is speaking?</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            styles.toggleButtonLeft,
            activeSpeaker === 'person_a' && styles.toggleButtonActive,
            disabled && styles.toggleButtonDisabled,
          ]}
          onPress={() => handlePress('person_a')}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.toggleButtonText,
              activeSpeaker === 'person_a' && styles.toggleButtonTextActive,
              disabled && styles.toggleButtonTextDisabled,
            ]}
            numberOfLines={1}
          >
            Person A
          </Text>
          <Text
            style={[
              styles.toggleLanguageText,
              activeSpeaker === 'person_a' && styles.toggleLanguageTextActive,
              disabled && styles.toggleButtonTextDisabled,
            ]}
            numberOfLines={1}
          >
            {languageAName}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            styles.toggleButtonRight,
            activeSpeaker === 'person_b' && styles.toggleButtonActive,
            disabled && styles.toggleButtonDisabled,
          ]}
          onPress={() => handlePress('person_b')}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.toggleButtonText,
              activeSpeaker === 'person_b' && styles.toggleButtonTextActive,
              disabled && styles.toggleButtonTextDisabled,
            ]}
            numberOfLines={1}
          >
            Person B
          </Text>
          <Text
            style={[
              styles.toggleLanguageText,
              activeSpeaker === 'person_b' && styles.toggleLanguageTextActive,
              disabled && styles.toggleButtonTextDisabled,
            ]}
            numberOfLines={1}
          >
            {languageBName}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[600],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonLeft: {
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
  },
  toggleButtonRight: {
    borderTopRightRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
  },
  toggleButtonDisabled: {
    opacity: 0.5,
  },
  toggleButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[700],
  },
  toggleButtonTextActive: {
    color: '#ffffff',
  },
  toggleButtonTextDisabled: {
    color: colors.gray[400],
  },
  toggleLanguageText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  toggleLanguageTextActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
