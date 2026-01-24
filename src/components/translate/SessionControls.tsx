import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import type { SessionState } from '../../types/liveTranslate.types';

interface SessionControlsProps {
  sessionState: SessionState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

interface ControlButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'large';
}

function ControlButton({
  icon,
  label,
  onPress,
  variant,
  size = 'small',
}: ControlButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const buttonStyles = [
    styles.button,
    size === 'large' ? styles.buttonLarge : styles.buttonSmall,
    variant === 'primary' && styles.buttonPrimary,
    variant === 'secondary' && styles.buttonSecondary,
    variant === 'danger' && styles.buttonDanger,
  ];

  const iconColor =
    variant === 'primary'
      ? '#fff'
      : variant === 'danger'
      ? colors.error
      : colors.gray[700];

  const labelColor =
    variant === 'primary'
      ? '#fff'
      : variant === 'danger'
      ? colors.error
      : colors.gray[700];

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          buttonStyles,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Ionicons
          name={icon}
          size={size === 'large' ? 32 : 24}
          color={iconColor}
        />
        <Text style={[
          styles.buttonLabel,
          size === 'large' && styles.buttonLabelLarge,
          { color: labelColor },
        ]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function SessionControls({
  sessionState,
  onStart,
  onPause,
  onResume,
  onStop,
}: SessionControlsProps) {
  const isIdle = sessionState === 'idle';
  const isListening = sessionState === 'listening';
  const isPaused = sessionState === 'paused';

  // Idle state - show large Start button
  if (isIdle) {
    return (
      <View style={styles.container}>
        <ControlButton
          icon="mic"
          label="Start Session"
          onPress={onStart}
          variant="primary"
          size="large"
        />
      </View>
    );
  }

  // Active/Paused state - show control buttons
  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        {isListening ? (
          <ControlButton
            icon="pause"
            label="Pause"
            onPress={onPause}
            variant="secondary"
          />
        ) : (
          <ControlButton
            icon="play"
            label="Resume"
            onPress={onResume}
            variant="primary"
          />
        )}

        <ControlButton
          icon="stop"
          label="Stop"
          onPress={onStop}
          variant="danger"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  buttonSmall: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  buttonLarge: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  buttonPrimary: {
    backgroundColor: colors.primary[500],
    shadowColor: colors.primary[500],
  },
  buttonSecondary: {
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  buttonDanger: {
    backgroundColor: colors.semantic.error[50],
    borderWidth: 1,
    borderColor: colors.semantic.error[100],
  },
  buttonLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing.xs,
  },
  buttonLabelLarge: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.sm,
  },
});
