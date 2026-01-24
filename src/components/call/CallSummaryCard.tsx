import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CallSummary } from '../../types/call.types';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
  },
};

interface CallSummaryCardProps {
  summary: CallSummary;
}

type SentimentType = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';

const sentimentConfig: Record<SentimentType, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  bg: string;
  border: string;
}> = {
  very_positive: {
    icon: 'happy',
    color: brand.green[600],
    label: 'Very Positive',
    bg: brand.green[50],
    border: brand.green[100],
  },
  positive: {
    icon: 'happy-outline',
    color: brand.green[500],
    label: 'Positive',
    bg: brand.green[50],
    border: brand.green[100],
  },
  neutral: {
    icon: 'remove-circle-outline',
    color: brand.gray[500],
    label: 'Neutral',
    bg: brand.gray[100],
    border: brand.gray[200],
  },
  negative: {
    icon: 'sad-outline',
    color: brand.amber[600],
    label: 'Negative',
    bg: brand.amber[50],
    border: brand.amber[100],
  },
  very_negative: {
    icon: 'sad',
    color: brand.red[500],
    label: 'Very Negative',
    bg: brand.red[50],
    border: brand.red[100],
  },
};

// Collapsible section component
function CollapsibleSection({
  title,
  icon,
  iconColor = brand.gray[500],
  children,
  defaultExpanded = true,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotateAnim = React.useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={sectionStyles.container}>
      <TouchableOpacity
        style={sectionStyles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={sectionStyles.headerLeft}>
          <View style={[sectionStyles.iconWrapper, { backgroundColor: `${iconColor}15` }]}>
            <Ionicons name={icon} size={14} color={iconColor} />
          </View>
          <Text style={sectionStyles.title}>{title}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="chevron-up" size={18} color={brand.gray[400]} />
        </Animated.View>
      </TouchableOpacity>
      {expanded && <View style={sectionStyles.content}>{children}</View>}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: brand.gray[700],
  },
  content: {
    paddingTop: 8,
    paddingLeft: 38,
  },
});

