import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration } from '../../utils/helpers';

// TalkTool brand colors
const brand = {
  blue: {
    primary: '#3B82F6',
    dark: '#1E40AF',
    light: '#DBEAFE',
    lighter: '#EFF6FF',
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  amber: {
    500: '#F59E0B',
    600: '#D97706',
  },
};

interface AudioPlayerProps {
  url: string;
  title?: string;
  duration?: number;
  variant?: 'default' | 'compact' | 'voicemail';
}

// Waveform visualization component
function WaveformBars({ isPlaying, progress }: { isPlaying: boolean; progress: number }) {
  const bars = 24;
  const activeBar = Math.floor(progress * bars);

  return (
    <View style={waveStyles.container}>
      {Array.from({ length: bars }).map((_, i) => {
        const height = 8 + Math.sin(i * 0.8) * 12 + Math.random() * 4;
        const isActive = i <= activeBar;
        const isCurrent = i === activeBar;

        return (
          <View
            key={i}
            style={[
              waveStyles.bar,
              { height },
              isActive && waveStyles.barActive,
              isCurrent && isPlaying && waveStyles.barCurrent,
            ]}
          />
        );
      })}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
    flex: 1,
    paddingHorizontal: 4,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: brand.gray[200],
  },
  barActive: {
    backgroundColor: brand.blue.primary,
  },
  barCurrent: {
    backgroundColor: brand.blue.dark,
  },
});

export function AudioPlayer({
  url,
  title = 'Recording',
  duration: initialDuration,
  variant = 'default',
}: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(initialDuration ?? 0);
  const [error, setError] = useState<string | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Pulse animation for loading
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isLoading, pulseAnim]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setError('Failed to load audio');
      }
      return;
    }

    setPosition(status.positionMillis / 1000);
    setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
    setIsPlaying(status.isPlaying);

    if (status.durationMillis) {
      const progress = status.positionMillis / status.durationMillis;
      progressAnim.setValue(progress);
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
      progressAnim.setValue(0);
    }
  };

  const loadAndPlay = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsPlaying(true);
    } catch (err) {
      console.error('Error loading audio:', err);
      setError('Unable to play audio');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();

    if (!sound) {
      await loadAndPlay();
      return;
    }

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const skipBackward = async () => {
    if (!sound) return;
    const newPosition = Math.max(0, (position - 10) * 1000);
    await sound.setPositionAsync(newPosition);
  };

  const skipForward = async () => {
    if (!sound) return;
    const newPosition = Math.min(duration * 1000, (position + 10) * 1000);
    await sound.setPositionAsync(newPosition);
  };

  const progress = duration > 0 ? position / duration : 0;
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isVoicemail = variant === 'voicemail';
  const accentColor = isVoicemail ? brand.amber[500] : brand.blue.primary;

  // Compact variant
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={togglePlayPause}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.compactPlayBtn, { opacity: pulseAnim }]}>
          <Ionicons
            name={isLoading ? 'ellipsis-horizontal' : isPlaying ? 'pause' : 'play'}
            size={14}
            color={brand.blue.primary}
          />
        </Animated.View>
        <Text style={styles.compactText}>
          {isPlaying ? formatDuration(Math.floor(position)) : title}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={brand.gray[400]} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, isVoicemail && styles.containerVoicemail]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconWrapper, isVoicemail && styles.iconWrapperVoicemail]}>
          <Ionicons
            name={isVoicemail ? 'mic' : 'musical-notes'}
            size={16}
            color={accentColor}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {duration > 0 && (
            <Text style={styles.totalDuration}>{formatDuration(Math.floor(duration))}</Text>
          )}
        </View>
      </View>

      {/* Error state */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Waveform / Progress */}
      <View style={styles.waveformContainer}>
        <WaveformBars isPlaying={isPlaying} progress={progress} />
      </View>

      {/* Time indicators */}
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatDuration(Math.floor(position))}</Text>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { width: progressWidth },
                isVoicemail && styles.progressBarFillVoicemail,
              ]}
            />
          </View>
        </View>
        <Text style={styles.timeText}>-{formatDuration(Math.floor(duration - position))}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={skipBackward}
          disabled={!sound}
          activeOpacity={0.7}
        >
          <Ionicons
            name="play-back"
            size={18}
            color={sound ? brand.gray[600] : brand.gray[300]}
          />
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.playButton, isVoicemail && styles.playButtonVoicemail]}
            onPress={togglePlayPause}
            disabled={isLoading}
            activeOpacity={0.9}
          >
            <Animated.View style={{ opacity: pulseAnim }}>
              <Ionicons
                name={isLoading ? 'ellipsis-horizontal' : isPlaying ? 'pause' : 'play'}
                size={24}
                color="#fff"
              />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={skipForward}
          disabled={!sound}
          activeOpacity={0.7}
        >
          <Ionicons
            name="play-forward"
            size={18}
            color={sound ? brand.gray[600] : brand.gray[300]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: brand.gray[100],
  },
  containerVoicemail: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: brand.blue.lighter,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapperVoicemail: {
    backgroundColor: '#FEF3C7',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: brand.gray[800],
    marginBottom: 2,
  },
  totalDuration: {
    fontSize: 13,
    color: brand.gray[500],
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },

  // Waveform
  waveformContainer: {
    marginBottom: 16,
  },

  // Time row
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  timeText: {
    fontSize: 12,
    color: brand.gray[500],
    fontVariant: ['tabular-nums'],
    minWidth: 36,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: brand.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: brand.blue.primary,
    borderRadius: 2,
  },
  progressBarFillVoicemail: {
    backgroundColor: brand.amber[500],
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  skipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: brand.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: brand.blue.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brand.blue.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  playButtonVoicemail: {
    backgroundColor: brand.amber[500],
    shadowColor: brand.amber[600],
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.blue.lighter,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 10,
  },
  compactPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactText: {
    flex: 1,
    fontSize: 13,
    color: brand.blue.dark,
    fontWeight: '500',
  },
});
