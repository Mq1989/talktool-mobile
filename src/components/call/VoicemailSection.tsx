import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLanguageFlag, getLanguageName } from '../../utils/languages';
import { formatDateTime } from '../../utils/helpers';
import { AudioPlayer } from './AudioPlayer';

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
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
  },
};

interface VoicemailSectionProps {
  voicemailTranscript?: string;
  voicemailTranslation?: string;
  voicemailSummary?: string;
  voicemailTtsUrl?: string;
  voicemailDetectedLang?: string;
  voicemailProcessedAt?: Date | string;
  recordingUrl?: string;
}

type TabType = 'original' | 'translation' | 'summary';

export function VoicemailSection({
  voicemailTranscript,
  voicemailTranslation,
  voicemailSummary,
  voicemailTtsUrl,
  voicemailDetectedLang,
  voicemailProcessedAt,
  recordingUrl,
}: VoicemailSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('translation');

  if (!voicemailTranscript && !voicemailTranslation && !voicemailSummary) {
    return null;
  }

  const detectedFlag = getLanguageFlag(voicemailDetectedLang || 'EN_US');
  const detectedLangName = voicemailDetectedLang ? getLanguageName(voicemailDetectedLang) : 'Unknown';

  const tabs = [
    { key: 'translation' as TabType, label: 'Translation', icon: 'language-outline' as const, enabled: !!voicemailTranslation },
    { key: 'original' as TabType, label: 'Original', icon: 'text-outline' as const, enabled: !!voicemailTranscript },
    { key: 'summary' as TabType, label: 'Summary', icon: 'sparkles-outline' as const, enabled: !!voicemailSummary },
  ].filter(tab => tab.enabled);

  const processedDate = voicemailProcessedAt
    ? formatDateTime(typeof voicemailProcessedAt === 'string' ? voicemailProcessedAt : voicemailProcessedAt)
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="mic" size={18} color={brand.amber[600]} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Voicemail</Text>
            {processedDate && (
              <Text style={styles.headerSubtitle}>Processed {processedDate}</Text>
            )}
          </View>
        </View>
        {voicemailDetectedLang && (
          <View style={styles.detectedLang}>
            <Text style={styles.flagEmoji}>{detectedFlag}</Text>
            <Text style={styles.detectedLangText}>{detectedLangName}</Text>
          </View>
        )}
      </View>

      {/* Audio Player */}
      {(recordingUrl || voicemailTtsUrl) && (
        <View style={styles.audioSection}>
          <AudioPlayer
            url={voicemailTtsUrl || recordingUrl || ''}
            title={voicemailTtsUrl ? 'Translated Audio' : 'Original Recording'}
            variant="voicemail"
          />
        </View>
      )}

      {/* Tab navigation */}
      {tabs.length > 1 && (
        <View style={styles.tabs}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={activeTab === tab.key ? brand.amber[700] : brand.gray[400]}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tab content */}
      <View style={styles.contentSection}>
        {activeTab === 'translation' && voicemailTranslation && (
          <View style={styles.textContent}>
            <View style={styles.textHeader}>
              <View style={styles.labelIcon}>
                <Ionicons name="language" size={12} color={brand.blue.primary} />
              </View>
              <Text style={styles.textLabel}>English Translation</Text>
            </View>
            <Text style={styles.textBody}>{voicemailTranslation}</Text>
          </View>
        )}

        {activeTab === 'original' && voicemailTranscript && (
          <View style={styles.textContent}>
            <View style={styles.textHeader}>
              <Text style={styles.flagEmoji}>{detectedFlag}</Text>
              <Text style={styles.textLabel}>
                Original ({detectedLangName || 'Detected Language'})
              </Text>
            </View>
            <Text style={[styles.textBody, styles.originalText]}>
              {voicemailTranscript}
            </Text>
          </View>
        )}

        {activeTab === 'summary' && voicemailSummary && (
          <View style={styles.textContent}>
            <View style={styles.textHeader}>
              <View style={[styles.labelIcon, { backgroundColor: brand.amber[100] }]}>
                <Ionicons name="sparkles" size={12} color={brand.amber[600]} />
              </View>
              <Text style={styles.textLabel}>AI Summary</Text>
            </View>
            <Text style={styles.textBody}>{voicemailSummary}</Text>
          </View>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} activeOpacity={0.8}>
          <Ionicons name="call" size={16} color="#fff" />
          <Text style={styles.actionBtnPrimaryText}>Call Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Ionicons name="copy-outline" size={16} color={brand.gray[600]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={16} color={brand.gray[600]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: brand.amber[200],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: brand.amber[50],
    borderBottomWidth: 1,
    borderBottomColor: brand.amber[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brand.amber[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brand.amber[800],
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: brand.amber[600],
  },
  detectedLang: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: brand.amber[200],
  },
  flagEmoji: {
    fontSize: 14,
  },
  detectedLangText: {
    fontSize: 12,
    color: brand.amber[700],
    fontWeight: '500',
  },

  // Audio
  audioSection: {
    padding: 16,
    backgroundColor: brand.amber[50],
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 4,
    backgroundColor: brand.gray[50],
    paddingVertical: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: brand.amber[100],
  },
  tabText: {
    fontSize: 13,
    color: brand.gray[500],
    fontWeight: '500',
  },
  tabTextActive: {
    color: brand.amber[700],
    fontWeight: '600',
  },

  // Content
  contentSection: {
    padding: 16,
  },
  textContent: {
    backgroundColor: brand.gray[50],
    borderRadius: 14,
    padding: 16,
  },
  textHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: brand.gray[100],
  },
  labelIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: brand.blue.lighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brand.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textBody: {
    fontSize: 15,
    color: brand.gray[700],
    lineHeight: 24,
  },
  originalText: {
    fontStyle: 'italic',
    color: brand.gray[600],
  },

  // Actions
  actions: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 10,
  },
  actionBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: brand.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: brand.amber[500],
    shadowColor: brand.amber[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
