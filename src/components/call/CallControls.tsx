import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface CallControlsProps {
  isMuted: boolean;
  isSpeakerOn: boolean;
  onMuteToggle: () => void;
  onSpeakerToggle: () => void;
  onEndCall: () => void;
}

export function CallControls({
  isMuted,
  isSpeakerOn,
  onMuteToggle,
  onSpeakerToggle,
  onEndCall,
}: CallControlsProps) {
  const handleMuteToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMuteToggle();
  };

  const handleSpeakerToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSpeakerToggle();
  };

  const handleEndCall = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onEndCall();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.controlButton, isMuted && styles.controlButtonActive]}
        onPress={handleMuteToggle}
      >
        <Text style={[styles.controlIcon, isMuted && styles.controlIconActive]}>
          {isMuted ? 'M' : 'U'}
        </Text>
        <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>
          {isMuted ? 'Unmute' : 'Mute'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
        <Text style={styles.endCallIcon}>X</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
        onPress={handleSpeakerToggle}
      >
        <Text style={[styles.controlIcon, isSpeakerOn && styles.controlIconActive]}>
          S
        </Text>
        <Text style={[styles.controlLabel, isSpeakerOn && styles.controlLabelActive]}>
          Speaker
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  controlButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: colors.primary[100],
  },
  controlIcon: {
    fontSize: 24,
    color: colors.gray[600],
    fontWeight: typography.fontWeight.bold,
  },
  controlIconActive: {
    color: colors.primary[600],
  },
  controlLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
  controlLabelActive: {
    color: colors.primary[600],
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: typography.fontWeight.bold,
  },
});
