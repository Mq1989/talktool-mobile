import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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

interface RoundControlProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onPress: () => void;
}

function RoundControl({ icon, label, active, onPress }: RoundControlProps) {
  return (
    <View style={styles.controlSlot}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.controlButton,
          active && styles.controlButtonActive,
          pressed && styles.pressed,
        ]}
      >
        {icon}
      </Pressable>
      <Text style={[styles.controlLabel, active && styles.controlLabelActive]}>{label}</Text>
    </View>
  );
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
      <RoundControl
        active={isMuted}
        onPress={handleMuteToggle}
        label={isMuted ? 'Unmute' : 'Mute'}
        icon={
          <Ionicons
            name={isMuted ? 'mic-off' : 'mic'}
            size={26}
            color={isMuted ? colors.primary[600] : colors.gray[700]}
          />
        }
      />

      <View style={styles.controlSlot}>
        <Pressable
          onPress={handleEndCall}
          style={({ pressed }) => [styles.endCallButton, pressed && styles.pressed]}
        >
          <MaterialIcons name="call-end" size={30} color="#fff" />
        </Pressable>
        <Text style={styles.controlLabel}>End</Text>
      </View>

      <RoundControl
        active={isSpeakerOn}
        onPress={handleSpeakerToggle}
        label="Speaker"
        icon={
          <Ionicons
            name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
            size={26}
            color={isSpeakerOn ? colors.primary[600] : colors.gray[700]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  controlSlot: {
    alignItems: 'center',
  },
  controlButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonActive: {
    backgroundColor: colors.primary[100],
  },
  pressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
  controlLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },
  controlLabelActive: {
    color: colors.primary[600],
  },
  endCallButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
