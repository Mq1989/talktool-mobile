import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBalance } from '../src/hooks';
import { useMinutePurchase } from '../src/hooks/useMinutePurchase';
import {
  MINUTE_PRODUCT_IDS,
  MINUTE_PRODUCT_MINUTES,
} from '../src/services/iapService';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { spacing } from '../src/theme/spacing';

export default function BuyMinutesScreen() {
  const router = useRouter();
  const { formattedMinutes, isLoading: balanceLoading } = useBalance();
  const {
    connected,
    products,
    status,
    error,
    lastResult,
    buy,
    reset,
    isBusy,
  } = useMinutePurchase();

  const priceFor = (productId: string) =>
    products.find((p) => p.id === productId)?.displayPrice ?? '$19.99';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Minutes</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Current balance */}
        <View style={styles.balancePill}>
          <Ionicons name="time-outline" size={16} color={colors.primary[500]} />
          <Text style={styles.balanceText}>
            {balanceLoading ? '…' : `${formattedMinutes} minutes available`}
          </Text>
        </View>

        {/* Success banner */}
        {status === 'success' && lastResult && (
          <View style={[styles.banner, styles.bannerSuccess]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.bannerText}>
              {lastResult.credited
                ? `Added ${lastResult.minutesAdded} minutes — you now have ${lastResult.balance.minutes}.`
                : `You now have ${lastResult.balance.minutes} minutes.`}
            </Text>
          </View>
        )}

        {/* Error banner */}
        {status === 'error' && error && (
          <TouchableOpacity
            style={[styles.banner, styles.bannerError]}
            onPress={reset}
            activeOpacity={0.8}
          >
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.bannerText}>{error}</Text>
          </TouchableOpacity>
        )}

        {/* Product cards */}
        {MINUTE_PRODUCT_IDS.map((productId) => {
          const minutes = MINUTE_PRODUCT_MINUTES[productId] ?? 0;
          return (
            <View key={productId} style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productMinutes}>{minutes} minutes</Text>
                <Text style={styles.productSub}>
                  {(minutes / 60).toFixed(0)} hour{minutes === 60 ? '' : 's'} of translated calls
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.buyButton, (isBusy || !connected) && styles.buyButtonDisabled]}
                onPress={() => buy(productId)}
                disabled={isBusy || !connected}
                activeOpacity={0.85}
              >
                {isBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buyButtonText}>{priceFor(productId)}</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {status === 'verifying' && (
          <Text style={styles.statusText}>Adding your minutes…</Text>
        )}

        {!connected && (
          <Text style={styles.statusText}>
            Connecting to the App Store…
          </Text>
        )}

        <Text style={styles.fineprint}>
          Minutes are billed through Apple at $20/hour and never expire. They&apos;re
          added to your balance as soon as the purchase completes.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
  },
  content: {
    padding: spacing.lg,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    marginBottom: spacing.lg,
  },
  balanceText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  bannerSuccess: {
    backgroundColor: '#ECFDF5',
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
  },
  bannerText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray[800],
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  productInfo: {
    flex: 1,
  },
  productMinutes: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
  },
  productSub: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  buyButton: {
    minWidth: 96,
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonDisabled: {
    opacity: 0.5,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  fineprint: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 18,
  },
});
