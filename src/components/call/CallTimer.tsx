import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDuration } from '../../utils/helpers';
import type { CallStatus } from '../../types/call.types';

interface CallTimerProps {
  duration: number;
  status: CallStatus;
}

export function CallTimer({ duration, status }: CallTimerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'connecting' || status === 'ringing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'active':
        return formatDuration(duration);
      case 'ended':
        return 'Call Ended';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connecting':
        return colors.call.connecting;
      case 'ringing':
        return colors.call.connecting;
      case 'active':
        return colors.call.active;
      case 'ended':
        return colors.call.ended;
      default:
        return colors.gray[500];
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.statusIndicator,
          { backgroundColor: getStatusColor() },
          { transform: [{ scale: pulseAnim }] },
        ]}
      />
      <Text style={styles.timerText}>{getStatusText()}</Text>
      {status === 'active' && (
        <Text style={styles.statusLabel}>In Call</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: spacing.sm,
  },
  timerText: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
  },
  statusLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
});
