import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser, useOrganization } from '@clerk/clerk-expo';
import { useAuth, useBalance } from '../../src/hooks';
import { useVoice } from '../../src/contexts/VoiceContext';
import { useSettingsStore } from '../../src/store/settingsStore';
import { availabilityService } from '../../src/services/availabilityService';
import { apiEndpoints } from '../../src/services/api';
import { WEB_BASE_URL, QUERY_KEYS } from '../../src/utils/constants';
import { getLanguageName, LanguageCode } from '../../src/utils/languages';

// TalkTool brand colors - refined palette (matching dashboard)
const colors = {
  // Primary blues
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  // Neutrals
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  // Accents
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
  },
  violet: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    500: '#8B5CF6',
    600: '#7C3AED',
  },
  pink: {
    50: '#FDF2F8',
    500: '#EC4899',
  },
  indigo: {
    50: '#EEF2FF',
    500: '#6366F1',
  },
  white: '#FFFFFF',
};

interface NumberConfig {
  phoneNumber: string;
  friendlyName?: string;
  isShared?: boolean;
}

// Setting Row Component
function SettingRow({
  icon,
  iconColor = colors.slate[600],
  iconBg = colors.slate[100],
  label,
  value,
  onPress,
  rightElement,
  showArrow = true,
  isFirst = false,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.settingRow,
        isFirst && styles.settingRowFirst,
        isLast && styles.settingRowLast,
      ]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIconWrapper, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {rightElement}
        {showArrow && onPress && (
          <Ionicons name="chevron-forward" size={18} color={colors.slate[300]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// Section Header
function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

// Settings Card
function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.settingsCard}>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const { organization } = useOrganization();
  const { user, logout, isLoading: isLoggingOut } = useAuth();
  const { isRegistered } = useVoice();
  const {
    defaultLanguage,
    defaultSpeakerMode,
    enableHaptics,
    theme,
    setDefaultSpeakerMode,
    setEnableHaptics,
    setTheme,
  } = useSettingsStore();

  // Get balance data
  const { minutes, formattedMinutes, isOrgBalance, isLoading: isBalanceLoading } = useBalance();

  // Availability state
  const [isAvailable, setIsAvailable] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([]);

  // Fetch user's phone numbers
  const { data: numberConfigs } = useQuery<NumberConfig[]>({
    queryKey: ['numberConfigs'],
    queryFn: async () => {
      const response = await apiEndpoints.getNumberConfigs();
      return response.data?.numbers ?? response.data ?? [];
    },
  });

  // Filter to only dedicated numbers (isShared === false means dedicated)
  // Numbers without isShared field are treated as shared (cannot receive calls)
  const dedicatedNumbers = numberConfigs?.filter(n => n.isShared === false) ?? [];
  const canUseAvailability = !!organization?.id && dedicatedNumbers.length > 0;

  // Initialize availability service with Clerk credentials
  useEffect(() => {
    const userId = clerkUser?.id;
    const orgId = organization?.id;

    if (userId) {
      availabilityService.init(userId, orgId);
    }

    return () => {
      availabilityService.cleanup();
    };
  }, [clerkUser?.id, organization?.id]);

  const handleAvailabilityToggle = async (value: boolean) => {
    if (value && dedicatedNumbers.length > 0) {
      const numbers = dedicatedNumbers.map(n => n.phoneNumber);
      await availabilityService.setAvailable(numbers);
      setAvailableNumbers(numbers);
    } else {
      await availabilityService.setUnavailable();
      setAvailableNumbers([]);
    }
    setIsAvailable(value);
  };

  const handleManageSubscription = async () => {
    // Open dashboard directly - web app will handle auth
    // If already signed in on web, goes straight to plans
    // If not signed in, web app redirects to login then back to plans
    await Linking.openURL(`${WEB_BASE_URL}/dashboard/plans`);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await availabilityService.setUnavailable();
            logout();
          },
        },
      ]
    );
  };

  // Get initials for avatar
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.profileAvatarWrapper}>
            <LinearGradient
              colors={[colors.blue[500], colors.blue[600]]}
              style={styles.profileAvatar}
            >
              <Text style={styles.profileAvatarText}>{initials}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
          </View>
          <TouchableOpacity style={styles.editProfileButton}>
            <Ionicons name="pencil" size={16} color={colors.blue[500]} />
          </TouchableOpacity>
        </View>

        {/* Availability Section */}
        <SectionHeader title="AVAILABILITY" />
        <SettingsCard>
          <SettingRow
            icon="radio"
            iconColor={isAvailable ? colors.emerald[600] : colors.slate[500]}
            iconBg={isAvailable ? colors.emerald[50] : colors.slate[100]}
            label="Available for Calls"
            rightElement={
              <Switch
                value={isAvailable}
                onValueChange={handleAvailabilityToggle}
                trackColor={{ false: colors.slate[200], true: colors.emerald[500] }}
                thumbColor={colors.white}
                disabled={!canUseAvailability}
              />
            }
            showArrow={false}
            isFirst
            isLast={!isRegistered && canUseAvailability}
          />
          {!canUseAvailability && (
            <View style={styles.disabledExplanation}>
              <Ionicons name="information-circle-outline" size={16} color={colors.slate[400]} />
              <Text style={styles.disabledText}>
                Availability requires a dedicated phone number
              </Text>
            </View>
          )}
          {isRegistered && (
            <View style={styles.statusIndicator}>
              <View style={[
                styles.statusDot,
                isRegistered && styles.statusDotOnline,
              ]} />
              <Text style={styles.statusText}>
                Registered for incoming calls
              </Text>
            </View>
          )}
        </SettingsCard>

        {/* Preferences Section */}
        <SectionHeader title="PREFERENCES" />
        <SettingsCard>
          <SettingRow
            icon="language"
            iconColor={colors.blue[500]}
            iconBg={colors.blue[50]}
            label="Default Language"
            value={getLanguageName(defaultLanguage)}
            onPress={() => {}}
            isFirst
          />
          <SettingRow
            icon="volume-high"
            iconColor={colors.violet[500]}
            iconBg={colors.violet[50]}
            label="Speaker Mode"
            rightElement={
              <Switch
                value={defaultSpeakerMode}
                onValueChange={setDefaultSpeakerMode}
                trackColor={{ false: colors.slate[200], true: colors.blue[500] }}
                thumbColor={colors.white}
              />
            }
            showArrow={false}
          />
          <SettingRow
            icon="hand-left"
            iconColor={colors.pink[500]}
            iconBg={colors.pink[50]}
            label="Haptic Feedback"
            rightElement={
              <Switch
                value={enableHaptics}
                onValueChange={setEnableHaptics}
                trackColor={{ false: colors.slate[200], true: colors.blue[500] }}
                thumbColor={colors.white}
              />
            }
            showArrow={false}
            isLast
          />
        </SettingsCard>

        {/* Appearance Section */}
        <SectionHeader title="APPEARANCE" />
        <SettingsCard>
          <SettingRow
            icon="moon"
            iconColor={colors.indigo[500]}
            iconBg={colors.indigo[50]}
            label="Theme"
            value={theme.charAt(0).toUpperCase() + theme.slice(1)}
            onPress={() => {
              Alert.alert(
                'Select Theme',
                '',
                [
                  { text: 'Light', onPress: () => setTheme('light') },
                  { text: 'Dark', onPress: () => setTheme('dark') },
                  { text: 'System', onPress: () => setTheme('system') },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
            isFirst
            isLast
          />
        </SettingsCard>

        {/* Balance & Subscription Section */}
        <SectionHeader title="BALANCE & SUBSCRIPTION" />

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={[colors.emerald[500], colors.emerald[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceGradient}
          >
            <View style={styles.balanceContent}>
              <View style={styles.balanceLeft}>
                <View style={styles.balanceIconWrapper}>
                  <Ionicons name="wallet-outline" size={20} color={colors.white} />
                </View>
                <View>
                  <Text style={styles.balanceLabel}>
                    {isOrgBalance ? 'Organization Balance' : 'Your Balance'}
                  </Text>
                  <Text style={styles.balanceSubLabel}>
                    {isOrgBalance ? 'Shared with your team' : 'Personal minutes'}
                  </Text>
                </View>
              </View>
              <View style={styles.balanceRight}>
                <Text style={styles.balanceValue}>
                  {isBalanceLoading ? '...' : formattedMinutes}
                </Text>
                <Text style={styles.balanceUnit}>minutes</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <SettingsCard>
          <SettingRow
            icon="diamond"
            iconColor={colors.amber[500]}
            iconBg={colors.amber[50]}
            label="Current Plan"
            value="Professional"
            onPress={() => {}}
            isFirst
          />
          <SettingRow
            icon="card"
            iconColor={colors.emerald[600]}
            iconBg={colors.emerald[50]}
            label="Manage Subscription"
            onPress={handleManageSubscription}
            isLast
          />
        </SettingsCard>

        {/* Security Section */}
        <SectionHeader title="SECURITY" />
        <SettingsCard>
          <SettingRow
            icon="key"
            iconColor={colors.rose[500]}
            iconBg={colors.rose[50]}
            label="Change Password"
            onPress={() => {}}
            isFirst
          />
          <SettingRow
            icon="shield-checkmark"
            iconColor={colors.emerald[600]}
            iconBg={colors.emerald[50]}
            label="Two-Factor Authentication"
            onPress={() => {}}
            isLast
          />
        </SettingsCard>

        {/* Support Section */}
        <SectionHeader title="SUPPORT" />
        <SettingsCard>
          <SettingRow
            icon="help-circle"
            iconColor={colors.blue[500]}
            iconBg={colors.blue[50]}
            label="Help Center"
            onPress={() => Linking.openURL('https://usetalktool.com/help')}
            isFirst
          />
          <SettingRow
            icon="chatbubble-ellipses"
            iconColor={colors.violet[500]}
            iconBg={colors.violet[50]}
            label="Contact Support"
            onPress={() => Linking.openURL('mailto:support@usetalktool.com')}
          />
          <SettingRow
            icon="paper-plane"
            iconColor={colors.pink[500]}
            iconBg={colors.pink[50]}
            label="Send Feedback"
            onPress={() => {}}
            isLast
          />
        </SettingsCard>

        {/* Legal Section */}
        <SectionHeader title="LEGAL" />
        <SettingsCard>
          <SettingRow
            icon="document-text"
            iconColor={colors.slate[600]}
            iconBg={colors.slate[100]}
            label="Terms of Service"
            onPress={() => Linking.openURL('https://usetalktool.com/terms')}
            isFirst
          />
          <SettingRow
            icon="lock-closed"
            iconColor={colors.slate[600]}
            iconBg={colors.slate[100]}
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://usetalktool.com/privacy')}
            isLast
          />
        </SettingsCard>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.rose[600]} />
          <Text style={styles.signOutText}>
            {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
          </Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>TalkTool v1.0.0</Text>

        {/* Bottom spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },

  // Header
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.slate[900],
    letterSpacing: -0.5,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 8,
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatarWrapper: {
    shadowColor: colors.blue[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileAvatarText: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[800],
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.slate[400],
  },
  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.blue[50],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section Header
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[400],
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Settings Card
  settingsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  settingRowFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  settingRowLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  settingIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.slate[800],
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    fontSize: 14,
    color: colors.slate[400],
  },

  // Status Indicator
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.slate[50],
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.slate[300],
  },
  statusDotOnline: {
    backgroundColor: colors.emerald[500],
  },
  statusText: {
    fontSize: 13,
    color: colors.slate[500],
  },

  // Disabled Explanation
  disabledExplanation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.slate[50],
    gap: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  disabledText: {
    fontSize: 13,
    color: colors.slate[400],
    flex: 1,
  },

  // Sign Out Button
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.rose[50],
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 32,
    gap: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.rose[600],
  },

  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.slate[400],
    marginTop: 20,
  },

  // Balance Card
  balanceCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: colors.emerald[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  balanceGradient: {
    padding: 16,
  },
  balanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  balanceSubLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  balanceRight: {
    alignItems: 'flex-end',
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  balanceUnit: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
});
