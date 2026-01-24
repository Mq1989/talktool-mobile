import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCallDetail, useCallTranscript } from '../../../src/hooks/useCalls';
import { Card, Avatar, LoadingSpinner } from '../../../src/components/ui';
import {
  AudioPlayer,
  CallSummaryCard,
  TranscriptTimeline,
  VoicemailSection,
} from '../../../src/components/call';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import {
  formatDuration,
  formatPhoneNumber,
  formatDateTime,
  formatDate,
} from '../../../src/utils/helpers';
import { getLanguageFlag, getLanguageName } from '../../../src/utils/languages';
import type { CallHistoryItem } from '../../../src/types/call.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// TalkTool brand colors
const brand = {
  blue: {
    primary: '#3B82F6',
    dark: '#1E40AF',
    deeper: '#1E3A8A',
    indigo: '#4F46E5',
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
};

type CallStatusType = CallHistoryItem['status'];

// Status configuration
const statusConfig: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = {
  completed: { label: 'Completed', color: '#059669', bgColor: 'rgba(16, 185, 129, 0.1)', icon: 'checkmark-circle' },
  'in-progress': { label: 'Live', color: brand.blue.primary, bgColor: 'rgba(59, 130, 246, 0.1)', icon: 'radio' },
  ringing: { label: 'Ringing', color: '#D97706', bgColor: 'rgba(217, 119, 6, 0.1)', icon: 'notifications' },
  initiated: { label: 'Initiated', color: brand.gray[500], bgColor: 'rgba(107, 114, 128, 0.1)', icon: 'ellipsis-horizontal' },
  queued: { label: 'Queued', color: brand.gray[500], bgColor: 'rgba(107, 114, 128, 0.1)', icon: 'time' },
  busy: { label: 'Busy', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.1)', icon: 'close-circle' },
  failed: { label: 'Failed', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.1)', icon: 'alert-circle' },
  'no-answer': { label: 'No Answer', color: '#D97706', bgColor: 'rgba(217, 119, 6, 0.1)', icon: 'call' },
  canceled: { label: 'Canceled', color: brand.gray[500], bgColor: 'rgba(107, 114, 128, 0.1)', icon: 'close' },
  missed: { label: 'Missed', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.1)', icon: 'call' },
  voicemail: { label: 'Voicemail', color: '#D97706', bgColor: 'rgba(217, 119, 6, 0.1)', icon: 'mic' },
  'voicemail-received': { label: 'Voicemail', color: '#D97706', bgColor: 'rgba(217, 119, 6, 0.1)', icon: 'mic' },
  'voicemail-failed': { label: 'VM Failed', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.1)', icon: 'mic-off' },
};

// Modern status pill
function StatusPill({ status, direction }: { status?: CallStatusType; direction?: string }) {
  const config = status ? statusConfig[status] : statusConfig.completed;
  const isIncoming = direction === 'inbound';

  return (
    <View style={styles.statusPillContainer}>
      {/* Direction indicator */}
      <View style={[styles.directionPill, isIncoming ? styles.directionIncoming : styles.directionOutgoing]}>
        <Ionicons
          name={isIncoming ? 'arrow-down' : 'arrow-up'}
          size={12}
          color={isIncoming ? '#059669' : brand.blue.primary}
        />
        <Text style={[styles.directionText, { color: isIncoming ? '#059669' : brand.blue.primary }]}>
          {isIncoming ? 'Incoming' : 'Outgoing'}
        </Text>
      </View>

      {/* Status indicator */}
      {config && (
        <View style={[styles.statusPill, { backgroundColor: config.bgColor }]}>
          <View style={[styles.statusDot, { backgroundColor: config.color }]} />
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
      )}
    </View>
  );
}

// Language bridge component
function LanguageBridge({ repLang, customerLang }: { repLang?: string; customerLang?: string }) {
  if (!repLang && !customerLang) return null;

  const repFlag = getLanguageFlag(repLang || 'EN_US');
  const custFlag = getLanguageFlag(customerLang || 'EN_US');
  const repName = repLang ? getLanguageName(repLang) : 'Unknown';
  const custName = customerLang ? getLanguageName(customerLang) : 'Unknown';

  return (
    <View style={styles.languageBridge}>
      <View style={styles.languageEnd}>
        <Text style={styles.languageFlag}>{repFlag}</Text>
        <Text style={styles.languageNameText}>{repName}</Text>
        <Text style={styles.languageRole}>You</Text>
      </View>

      <View style={styles.languageConnector}>
        <View style={styles.connectorLine} />
        <View style={styles.connectorIcon}>
          <Ionicons name="sync" size={14} color={brand.blue.primary} />
        </View>
        <View style={styles.connectorLine} />
      </View>

      <View style={[styles.languageEnd, styles.languageEndRight]}>
        <Text style={styles.languageFlag}>{custFlag}</Text>
        <Text style={styles.languageNameText}>{custName}</Text>
        <Text style={styles.languageRole}>Caller</Text>
      </View>
    </View>
  );
}

// Metric tile component
function MetricTile({
  icon,
  label,
  value,
  accent = false
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.metricTile, accent && styles.metricTileAccent]}>
      <Ionicons
        name={icon}
        size={20}
        color={accent ? brand.blue.primary : brand.gray[400]}
      />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// Action button component
function ActionButton({
  icon,
  label,
  onPress,
  primary = false
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, primary && styles.actionButtonPrimary]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.actionIconWrapper, primary && styles.actionIconWrapperPrimary]}>
        <Ionicons name={icon} size={22} color={primary ? '#fff' : brand.gray[700]} />
      </View>
      <Text style={[styles.actionLabel, primary && styles.actionLabelPrimary]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Section header component
function SectionHeader({ title, icon }: { title: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.sectionHeader}>
      {icon && (
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={16} color={brand.blue.primary} />
        </View>
      )}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function CallDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollY = useRef(new Animated.Value(0)).current;

  const { data: call, isLoading, error, refetch } = useCallDetail(id ?? '');
  const { data: transcript } = useCallTranscript(id ?? '');

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Animated header opacity
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingGradient} />
        <LoadingSpinner fullScreen message="Loading call details..." />
      </View>
    );
  }

  if (error || !call) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={brand.gray[800]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Call Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="cloud-offline-outline" size={40} color={brand.gray[400]} />
          </View>
          <Text style={styles.errorTitle}>Unable to load call</Text>
          <Text style={styles.errorText}>
            {error?.message || 'The call details could not be found.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Extract call data
  const contactName = call.contactName || formatPhoneNumber(call.phoneNumber || call.from || call.to || '');
  const phoneNumber = call.phoneNumber || call.from || call.to || call.number || '';
  const duration = call.durationSeconds ?? call.duration ?? 0;
  const startTime = call.startedAt || call.startTime;
  const endTime = call.endedAt;
  const isVoicemail = call.type === 'voicemail';
  const hasRecording = !!call.recordingUrl;
  const hasTranscript = !!(call.transcriptMessages && call.transcriptMessages.length > 0) || !!call.transcriptionText;
  const hasSummary = !!call.summary;

  return (
    <View style={styles.container}>
      {/* Animated Header */}
      <Animated.View style={[styles.animatedHeader, { opacity: headerBgOpacity }]}>
        <View style={styles.animatedHeaderBg} />
      </Animated.View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={brand.gray[800]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Call Details</Text>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="share-outline" size={22} color={brand.gray[600]} />
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.blue.primary} />
          }
        >
          {/* Hero Card */}
          <View style={styles.heroCard}>
            {/* Gradient background */}
            <View style={styles.heroGradient}>
              <View style={styles.heroGradientLayer1} />
              <View style={styles.heroGradientLayer2} />
            </View>

            {/* Status Pills */}
            <StatusPill status={call.status} direction={call.direction} />

            {/* Contact Info */}
            <View style={styles.contactInfo}>
              <View style={styles.avatarContainer}>
                <Avatar name={contactName} size="xl" />
                {isVoicemail && (
                  <View style={styles.voicemailIndicator}>
                    <Ionicons name="mic" size={12} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={styles.contactName}>{contactName}</Text>
              {call.contactName && phoneNumber && (
                <Text style={styles.contactPhone}>{formatPhoneNumber(phoneNumber)}</Text>
              )}
            </View>

            {/* Duration Display */}
            <View style={styles.durationContainer}>
              <Text style={styles.durationValue}>{formatDuration(duration)}</Text>
              <Text style={styles.durationLabel}>Duration</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsRow}>
            <ActionButton
              icon="call"
              label="Call Back"
              primary
              onPress={() => router.push(`/call/new?phone=${phoneNumber}`)}
            />
            <ActionButton icon="chatbubble-outline" label="Message" />
            <ActionButton icon="person-add-outline" label="Save" />
            <ActionButton icon="ellipsis-horizontal" label="More" />
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <MetricTile
              icon="calendar-outline"
              label="Date"
              value={startTime ? formatDate(startTime) : '—'}
            />
            <MetricTile
              icon="time-outline"
              label="Started"
              value={startTime ? new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              accent
            />
            <MetricTile
              icon="flag-outline"
              label="Ended"
              value={endTime ? new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            />
          </View>

          {/* Language Section */}
          {(call.repLang || call.customerLang) && (
            <View style={styles.section}>
              <SectionHeader title="Translation" icon="language-outline" />
              <View style={styles.sectionCard}>
                <LanguageBridge repLang={call.repLang} customerLang={call.customerLang} />
              </View>
            </View>
          )}

          {/* Voicemail Section */}
          {isVoicemail && (
            <View style={styles.section}>
              <SectionHeader title="Voicemail" icon="mic-outline" />
              <VoicemailSection
                voicemailTranscript={call.voicemailTranscript}
                voicemailTranslation={call.voicemailTranslation}
                voicemailSummary={call.voicemailSummary}
                voicemailTtsUrl={call.voicemailTtsUrl}
                voicemailDetectedLang={call.voicemailDetectedLang}
                voicemailProcessedAt={call.voicemailProcessedAt}
                recordingUrl={call.recordingUrl}
              />
            </View>
          )}

          {/* Recording Section */}
          {!isVoicemail && hasRecording && (
            <View style={styles.section}>
              <SectionHeader title="Recording" icon="disc-outline" />
              <AudioPlayer
                url={call.recordingUrl!}
                title="Call Recording"
                duration={duration}
              />
            </View>
          )}

          {/* AI Summary */}
          {hasSummary && call.summary && (
            <View style={styles.section}>
              <SectionHeader title="AI Summary" icon="sparkles-outline" />
              <CallSummaryCard summary={call.summary} />
            </View>
          )}

          {/* Transcript */}
          {hasTranscript && (
            <View style={styles.section}>
              <SectionHeader title="Transcript" icon="chatbubbles-outline" />
              {call.transcriptMessages && call.transcriptMessages.length > 0 ? (
                <TranscriptTimeline
                  messages={call.transcriptMessages}
                  repLang={call.repLang}
                  customerLang={call.customerLang}
                  maxHeight={400}
                />
              ) : call.transcriptionText ? (
                <View style={styles.sectionCard}>
                  <Text style={styles.plainTranscript}>{call.transcriptionText}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Technical Details - Collapsed by default */}
          <View style={styles.section}>
            <SectionHeader title="Details" icon="information-circle-outline" />
            <View style={styles.sectionCard}>
              <DetailRow label="Call ID" value={call.callSid || call._id} mono />
              {call.agentNumber && (
                <DetailRow label="Agent" value={formatPhoneNumber(call.agentNumber)} />
              )}
              {call.number && (
                <DetailRow label="Tracked Number" value={formatPhoneNumber(call.number)} />
              )}
              {startTime && (
                <DetailRow label="Started" value={formatDateTime(startTime)} />
              )}
              {endTime && (
                <DetailRow label="Ended" value={formatDateTime(endTime)} />
              )}
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Detail row subcomponent
function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, mono && styles.detailValueMono]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.gray[50],
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: brand.gray[50],
  },
  loadingGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: brand.blue.lighter,
  },

  // Animated Header
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 10,
  },
  animatedHeaderBg: {
    flex: 1,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: brand.gray[100],
  },

  // Fixed Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: brand.gray[900],
    letterSpacing: -0.3,
  },
  headerSpacer: { width: 40 },
  moreButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: brand.blue.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  heroGradientLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: brand.blue.lighter,
    opacity: 0.8,
  },
  heroGradientLayer2: {
    position: 'absolute',
    top: 0,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: brand.blue.light,
    opacity: 0.4,
  },

  // Status Pills
  statusPillContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  directionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  directionIncoming: {},
  directionOutgoing: {},
  directionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Contact Info
  contactInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  voicemailIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  contactName: {
    fontSize: 24,
    fontWeight: '700',
    color: brand.gray[900],
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  contactPhone: {
    fontSize: 15,
    color: brand.gray[500],
  },

  // Duration
  durationContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: brand.gray[100],
  },
  durationValue: {
    fontSize: 32,
    fontWeight: '700',
    color: brand.blue.primary,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  durationLabel: {
    fontSize: 13,
    color: brand.gray[500],
    marginTop: 2,
  },

  // Actions Row
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionButtonPrimary: {},
  actionIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconWrapperPrimary: {
    backgroundColor: brand.blue.primary,
    shadowColor: brand.blue.dark,
    shadowOpacity: 0.3,
  },
  actionLabel: {
    fontSize: 12,
    color: brand.gray[600],
    fontWeight: '500',
  },
  actionLabelPrimary: {
    color: brand.blue.primary,
    fontWeight: '600',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: brand.gray[100],
  },
  metricTileAccent: {
    borderColor: brand.blue.light,
    backgroundColor: brand.blue.lighter,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
    color: brand.gray[900],
    marginTop: 8,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: brand.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: brand.blue.lighter,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.gray[900],
    letterSpacing: -0.3,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: brand.gray[100],
  },

  // Language Bridge
  languageBridge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageEnd: {
    alignItems: 'center',
    flex: 1,
  },
  languageEndRight: {},
  languageFlag: {
    fontSize: 32,
    marginBottom: 8,
  },
  languageNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: brand.gray[800],
    marginBottom: 2,
  },
  languageRole: {
    fontSize: 11,
    color: brand.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  languageConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  connectorLine: {
    width: 24,
    height: 2,
    backgroundColor: brand.blue.light,
    borderRadius: 1,
  },
  connectorIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: brand.blue.lighter,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: brand.gray[100],
  },
  detailLabel: {
    fontSize: 14,
    color: brand.gray[500],
  },
  detailValue: {
    fontSize: 14,
    color: brand.gray[800],
    fontWeight: '500',
    maxWidth: '55%',
    textAlign: 'right',
  },
  detailValueMono: {
    fontFamily: 'Menlo',
    fontSize: 12,
    color: brand.gray[600],
  },
  plainTranscript: {
    fontSize: 15,
    color: brand.gray[700],
    lineHeight: 24,
  },

  // Error state
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: brand.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: brand.gray[800],
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: brand.gray[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: brand.blue.primary,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  bottomSpacer: {
    height: 40,
  },
});
