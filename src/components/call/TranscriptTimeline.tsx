import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLanguageFlag, getLanguageName } from '../../utils/languages';
import type { TranscriptMessage } from '../../types/call.types';

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
  },
};

interface TranscriptTimelineProps {
  messages: TranscriptMessage[];
  repLang?: string;
  customerLang?: string;
  maxHeight?: number;
}

function formatTime(timeStamp?: number | string): string {
  if (!timeStamp) return '';

  if (typeof timeStamp === 'number') {
    const date = new Date(timeStamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (typeof timeStamp === 'string') {
    try {
      const date = new Date(timeStamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeStamp;
    }
  }

  return '';
}

function MessageBubble({
  message,
  repLang,
  customerLang,
  isFirst,
  isLast,
}: {
  message: TranscriptMessage;
  repLang?: string;
  customerLang?: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const isRep = message.from === 'rep' || message.from === 'user' || message.from === 'agent';
  const isUserSide = isRep;

  const sourceLang = isUserSide ? repLang : customerLang;
  const targetLang = isUserSide ? customerLang : repLang;
  const sourceFlag = getLanguageFlag(sourceLang || 'EN_US');
  const targetFlag = getLanguageFlag(targetLang || 'EN_US');

  const originalText = message.original || message.text || '';
  const translatedText = message.translation || '';
  const hasTranslation = !!translatedText && translatedText !== originalText;

  return (
    <View style={[
      styles.messageRow,
      isUserSide ? styles.messageRowRight : styles.messageRowLeft,
    ]}>
      {/* Avatar / Timeline indicator */}
      <View style={styles.avatarColumn}>
        <View style={[
          styles.avatar,
          isUserSide ? styles.avatarUser : styles.avatarCaller,
        ]}>
          <Ionicons
            name={isUserSide ? 'person' : 'call'}
            size={12}
            color={isUserSide ? brand.blue.primary : brand.green[600]}
          />
        </View>
        {!isLast && <View style={styles.timelineConnector} />}
      </View>

      {/* Message content */}
      <View style={styles.messageContent}>
        {/* Header with speaker and time */}
        <View style={styles.messageHeader}>
          <Text style={[
            styles.speakerName,
            isUserSide && styles.speakerNameUser,
          ]}>
            {isUserSide ? 'You' : 'Caller'}
          </Text>
          {message.timeStamp && (
            <Text style={styles.messageTime}>
              {formatTime(message.timeStamp)}
            </Text>
          )}
        </View>

        {/* Bubble */}
        <View style={[
          styles.bubble,
          isUserSide ? styles.bubbleUser : styles.bubbleCaller,
        ]}>
          {/* Original text */}
          <View style={styles.textBlock}>
            <View style={styles.languageIndicator}>
              <Text style={styles.flag}>{sourceFlag}</Text>
              <Text style={styles.languageLabel}>Original</Text>
            </View>
            <Text style={[
              styles.messageText,
              isUserSide && styles.messageTextUser,
            ]}>
              {originalText}
            </Text>
          </View>

          {/* Translation */}
          {hasTranslation && (
            <View style={styles.translationBlock}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <View style={styles.translationArrow}>
                  <Ionicons name="arrow-down" size={10} color={brand.gray[400]} />
                </View>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.textBlock}>
                <View style={styles.languageIndicator}>
                  <Text style={styles.flag}>{targetFlag}</Text>
                  <Text style={styles.languageLabel}>Translated</Text>
                </View>
                <Text style={styles.translatedText}>
                  {translatedText}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export function TranscriptTimeline({
  messages,
  repLang,
  customerLang,
  maxHeight,
}: TranscriptTimelineProps) {
  if (!messages || messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrapper}>
          <Ionicons name="chatbubbles-outline" size={28} color={brand.gray[400]} />
        </View>
        <Text style={styles.emptyTitle}>No Transcript</Text>
        <Text style={styles.emptyText}>
          The conversation transcript will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="chatbubbles" size={16} color={brand.blue.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Transcript</Text>
            <Text style={styles.headerSubtitle}>{messages.length} messages</Text>
          </View>
        </View>

        {/* Language pills */}
        {(repLang || customerLang) && (
          <View style={styles.languagePills}>
            {repLang && (
              <View style={[styles.langPill, styles.langPillUser]}>
                <Text style={styles.langPillFlag}>
                  {getLanguageFlag(repLang)}
                </Text>
                <Text style={styles.langPillText}>
                  {getLanguageName(repLang).split(' ')[0]}
                </Text>
              </View>
            )}
            {repLang && customerLang && (
              <Ionicons name="swap-horizontal" size={14} color={brand.gray[300]} />
            )}
            {customerLang && (
              <View style={[styles.langPill, styles.langPillCaller]}>
                <Text style={styles.langPillFlag}>
                  {getLanguageFlag(customerLang)}
                </Text>
                <Text style={styles.langPillText}>
                  {getLanguageName(customerLang).split(' ')[0]}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        style={[styles.messagesScroll, maxHeight ? { maxHeight } : undefined]}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            message={message}
            repLang={repLang}
            customerLang={customerLang}
            isFirst={index === 0}
            isLast={index === messages.length - 1}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: brand.gray[100],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.gray[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: brand.blue.lighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: brand.gray[800],
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: brand.gray[400],
  },

  // Language pills
  languagePills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  langPillUser: {
    backgroundColor: brand.blue.lighter,
  },
  langPillCaller: {
    backgroundColor: brand.green[50],
  },
  langPillFlag: {
    fontSize: 12,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: brand.gray[600],
  },

  // Messages
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },

  // Message row
  messageRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-start',
  },

  // Avatar column
  avatarColumn: {
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUser: {
    backgroundColor: brand.blue.lighter,
  },
  avatarCaller: {
    backgroundColor: brand.green[50],
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: brand.gray[100],
    marginTop: 8,
    borderRadius: 1,
  },

  // Message content
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  speakerName: {
    fontSize: 13,
    fontWeight: '600',
    color: brand.green[600],
  },
  speakerNameUser: {
    color: brand.blue.primary,
  },
  messageTime: {
    fontSize: 11,
    color: brand.gray[400],
  },

  // Bubble
  bubble: {
    borderRadius: 16,
    padding: 14,
  },
  bubbleUser: {
    backgroundColor: brand.blue.lighter,
    borderTopLeftRadius: 4,
  },
  bubbleCaller: {
    backgroundColor: brand.gray[50],
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: brand.gray[100],
  },

  // Text blocks
  textBlock: {
    gap: 6,
  },
  languageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flag: {
    fontSize: 13,
  },
  languageLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: brand.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  messageText: {
    fontSize: 14,
    color: brand.gray[700],
    lineHeight: 21,
  },
  messageTextUser: {
    color: brand.gray[800],
  },

  // Translation
  translationBlock: {
    marginTop: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: brand.gray[200],
  },
  translationArrow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: brand.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  translatedText: {
    fontSize: 14,
    color: brand.gray[500],
    lineHeight: 21,
    fontStyle: 'italic',
  },

  // Empty state
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: brand.gray[100],
  },
  emptyIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: brand.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: brand.gray[700],
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: brand.gray[400],
    textAlign: 'center',
  },
});
