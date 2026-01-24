import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

interface AudioLevelIndicatorProps {
  level: number; // 0-1
  isActive: boolean;
}

const BAR_COUNT = 5;
const BAR_WIDTH = 4;
const BAR_GAP = 3;
const MIN_HEIGHT = 8;
const MAX_HEIGHT = 32;

function AudioBar({ index, level, isActive }: { index: number; level: number; isActive: boolean }) {
  const heightAnim = useRef(new Animated.Value(MIN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!isActive) {
      // When paused, animate to minimum height
      Animated.timing(heightAnim, {
        toValue: MIN_HEIGHT,
        duration: 200,
        useNativeDriver: false,
      }).start();
      Animated.timing(opacityAnim, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: false, // Must match heightAnim since both are on same view
      }).start();
      return;
    }

    // Calculate target height based on level and bar index
    // Middle bars should be taller, edge bars shorter (like an equalizer)
    const middleIndex = (BAR_COUNT - 1) / 2;
    const distanceFromMiddle = Math.abs(index - middleIndex);
    const positionFactor = 1 - (distanceFromMiddle / middleIndex) * 0.4;

    // Add some randomness for natural feel
    const randomFactor = 0.7 + Math.random() * 0.3;
    const targetHeight = MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * level * positionFactor * randomFactor;

    Animated.spring(heightAnim, {
      toValue: Math.max(MIN_HEIGHT, targetHeight),
      friction: 8,
      tension: 100,
      useNativeDriver: false,
    }).start();

    // Opacity based on level
    Animated.timing(opacityAnim, {
      toValue: 0.4 + level * 0.6,
      duration: 100,
      useNativeDriver: false, // Must match heightAnim since both are on same view
    }).start();
  }, [level, isActive, index, heightAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height: heightAnim,
          opacity: opacityAnim,
        },
      ]}
    />
  );
}

export function AudioLevelIndicator({ level, isActive }: AudioLevelIndicatorProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive && level > 0.3) {
      // Pulse animation when detecting speech
      // Using useNativeDriver: false to match child AudioBar animations
      // (mixing native and JS drivers on related views causes errors)
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [level, isActive, pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.barsContainer,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        {Array.from({ length: BAR_COUNT }).map((_, index) => (
          <AudioBar
            key={index}
            index={index}
            level={level}
            isActive={isActive}
          />
        ))}
      </Animated.View>
      <View style={[
        styles.statusIndicator,
        isActive ? styles.statusActive : styles.statusPaused,
      ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: MAX_HEIGHT + spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.xl,
    gap: BAR_GAP,
  },
  bar: {
    width: BAR_WIDTH,
    backgroundColor: colors.primary[500],
    borderRadius: BAR_WIDTH / 2,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: spacing.sm,
  },
  statusActive: {
    backgroundColor: colors.success,
  },
  statusPaused: {
    backgroundColor: colors.warning,
  },
});
