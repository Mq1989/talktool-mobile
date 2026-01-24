import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';

// Required for OAuth to work properly
WebBrowser.maybeCompleteAuthSession();

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
  red: {
    50: '#FEF2F2',
    500: '#EF4444',
  },
  green: {
    500: '#22C55E',
  },
  yellow: {
    500: '#EAB308',
  },
};

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms of service' }),
  }),
});

const verifySchema = z.object({
  code: z.string().length(6, 'Please enter the 6-digit code'),
});

type RegisterFormData = z.infer<typeof registerSchema>;
type VerifyFormData = z.infer<typeof verifySchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { register, verifyEmail, isLoading } = useAuth();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OAuth hooks
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      acceptedTerms: false as any,
    },
  });

  const {
    control: verifyControl,
    handleSubmit: handleVerifySubmit,
    formState: { errors: verifyErrors },
  } = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      code: '',
    },
  });

  const password = watch('password', '');

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);

  const getStrengthColor = (level: number) => {
    if (passwordStrength >= level) {
      if (passwordStrength <= 2) return brand.red[500];
      if (passwordStrength <= 3) return brand.yellow[500];
      return brand.green[500];
    }
    return brand.gray[200];
  };

  const getStrengthLabel = () => {
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Fair';
    return 'Strong';
  };

  const onSubmit = async (data: RegisterFormData) => {
    setRegisterError(null);
    try {
      const result = await register(data.email, data.password, data.firstName, data.lastName);
      if (result?.needsVerification) {
        setPendingVerification(true);
      }
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    }
  };

  const onVerify = async (data: VerifyFormData) => {
    setRegisterError(null);
    try {
      await verifyEmail(data.code);
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setRegisterError(null);
      const { createdSessionId, setActive } = await startGoogleOAuth();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Google OAuth error:', err);
      setRegisterError('Google sign up failed. Please try again.');
    }
  };

  const handleAppleSignUp = async () => {
    try {
      setRegisterError(null);
      const { createdSessionId, setActive } = await startAppleOAuth();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Apple OAuth error:', err);
      setRegisterError('Apple sign up failed. Please try again.');
    }
  };

  // Verification code screen
  if (pendingVerification) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo & Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logoIcon}>
                  <Ionicons name="mail-open" size={32} color="#fff" />
                </View>
              </View>
              <Text style={styles.logoText}>TalkTool</Text>
              <Text style={styles.title}>Verify your email</Text>
              <Text style={styles.subtitle}>Enter the 6-digit code sent to your email</Text>
            </View>

            {/* Verification Form */}
            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <Controller
                  control={verifyControl}
                  name="code"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={[
                      styles.inputContainer,
                      verifyErrors.code && styles.inputContainerError,
                    ]}>
                      <Ionicons name="keypad-outline" size={20} color={brand.gray[400]} />
                      <TextInput
                        style={[styles.textInput, styles.codeInput]}
                        placeholder="000000"
                        placeholderTextColor={brand.gray[400]}
                        keyboardType="number-pad"
                        maxLength={6}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    </View>
                  )}
                />
                {verifyErrors.code && (
                  <Text style={styles.errorText}>{verifyErrors.code.message}</Text>
                )}
              </View>

              {/* Error Message */}
              {registerError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color={brand.red[500]} />
                  <Text style={styles.errorBannerText}>{registerError}</Text>
                </View>
              )}

              {/* Verify Button */}
              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                onPress={handleVerifySubmit(onVerify)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Text style={styles.primaryButtonText}>Verifying...</Text>
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Verify Email</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setPendingVerification(false)}
              >
                <Ionicons name="arrow-back" size={18} color={brand.blue.primary} />
                <Text style={styles.backButtonText}>Back to registration</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 20 }}>🇺🇸</Text>
                  <Text style={{ fontSize: 12, color: '#fff' }}>⇄</Text>
                  <Text style={{ fontSize: 20 }}>🇪🇸</Text>
                </View>
              </View>
            </View>
            <Text style={styles.logoText}>TalkTool</Text>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start translating calls today</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Row */}
            <View style={styles.nameRow}>
              {/* First Name */}
              <View style={[styles.inputWrapper, styles.nameField]}>
                <Text style={styles.inputLabel}>First Name</Text>
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={[
                      styles.inputContainer,
                      errors.firstName && styles.inputContainerError,
                    ]}>
                      <Ionicons name="person-outline" size={20} color={brand.gray[400]} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="John"
                        placeholderTextColor={brand.gray[400]}
                        autoCapitalize="words"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    </View>
                  )}
                />
                {errors.firstName && (
                  <Text style={styles.errorText}>{errors.firstName.message}</Text>
                )}
              </View>

              {/* Last Name */}
              <View style={[styles.inputWrapper, styles.nameField]}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View style={[
                      styles.inputContainer,
                      errors.lastName && styles.inputContainerError,
                    ]}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Doe"
                        placeholderTextColor={brand.gray[400]}
                        autoCapitalize="words"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                    </View>
                  )}
                />
                {errors.lastName && (
                  <Text style={styles.errorText}>{errors.lastName.message}</Text>
                )}
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[
                    styles.inputContainer,
                    errors.email && styles.inputContainerError,
                  ]}>
                    <Ionicons name="mail-outline" size={20} color={brand.gray[400]} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="you@example.com"
                      placeholderTextColor={brand.gray[400]}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                  </View>
                )}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email.message}</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[
                    styles.inputContainer,
                    errors.password && styles.inputContainerError,
                  ]}>
                    <Ionicons name="lock-closed-outline" size={20} color={brand.gray[400]} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Create a password"
                      placeholderTextColor={brand.gray[400]}
                      secureTextEntry={!showPassword}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={brand.gray[400]}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password.message}</Text>
              )}
            </View>

            {/* Password Strength */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthSegment,
                        { backgroundColor: getStrengthColor(level) },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[
                  styles.strengthText,
                  { color: passwordStrength <= 2 ? brand.red[500] : passwordStrength <= 3 ? brand.yellow[500] : brand.green[500] }
                ]}>
                  {getStrengthLabel()}
                </Text>
              </View>
            )}

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => {
                setAcceptedTerms(!acceptedTerms);
                setValue('acceptedTerms', !acceptedTerms as any);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
            {errors.acceptedTerms && (
              <Text style={styles.errorText}>{errors.acceptedTerms.message}</Text>
            )}

            {/* Error Message */}
            {registerError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={brand.red[500]} />
                <Text style={styles.errorBannerText}>{registerError}</Text>
              </View>
            )}

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.primaryButtonText}>Creating account...</Text>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignUp}>
                <Ionicons name="logo-google" size={20} color={brand.gray[700]} />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton} onPress={handleAppleSignUp}>
                <Ionicons name="logo-apple" size={20} color={brand.gray[700]} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  // Header
  header: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: brand.blue.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brand.blue.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: brand.blue.primary,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: brand.gray[900],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: brand.gray[500],
  },

  // Form
  form: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: brand.gray[700],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.gray[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: brand.gray[200],
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  inputContainerError: {
    borderColor: brand.red[500],
    backgroundColor: brand.red[50],
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: brand.gray[800],
  },
  codeInput: {
    letterSpacing: 8,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: brand.red[500],
    marginTop: 6,
  },

  // Password Strength
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  strengthBar: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    width: 50,
  },

  // Terms
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: brand.gray[300],
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: brand.blue.primary,
    borderColor: brand.blue.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: brand.gray[600],
    lineHeight: 20,
  },
  termsLink: {
    color: brand.blue.primary,
    fontWeight: '500',
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.red[50],
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: brand.red[500],
  },

  // Primary Button
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.blue.primary,
    height: 52,
    borderRadius: 14,
    gap: 8,
    shadowColor: brand.blue.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Back Button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  backButtonText: {
    color: brand.blue.primary,
    fontSize: 15,
    fontWeight: '500',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: brand.gray[200],
  },
  dividerText: {
    marginHorizontal: 16,
    color: brand.gray[500],
    fontSize: 13,
  },

  // Social Buttons
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: brand.gray[200],
    height: 52,
    borderRadius: 14,
    gap: 8,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: brand.gray[700],
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
  },
  footerText: {
    color: brand.gray[600],
    fontSize: 15,
  },
  footerLink: {
    color: brand.blue.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
