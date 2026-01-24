import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDate, formatDuration, formatPhoneNumber } from '../../utils/helpers';
import { getLanguageFlag, getLanguageName } from '../../utils/languages';
import type { CallHistoryItem } from '../../types/call.types';

// TalkTool premium palette - editorial aesthetic
const palette = {
  // Core blues with depth
  azure: {
    50: '#EEF4FF',
    100: '#E0EAFF',
    200: '#C7D7FE',
    300: '#A4BCFD',
    400: '#8098F9',
    500: '#6172F3',
    600: '#444CE7',
    700: '#3538CD',
    800: '#2D31A6',
    900: '#1F235B',
  },
  // Warm neutrals for sophistication
  ink: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    150: '#EBEBED',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
    950: '#0D0D0F',
  },
  // Success spectrum
  jade: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
  },
  // Warning spectrum
  honey: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  // Error spectrum
  coral: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
  },
  // Accent violet
  iris: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
  },
  white: '#FFFFFF',
};

// Status configuration with premium colors
const statusConfig = {
  completed: {
    icon: 'checkmark-circle' as const,
    label: 'Completed',
    gradient: [palette.jade[500], palette.jade[600]] as const,
    bg: palette.jade[50],
    text: palette.jade[700],
    glow: palette.jade[400],
  },
  missed: {
    icon: 'call' as const,
    label: 'Missed',
    gradient: [palette.honey[500], palette.honey[600]] as const,
    bg: palette.honey[50],
    text: palette.honey[600],
    glow: palette.honey[400],
  },
  failed: {
    icon: 'close-circle' as const,
    label: 'Failed',
    gradient: [palette.coral[500], palette.coral[600]] as const,
    bg: palette.coral[50],
    text: palette.coral[600],
    glow: palette.coral[400],
  },
};

interface CallCardProps {
  call: CallHistoryItem;
  variant?: 'full' | 'compact';
  showActions?: boolean;
  onPress?: () => void;
}

