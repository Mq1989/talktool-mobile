import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { apiEndpoints } from '../../src/services/api';
import { usePlanEntitlement } from '../../src/hooks/usePlanEntitlement';
import { IncomingCallsPaywall } from '../../src/components/IncomingCallsPaywall';
import { Button, Card, Input, LoadingSpinner } from '../../src/components/ui';
import { LanguageSelector } from '../../src/components/call/LanguageSelector';
import { NumberConfig } from '../../src/types/call.types';
import { formatPhoneNumber, validatePhoneNumber } from '../../src/utils/helpers';
import { getLanguageFlag, getLanguageName } from '../../src/utils/languages';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

type PlanType =
  | 'no-incoming-calls-allowed'
  | 'all-callers-select-language'
  | 'only-select-callers-select-language'
  | 'incoming-calls-forwarded-to-main'
  | 'voicemail-only';

type RingTarget = 'browser' | 'phone';
type BrowserFallbackMode = 'voicemail' | 'phone' | 'phone-then-voicemail';

interface AllowListEntry {
  value: string;
  label?: string;
}

const DEFAULT_IVR_LANGUAGES = ['EN_US', 'ES'];

const PLAN_OPTIONS: Array<{
  type: PlanType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    type: 'all-callers-select-language',
    title: 'Let Callers Choose Their Language',
    description: 'Callers hear a menu — "Press 1 for English..." — then connect with live translation.',
    icon: 'globe-outline',
  },
  {
    type: 'only-select-callers-select-language',
    title: 'Only Approved Callers',
    description: 'Only phone numbers on your allowlist can reach this line, choosing their language via the menu.',
    icon: 'people-outline',
  },
  {
    type: 'incoming-calls-forwarded-to-main',
    title: 'One Language, Auto-Connect',
    description: 'Every caller speaks the same language. Calls connect instantly with translation.',
    icon: 'arrow-redo-outline',
  },
  {
    type: 'voicemail-only',
    title: 'Voicemail Only',
    description: "Callers leave a voicemail. We'll transcribe, translate, and notify you.",
    icon: 'mic-circle-outline',
  },
  {
    type: 'no-incoming-calls-allowed',
    title: 'Outbound Only',
    description: "No one can call in — you'll only use this number to make outgoing translated calls.",
    icon: 'ban-outline',
  },
];

// Plans that need somewhere to ring a live person (as opposed to voicemail-only
// or fully blocked). Mirrors callRouting.jsx's needsRingTarget list, extended to
// the allowlist plan since it also connects a live caller.
const RING_TARGET_PLANS: PlanType[] = [
  'all-callers-select-language',
  'only-select-callers-select-language',
  'incoming-calls-forwarded-to-main',
];

// Plans where a voicemail greeting is required/used as a fallback.
const VOICEMAIL_GREETING_PLANS: PlanType[] = [
  'all-callers-select-language',
  'only-select-callers-select-language',
  'incoming-calls-forwarded-to-main',
  'voicemail-only',
];

function normalizeAllowList(raw: unknown): AllowListEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): AllowListEntry | null => {
      if (typeof entry === 'string') return { value: entry };
      if (entry && typeof entry === 'object' && 'value' in entry) {
        const value = (entry as { value?: unknown }).value;
        const label = (entry as { label?: unknown }).label;
        if (typeof value === 'string' && value) {
          return { value, label: typeof label === 'string' ? label : undefined };
        }
      }
      return null;
    })
    .filter((entry): entry is AllowListEntry => entry !== null);
}

