import {
  isAuthentikConfigured,
  parseEmailAddress,
  parseSignUpPassword,
  resolveAuthentikLoginStrategy,
  type AuthentikRelayRoute,
} from '@alternun/auth';
import { Image as ExpoImage } from 'expo-image';
import {
  AlertCircle,
  Chrome,
  Eye,
  EyeOff,
  Languages,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  Settings,
  Sun,
  Wallet,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import { getLocaleLabel } from '@alternun/i18n';
import { useRouter } from 'expo-router';
import { createTypographyStyles } from '../theme/typography';
import { useAppPalette } from '../theme/useAppPalette';
import ShaderBackground from './ShaderBackground';
import WalletConnectModal from '../dashboard/WalletConnectModal';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { useAuth } from './AppAuthProvider';
import { resolvePrimaryOAuthProvider } from './authExecutionMode';
import { shouldForceFreshAuthentikSocialSession } from './authentikWebSessionPolicy';
import {
  readPendingAuthentikOAuthProvider,
  resumePendingSocialSignIn,
  startSocialSignIn,
} from './authWebSession';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import AnimatedCollapsibleContent from '../common/AnimatedCollapsibleContent';
import { AuthFooter } from './AuthFooter';
const RESEND_COOLDOWN_SECONDS = 45;

// Feature flags
const ENABLE_WEB3_LOGIN = false; // Temporarily disabled: full web3 login flow not implemented

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AIRS_LOGOTIPO_LIGHT = require('../../assets/AIRS-logotipo-light.svg') as number;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AIRS_LOGOTIPO_DARK = require('../../assets/AIRS-logotipo-dark.svg') as number;

type SubmitMode =
  | 'signin'
  | 'signup'
  | 'resend'
  | 'verifyCode'
  | 'google'
  | 'discord'
  | 'wallet'
  | null;
type AuthMode = 'signin' | 'signup';
type AuthStep = 'form' | 'emailConfirmation';
type RequiredField = 'email' | 'password' | 'confirmPassword';

interface RequiredFieldState {
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

interface SignUpResult {
  needsEmailVerification: boolean;
  emailAlreadyRegistered: boolean;
  confirmationEmailSent: boolean;
}

interface EmailAuthCapableClient {
  signUpWithEmail?: (email: string, password: string, locale?: string) => Promise<SignUpResult>;
  resendEmailConfirmation?: (email: string) => Promise<void>;
  verifyEmailConfirmationCode?: (email: string, code: string) => Promise<void>;
}

export interface AuthSignInScreenProps {
  onCancel?: () => void;
  presentation?: 'screen' | 'modal';
  authReturnTo?: string;
}

function stripKnownErrorPrefix(message: string): string {
  const prefixes = ['UNSUPPORTED_FLOW:', 'PROVIDER_ERROR:', 'VALIDATION_ERROR:'];
  for (const prefix of prefixes) {
    if (message.startsWith(prefix)) {
      return message.replace(prefix, '').trim();
    }
  }

  return message.trim();
}

function normalizeMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = stripKnownErrorPrefix(value);
    if (!normalized || normalized === '{}' || normalized === '[object Object]') {
      return null;
    }

    return normalized;
  }

  if (value instanceof Error) {
    return normalizeMessage(value.message);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalizedEntry = normalizeMessage(entry);
      if (normalizedEntry) {
        return normalizedEntry;
      }
    }

    return null;
  }

  if (value && typeof value === 'object') {
    const typedValue = value as Record<string, unknown>;
    const candidates = [
      typedValue.message,
      typedValue.error_description,
      typedValue.error,
      typedValue.details,
      typedValue.detail,
      typedValue.hint,
      typedValue.msg,
    ];

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeMessage(candidate);
      if (normalizedCandidate) {
        return normalizedCandidate;
      }
    }

    try {
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== '{}' && serialized !== '[]') {
        return stripKnownErrorPrefix(serialized);
      }
    } catch {
      return null;
    }

    return null;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  return null;
}

function getMessage(error: unknown, fallbackMessage: string): string {
  return normalizeMessage(error) ?? fallbackMessage;
}

function isEmailAuthCapable(client: unknown): client is EmailAuthCapableClient {
  return Boolean(
    client && typeof (client as EmailAuthCapableClient).signUpWithEmail === 'function'
  );
}

function supportsConfirmationResend(client: unknown): client is EmailAuthCapableClient {
  return Boolean(
    client && typeof (client as EmailAuthCapableClient).resendEmailConfirmation === 'function'
  );
}

function supportsConfirmationCodeVerification(client: unknown): client is EmailAuthCapableClient {
  return Boolean(
    client && typeof (client as EmailAuthCapableClient).verifyEmailConfirmationCode === 'function'
  );
}

function isEmailNotConfirmedMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('email not confirmed') ||
    normalized.includes('email is not confirmed') ||
    normalized.includes('confirm your email')
  );
}

