import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Button, Card } from './ui';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { WEB_BASE_URL } from '../utils/constants';

interface IncomingCallsPaywallProps {
  /**
   * Called after the user returns from the in-app browser (regardless of
   * whether they actually completed a purchase). The caller should refetch
   * entitlement (e.g. via usePlanEntitlement().refetch()) so the gate lifts
   * automatically if the upgrade succeeded.
   */
  onReturn?: () => void;
  /** Optional override for the message body, e.g. to explain a 403 backstop. */
  message?: string;
}

/**
 * Shown in place of the incoming-call configuration form when the signed-in
 * user/org is not entitled to incoming calls (no Business plan or
 * incoming-calls add-on). Mirrors the web app's "Business plan required"
 * lock overlay in callRouting.jsx, but as a full-screen gate since the
 * mobile app doesn't have a way to partially disable the form.
 */
export function IncomingCallsPaywall({ onReturn, message }: IncomingCallsPaywallProps) {
  const [isOpeningBrowser, setIsOpeningBrowser] = useState(false);

  const handleUpgrade = async () => {
    setIsOpeningBrowser(true);
    try {
      await WebBrowser.openBrowserAsync(`${WEB_BASE_URL}/dashboard/plans`);
    } finally {
      setIsOpeningBrowser(false);
      onReturn?.();
    }
  };

  return (
    <View style={styles.container}>
      <Card variant="elevated" padding="lg" style={styles.card}>
        <View style={styles.iconWrapper}>
          <Ionicons name="lock-closed" size={28} color={colors.primary[600]} />
        </View>

        <Text style={styles.title}>Incoming Calls Aren&apos;t Included Yet</Text>
        <Text style={styles.description}>
          {message ??
            'Receiving translated calls on your numbers requires a Business plan or the incoming-calls add-on. Upgrade on the web to unlock incoming-call routing, IVR language menus, and voicemail.'}
        </Text>

        <View style={styles.featureList}>
          <FeatureRow text="Let callers pick their language with an IVR menu" />
          <FeatureRow text="Auto-connect callers who speak one language" />
          <FeatureRow text="Ring your phone or the TalkTool app" />
          <FeatureRow text="Voicemail with automatic translation" />
        </View>

        <Button
          title={isOpeningBrowser ? 'Opening...' : 'View Plans'}
          onPress={handleUpgrade}
          loading={isOpeningBrowser}
          fullWidth
          size="lg"
          leftIcon={<Ionicons name="sparkles" size={18} color="#fff" />}
        />

        <Text style={styles.hint}>
          You&apos;ll be taken to usetalktool.com to subscribe. Come back here afterward — this
          screen will update automatically.
        </Text>
      </Card>
    </View>
  );
}

function FeatureRow({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={18} color={colors.semantic.success[600]} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.gray[50],
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
  },
  featureList: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
  },
});
