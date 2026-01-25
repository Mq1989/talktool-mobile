import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@clerk/clerk-expo';
import { Button, Card } from '../../src/components/ui';
import { LanguageSelector } from '../../src/components/call';
import { useVoice } from '../../src/contexts/VoiceContext';
import { useSettingsStore } from '../../src/store/settingsStore';
import { apiEndpoints } from '../../src/services/api';
import { QUERY_KEYS } from '../../src/utils/constants';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

interface NumberConfig {
  phoneNumber: string;
  friendlyName?: string;
}

interface ApiNumberConfig {
  _id?: string;
  number: string;
  name?: string;
  status?: string;
  phoneNumber?: string;
  friendlyName?: string;
  friendly_name?: string;
}

export default function NewCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; lang?: string }>();
  const { defaultLanguage, defaultSpeakerMode } = useSettingsStore();
  const { makeCall, callState, callSid, error: voiceError, clearError, testVoiceSetup, isVoiceSupported } = useVoice();
  const { organization } = useOrganization();
  const [testResult, setTestResult] = useState<string | null>(null);

  // Ensure valid language codes with fallbacks
  const [fromLanguage, setFromLanguage] = useState<string>(defaultLanguage || 'EN_US');
  const [toLanguage, setToLanguage] = useState<string>(params.lang || 'ES_US');
  const [phoneNumber, setPhoneNumber] = useState(params.phone ?? '');
  const [speakerMode, setSpeakerMode] = useState(defaultSpeakerMode);
  const [enableRecording, setEnableRecording] = useState(false);
  const [selectedCallerId, setSelectedCallerId] = useState<string>('');
  const [callError, setCallError] = useState<string | null>(null);

  // Fetch user's phone numbers for caller ID selection
  const { data: numberConfigs, isLoading: isLoadingNumbers, error: numbersError } = useQuery<NumberConfig[]>({
    queryKey: ['numberConfigs'],
    queryFn: async () => {
      console.log('[NewCall] Fetching number configs...');
      const response = await apiEndpoints.getNumberConfigs();
      console.log('[NewCall] Number config raw response:', JSON.stringify(response.data, null, 2));
      console.log('[NewCall] Response type:', typeof response.data);

      // Handle various API response formats
      let apiNumbers: ApiNumberConfig[] = [];

      const rawData = response.data;

      if (Array.isArray(rawData)) {
        // Direct array response
        apiNumbers = rawData;
      } else if (rawData && typeof rawData === 'object') {
        // Object response - check common patterns
        if (Array.isArray(rawData.data)) {
          apiNumbers = rawData.data;
        } else if (Array.isArray(rawData.numbers)) {
          apiNumbers = rawData.numbers;
        } else if (Array.isArray(rawData.configs)) {
          apiNumbers = rawData.configs;
        } else if (rawData.number) {
          // Single number object
          apiNumbers = [rawData];
        } else {
          console.log('[NewCall] Unknown response structure, keys:', Object.keys(rawData));
        }
      }

      console.log('[NewCall] Extracted apiNumbers:', apiNumbers);
      console.log('[NewCall] apiNumbers is array:', Array.isArray(apiNumbers));

      // Map API format to component format
      const mapped = apiNumbers.map((n) => ({
        phoneNumber: n.number || n.phoneNumber || '',
        friendlyName: n.name || n.friendlyName || n.friendly_name || undefined,
      }));
      console.log('[NewCall] Mapped number configs:', mapped);
      return mapped;
    },
  });

  // Set default caller ID when numbers are loaded
  useEffect(() => {
    if (numberConfigs && numberConfigs.length > 0 && !selectedCallerId) {
      setSelectedCallerId(numberConfigs[0].phoneNumber);
    }
  }, [numberConfigs, selectedCallerId]);

  // Navigate to active call screen when call is ringing or connected
  useEffect(() => {
    if (['call-ringing', 'active'].includes(callState) && callSid) {
      router.replace(`/call/${callSid}`);
    }
  }, [callState, callSid, router]);

  // Handle voice errors
  useEffect(() => {
    if (voiceError) {
      setCallError(voiceError);
    }
  }, [voiceError]);

  const handleSwapLanguages = () => {
    const temp = fromLanguage;
    setFromLanguage(toLanguage);
    setToLanguage(temp);
  };

  const handleInitiateCall = async () => {
    console.log('[NewCall] handleInitiateCall called');
    console.log('[NewCall] phoneNumber:', phoneNumber);
    console.log('[NewCall] selectedCallerId:', selectedCallerId);
    console.log('[NewCall] fromLanguage:', fromLanguage);
    console.log('[NewCall] toLanguage:', toLanguage);

    if (!phoneNumber.trim()) {
      console.log('[NewCall] Error: No phone number entered');
      setCallError('Please enter a phone number');
      return;
    }

    if (!selectedCallerId) {
      console.log('[NewCall] Error: No caller ID selected');
      setCallError('No caller ID available. Please add a phone number to your account.');
      return;
    }

    setCallError(null);
    clearError();

    console.log('[NewCall] Calling makeCall...');
    console.log('[NewCall] Organization ID:', organization?.id || '(none)');
    try {
      await makeCall({
        toNumber: phoneNumber.trim(),
        fromNumber: selectedCallerId,
        fromLanguage,
        toLanguage,
        // iOS call parameters for /iosCall endpoint
        orgId: organization?.id,
        translateInitially: true,
      });
      console.log('[NewCall] makeCall completed');
    } catch (err) {
      console.error('[NewCall] makeCall failed:', err);
      setCallError(err instanceof Error ? err.message : 'Failed to initiate call');
    }
  };

  const isCallInProgress = callState === 'connecting' || callState === 'ringing';

  const handleTestSetup = async () => {
    setTestResult('Running tests...');
    const result = await testVoiceSetup();
    setTestResult(result.message);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Call</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Languages</Text>
          <Card style={styles.languageCard} variant="outlined" padding="md">
            <LanguageSelector
              label="Your Language"
              value={fromLanguage}
              onChange={setFromLanguage}
            />

            <TouchableOpacity
              style={styles.swapButton}
              onPress={handleSwapLanguages}
            >
              <Text style={styles.swapIcon}>↕</Text>
            </TouchableOpacity>

            <LanguageSelector
              label="Their Language"
              value={toLanguage}
              onChange={setToLanguage}
            />
          </Card>

          <Text style={styles.sectionTitle}>Phone Number</Text>
          <Card style={styles.phoneCard} variant="outlined" padding="md">
            <TextInput
              style={styles.phoneInput}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={colors.gray[400]}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </Card>

          <Text style={styles.sectionTitle}>Caller ID</Text>
          <View style={styles.callerIdContainer}>
            {isLoadingNumbers ? (
              <View style={styles.callerIdLoadingCard}>
                <ActivityIndicator size="small" color={colors.primary[500]} />
                <Text style={styles.callerIdLoadingText}>Loading your numbers...</Text>
              </View>
            ) : numbersError ? (
              <View style={styles.callerIdErrorCard}>
                <View style={styles.callerIdErrorIcon}>
                  <Text style={styles.callerIdErrorIconText}>!</Text>
                </View>
                <Text style={styles.callerIdErrorTitle}>Connection Error</Text>
                <Text style={styles.callerIdErrorMessage}>
                  Failed to load phone numbers. Check your connection.
                </Text>
                <Text style={styles.callerIdDebugText}>
                  Error: {numbersError instanceof Error ? numbersError.message : 'Unknown'}
                </Text>
              </View>
            ) : !numberConfigs || numberConfigs.length === 0 ? (
              <View style={styles.callerIdEmptyCard}>
                <View style={styles.callerIdEmptyIcon}>
                  <Text style={styles.callerIdEmptyIconText}>📱</Text>
                </View>
                <Text style={styles.callerIdEmptyTitle}>No Phone Numbers</Text>
                <Text style={styles.callerIdEmptyMessage}>
                  Add a phone number to your account to make calls.
                </Text>
                <Text style={styles.callerIdDebugText}>
                  Data: {JSON.stringify(numberConfigs)}
                </Text>
              </View>
            ) : (
              <View style={styles.callerIdListCard}>
                <View style={styles.callerIdListHeader}>
                  <Text style={styles.callerIdListHeaderText}>
                    Select outgoing number
                  </Text>
                  <View style={styles.callerIdCountBadge}>
                    <Text style={styles.callerIdCountText}>{numberConfigs.length}</Text>
                  </View>
                </View>
                {numberConfigs.map((config, index) => (
                  <TouchableOpacity
                    key={config.phoneNumber || index}
                    style={[
                      styles.callerIdOption,
                      selectedCallerId === config.phoneNumber && styles.callerIdOptionSelected,
                      index === numberConfigs.length - 1 && styles.callerIdOptionLast,
                    ]}
                    onPress={() => setSelectedCallerId(config.phoneNumber)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.callerIdRadioOuter}>
                      {selectedCallerId === config.phoneNumber && (
                        <View style={styles.callerIdRadioInner} />
                      )}
                    </View>
                    <View style={styles.callerIdInfo}>
                      <Text style={[
                        styles.callerIdNumber,
                        selectedCallerId === config.phoneNumber && styles.callerIdNumberSelected
                      ]}>
                        {config.phoneNumber}
                      </Text>
                      {config.friendlyName && (
                        <Text style={styles.callerIdName}>{config.friendlyName}</Text>
                      )}
                    </View>
                    {selectedCallerId === config.phoneNumber && (
                      <View style={styles.callerIdSelectedBadge}>
                        <Text style={styles.callerIdSelectedBadgeText}>Selected</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Call Options</Text>
          <Card style={styles.optionsCard} variant="outlined" padding="none">
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Speaker Mode</Text>
                <Text style={styles.optionDescription}>
                  Use device speaker for hands-free calling
                </Text>
              </View>
              <Switch
                value={speakerMode}
                onValueChange={setSpeakerMode}
                trackColor={{ false: colors.gray[200], true: colors.primary[200] }}
                thumbColor={speakerMode ? colors.primary[500] : colors.gray[400]}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Record Call</Text>
                <Text style={styles.optionDescription}>
                  Save recording for later review
                </Text>
              </View>
              <Switch
                value={enableRecording}
                onValueChange={setEnableRecording}
                trackColor={{ false: colors.gray[200], true: colors.primary[200] }}
                thumbColor={enableRecording ? colors.primary[500] : colors.gray[400]}
              />
            </View>
          </Card>

          {/* Debug Test Section */}
          <Text style={styles.sectionTitle}>Debug</Text>
          <Card style={styles.optionsCard} variant="outlined" padding="md">
            <Text style={styles.optionLabel}>Voice SDK: {isVoiceSupported ? '✓ Loaded' : '✗ Not Available'}</Text>
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestSetup}
            >
              <Text style={styles.testButtonText}>Run Setup Test</Text>
            </TouchableOpacity>
            {testResult && (
              <Text style={[styles.testResult, testResult.includes('FAIL') ? styles.testFail : styles.testPass]}>
                {testResult}
              </Text>
            )}
          </Card>

          {callError && (
            <Text style={styles.errorText}>{callError}</Text>
          )}

          <Button
            title={isCallInProgress ? 'Connecting...' : 'Start Call'}
            onPress={handleInitiateCall}
            loading={isCallInProgress}
            disabled={!phoneNumber.trim() || isCallInProgress}
            fullWidth
            size="lg"
            style={styles.startButton}
          />

          <Text style={styles.disclaimer}>
            By initiating this call, you confirm that you have consent to record
            if recording is enabled.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backButton: {
    color: colors.primary[500],
    fontSize: typography.fontSize.base,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
  },
  scrollContent: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[500],
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    marginLeft: spacing.xs,
  },
  languageCard: {},
  swapButton: {
    alignSelf: 'center',
    marginVertical: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapIcon: {
    fontSize: 20,
    color: colors.gray[600],
  },
  phoneCard: {},
  phoneInput: {
    fontSize: typography.fontSize.xl,
    color: colors.gray[900],
    textAlign: 'center',
    padding: spacing.md,
  },
  // Caller ID Container and Cards
  callerIdContainer: {
    marginBottom: spacing.sm,
  },
  callerIdLoadingCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  callerIdLoadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontWeight: typography.fontWeight.medium,
    marginLeft: 12,
  },
  callerIdErrorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.lg,
    alignItems: 'center',
  },
  callerIdErrorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  callerIdErrorIconText: {
    fontSize: 20,
    color: '#DC2626',
    fontWeight: typography.fontWeight.bold,
  },
  callerIdErrorTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#991B1B',
    marginBottom: 4,
  },
  callerIdErrorMessage: {
    fontSize: typography.fontSize.sm,
    color: '#B91C1C',
    textAlign: 'center',
  },
  callerIdEmptyCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing.lg,
    alignItems: 'center',
  },
  callerIdEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  callerIdEmptyIconText: {
    fontSize: 24,
  },
  callerIdEmptyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#92400E',
    marginBottom: 4,
  },
  callerIdEmptyMessage: {
    fontSize: typography.fontSize.sm,
    color: '#B45309',
    textAlign: 'center',
  },
  callerIdDebugText: {
    fontSize: 10,
    color: colors.gray[400],
    marginTop: spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  callerIdListCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    overflow: 'hidden',
  },
  callerIdListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  callerIdListHeaderText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  callerIdCountBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  callerIdCountText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[700],
  },
  callerIdOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    backgroundColor: '#fff',
  },
  callerIdOptionSelected: {
    backgroundColor: colors.primary[50],
  },
  callerIdOptionLast: {
    borderBottomWidth: 0,
  },
  callerIdRadioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  callerIdRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary[500],
  },
  callerIdInfo: {
    flex: 1,
  },
  callerIdNumber: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[800],
    letterSpacing: 0.3,
  },
  callerIdNumberSelected: {
    color: colors.primary[700],
    fontWeight: typography.fontWeight.semibold,
  },
  callerIdName: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  callerIdSelectedBadge: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  callerIdSelectedBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: '#fff',
  },
  optionsCard: {},
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  optionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  optionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[900],
  },
  optionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning ?? colors.gray[600],
    textAlign: 'center',
  },
  startButton: {
    marginTop: spacing.xl,
  },
  disclaimer: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  testButton: {
    backgroundColor: colors.gray[200],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  testButtonText: {
    color: colors.gray[700],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  testResult: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  testPass: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  testFail: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
});