export function CallSummaryCard({ summary }: CallSummaryCardProps) {
  if (!summary || (!summary.summary && !summary.key_points?.length)) {
    return null;
  }

  const sentiment = summary.sentiment as SentimentType | undefined;
  const sentimentData = sentiment ? sentimentConfig[sentiment] : null;

  return (
    <View style={styles.container}>
      {/* Premium header with AI badge */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiIconWrapper}>
            <Ionicons name="sparkles" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Summary</Text>
            <Text style={styles.headerSubtitle}>Generated insights</Text>
          </View>
        </View>
        {sentimentData && (
          <View style={[
            styles.sentimentBadge,
            { backgroundColor: sentimentData.bg, borderColor: sentimentData.border }
          ]}>
            <Ionicons name={sentimentData.icon} size={14} color={sentimentData.color} />
            <Text style={[styles.sentimentText, { color: sentimentData.color }]}>
              {sentimentData.label}
            </Text>
          </View>
        )}
      </View>

      {/* Summary text - hero section */}
      {summary.summary && (
        <View style={styles.summarySection}>
          <Text style={styles.summaryText}>{summary.summary}</Text>
        </View>
      )}

      {/* Participants */}
      {summary.participants && (summary.participants.caller_description || summary.participants.callee_description) && (
        <CollapsibleSection
          title="Participants"
          icon="people"
          iconColor={brand.blue.primary}
        >
          <View style={styles.participantsGrid}>
            {summary.participants.caller_description && (
              <View style={styles.participantCard}>
                <View style={[styles.participantAvatar, { backgroundColor: brand.blue.lighter }]}>
                  <Ionicons name="call" size={14} color={brand.blue.primary} />
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantLabel}>Caller</Text>
                  <Text style={styles.participantDescription}>
                    {summary.participants.caller_description}
                  </Text>
                </View>
              </View>
            )}
            {summary.participants.callee_description && (
              <View style={styles.participantCard}>
                <View style={[styles.participantAvatar, { backgroundColor: brand.green[50] }]}>
                  <Ionicons name="person" size={14} color={brand.green[600]} />
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantLabel}>Recipient</Text>
                  <Text style={styles.participantDescription}>
                    {summary.participants.callee_description}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </CollapsibleSection>
      )}

      {/* Key Points */}
      {summary.key_points && summary.key_points.length > 0 && (
        <CollapsibleSection
          title={`Key Points (${summary.key_points.length})`}
          icon="list"
          iconColor={brand.blue.indigo}
        >
          <View style={styles.keyPointsList}>
            {summary.key_points.map((point, index) => (
              <View key={index} style={styles.keyPointItem}>
                <View style={styles.keyPointNumber}>
                  <Text style={styles.keyPointNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.keyPointText}>{point}</Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>
      )}

      {/* Decisions */}
      {summary.decisions && summary.decisions.length > 0 && (
        <CollapsibleSection
          title={`Decisions (${summary.decisions.length})`}
          icon="checkmark-done"
          iconColor={brand.green[600]}
        >
          <View style={styles.decisionsList}>
            {summary.decisions.map((decision, index) => (
              <View key={index} style={styles.decisionItem}>
                <View style={styles.decisionIcon}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
                <Text style={styles.decisionText}>{decision}</Text>
              </View>
            ))}
          </View>
        </CollapsibleSection>
      )}

      {/* Action Items */}
      {summary.action_items && summary.action_items.length > 0 && (
        <CollapsibleSection
          title={`Action Items (${summary.action_items.length})`}
          icon="flag"
          iconColor={brand.amber[600]}
        >
          <View style={styles.actionItemsList}>
            {summary.action_items.map((item, index) => (
              <View key={index} style={styles.actionItem}>
                <View style={styles.actionCheckbox}>
                  <View style={styles.actionCheckboxInner} />
                </View>
                <View style={styles.actionContent}>
                  <View style={styles.actionHeader}>
                    <Text style={styles.actionTask}>{item.task}</Text>
                    <View style={[
                      styles.actionOwnerBadge,
                      item.owner === 'user' ? styles.userOwnerBadge : styles.otherOwnerBadge,
                    ]}>
                      <Text style={[
                        styles.actionOwnerText,
                        item.owner === 'user' ? styles.userOwnerText : styles.otherOwnerText,
                      ]}>
                        {item.owner === 'user' ? 'You' : 'Other'}
                      </Text>
                    </View>
                  </View>
                  {item.due && (
                    <View style={styles.actionDue}>
                      <Ionicons name="time-outline" size={12} color={brand.gray[400]} />
                      <Text style={styles.actionDueText}>Due: {item.due}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </CollapsibleSection>
      )}

      {/* Languages footer */}
      {summary.languages_used && summary.languages_used.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.languageChips}>
            <Ionicons name="language" size={14} color={brand.gray[400]} />
            {summary.languages_used.map((lang, index) => (
              <View key={index} style={styles.languageChip}>
                <Text style={styles.languageChipText}>{lang}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.gray[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: brand.blue.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brand.blue.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: brand.gray[900],
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: brand.gray[400],
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Summary
  summarySection: {
    backgroundColor: brand.gray[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 15,
    color: brand.gray[700],
    lineHeight: 24,
    fontWeight: '400',
  },

  // Participants
  participantsGrid: {
    gap: 10,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: brand.gray[50],
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInfo: {
    flex: 1,
  },
  participantLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brand.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  participantDescription: {
    fontSize: 14,
    color: brand.gray[700],
    lineHeight: 20,
  },

  // Key Points
  keyPointsList: {
    gap: 10,
  },
  keyPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  keyPointNumber: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: brand.blue.lighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPointNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: brand.blue.primary,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    color: brand.gray[600],
    lineHeight: 20,
  },

  // Decisions
  decisionsList: {
    gap: 10,
  },
  decisionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  decisionIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: brand.green[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionText: {
    flex: 1,
    fontSize: 14,
    color: brand.gray[600],
    lineHeight: 20,
  },

  // Action Items
  actionItemsList: {
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: brand.gray[50],
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  actionCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: brand.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  actionCheckboxInner: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  actionContent: {
    flex: 1,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionTask: {
    flex: 1,
    fontSize: 14,
    color: brand.gray[700],
    lineHeight: 20,
  },
  actionOwnerBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  userOwnerBadge: {
    backgroundColor: brand.blue.lighter,
  },
  otherOwnerBadge: {
    backgroundColor: brand.gray[200],
  },
  actionOwnerText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  userOwnerText: {
    color: brand.blue.dark,
  },
  otherOwnerText: {
    color: brand.gray[600],
  },
  actionDue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  actionDueText: {
    fontSize: 12,
    color: brand.gray[400],
  },

  // Footer
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: brand.gray[100],
    marginTop: 4,
  },
  languageChips: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    backgroundColor: brand.gray[100],
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  languageChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: brand.gray[600],
  },
});