export default function NumberConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    hasIncomingCalls,
    isLoading: isEntitlementLoading,
    refetch: refetchEntitlement,
  } = usePlanEntitlement();

  const {
    data: config,
    isLoading: isConfigLoading,
    isError: isConfigError,
  } = useQuery<NumberConfig>({
    queryKey: ['numberConfig', id],
    queryFn: async () => {
      const response = await apiEndpoints.getNumberConfig(id);
      return response.data as NumberConfig;
    },
    enabled: !!id,
  });

  // Form state — seeded from the loaded config once it arrives.
  const [mainPhone, setMainPhone] = useState('');
  const [mainLang, setMainLang] = useState('EN_US');
  const [planType, setPlanType] = useState<PlanType | ''>('');
  const [forwardLanguage, setForwardLanguage] = useState('');
  const [ivrLanguages, setIvrLanguages] = useState<string[]>(DEFAULT_IVR_LANGUAGES);
  const [ivrAudioUrl, setIvrAudioUrl] = useState<string | null>(null);
  const [allowList, setAllowList] = useState<AllowListEntry[]>([]);
  const [newAllowNumber, setNewAllowNumber] = useState('');
  const [voicemailGreeting, setVoicemailGreeting] = useState('');
  const [voicemailLang, setVoicemailLang] = useState('EN_US');
  const [ringTarget, setRingTarget] = useState<RingTarget | ''>('');
  const [phoneRingTimeout, setPhoneRingTimeout] = useState(30);
  const [browserFallbackMode, setBrowserFallbackMode] = useState<BrowserFallbackMode>('voicemail');
  const [browserRingTimeout, setBrowserRingTimeout] = useState(30);
  const [isActive, setIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAddonBackstop, setShowAddonBackstop] = useState(false);

  useEffect(() => {
    if (!config) return;
    setMainPhone(config.mainPhone ?? '');
    setMainLang((config as unknown as { mainLang?: string }).mainLang ?? 'EN_US');

    const plan = config.incomingPlan ?? {};
    const loadedPlanType = typeof plan.planType === 'string' ? (plan.planType as PlanType) : '';
    setPlanType(loadedPlanType);

    if (typeof plan.forwardLanguage === 'string') setForwardLanguage(plan.forwardLanguage);
    if (Array.isArray(plan.ivrLanguages) && plan.ivrLanguages.length > 0) {
      setIvrLanguages(plan.ivrLanguages as string[]);
    }
    if (typeof plan.ivrAudioUrl === 'string') setIvrAudioUrl(plan.ivrAudioUrl);
    setAllowList(normalizeAllowList(plan.allowList));
    if (typeof plan.voicemailGreeting === 'string') setVoicemailGreeting(plan.voicemailGreeting);
    if (typeof plan.voicemailLang === 'string') setVoicemailLang(plan.voicemailLang);
    if (plan.ringTarget === 'browser' || plan.ringTarget === 'phone') {
      setRingTarget(plan.ringTarget);
    }
    if (typeof plan.phoneRingTimeout === 'number') setPhoneRingTimeout(plan.phoneRingTimeout);
    if (
      plan.browserFallbackMode === 'voicemail' ||
      plan.browserFallbackMode === 'phone' ||
      plan.browserFallbackMode === 'phone-then-voicemail'
    ) {
      setBrowserFallbackMode(plan.browserFallbackMode);
    }
    if (typeof plan.browserRingTimeout === 'number') setBrowserRingTimeout(plan.browserRingTimeout);

    // Never-configured numbers have no saved status at all — default to ON,
    // matching the web app's behavior in callRouting.jsx.
    setIsActive(config.status === undefined || config.status === null ? true : config.status === 'active');
  }, [config]);

  const needsRingTarget = planType !== '' && RING_TARGET_PLANS.includes(planType);
  const needsVoicemailGreeting = planType !== '' && VOICEMAIL_GREETING_PLANS.includes(planType);
  const needsBrowserFallback = needsRingTarget && ringTarget === 'browser';

  const isPhoneValid = validatePhoneNumber(mainPhone);
  const isVoicemailGreetingValid = !needsVoicemailGreeting || voicemailGreeting.trim().length > 0;
  const isRingTargetValid = !needsRingTarget || !!ringTarget;
  const isAllowListValid = planType !== 'only-select-callers-select-language' || allowList.length > 0;

  const canSave =
    !!planType &&
    isPhoneValid &&
    isVoicemailGreetingValid &&
    isRingTargetValid &&
    isAllowListValid &&
    !isSaving;

  const toggleIvrLanguage = (code: string) => {
    setIvrLanguages((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
    });
    setIvrAudioUrl(null); // Selection changed — stale audio must be regenerated.
  };

  const handleAddAllowNumber = () => {
    const trimmed = newAllowNumber.trim();
    if (!trimmed) return;
    if (!validatePhoneNumber(trimmed)) {
      Alert.alert('Invalid number', 'Enter a valid phone number (10-15 digits).');
      return;
    }
    const digitsOnly = trimmed.replace(/\D/g, '');
    const normalized = trimmed.startsWith('+') ? trimmed : `+1${digitsOnly}`;
    if (allowList.some((entry) => entry.value === normalized)) {
      Alert.alert('Already added', 'This number is already on the allowlist.');
      return;
    }
    setAllowList((prev) => [...prev, { value: normalized }]);
    setNewAllowNumber('');
  };

  const handleRemoveAllowNumber = (value: string) => {
    setAllowList((prev) => prev.filter((entry) => entry.value !== value));
  };

  const handleSave = async () => {
    if (!id || !planType) return;
    setSaveError(null);
    setIsSaving(true);

    try {
      let audioUrlToSave = ivrAudioUrl;
      const needsIvrAudio =
        planType === 'all-callers-select-language' || planType === 'only-select-callers-select-language';

      if (needsIvrAudio && !audioUrlToSave) {
        if (ivrLanguages.length === 0) {
          setSaveError('Select at least one language for the menu.');
          setIsSaving(false);
          return;
        }
        setIsGeneratingAudio(true);
        try {
          const audioResponse = await apiEndpoints.generateIvrAudio({
            ivrLanguages,
            numberId: id,
          });
          audioUrlToSave = (audioResponse.data as { audioUrl?: string })?.audioUrl ?? null;
          if (!audioUrlToSave) {
            throw new Error('Audio generation did not return a URL');
          }
          setIvrAudioUrl(audioUrlToSave);
        } catch (audioErr) {
          setSaveError(
            audioErr instanceof Error ? audioErr.message : 'Failed to generate IVR audio'
          );
          return;
        } finally {
          setIsGeneratingAudio(false);
        }
      }

      const effectiveBrowserFallbackMode = needsBrowserFallback ? browserFallbackMode : null;

      const body: Record<string, unknown> = {
        numberId: id,
        mainPhone,
        plan: planType,
        allowList:
          planType === 'only-select-callers-select-language'
            ? allowList.map((entry) => ({ value: entry.value, label: entry.label ?? null }))
            : null,
        forwardLanguage: planType === 'incoming-calls-forwarded-to-main' ? forwardLanguage || null : null,
        isActive,
        mainLang,
        ivrLanguages: needsIvrAudio ? ivrLanguages : null,
        ivrAudioUrl: needsIvrAudio ? audioUrlToSave : null,
        voicemailGreeting: needsVoicemailGreeting ? voicemailGreeting : null,
        voicemailLang: needsVoicemailGreeting
          ? planType === 'voicemail-only'
            ? voicemailLang
            : planType === 'incoming-calls-forwarded-to-main'
              ? forwardLanguage
              : null
          : null,
        voicemailFallback: needsRingTarget,
        browserFallbackMode: effectiveBrowserFallbackMode,
        browserRingTimeout: needsBrowserFallback ? browserRingTimeout : null,
        ringTarget: needsRingTarget ? ringTarget : null,
        phoneRingTimeout: needsRingTarget && ringTarget === 'phone' ? phoneRingTimeout : null,
      };

      await apiEndpoints.setIncomingPlan(id, body);

      await queryClient.invalidateQueries({ queryKey: ['numberConfigs'] });
      await queryClient.invalidateQueries({ queryKey: ['numberConfig', id] });

      router.back();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data as { error?: string; requiresAddon?: string } | undefined;

        if (status === 403 && data?.requiresAddon === 'incoming-calls') {
          // Backstop: entitlement check passed client-side but the server
          // disagrees (e.g. plan lapsed mid-session). Show the paywall.
          setShowAddonBackstop(true);
          return;
        }

        setSaveError(data?.error ?? 'Failed to save configuration');
        return;
      }
      setSaveError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (isEntitlementLoading || isConfigLoading) {
    return <LoadingSpinner fullScreen message="Loading configuration..." />;
  }

  if (!hasIncomingCalls || showAddonBackstop) {
    return (
      <IncomingCallsPaywall
        message={
          showAddonBackstop
            ? 'Your plan no longer includes incoming calls. Upgrade to a Business plan or the incoming-calls add-on to keep this configuration.'
            : undefined
        }
        onReturn={() => {
          setShowAddonBackstop(false);
          refetchEntitlement();
        }}
      />
    );
  }

  if (isConfigError || !config) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={28} color={colors.error} />
        <Text style={styles.errorText}>Couldn&apos;t load this number&apos;s configuration.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.numberHeader}>
            <Text style={styles.numberHeaderLabel}>Phone Number</Text>
            <Text style={styles.numberHeaderValue}>{formatPhoneNumber(config.number)}</Text>
          </View>

          <Text style={styles.sectionTitle}>Your Language</Text>
          <Card variant="outlined" padding="md" style={styles.sectionCard}>
            <Text style={styles.helperText}>
              The language you speak — callers&apos; words are translated into this language for
              you.
            </Text>
            <LanguageSelector label="Your Language" value={mainLang} onChange={setMainLang} />
          </Card>

          <Text style={styles.sectionTitle}>Forwarding Number</Text>
          <Card variant="outlined" padding="md" style={styles.sectionCard}>
            <Text style={styles.helperText}>
              Where we&apos;ll forward translated calls when you answer on your phone.
            </Text>
            <Input
              value={mainPhone}
              onChangeText={setMainPhone}
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
              error={mainPhone.length > 0 && !isPhoneValid ? 'Enter a valid phone number' : undefined}
            />
          </Card>

          <Text style={styles.sectionTitle}>When Someone Calls This Number</Text>
          <View style={styles.planList}>
            {PLAN_OPTIONS.map((option) => {
              const isSelected = planType === option.type;
              return (
                <TouchableOpacity
                  key={option.type}
                  style={[styles.planCard, isSelected && styles.planCardSelected]}
                  onPress={() => setPlanType(option.type)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.planIconWrapper, isSelected && styles.planIconWrapperSelected]}>
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={isSelected ? '#fff' : colors.primary[600]}
                    />
                  </View>
                  <View style={styles.planCardText}>
                    <Text style={styles.planCardTitle}>{option.title}</Text>
                    <Text style={styles.planCardDescription}>{option.description}</Text>
                  </View>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {(planType === 'all-callers-select-language' ||
            planType === 'only-select-callers-select-language') && (
            <>
              <Text style={styles.sectionTitle}>Languages in the Menu</Text>
              <Card variant="outlined" padding="md" style={styles.sectionCard}>
                <Text style={styles.helperText}>
                  Callers press a number to pick their language. Order matters — first is Press 1.
                </Text>
                <View style={styles.chipRow}>
                  {ivrLanguages.map((code, index) => (
                    <TouchableOpacity
                      key={code}
                      style={styles.langChip}
                      onPress={() => toggleIvrLanguage(code)}
                    >
                      <Text style={styles.langChipIndex}>{index + 1}</Text>
                      <Text style={styles.langChipFlag}>{getLanguageFlag(code)}</Text>
                      <Text style={styles.langChipLabel}>{getLanguageName(code)}</Text>
                      <Ionicons name="close" size={14} color={colors.gray[500]} />
                    </TouchableOpacity>
                  ))}
                </View>
                <LanguageSelector
                  label="Add a Language"
                  value=""
                  onChange={(code) => {
                    if (!ivrLanguages.includes(code)) toggleIvrLanguage(code);
                  }}
                />
                {ivrAudioUrl ? (
                  <View style={styles.audioReadyBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.semantic.success[600]} />
                    <Text style={styles.audioReadyText}>Audio ready</Text>
                  </View>
                ) : (
                  <View style={styles.audioPendingBadge}>
                    <Text style={styles.audioPendingText}>Audio will be generated on save</Text>
                  </View>
                )}
              </Card>
            </>
          )}

          {planType === 'only-select-callers-select-language' && (
            <>
              <Text style={styles.sectionTitle}>Approved Callers</Text>
              <Card variant="outlined" padding="md" style={styles.sectionCard}>
                <Text style={styles.helperText}>
                  Only these numbers can reach this line. Add at least one to save.
                </Text>
                <View style={styles.addAllowRow}>
                  <TextInput
                    style={styles.allowInput}
                    value={newAllowNumber}
                    onChangeText={setNewAllowNumber}
                    placeholder="+1 (555) 123-4567"
                    placeholderTextColor={colors.gray[400]}
                    keyboardType="phone-pad"
                  />
                  <TouchableOpacity style={styles.addAllowButton} onPress={handleAddAllowNumber}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.chipRow}>
                  {allowList.map((entry) => (
                    <TouchableOpacity
                      key={entry.value}
                      style={styles.allowChip}
                      onPress={() => handleRemoveAllowNumber(entry.value)}
                    >
                      <Text style={styles.allowChipLabel}>{formatPhoneNumber(entry.value)}</Text>
                      <Ionicons name="close" size={14} color={colors.gray[500]} />
                    </TouchableOpacity>
                  ))}
                </View>
                {allowList.length === 0 && (
                  <Text style={styles.allowEmptyText}>No numbers yet.</Text>
                )}
              </Card>
            </>
          )}

          {planType === 'incoming-calls-forwarded-to-main' && (
            <>
              <Text style={styles.sectionTitle}>What Language Do Your Callers Speak?</Text>
              <Card variant="outlined" padding="md" style={styles.sectionCard}>
                <LanguageSelector
                  label="Caller Language"
                  value={forwardLanguage}
                  onChange={setForwardLanguage}
                />
              </Card>
            </>
          )}

          {needsRingTarget && (
            <>
              <Text style={styles.sectionTitle}>Where to Answer Calls</Text>
              <Card variant="outlined" padding="md" style={styles.sectionCard}>
                <TouchableOpacity
                  style={[styles.ringOption, ringTarget === 'browser' && styles.ringOptionSelected]}
                  onPress={() => setRingTarget('browser')}
                >
                  <View style={[styles.radioOuter, ringTarget === 'browser' && styles.radioOuterSelected]}>
                    {ringTarget === 'browser' && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.ringOptionText}>
                    <Text style={styles.ringOptionTitle}>Ring my phone/app</Text>
                    <Text style={styles.ringOptionDescription}>
                      Calls ring in the TalkTool app when you&apos;re online, with live
                      transcripts and translation on screen.
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ringOption, ringTarget === 'phone' && styles.ringOptionSelected]}
                  onPress={() => setRingTarget('phone')}
                >
                  <View style={[styles.radioOuter, ringTarget === 'phone' && styles.radioOuterSelected]}>
                    {ringTarget === 'phone' && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.ringOptionText}>
                    <Text style={styles.ringOptionTitle}>
                      Forward to your phone{mainPhone ? ` (${formatPhoneNumber(mainPhone)})` : ''}
                    </Text>
                    <Text style={styles.ringOptionDescription}>
                      Calls ring your phone directly. Translation happens in the background.
                    </Text>
                  </View>
                </TouchableOpacity>

                {ringTarget === 'phone' && (
                  <View style={styles.timeoutRow}>
                    <Text style={styles.timeoutLabel}>Ring for {phoneRingTimeout}s</Text>
                    <View style={styles.timeoutButtons}>
                      <TouchableOpacity
                        style={styles.timeoutButton}
                        onPress={() => setPhoneRingTimeout((v) => Math.max(15, v - 5))}
                      >
                        <Ionicons name="remove" size={16} color={colors.gray[700]} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.timeoutButton}
                        onPress={() => setPhoneRingTimeout((v) => Math.min(60, v + 5))}
                      >
                        <Ionicons name="add" size={16} color={colors.gray[700]} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </Card>
            </>
          )}

          {needsBrowserFallback && (
            <>
              <Text style={styles.sectionTitle}>If You Miss a Call</Text>
              <Card variant="outlined" padding="md" style={styles.sectionCard}>
                <TouchableOpacity
                  style={[
                    styles.ringOption,
                    browserFallbackMode === 'voicemail' && styles.ringOptionSelected,
                  ]}
                  onPress={() => setBrowserFallbackMode('voicemail')}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      browserFallbackMode === 'voicemail' && styles.radioOuterSelected,
                    ]}
                  >
                    {browserFallbackMode === 'voicemail' && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.ringOptionText}>
                    <Text style={styles.ringOptionTitle}>Send to voicemail</Text>
                    <Text style={styles.ringOptionDescription}>
                      Caller leaves a voicemail — we&apos;ll transcribe and translate it.
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ringOption, browserFallbackMode === 'phone' && styles.ringOptionSelected]}
                  onPress={() => setBrowserFallbackMode('phone')}
                >
                  <View
                    style={[styles.radioOuter, browserFallbackMode === 'phone' && styles.radioOuterSelected]}
                  >
                    {browserFallbackMode === 'phone' && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.ringOptionText}>
                    <Text style={styles.ringOptionTitle}>
                      Try your phone instead{mainPhone ? ` (${formatPhoneNumber(mainPhone)})` : ''}
                    </Text>
                    <Text style={styles.ringOptionDescription}>
                      We&apos;ll ring your phone as a backup before giving up.
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.timeoutRow}>
                  <Text style={styles.timeoutLabel}>Wait {browserRingTimeout}s before fallback</Text>
                  <View style={styles.timeoutButtons}>
                    <TouchableOpacity
                      style={styles.timeoutButton}
                      onPress={() => setBrowserRingTimeout((v) => Math.max(15, v - 5))}
                    >
                      <Ionicons name="remove" size={16} color={colors.gray[700]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.timeoutButton}
                      onPress={() => setBrowserRingTimeout((v) => Math.min(60, v + 5))}
                    >
                      <Ionicons name="add" size={16} color={colors.gray[700]} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            </>
          )}

          {needsVoicemailGreeting && (
            <>
              <Text style={styles.sectionTitle}>Voicemail Greeting</Text>
              <Card variant="outlined" padding="md" style={styles.sectionCard}>
                <Text style={styles.helperText}>
                  {planType === 'voicemail-only'
                    ? "What callers hear before leaving a message."
                    : "Played if a caller reaches voicemail as a fallback."}
                </Text>
                <TextInput
                  style={[
                    styles.greetingInput,
                    !voicemailGreeting.trim() && styles.greetingInputError,
                  ]}
                  value={voicemailGreeting}
                  onChangeText={setVoicemailGreeting}
                  placeholder="Please leave a message after the tone."
                  placeholderTextColor={colors.gray[400]}
                  multiline
                  numberOfLines={3}
                />
                {planType === 'voicemail-only' && (
                  <View style={styles.voicemailLangWrapper}>
                    <LanguageSelector
                      label="Greeting Language"
                      value={voicemailLang}
                      onChange={setVoicemailLang}
                    />
                  </View>
                )}
              </Card>
            </>
          )}

          <Card variant="outlined" padding="md" style={styles.sectionCard}>
            <View style={styles.activeRow}>
              <View style={styles.activeRowText}>
                <Text style={styles.activeRowTitle}>Enable Incoming Calls</Text>
                <Text style={styles.activeRowDescription}>
                  Turn this off to reject all incoming callers on this number.
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: colors.gray[200], true: colors.semantic.success[500] }}
                thumbColor="#fff"
              />
            </View>
          </Card>

          {saveError && <Text style={styles.saveErrorText}>{saveError}</Text>}

          <Button
            title={isSaving ? (isGeneratingAudio ? 'Generating audio...' : 'Saving...') : 'Save Changes'}
            onPress={handleSave}
            loading={isSaving}
            disabled={!canSave}
            fullWidth
            size="lg"
            style={styles.saveButton}
          />

          <View style={{ height: spacing['2xl'] }} />
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  numberHeader: {
    marginBottom: spacing.md,
  },
  numberHeaderLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  numberHeaderValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[500],
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    marginBottom: spacing.xs,
  },
  helperText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.sm,
    lineHeight: 19,
  },
  planList: {
    gap: spacing.sm,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    padding: spacing.md,
  },
  planCardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  planIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  planIconWrapperSelected: {
    backgroundColor: colors.primary[600],
  },
  planCardText: {
    flex: 1,
  },
  planCardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
  },
  planCardDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
    lineHeight: 16,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  radioOuterSelected: {
    borderColor: colors.primary[500],
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary[500],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
  },
  langChipIndex: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  langChipFlag: {
    fontSize: 14,
  },
  langChipLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  audioReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#D1FAE5',
    borderRadius: borderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  audioReadyText: {
    fontSize: typography.fontSize.xs,
    color: colors.semantic.success[700],
    fontWeight: typography.fontWeight.medium,
  },
  audioPendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.amber[100],
    borderRadius: borderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  audioPendingText: {
    fontSize: typography.fontSize.xs,
    color: colors.amber[700],
    fontWeight: typography.fontWeight.medium,
  },
  addAllowRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  allowInput: {
    flex: 1,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
  },
  addAllowButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 2,
  },
  allowChipLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  allowEmptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    fontStyle: 'italic',
  },
  ringOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    marginBottom: spacing.sm,
  },
  ringOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  ringOptionText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  ringOptionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
  },
  ringOptionDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
    lineHeight: 16,
  },
  timeoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  timeoutLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontWeight: typography.fontWeight.medium,
  },
  timeoutButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  timeoutButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingInput: {
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
    textAlignVertical: 'top',
    minHeight: 80,
  },
  greetingInputError: {
    borderColor: '#FCA5A5',
  },
  voicemailLangWrapper: {
    marginTop: spacing.sm,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeRowText: {
    flex: 1,
    marginRight: spacing.md,
  },
  activeRowTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
  },
  activeRowDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },
  saveButton: {
    marginTop: spacing.lg,
  },
  saveErrorText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    textAlign: 'center',
  },
});