function createDefaultRequiredFieldState(): RequiredFieldState {
  return {
    email: false,
    password: false,
    confirmPassword: false,
  };
}

export default function AuthSignInScreen({
  onCancel,
  presentation = 'screen',
  authReturnTo,
}: AuthSignInScreenProps): JSX.Element {
  const { signInWithEmail, signIn, loading, error, client } = useAuth();
  const { t, locale } = useAppTranslation('mobile');
  const { language, toggleThemeMode, cycleLanguage } = useAppPreferences();
  const router = useRouter();
  const p = useAppPalette();
  const ThemeIcon = p.isDark ? Sun : Moon;
  const themeLabel = p.isDark ? t('labels.dark') : t('labels.light');
  const loginStrategy = resolveAuthentikLoginStrategy();
  const forceFreshSocialSession = shouldForceFreshAuthentikSocialSession(
    Platform.OS,
    loginStrategy.socialMode
  );
  const authentikSocialLoginMode = loginStrategy.socialMode;
  const authentikConfigured = isAuthentikConfigured();
  const shouldUseAuthentikSocialLogin = authentikSocialLoginMode !== 'supabase';
  const shouldForceAuthentikSocialLogin = authentikSocialLoginMode === 'authentik';
  const shouldShowAuthentikSocialButtons =
    shouldUseAuthentikSocialLogin && (shouldForceAuthentikSocialLogin || authentikConfigured);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [submitMode, setSubmitMode] = useState<SubmitMode>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [confirmationCodeRequired, setConfirmationCodeRequired] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authStep, setAuthStep] = useState<AuthStep>('form');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [requiredFields, setRequiredFields] = useState<RequiredFieldState>(() =>
    createDefaultRequiredFieldState()
  );

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const confirmationCodeInputRef = useRef<TextInput>(null);

  const googleProvider = resolvePrimaryOAuthProvider();

  const rawEffectiveError = localError ?? error;
  const effectiveError = rawEffectiveError
    ? getMessage(rawEffectiveError, t('authModal.errors.authenticationFailed'))
    : null;
  const isBusy = loading || submitMode !== null;
  const isModal = presentation === 'modal';
  const { height: windowHeight } = useWindowDimensions();
  const hasEmailInputError = requiredFields.email || invalidEmail;

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      setResendCooldown((seconds) => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);

    return (): void => clearTimeout(timeout);
  }, [resendCooldown]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const pendingProvider = readPendingAuthentikOAuthProvider();
    if (pendingProvider !== 'google' && pendingProvider !== 'discord') {
      return;
    }

    setSubmitMode(pendingProvider);
    void resumePendingSocialSignIn({
      client,
      redirectTo: authReturnTo,
      forceFreshSession: false,
      strategy: loginStrategy,
      resolveProvider: (pendingProvider: 'google' | 'discord') =>
        pendingProvider === 'google' ? googleProvider : pendingProvider,
      onRelayRoute: (route: AuthentikRelayRoute) => {
        router.replace(route);
      },
    })
      .catch((authError: unknown) => {
        setLocalError(getMessage(authError, t('authModal.errors.authenticationFailed')));
      })
      .finally(() => {
        setSubmitMode(null);
      });
  }, [authReturnTo, client, googleProvider, loginStrategy, router, t]);

  const transitionToStep = (step: AuthStep): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAuthStep(step);
  };

  const resetMessages = (): void => {
    setLocalError(null);
    setNotice(null);
  };

  const clearRequiredFields = (): void => {
    setRequiredFields(createDefaultRequiredFieldState());
    setInvalidEmail(false);
  };

  const clearRequiredField = (field: RequiredField): void => {
    setRequiredFields((current) => {
      if (field === 'email') {
        return current.email
          ? {
              ...current,
              email: false,
            }
          : current;
      }

      if (field === 'password') {
        return current.password
          ? {
              ...current,
              password: false,
            }
          : current;
      }

      return current.confirmPassword
        ? {
            ...current,
            confirmPassword: false,
          }
        : current;
    });
  };

  const focusRequiredField = (field: RequiredField): void => {
    if (field === 'email') {
      emailInputRef.current?.focus();
      return;
    }

    if (field === 'password') {
      passwordInputRef.current?.focus();
      return;
    }

    confirmPasswordInputRef.current?.focus();
  };

  const validateRequiredFields = (fields: RequiredField[]): boolean => {
    const nextRequiredState = createDefaultRequiredFieldState();
    let firstMissingField: RequiredField | null = null;

    for (const field of fields) {
      const value =
        field === 'email'
          ? email.trim()
          : field === 'password'
          ? password.trim()
          : confirmPassword.trim();
      const isMissing = !value;

      if (field === 'email') {
        nextRequiredState.email = isMissing;
      } else if (field === 'password') {
        nextRequiredState.password = isMissing;
      } else {
        nextRequiredState.confirmPassword = isMissing;
      }
      if (!firstMissingField && isMissing) {
        firstMissingField = field;
      }
    }

    setRequiredFields(nextRequiredState);

    if (firstMissingField) {
      focusRequiredField(firstMissingField);
      return false;
    }

    return true;
  };

  const normalizeEmailOrSetError = (rawEmail: string): string | null => {
    try {
      const normalizedEmail = parseEmailAddress(rawEmail);
      setInvalidEmail(false);
      return normalizedEmail;
    } catch (validationError) {
      setInvalidEmail(true);
      clearRequiredField('email');
      if (authStep === 'form') {
        focusRequiredField('email');
      }
      setLocalError(t('authModal.validation.validEmail'));
      return null;
    }
  };

  const normalizeConfirmationCode = (rawCode: string): string => {
    return rawCode.trim().replace(/\s+/g, '');
  };

  const transitionToSignInForm = (
    prefilledEmail: string,
    nextNotice: string | null = null
  ): void => {
    transitionToStep('form');
    setMode('signin');
    setEmail(prefilledEmail);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setConfirmationCode('');
    setConfirmationCodeRequired(false);
    clearRequiredFields();
    setLocalError(null);
    setNotice(nextNotice);
  };

  const handleEmailSignIn = async (): Promise<void> => {
    resetMessages();

    if (!validateRequiredFields(['email', 'password'])) {
      setLocalError(t('authModal.validation.emailAndPasswordRequired'));
      return;
    }

    const normalizedEmail = normalizeEmailOrSetError(email);
    if (!normalizedEmail) {
      return;
    }

    setSubmitMode('signin');
    try {
      await signInWithEmail(normalizedEmail, password);
    } catch (authError) {
      const message = getMessage(authError, t('authModal.errors.authenticationFailed'));
      if (normalizedEmail && isEmailNotConfirmedMessage(message)) {
        setConfirmationEmail(normalizedEmail);
        setConfirmationCode('');
        setConfirmationCodeRequired(false);
        setNotice(t('authModal.notices.unverifiedEmail'));
        transitionToStep('emailConfirmation');
      }
      setLocalError(message);
    } finally {
      setSubmitMode(null);
    }
  };

  const handleEmailSignUp = async (): Promise<void> => {
    resetMessages();

    if (!validateRequiredFields(['email', 'password', 'confirmPassword'])) {
      setLocalError(t('authModal.validation.emailPasswordConfirmationRequired'));
      return;
    }

    const normalizedEmail = normalizeEmailOrSetError(email);
    if (!normalizedEmail) {
      return;
    }

    try {
      parseSignUpPassword(password);
    } catch {
      setLocalError(t('authModal.validation.passwordMin'));
      return;
    }

    // Comparing two user-entered form fields locally is not a secret check.
    // eslint-disable-next-line security/detect-possible-timing-attacks
    if (password !== confirmPassword) {
      setLocalError(t('authModal.validation.passwordMismatch'));
      return;
    }

    if (!isEmailAuthCapable(client) || !client.signUpWithEmail) {
      setLocalError(t('authModal.errors.signupUnavailable'));
      return;
    }

    setSubmitMode('signup');
    try {
      const result = await client.signUpWithEmail(normalizedEmail, password, locale);

      if (result.needsEmailVerification) {
        setConfirmationEmail(normalizedEmail);
        setConfirmationCode('');
        setConfirmationCodeRequired(false);
        if (result.emailAlreadyRegistered) {
          setLocalError(t('authModal.errors.accountExistsSignInOrResend'));
          setNotice(t('authModal.notices.requestNewConfirmation'));
          setResendCooldown(0);
        } else {
          setNotice(t('authModal.notices.confirmationSent', { email: normalizedEmail }));
          if (result.confirmationEmailSent) {
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
          }
        }
        setMode('signin');
        transitionToStep('emailConfirmation');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        clearRequiredFields();
        return;
      }

      setConfirmationEmail(null);
      setResendCooldown(0);
      setNotice(t('authModal.notices.accountCreatedSigningIn'));
    } catch (authError) {
      setLocalError(getMessage(authError, t('authModal.errors.authenticationFailed')));
    } finally {
      setSubmitMode(null);
    }
  };

  const handleResendConfirmation = async (): Promise<void> => {
    resetMessages();

    const emailCandidate = (confirmationEmail ?? email).trim();
    if (!emailCandidate) {
      setLocalError(t('authModal.errors.enterEmailFirst'));
      return;
    }

    const normalizedEmail = normalizeEmailOrSetError(emailCandidate);
    if (!normalizedEmail) {
      return;
    }

    if (!supportsConfirmationResend(client) || !client.resendEmailConfirmation) {
      setLocalError(t('authModal.errors.resendUnavailable'));
      return;
    }

    if (resendCooldown > 0) {
      return;
    }

    setSubmitMode('resend');
    try {
      await client.resendEmailConfirmation(normalizedEmail);
      setConfirmationEmail(normalizedEmail);
      setNotice(t('authModal.notices.confirmationSent', { email: normalizedEmail }));
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (authError) {
      setLocalError(getMessage(authError, t('authModal.errors.authenticationFailed')));
    } finally {
      setSubmitMode(null);
    }
  };

  const handleVerifyConfirmationCode = async (): Promise<void> => {
    resetMessages();
    setConfirmationCodeRequired(false);

    const emailCandidate = (confirmationEmail ?? email).trim();
    if (!emailCandidate) {
      setLocalError(t('authModal.errors.enterEmailFirst'));
      return;
    }

    const normalizedEmail = normalizeEmailOrSetError(emailCandidate);
    if (!normalizedEmail) {
      return;
    }

    if (!supportsConfirmationCodeVerification(client) || !client.verifyEmailConfirmationCode) {
      setLocalError(t('authModal.errors.verificationCodeUnavailable'));
      return;
    }

    const normalizedCode = normalizeConfirmationCode(confirmationCode);
    if (!normalizedCode) {
      setConfirmationCodeRequired(true);
      confirmationCodeInputRef.current?.focus();
      setLocalError(t('authModal.validation.confirmationCodeRequired'));
      return;
    }

    setSubmitMode('verifyCode');
    try {
      await client.verifyEmailConfirmationCode(normalizedEmail, normalizedCode);
      setConfirmationEmail(normalizedEmail);
      setResendCooldown(0);
      transitionToSignInForm(normalizedEmail, t('authModal.notices.emailConfirmedSignIn'));
    } catch (authError) {
      setLocalError(getMessage(authError, t('authModal.errors.confirmationCodeInvalid')));
    } finally {
      setSubmitMode(null);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'discord'): Promise<void> => {
    resetMessages();
    setSubmitMode(provider);
    try {
      await startSocialSignIn({
        client,
        provider: provider === 'google' ? googleProvider : provider,
        authentikProviderHint: provider,
        redirectTo: authReturnTo,
        forceFreshSession: forceFreshSocialSession,
        strategy: loginStrategy,
        onRelayRoute: (route: AuthentikRelayRoute) => {
          router.replace(route);
        },
      });
    } catch (oidcError) {
      setLocalError(getMessage(oidcError, t('authModal.errors.authenticationFailed')));
    } finally {
      setSubmitMode(null);
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    await handleSocialSignIn('google');
  };

  const handleDiscordSignIn = async (): Promise<void> => {
    await handleSocialSignIn('discord');
  };

  const handleWalletConnect = async (walletType: string): Promise<void> => {
    setWalletModalVisible(false);
    resetMessages();
    setSubmitMode('wallet');
    try {
      await signIn({
        provider: walletType,
        flow: 'native',
      });
    } catch (authError) {
      setLocalError(getMessage(authError, t('authModal.errors.authenticationFailed')));
    } finally {
      setSubmitMode(null);
    }
  };

  const switchMode = (nextMode: AuthMode): void => {
    if (nextMode === mode && authStep === 'form') {
      return;
    }

    transitionToStep('form');
    setMode(nextMode);
    resetMessages();
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setConfirmationCode('');
    setConfirmationCodeRequired(false);
    clearRequiredFields();
    if (nextMode === 'signup') {
      setConfirmationEmail(null);
      setResendCooldown(0);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        isModal && styles.modalScreen,
        { backgroundColor: isModal ? p.overlay : p.screenBg },
      ]}
    >
      {isModal ? (
        <View pointerEvents='none' style={styles.shaderBackdrop}>
          <ShaderBackground opacity={0.52} />
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isModal && styles.scrollContentModal,
            { minHeight: windowHeight },
          ]}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              isModal && styles.cardModal,
              { backgroundColor: p.cardBg, borderColor: p.cardBorder },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.titleLockup}>
                <ExpoImage
                  source={p.isDark ? AIRS_LOGOTIPO_LIGHT : AIRS_LOGOTIPO_DARK}
                  style={styles.titleWordmark}
                  contentFit='contain'
                />
                <Text style={[styles.subtitle, { color: p.textMuted }]}>
                  {t('authModal.notices.secureSignIn')}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <View style={styles.settingsMenuContainer}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSettingsMenuOpen((prev) => !prev)}
                    style={[
                      styles.settingsButton,
                      {
                        borderColor: settingsMenuOpen ? p.accent : p.cardBorder,
                        backgroundColor: settingsMenuOpen ? p.accentMuted : undefined,
                      },
                    ]}
                  >
                    <Settings size={15} color={settingsMenuOpen ? p.accent : p.iconDefault} />
                  </TouchableOpacity>
                  <AnimatedCollapsibleContent
                    expanded={settingsMenuOpen}
                    style={[
                      styles.settingsDropdown,
                      { backgroundColor: p.dropdownBg, borderColor: p.dropdownBorder },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => cycleLanguage()}
                      style={styles.settingsDropdownItem}
                    >
                      <Languages size={13} color={p.iconDefault} />
                      <Text style={[styles.settingsDropdownLabel, { color: p.dropdownMuted }]}>
                        {t('labels.language')}
                      </Text>
                      <Text style={[styles.settingsDropdownValue, { color: p.dropdownValue }]}>
                        {getLocaleLabel(language, language)}
                      </Text>
                    </TouchableOpacity>
                    <View
                      style={[
                        styles.settingsDropdownDivider,
                        { backgroundColor: p.dropdownDivider },
                      ]}
                    />
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => toggleThemeMode()}
                      style={styles.settingsDropdownItem}
                    >
                      <ThemeIcon size={13} color={p.iconDefault} />
                      <Text style={[styles.settingsDropdownLabel, { color: p.dropdownMuted }]}>
                        {t('labels.theme')}
                      </Text>
                      <Text style={[styles.settingsDropdownValue, { color: p.dropdownValue }]}>
                        {themeLabel}
                      </Text>
                    </TouchableOpacity>
                  </AnimatedCollapsibleContent>
                </View>
                {onCancel ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onCancel}
                    style={[styles.closeButton, { borderColor: p.cardBorder }]}
                  >
                    <X size={16} color={p.iconDefault} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {authStep === 'form' ? (
              <>
                <View
                  style={[
                    styles.modeSwitch,
                    { borderColor: p.inputBorder, backgroundColor: p.inputBg },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => switchMode('signin')}
                    style={[
                      styles.modeButton,
                      mode === 'signin' && [
                        styles.modeButtonActive,
                        { backgroundColor: p.accentMuted },
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        { color: p.textMuted },
                        mode === 'signin' && { color: p.accent },
                      ]}
                    >
                      {t('authModal.modes.signIn')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => switchMode('signup')}
                    style={[
                      styles.modeButton,
                      mode === 'signup' && [
                        styles.modeButtonActive,
                        { backgroundColor: p.accentMuted },
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        { color: p.textMuted },
                        mode === 'signup' && { color: p.accent },
                      ]}
                    >
                      {t('authModal.modes.signUp')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: p.inputBg, borderColor: p.inputBorder },
                    hasEmailInputError && {
                      backgroundColor: p.errorBg,
                      borderColor: p.errorBorder,
                    },
                  ]}
                >
                  <Mail size={16} color={hasEmailInputError ? p.errorIcon : p.textMuted} />
                  <TextInput
                    ref={emailInputRef}
                    autoCapitalize='none'
                    autoCorrect={false}
                    keyboardType='email-address'
                    onChangeText={(value) => {
                      setEmail(value);
                      clearRequiredField('email');
                      setInvalidEmail(false);
                    }}
                    placeholder={t('authModal.placeholders.email')}
                    placeholderTextColor={p.textPlaceholder}
                    style={[styles.input, { color: p.textPrimary }]}
                    value={email}
                  />
                </View>
                {requiredFields.email ? (
                  <Text style={[styles.requiredFieldText, { color: p.errorText }]}>
                    {t('authModal.validation.emailRequired')}
                  </Text>
                ) : invalidEmail ? (
                  <Text style={[styles.requiredFieldText, { color: p.errorText }]}>
                    {t('authModal.validation.validEmail')}
                  </Text>
                ) : null}

                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: p.inputBg, borderColor: p.inputBorder },
                    requiredFields.password && {
                      backgroundColor: p.errorBg,
                      borderColor: p.errorBorder,
                    },
                  ]}
                >
                  <Lock size={16} color={requiredFields.password ? p.errorIcon : p.textMuted} />
                  <TextInput
                    ref={passwordInputRef}
                    autoCapitalize='none'
                    autoCorrect={false}
                    onChangeText={(value) => {
                      setPassword(value);
                      clearRequiredField('password');
                    }}
                    placeholder={t('authModal.placeholders.password')}
                    placeholderTextColor={p.textPlaceholder}
                    secureTextEntry={!showPassword}
                    style={[styles.input, { color: p.textPrimary }]}
                    value={password}
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowPassword((current) => !current)}
                    style={styles.visibilityToggle}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color={p.textSecondary} />
                    ) : (
                      <Eye size={16} color={p.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
                {requiredFields.password ? (
                  <Text style={[styles.requiredFieldText, { color: p.errorText }]}>
                    {t('authModal.validation.passwordRequired')}
                  </Text>
                ) : null}

                {mode === 'signup' ? (
                  <>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: p.inputBg, borderColor: p.inputBorder },
                        requiredFields.confirmPassword && {
                          backgroundColor: p.errorBg,
                          borderColor: p.errorBorder,
                        },
                      ]}
                    >
                      <Lock
                        size={16}
                        color={requiredFields.confirmPassword ? p.errorIcon : p.textMuted}
                      />
                      <TextInput
                        ref={confirmPasswordInputRef}
                        autoCapitalize='none'
                        autoCorrect={false}
                        onChangeText={(value) => {
                          setConfirmPassword(value);
                          clearRequiredField('confirmPassword');
                        }}
                        placeholder={t('authModal.placeholders.confirmPassword')}
                        placeholderTextColor={p.textPlaceholder}
                        secureTextEntry={!showConfirmPassword}
                        style={[styles.input, { color: p.textPrimary }]}
                        value={confirmPassword}
                      />
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setShowConfirmPassword((current) => !current)}
                        style={styles.visibilityToggle}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={16} color={p.textSecondary} />
                        ) : (
                          <Eye size={16} color={p.textSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>
                    {requiredFields.confirmPassword ? (
                      <Text style={[styles.requiredFieldText, { color: p.errorText }]}>
                        {t('authModal.validation.confirmPasswordRequired')}
                      </Text>
                    ) : null}
                  </>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isBusy}
                  onPress={() => {
                    if (mode === 'signin') {
                      void handleEmailSignIn();
                    } else {
                      void handleEmailSignUp();
                    }
                  }}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: p.primaryBtnBg },
                    isBusy && styles.buttonDisabled,
                  ]}
                >
                  {submitMode === 'signin' || submitMode === 'signup' ? (
                    <ActivityIndicator color={p.primaryBtnText} size='small' />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: p.primaryBtnText }]}>
                      {mode === 'signin'
                        ? t('authModal.actions.continueWithEmail')
                        : t('authModal.actions.createAccount')}
                    </Text>
                  )}
                </TouchableOpacity>

                {mode === 'signin' ? (
                  <>
                    <View style={styles.dividerRow}>
                      <View style={[styles.dividerLine, { backgroundColor: p.divider }]} />
                      <Text style={[styles.dividerText, { color: p.textMuted }]}>
                        {t('authModal.divider.or')}
                      </Text>
                      <View style={[styles.dividerLine, { backgroundColor: p.divider }]} />
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={isBusy}
                      onPress={() => {
                        void handleGoogleSignIn();
                      }}
                      style={[
                        styles.secondaryButton,
                        { backgroundColor: p.secondaryBtnBg, borderColor: p.secondaryBtnBorder },
                        isBusy && styles.buttonDisabled,
                      ]}
                    >
                      {submitMode === 'google' ? (
                        <ActivityIndicator color={p.secondaryBtnText} size='small' />
                      ) : (
                        <>
                          <Chrome size={16} color={p.secondaryBtnText} />
                          <Text style={[styles.secondaryButtonText, { color: p.secondaryBtnText }]}>
                            {t('authModal.actions.continueWithGoogle')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {shouldShowAuthentikSocialButtons ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={isBusy}
                        onPress={() => {
                          void handleDiscordSignIn();
                        }}
                        style={[
                          styles.secondaryButton,
                          { backgroundColor: p.secondaryBtnBg, borderColor: p.secondaryBtnBorder },
                          isBusy && styles.buttonDisabled,
                        ]}
                      >
                        {submitMode === 'discord' ? (
                          <ActivityIndicator color={p.secondaryBtnText} size='small' />
                        ) : (
                          <>
                            <MessageSquare size={16} color={p.secondaryBtnText} />
                            <Text
                              style={[styles.secondaryButtonText, { color: p.secondaryBtnText }]}
                            >
                              {t('authModal.actions.continueWithDiscord')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}

                    {ENABLE_WEB3_LOGIN && (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={isBusy}
                        onPress={() => setWalletModalVisible(true)}
                        style={[
                          styles.secondaryButton,
                          { backgroundColor: p.secondaryBtnBg, borderColor: p.secondaryBtnBorder },
                          isBusy && styles.buttonDisabled,
                        ]}
                      >
                        {submitMode === 'wallet' ? (
                          <ActivityIndicator color={p.secondaryBtnText} size='small' />
                        ) : (
                          <>
                            <Wallet size={16} color={p.secondaryBtnText} />
                            <Text
                              style={[styles.secondaryButtonText, { color: p.secondaryBtnText }]}
                            >
                              {t('authModal.actions.connectWallet')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </>
                ) : null}

                {notice ? (
                  <View
                    style={[
                      styles.noticeBox,
                      { backgroundColor: p.noticeBg, borderColor: p.noticeBorder },
                    ]}
                  >
                    <Text style={[styles.noticeText, { color: p.noticeText }]}>{notice}</Text>
                  </View>
                ) : null}

                {effectiveError ? (
                  <View
                    style={[
                      styles.errorBox,
                      { backgroundColor: p.errorBg, borderColor: p.errorBorder },
                    ]}
                  >
                    <AlertCircle color={p.errorIcon} size={14} />
                    <Text style={[styles.errorText, { color: p.errorText }]}>{effectiveError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isBusy}
                  onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                  style={styles.footerToggle}
                >
                  <Text style={[styles.footerToggleText, { color: p.textMuted }]}>
                    {mode === 'signin'
                      ? t('authModal.footer.dontHaveAccount')
                      : t('authModal.footer.alreadyHaveAccount')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.confirmationIntro,
                    { backgroundColor: p.noticeBg, borderColor: p.noticeBorder },
                  ]}
                >
                  <View
                    style={[
                      styles.confirmationIconWrap,
                      { borderColor: p.noticeBorder, backgroundColor: p.noticeBg },
                    ]}
                  >
                    <Mail size={18} color={p.noticeText} />
                  </View>
                  <Text style={[styles.confirmationTitle, { color: p.noticeText }]}>
                    {t('authModal.confirmation.checkEmail')}
                  </Text>
                  <Text style={[styles.confirmationSubtitle, { color: p.textSecondary }]}>
                    {t('authModal.confirmation.linkSentTo')}
                  </Text>
                  <Text style={[styles.confirmationEmail, { color: p.textPrimary }]}>
                    {confirmationEmail ?? t('authModal.confirmation.emailFallback')}
                  </Text>
                  <Text style={[styles.confirmationHint, { color: p.textSecondary }]}>
                    {t('authModal.confirmation.codeOrLinkHint')}
                  </Text>
                </View>

                <View
                  style={[
                    styles.resendBox,
                    { borderColor: p.inputBorder, backgroundColor: p.inputBg },
                  ]}
                >
                  <Text style={[styles.resendSectionTitle, { color: p.textPrimary }]}>
                    {t('authModal.confirmation.codeTitle')}
                  </Text>
                  <Text style={[styles.resendText, { color: p.textSecondary }]}>
                    {t('authModal.confirmation.codeBody')}
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: p.inputBg, borderColor: p.inputBorder },
                      confirmationCodeRequired && {
                        backgroundColor: p.errorBg,
                        borderColor: p.errorBorder,
                      },
                    ]}
                  >
                    <Lock size={16} color={confirmationCodeRequired ? p.errorIcon : p.textMuted} />
                    <TextInput
                      ref={confirmationCodeInputRef}
                      autoCapitalize='none'
                      autoCorrect={false}
                      keyboardType='number-pad'
                      onChangeText={(value) => {
                        setConfirmationCode(value.replace(/\s+/g, ''));
                        setConfirmationCodeRequired(false);
                      }}
                      placeholder={t('authModal.placeholders.confirmationCode')}
                      placeholderTextColor={p.textPlaceholder}
                      style={[styles.input, { color: p.textPrimary }]}
                      textContentType='oneTimeCode'
                      value={confirmationCode}
                    />
                  </View>
                  {confirmationCodeRequired ? (
                    <Text style={[styles.requiredFieldText, { color: p.errorText }]}>
                      {t('authModal.validation.confirmationCodeRequired')}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isBusy}
                    onPress={() => {
                      void handleVerifyConfirmationCode();
                    }}
                    style={[
                      styles.resendButton,
                      { borderColor: p.noticeBorder, backgroundColor: p.noticeBg },
                      isBusy && styles.buttonDisabled,
                    ]}
                  >
                    {submitMode === 'verifyCode' ? (
                      <ActivityIndicator color={p.accent} size='small' />
                    ) : (
                      <Text style={[styles.resendButtonText, { color: p.noticeText }]}>
                        {t('authModal.actions.verifyConfirmationCode')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {notice ? (
                  <View
                    style={[
                      styles.noticeBox,
                      { backgroundColor: p.noticeBg, borderColor: p.noticeBorder },
                    ]}
                  >
                    <Text style={[styles.noticeText, { color: p.noticeText }]}>{notice}</Text>
                  </View>
                ) : null}

                {effectiveError ? (
                  <View
                    style={[
                      styles.errorBox,
                      { backgroundColor: p.errorBg, borderColor: p.errorBorder },
                    ]}
                  >
                    <AlertCircle color={p.errorIcon} size={14} />
                    <Text style={[styles.errorText, { color: p.errorText }]}>{effectiveError}</Text>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.resendBox,
                    { borderColor: p.inputBorder, backgroundColor: p.inputBg },
                  ]}
                >
                  <Text style={[styles.resendSectionTitle, { color: p.textPrimary }]}>
                    {t('authModal.resend.title')}
                  </Text>
                  <Text style={[styles.resendText, { color: p.textSecondary }]}>
                    {t('authModal.resend.body')}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isBusy || resendCooldown > 0}
                    onPress={() => {
                      void handleResendConfirmation();
                    }}
                    style={[
                      styles.resendButton,
                      { borderColor: p.noticeBorder, backgroundColor: p.noticeBg },
                      (isBusy || resendCooldown > 0) && styles.buttonDisabled,
                    ]}
                  >
                    {submitMode === 'resend' ? (
                      <ActivityIndicator color={p.accent} size='small' />
                    ) : (
                      <Text style={[styles.resendButtonText, { color: p.noticeText }]}>
                        {resendCooldown > 0
                          ? t('authModal.resend.sendAgainIn', { seconds: resendCooldown })
                          : t('authModal.resend.sendAgain')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isBusy}
                  onPress={() => {
                    transitionToSignInForm(confirmationEmail ?? '');
                  }}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: p.primaryBtnBg },
                    isBusy && styles.buttonDisabled,
                  ]}
                >
                  <Text style={[styles.primaryButtonText, { color: p.primaryBtnText }]}>
                    {t('authModal.actions.alreadyConfirmedContinue')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isBusy}
                  onPress={() => {
                    transitionToStep('form');
                    setMode('signup');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                    setConfirmationEmail(null);
                    setConfirmationCode('');
                    setConfirmationCodeRequired(false);
                    setResendCooldown(0);
                    clearRequiredFields();
                    resetMessages();
                  }}
                  style={styles.footerToggle}
                >
                  <Text style={[styles.footerToggleText, { color: p.textMuted }]}>
                    {t('authModal.actions.useAnotherEmail')}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Footer with Privacy, Terms, Version, Help */}
            <AuthFooter locale={locale} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <WalletConnectModal
        visible={walletModalVisible}
        onClose={() => setWalletModalVisible(false)}
        onConnect={(walletType) => {
          void handleWalletConnect(walletType);
        }}
      />
    </View>
  );
}

const styles = createTypographyStyles({
  screen: {
    flex: 1,
    backgroundColor: '#050510',
  },
  modalScreen: {
    backgroundColor: 'rgba(5,5,16,0.82)',
  },
  shaderBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  scrollContentModal: {
    alignItems: 'center',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(13,13,31,0.92)',
    padding: 18,
    gap: 12,
  },
  cardModal: {
    width: '100%',
    maxWidth: 520,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 4,
    zIndex: 50,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    zIndex: 50,
  },
  settingsMenuContainer: {
    position: 'relative',
    zIndex: 100,
  },
  settingsButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonActive: {
    borderColor: 'rgba(28,203,161,0.4)',
    backgroundColor: 'rgba(28,203,161,0.08)',
  },
  settingsDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    zIndex: 9999,
    minWidth: 168,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#07071a',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 24,
  },
  settingsDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  settingsDropdownLabel: {
    flex: 1,
    color: 'rgba(232,232,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsDropdownValue: {
    color: '#1ccba1',
    fontSize: 12,
    fontWeight: '700',
  },
  settingsDropdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 10,
  },
  titleLockup: {
    gap: 6,
  },
  titleWordmark: {
    width: 96,
    height: 34,
  },
  subtitle: {
    color: 'rgba(232,232,255,0.55)',
    fontSize: 13,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  modeButton: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(28,203,161,0.16)',
  },
  modeButtonText: {
    color: 'rgba(232,232,255,0.6)',
    fontSize: 13,
    fontWeight: '700',
  },
  modeButtonTextActive: {
    color: '#1ccba1',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputWrapperRequired: {
    borderColor: 'rgba(248,113,113,0.75)',
    backgroundColor: 'rgba(248,113,113,0.12)',
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: '#e8e8ff',
    fontSize: 14,
    paddingVertical: 0,
  },
  requiredFieldText: {
    marginTop: -4,
    marginLeft: 4,
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '600',
  },
  visibilityToggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#1ccba1',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#050510',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: '#e8e8ff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmationIntro: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.25)',
    backgroundColor: 'rgba(28,203,161,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
  },
  confirmationIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(102,230,197,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(102,230,197,0.08)',
  },
  confirmationTitle: {
    color: '#66e6c5',
    fontSize: 17,
    fontWeight: '800',
  },
  confirmationSubtitle: {
    color: 'rgba(232,232,255,0.7)',
    fontSize: 12,
  },
  confirmationEmail: {
    color: '#e8e8ff',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmationHint: {
    marginTop: 2,
    color: 'rgba(232,232,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: 'rgba(232,232,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
  },
  noticeBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.32)',
    backgroundColor: 'rgba(28,203,161,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noticeText: {
    color: '#66e6c5',
    fontSize: 12,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    backgroundColor: 'rgba(248,113,113,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
  },
  resendBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,232,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  resendText: {
    color: 'rgba(232,232,255,0.78)',
    fontSize: 12,
    lineHeight: 17,
  },
  resendSectionTitle: {
    color: '#e8e8ff',
    fontSize: 13,
    fontWeight: '700',
  },
  resendButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(28,203,161,0.35)',
    backgroundColor: 'rgba(28,203,161,0.12)',
    minHeight: 36,
    paddingHorizontal: 10,
  },
  resendButtonText: {
    color: '#66e6c5',
    fontSize: 12,
    fontWeight: '700',
  },
  footerToggle: {
    alignItems: 'center',
    marginTop: 2,
    paddingVertical: 6,
  },
  footerToggleText: {
    color: 'rgba(232,232,255,0.65)',
    fontSize: 12,
    fontWeight: '600',
  },
});