// Language flow visualization component
function LanguageFlow({
  from,
  to,
  compact = false,
}: {
  from: string;
  to: string;
  compact?: boolean;
}) {
  const fromFlag = getLanguageFlag(from);
  const toFlag = getLanguageFlag(to);
  const fromName = getLanguageName(from);
  const toName = getLanguageName(to);

  if (compact) {
    return (
      <View style={flowStyles.compactContainer}>
        <Text style={flowStyles.flag}>{fromFlag}</Text>
        <View style={flowStyles.flowLine}>
          <LinearGradient
            colors={[palette.azure[300], palette.azure[500], palette.iris[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={flowStyles.flowGradient}
          />
          <View style={flowStyles.flowDot} />
        </View>
        <Text style={flowStyles.flag}>{toFlag}</Text>
      </View>
    );
  }

  return (
    <View style={flowStyles.container}>
      <View style={flowStyles.langBlock}>
        <Text style={flowStyles.flagLarge}>{fromFlag}</Text>
        <Text style={flowStyles.langName} numberOfLines={1}>{fromName}</Text>
      </View>
      <View style={flowStyles.arrowContainer}>
        <LinearGradient
          colors={[palette.azure[200], palette.azure[400], palette.iris[300]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={flowStyles.arrowLine}
        />
        <View style={flowStyles.arrowHead}>
          <Ionicons name="chevron-forward" size={10} color={palette.azure[500]} />
        </View>
      </View>
      <View style={flowStyles.langBlock}>
        <Text style={flowStyles.flagLarge}>{toFlag}</Text>
        <Text style={flowStyles.langName} numberOfLines={1}>{toName}</Text>
      </View>
    </View>
  );
}

const flowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langBlock: {
    alignItems: 'center',
    minWidth: 48,
  },
  flag: {
    fontSize: 16,
  },
  flagLarge: {
    fontSize: 22,
    marginBottom: 2,
  },
  langName: {
    fontSize: 10,
    fontWeight: '500',
    color: palette.ink[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    maxWidth: 60,
    textAlign: 'center',
  },
  arrowContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 80,
  },
  arrowLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  arrowHead: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.azure[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  flowLine: {
    width: 24,
    height: 2,
    borderRadius: 1,
    position: 'relative',
    overflow: 'visible',
  },
  flowGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 1,
  },
  flowDot: {
    position: 'absolute',
    right: -2,
    top: -1,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.iris[400],
  },
});

// Premium status badge
function StatusBadge({ status }: { status: CallHistoryItem['status'] }) {
  const statusKey = status as keyof typeof statusConfig;
  const config = statusConfig[statusKey] || statusConfig.completed;

  return (
    <View style={[badgeStyles.container, { backgroundColor: config.bg }]}>
      <View style={[badgeStyles.iconDot, { backgroundColor: config.glow + '40' }]}>
        <Ionicons
          name={config.icon}
          size={10}
          color={config.text}
          style={status === 'missed' && badgeStyles.missedIcon}
        />
      </View>
      <Text style={[badgeStyles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 20,
    gap: 6,
  },
  iconDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  missedIcon: {
    transform: [{ rotate: '135deg' }],
  },
});

// Action chip button
function ActionChip({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={chipStyles.container} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={13} color={palette.azure[600]} />
      <Text style={chipStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: palette.azure[50],
    borderWidth: 1,
    borderColor: palette.azure[100],
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: palette.azure[700],
  },
});

export function CallCard({ call, variant = 'full', showActions = true, onPress }: CallCardProps) {
  const router = useRouter();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // Extract call data with fallbacks
  const callId = call.id ?? call._id;
  const phone = call.phoneNumber ?? call.from ?? call.to ?? '';
  const contactDisplay = call.contactName ?? formatPhoneNumber(phone);
  const fromLang = call.fromLanguage ?? call.repLang ?? 'EN_US';
  const toLang = call.toLanguage ?? call.customerLang ?? 'EN_US';
  const callDuration = call.duration ?? call.durationSeconds ?? 0;
  const callTime = call.startTime ?? (call.startedAt ? new Date(call.startedAt) : new Date());

  const initials = call.contactName
    ? call.contactName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '#';

  const isMissed = call.status === 'missed';
  const status = call.status as keyof typeof statusConfig;
  const statusCfg = statusConfig[status] || statusConfig.completed;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/call/history/${callId}`);
    }
  };

  // Compact variant for dashboard
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View style={[compactStyles.container, { transform: [{ scale: scaleAnim }] }]}>
          {/* Left accent line */}
          <LinearGradient
            colors={statusCfg.gradient}
            style={compactStyles.accentLine}
          />

          {/* Avatar */}
          <View style={[compactStyles.avatar, isMissed && compactStyles.avatarMissed]}>
            {isMissed ? (
              <Ionicons
                name="call"
                size={16}
                color={palette.honey[600]}
                style={compactStyles.missedIcon}
              />
            ) : (
              <Text style={compactStyles.avatarText}>{initials}</Text>
            )}
          </View>

          {/* Content */}
          <View style={compactStyles.content}>
            <View style={compactStyles.topRow}>
              <Text style={compactStyles.name} numberOfLines={1}>{contactDisplay}</Text>
              <Text style={compactStyles.time}>{formatDate(callTime)}</Text>
            </View>
            <View style={compactStyles.bottomRow}>
              <LanguageFlow from={fromLang} to={toLang} compact />
              <View style={compactStyles.metaDivider} />
              <Text style={compactStyles.duration}>{formatDuration(callDuration)}</Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={16} color={palette.ink[300]} />
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // Full variant for call history page
  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        {/* Top gradient accent */}
        <LinearGradient
          colors={[palette.azure[400], palette.iris[400]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topAccent}
        />

        {/* Main content */}
        <View style={styles.cardBody}>
          {/* Header row */}
          <View style={styles.headerRow}>
            {/* Avatar with glow */}
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarGlow, { backgroundColor: statusCfg.glow + '20' }]} />
              <View style={[styles.avatar, isMissed && styles.avatarMissed]}>
                {isMissed ? (
                  <Ionicons
                    name="call"
                    size={20}
                    color={palette.honey[600]}
                    style={styles.missedIcon}
                  />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
            </View>

            {/* Name and phone */}
            <View style={styles.nameBlock}>
              <Text style={styles.contactName} numberOfLines={1}>{contactDisplay}</Text>
              {call.contactName && (
                <Text style={styles.phoneNumber}>{formatPhoneNumber(phone)}</Text>
              )}
            </View>

            {/* Status badge */}
            <StatusBadge status={call.status} />
          </View>

          {/* Language flow section */}
          <View style={styles.languageSection}>
            <LanguageFlow from={fromLang} to={toLang} />
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color={palette.ink[400]} />
              <Text style={styles.metaText}>{formatDuration(callDuration)}</Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={13} color={palette.ink[400]} />
              <Text style={styles.metaText}>{formatDate(callTime)}</Text>
            </View>
          </View>
        </View>

        {/* Actions footer */}
        {showActions && (
          <View style={styles.actionsRow}>
            {call.hasTranscript && (
              <ActionChip icon="document-text-outline" label="Transcript" />
            )}
            {call.hasRecording && (
              <ActionChip icon="play-circle-outline" label="Recording" />
            )}
            <View style={styles.actionsSpacer} />
            <TouchableOpacity
              style={styles.callBackBtn}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/call/new?phone=${phone}`);
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[palette.azure[500], palette.azure[600]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.callBackGradient}
              >
                <Ionicons name="call" size={14} color={palette.white} />
                <Text style={styles.callBackText}>Call Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// Compact styles
const compactStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 0,
    backgroundColor: palette.white,
  },
  accentLine: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginRight: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: palette.ink[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarMissed: {
    backgroundColor: palette.honey[50],
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.ink[500],
  },
  missedIcon: {
    transform: [{ rotate: '135deg' }],
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.ink[900],
    flex: 1,
    marginRight: 12,
  },
  time: {
    fontSize: 11,
    color: palette.ink[400],
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.ink[200],
    marginHorizontal: 8,
  },
  duration: {
    fontSize: 12,
    color: palette.ink[400],
    fontWeight: '500',
  },
});

// Full card styles
const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: palette.ink[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  topAccent: {
    height: 3,
  },
  cardBody: {
    padding: 18,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatarGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 18,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: palette.ink[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMissed: {
    backgroundColor: palette.honey[50],
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '600',
    color: palette.ink[500],
  },
  missedIcon: {
    transform: [{ rotate: '135deg' }],
  },
  nameBlock: {
    flex: 1,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '700',
    color: palette.ink[900],
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  phoneNumber: {
    fontSize: 13,
    color: palette.ink[400],
    fontWeight: '500',
  },

  // Language section
  languageSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: palette.ink[100],
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: palette.ink[400],
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: palette.ink[300],
    marginHorizontal: 10,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: palette.ink[100],
    backgroundColor: palette.ink[50],
    gap: 8,
  },
  actionsSpacer: {
    flex: 1,
  },
  callBackBtn: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: palette.azure[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  callBackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  callBackText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.white,
  },
});

export default CallCard;
