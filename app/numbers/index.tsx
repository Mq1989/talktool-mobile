import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiEndpoints } from '../../src/services/api';
import { LoadingSpinner } from '../../src/components/ui';
import { NumberConfig, NumberConfigsListResponse } from '../../src/types/call.types';
import { formatPhoneNumber } from '../../src/utils/helpers';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

// The canonical NumberConfig type (src/types/call.types.ts) doesn't declare
// `isShared`, even though the API returns it and settings.tsx already reads
// it via its own local interface. Extend locally rather than editing the
// shared type (out of scope for this task).
type NumberConfigWithSharing = NumberConfig & { isShared?: boolean };

const PLAN_LABELS: Record<string, string> = {
  'no-incoming-calls-allowed': 'Outbound only',
  'all-callers-select-language': 'IVR menu',
  'only-select-callers-select-language': 'Allowlist',
  'incoming-calls-forwarded-to-main': 'Auto-forward',
  'voicemail-only': 'Voicemail only',
};

function getPlanLabel(config: NumberConfigWithSharing): string {
  const planType = config.incomingPlan?.planType;
  if (typeof planType === 'string' && PLAN_LABELS[planType]) {
    return PLAN_LABELS[planType];
  }
  return 'Not configured';
}

function NumberRow({ config, onPress }: { config: NumberConfigWithSharing; onPress: () => void }) {
  const isConfigured = !!config.incomingPlan?.planType;
  const isActive = config.status === 'active';

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIconWrapper}>
        <Ionicons name="call" size={20} color={colors.primary[600]} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowNumber}>{formatPhoneNumber(config.number)}</Text>
        {!!config.name && <Text style={styles.rowName}>{config.name}</Text>}
        <View style={styles.rowMetaRow}>
          <View
            style={[
              styles.planBadge,
              isConfigured ? styles.planBadgeConfigured : styles.planBadgeUnconfigured,
            ]}
          >
            <Text
              style={[
                styles.planBadgeText,
                isConfigured ? styles.planBadgeTextConfigured : styles.planBadgeTextUnconfigured,
              ]}
            >
              {getPlanLabel(config)}
            </Text>
          </View>
          {isConfigured && (
            <View style={styles.statusDotRow}>
              <View
                style={[
                  styles.statusDot,
                  isActive ? styles.statusDotActive : styles.statusDotInactive,
                ]}
              />
              <Text style={styles.statusDotLabel}>{isActive ? 'Active' : 'Inactive'}</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gray[300]} />
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrapper}>
        <Ionicons name="call-outline" size={28} color={colors.gray[400]} />
      </View>
      <Text style={styles.emptyTitle}>No Phone Numbers</Text>
      <Text style={styles.emptyMessage}>
        You don&apos;t have any phone numbers yet. Add one from the web dashboard to configure
        incoming-call routing.
      </Text>
    </View>
  );
}

export default function NumbersListScreen() {
  const router = useRouter();

  const {
    data: numbers,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useQuery<NumberConfigWithSharing[]>({
    queryKey: ['numberConfigs'],
    queryFn: async () => {
      const response = await apiEndpoints.getNumberConfigs();
      const raw = response.data as NumberConfigsListResponse | NumberConfigWithSharing[] | undefined;
      if (Array.isArray(raw)) return raw;
      return raw?.numbers ?? [];
    },
  });

  // Dedicated numbers only — shared numbers can't be configured for incoming
  // calls (mirrors the isShared filtering already used in settings.tsx).
  const dedicatedNumbers = (numbers ?? []).filter((n) => n.isShared !== true);

  const handleOpenNumber = useCallback(
    (id: string) => {
      router.push(`/numbers/${id}`);
    },
    [router]
  );

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading your numbers..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {isError ? (
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.error} />
          <Text style={styles.errorTitle}>Couldn&apos;t load your numbers</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={dedicatedNumbers}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <NumberRow config={item} onPress={() => handleOpenNumber(item._id)} />
          )}
          contentContainerStyle={
            dedicatedNumbers.length === 0 ? styles.emptyListContent : styles.listContent
          }
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary[500]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[100],
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  rowIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowInfo: {
    flex: 1,
  },
  rowNumber: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
    letterSpacing: 0.2,
  },
  rowName: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  rowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  planBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  planBadgeConfigured: {
    backgroundColor: colors.primary[50],
  },
  planBadgeUnconfigured: {
    backgroundColor: colors.gray[100],
  },
  planBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  planBadgeTextConfigured: {
    color: colors.primary[700],
  },
  planBadgeTextUnconfigured: {
    color: colors.gray[500],
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotActive: {
    backgroundColor: colors.semantic.success[500],
  },
  statusDotInactive: {
    backgroundColor: colors.gray[300],
  },
  statusDotLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[800],
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  errorTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[700],
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
  },
});
