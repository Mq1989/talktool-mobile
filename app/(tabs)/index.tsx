import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LoadingSpinner } from '../../src/components/ui';
import { CallCard } from '../../src/components/call/CallCard';
import { useAuth, useBalance } from '../../src/hooks';
import { callsService } from '../../src/services/calls.service';
import { QUERY_KEYS } from '../../src/utils/constants';

// TalkTool brand colors - refined palette
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
    400: '#FB7185',
    500: '#F43F5E',
  },
  violet: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    500: '#8B5CF6',
    600: '#7C3AED',
  },
  white: '#FFFFFF',
};



export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Fetch recent calls (last 3) from calls API
  const {
    data: recentCallsData,
    isLoading: isRecentCallsLoading,
    refetch: refetchRecentCalls,
    isRefetching: isRecentCallsRefetching,
  } = useQuery({
    queryKey: [QUERY_KEYS.CALLS, 'recent'],
    queryFn: async () => {
      const result = await callsService.getCallHistory({ page: 1, limit: 3 });
      return result.data;
    },
  });

  // Use the shared balance hook
  const {
    balance: balanceData,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
    isRefetching: isBalanceRefetching,
    formattedMinutes,
  } = useBalance();

  const isLoading = isRecentCallsLoading || isBalanceLoading;
  const isRefetching = isBalanceRefetching || isRecentCallsRefetching;

  const handleRefresh = () => {
    refetchBalance();
    refetchRecentCalls();
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.blue[500]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.userName}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.blue[500], colors.blue[600]]}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarInitials}>
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Hero CTA Card */}
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => router.push('/call/new')}
          activeOpacity={0.95}
        >
          <LinearGradient
            colors={[colors.blue[500], colors.blue[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Background decoration */}
            <View style={styles.heroDecoration} />
            <View style={styles.heroDecorationSmall} />

            <View style={styles.heroContent}>
         
              <View style={styles.heroText}>
                <Text style={styles.heroTitle}>Start a Translated Call</Text>
                <Text style={styles.heroSubtitle}>40+ languages · Real-time AI</Text>
              </View>
              <View style={styles.heroArrow}>
                <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.9)" />
              </View>
            </View>

            {/* Feature pills */}
            <View style={styles.heroPills}>
              <View style={styles.heroPill}>
                <Ionicons name="flash" size={10} color={colors.white} />
                <Text style={styles.heroPillText}>Sub-2s latency</Text>
              </View>
              <View style={styles.heroPill}>
                <Ionicons name="shield-checkmark" size={10} color={colors.white} />
                <Text style={styles.heroPillText}>HD audio</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Minimal Balance Display */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceLeft}>
              <View style={[
                styles.balanceIconSmall,
                balanceData?.balanceType === 'org' && styles.balanceIconOrg
              ]}>
                <Ionicons
                  name={balanceData?.balanceType === 'org' ? 'people' : 'time'}
                  size={16}
                  color={balanceData?.balanceType === 'org' ? colors.violet[500] : colors.emerald[500]}
                />
              </View>
              <View>
                <Text style={styles.balanceAmount}>
                  {isBalanceLoading ? '...' : formattedMinutes}
                </Text>
                <Text style={styles.balanceLabel}>
                  minutes available
                  {balanceData?.balanceType === 'org' && ' · Team'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addMinutesBtn}
              onPress={() => router.push('/buy-minutes')}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={colors.blue[500]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Calls Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <View style={styles.sectionIcon}>
              <Ionicons name="time-outline" size={14} color={colors.slate[500]} />
            </View>
            <Text style={styles.sectionTitle}>Recent Calls</Text>
          </View>
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => router.push('/(tabs)/calls')}
          >
            <Text style={styles.seeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.blue[500]} />
          </TouchableOpacity>
        </View>

        {recentCallsData && recentCallsData.length > 0 ? (
          <View style={styles.callsCard}>
            {recentCallsData.slice(0, 3).map((call, index) => (
              <React.Fragment key={call._id || call.id || call.callSid}>
                <CallCard
                  call={call}
                  variant="compact"
                  showActions={false}
                  onPress={() => router.push(`/call/history/${call._id || call.callSid}`)}
                />
                {index < Math.min(recentCallsData.length - 1, 2) && (
                  <View style={styles.callDivider} />
                )}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="call-outline" size={32} color={colors.slate[300]} />
            </View>
            <Text style={styles.emptyTitle}>No calls yet</Text>
            <Text style={styles.emptySubtitle}>
              Start your first translated call to see it here
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/call/new')}
            >
              <Text style={styles.emptyButtonText}>Make a Call</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/contacts')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.emerald[50] }]}>
              <Ionicons name="people-outline" size={20} color={colors.emerald[500]} />
            </View>
            <Text style={styles.quickActionLabel}>Contacts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/calls')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.violet[50] }]}>
              <Ionicons name="list-outline" size={20} color={colors.violet[500]} />
            </View>
            <Text style={styles.quickActionLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.slate[100] }]}>
              <Ionicons name="settings-outline" size={20} color={colors.slate[500]} />
            </View>
            <Text style={styles.quickActionLabel}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: colors.white,
  },
  greeting: {
    fontSize: 14,
    color: colors.slate[400],
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.slate[900],
    letterSpacing: -0.5,
  },
  avatarButton: {
    shadowColor: colors.blue[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },

  // Hero Card
  heroCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.blue[900],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  heroGradient: {
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecoration: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroDecorationSmall: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
  heroArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPills: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.white,
  },

  // Balance Card - Minimal
  balanceCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.emerald[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceIconOrg: {
    backgroundColor: colors.violet[50],
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.slate[900],
    letterSpacing: -0.5,
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.slate[400],
    marginTop: 1,
  },
  addMinutesBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.blue[50],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[800],
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.blue[500],
  },

  // Calls Card
  callsCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  callDivider: {
    height: 1,
    backgroundColor: colors.slate[100],
    marginHorizontal: 16,
  },

  // Empty State
  emptyCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.slate[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.slate[800],
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.slate[400],
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.blue[500],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.slate[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[600],
  },
});
