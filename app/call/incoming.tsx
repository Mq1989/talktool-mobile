import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVoice } from '../../src/contexts/VoiceContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { getLanguageFlag, getLanguageName } from '../../src/utils/languages';

export default function IncomingCallScreen() {
  const router = useRouter();
  const {
    incomingCallInvite,
    callState,
    callSid,
    acceptIncomingCall,
    rejectIncomingCall,
  } = useVoice();

  // Vibrate when incoming call
  useEffect(() => {
    if (incomingCallInvite) {
      // Vibrate pattern: vibrate 500ms, pause 500ms, repeat
      const pattern = [0, 500, 500, 500, 500, 500];
      Vibration.vibrate(pattern, true);
    }

    return () => {
      Vibration.cancel();
    };
  }, [incomingCallInvite]);

  // Navigate to active call screen when call is accepted
  useEffect(() => {
    if (callState === 'active' && callSid) {
      Vibration.cancel();
      router.replace(`/call/${callSid}`);
    }
  }, [callState, callSid, router]);

  // If no incoming call, redirect back
  useEffect(() => {
    if (!incomingCallInvite && callState === 'idle') {
      router.replace('/(tabs)');
    }
  }, [incomingCallInvite, callState, router]);

  const handleAccept = async () => {
    Vibration.cancel();
    await acceptIncomingCall();
  };

  const handleReject = async () => {
    Vibration.cancel();
    await rejectIncomingCall();
    router.replace('/(tabs)');
  };

  // Get call info from invite custom parameters
  const customParams = incomingCallInvite?.getCustomParameters?.() ?? {};
  const callerNumber = customParams.From || incomingCallInvite?.getFrom?.() || 'Unknown';
  const callerName = customParams.CallerName || callerNumber;
  const fromLanguage = customParams.fromLanguage || 'en';
  const toLanguage = customParams.toLanguage || 'en';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.incomingText}>Incoming Call</Text>

        <View style={styles.callerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {callerName[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.callerName}>{callerName}</Text>
          {callerName !== callerNumber && (
            <Text style={styles.callerNumber}>{callerNumber}</Text>
          )}
        </View>

        <View style={styles.languageInfo}>
          <Text style={styles.languageLabel}>Translation</Text>
          <View style={styles.languagePair}>
            <Text style={styles.languageText}>
              {getLanguageFlag(fromLanguage as any)} {getLanguageName(fromLanguage as any)}
            </Text>
            <Text style={styles.languageArrow}>→</Text>
            <Text style={styles.languageText}>
              {getLanguageFlag(toLanguage as any)} {getLanguageName(toLanguage as any)}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <View style={styles.actionSlot}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              activeOpacity={0.85}
            >
              <MaterialIcons name="call-end" size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.actionText}>Decline</Text>
          </View>

          <View style={styles.actionSlot}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={30} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.actionText}>Accept</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[900],
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  incomingText: {
    fontSize: typography.fontSize.lg,
    color: colors.gray[400],
    marginBottom: spacing.xl,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
  },
  callerName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  callerNumber: {
    fontSize: typography.fontSize.lg,
    color: colors.gray[400],
  },
  languageInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl * 2,
  },
  languageLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  languagePair: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageText: {
    fontSize: typography.fontSize.lg,
    color: '#fff',
  },
  languageArrow: {
    fontSize: typography.fontSize.lg,
    color: colors.gray[500],
    marginHorizontal: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: spacing.xl,
  },
  actionSlot: {
    alignItems: 'center',
  },
  actionButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    marginTop: spacing.sm,
  },
});
