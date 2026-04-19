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
  AtSign,
  Eye,
  EyeOff,
  Languages,
  KeyRound,
  LockKeyhole,
  Mail,
  MessageSquare,
  Moon,
  Settings,
  Sun,
  Wallet,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import { getLocaleLabel } from '@alternun/i18n';
import { ToastSystem, type ToastItem } from '@alternun/ui';
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
import LoadingButton from '../common/LoadingButton';
import { AuthFooter } from './AuthFooter';
import { getAuthErrorMessage, getSocialSignInErrorMessage } from './authErrorMessages';
const RESEND_COOLDOWN_SECONDS = 45;

// Feature flags
const ENABLE_WEB3_LOGIN = false; // Temporarily disabled: full web3 login flow not implemented

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AIRS_LOGO_LIGHT = require('../../assets/AIRS-logo-light.png') as number;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AIRS_LOGO_LIGHT_2X = require('../../assets/AIRS-logo-light-2x.png') as number;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AIRS_LOGO_DARK = require('../../assets/AIRS-logo-dark.png') as number;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AIRS_LOGO_DARK_2X = require('../../assets/AIRS-logo-dark-2x.png') as number;

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
type InputFocusField = RequiredField | 'confirmationCode';

interface RequiredFieldState {
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

interface SignUpResult {
  needsEmailVerification: boolean;
  emailAlreadyRegistered?: boolean;
  confirmationEmailSent?: boolean;
  error?: string;
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

function isEmailAuthCapable(client: unknown): client is EmailAuthCapableClient {
  return Boolean(
    client && typeof (client as EmailAuthCapableClient).signUpWithEmail === 'function'
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
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [authStep, setAuthStep] = useState<AuthStep>('form');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [focusedField, setFocusedField] = useState<InputFocusField | null>(null);
  const [requiredFields, setRequiredFields] = useState<RequiredFieldState>(() =>
    createDefaultRequiredFieldState()
  );
  const [passwordValidationError, setPasswordValidationError] = useState<string | null>(null);

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const confirmationCodeInputRef = useRef<TextInput>(null);
  const emailLabelAnim = useRef(new Animated.Value(0)).current;
  const passwordLabelAnim = useRef(new Animated.Value(0)).current;
  const confirmLabelAnim = useRef(new Animated.Value(0)).current;
  const codeLabelAnim = useRef(new Animated.Value(0)).current;
  const toastIdRef = useRef(0);
  const toastTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const googleProvider = resolvePrimaryOAuthProvider();

  const rawEffectiveError = localError ?? (submitMode !== null ? error : null);
  const effectiveError = rawEffectiveError
    ? getAuthErrorMessage(rawEffectiveError, t('authModal.errors.authenticationFailed'))
    : null;
  const isBusy = loading || submitMode !== null;
  const isModal = presentation === 'modal';
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth >= 720;
  const isCompactModal = isModal && windowWidth < 560;
  const wordmarkSource = isDesktop
    ? p.isDark
      ? AIRS_LOGO_LIGHT_2X
      : AIRS_LOGO_DARK_2X
    : p.isDark
    ? AIRS_LOGO_LIGHT
    : AIRS_LOGO_DARK;
  const hasEmailInputError = requiredFields.email || invalidEmail;
  const dismissToast = useCallback((id: string): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (title: string, message: string): void => {
      const toastId = `auth-toast-${++toastIdRef.current}`;
      setToasts((current) => [
        ...current,
        {
          id: toastId,
          type: 'error',
          title,
          message,
        },
      ]);

      const timeout = setTimeout(() => {
        dismissToast(toastId);
        toastTimeoutsRef.current = toastTimeoutsRef.current.filter((entry) => entry !== timeout);
      }, 4500);
      toastTimeoutsRef.current = [...toastTimeoutsRef.current, timeout];
    },
    [dismissToast]
  );

  const showSocialSignInFailure = useCallback(
    (authError: unknown): string => {
      const message = getSocialSignInErrorMessage(authError, {
        unavailable: t('authModal.errors.socialSignInUnavailable'),
        serverError: t('authModal.errors.socialSignInServerError'),
        fallback: t('authModal.errors.authenticationFailed'),
      });
      setLocalError(message);
      pushToast(t('authModal.errors.socialSignInTitle'), message);
      return message;
    },
    [pushToast, t]
  );

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
        showSocialSignInFailure(authError);
      })
      .finally(() => {
        setSubmitMode(null);
      });
  }, [authReturnTo, client, googleProvider, loginStrategy, router, showSocialSignInFailure]);

  useEffect(() => {
    return () => {
      for (const timeout of toastTimeoutsRef.current) {
        clearTimeout(timeout);
      }
      toastTimeoutsRef.current = [];
    };
  }, []);

  const animateLabel = (anim: Animated.Value, visible: boolean): void => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const transitionToStep = (step: AuthStep): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAuthStep(step);
  };

  const resetMessages = (): void => {
    setLocalError(null);
    setNotice(null);
    setToasts([]);
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
    setPasswordMismatch(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setConfirmationCode('');
    setConfirmationCodeRequired(false);
    clearRequiredFields();
    emailLabelAnim.setValue(prefilledEmail.length > 0 ? 1 : 0);
    passwordLabelAnim.setValue(0);
    confirmLabelAnim.setValue(0);
    codeLabelAnim.setValue(0);
    setLocalError(null);
    setNotice(nextNotice);
    setSubmitMode(null);
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
      const message = getAuthErrorMessage(authError, t('authModal.errors.authenticationFailed'));
      if (normalizedEmail && isEmailNotConfirmedMessage(message)) {
        setConfirmationEmail(normalizedEmail);
        setConfirmationCode('');
        setConfirmationCodeRequired(false);
        setNotice(t('authModal.notices.unverifiedEmail'));
        transitionToStep('emailConfirmation');
      }
      setLocalError(message);
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
    setLocalError(null);
    try {
      const result = await client.signUpWithEmail(normalizedEmail, password, locale);

      if (result.error && typeof result.error === 'string') {
        setLocalError(result.error);
        setSubmitMode(null);
        return;
      }

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
        setSubmitMode(null);
        return;
      }

      setConfirmationEmail(null);
      setResendCooldown(0);
      setNotice(t('authModal.notices.accountCreatedSigningIn'));
      setSubmitMode(null);
    } catch (authError) {
      setLocalError(getAuthErrorMessage(authError, t('authModal.errors.authenticationFailed')));
      setSubmitMode(null);
    }
  };

  const handleResendConfirmation = async (): Promise<void> => {
    resetMessages();

    if (resendCooldown > 0) {
      return;
    }

    const emailCandidate = (confirmationEmail ?? email).trim();
    if (!emailCandidate) {
      setLocalError(t('authModal.errors.enterEmailFirst'));
      return;
    }

    const normalizedEmail = normalizeEmailOrSetError(emailCandidate);
    if (!normalizedEmail) {
      return;
    }

    if (!client || typeof client.resendEmailConfirmation !== 'function') {
      const msg = 'Resend not available. Check your email inbox or spam folder.';
      setLocalError(msg);
      pushToast(t('authModal.errors.authenticationFailed'), msg);
      return;
    }

    setSubmitMode('resend');
    try {
      const emailAuthClient = client as unknown as EmailAuthCapableClient;
      await Promise.race<void>([
        emailAuthClient.resendEmailConfirmation(normalizedEmail),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        ),
      ]);

      setConfirmationEmail(normalizedEmail);
      setNotice(t('authModal.notices.confirmationSent', { email: normalizedEmail }));
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setLocalError(null);
    } catch (authError) {
      const errorMsg =
        authError instanceof Error
          ? authError.message
          : getAuthErrorMessage(authError, 'Failed to resend confirmation email');
      setLocalError(errorMsg);
      pushToast('Resend Failed', errorMsg);
    } finally {
      setSubmitMode(null);
    }
  };

  const handleVerifyConfirmationCode = async (): Promise<void> => {
    try {
      resetMessages();
      setConfirmationCodeRequired(false);
      setSubmitMode('verifyCode');

      const emailCandidate = (confirmationEmail ?? email).trim();
      if (!emailCandidate) {
        setLocalError(t('authModal.errors.enterEmailFirst'));
        setSubmitMode(null);
        return;
      }

      const normalizedEmail = normalizeEmailOrSetError(emailCandidate);
      if (!normalizedEmail) {
        setSubmitMode(null);
        return;
      }

      const normalizedCode = normalizeConfirmationCode(confirmationCode);
      if (!normalizedCode) {
        setConfirmationCodeRequired(true);
        confirmationCodeInputRef.current?.focus();
        setLocalError(t('authModal.validation.confirmationCodeRequired'));
        setSubmitMode(null);
        return;
      }

      if (!client || typeof client.verifyEmailConfirmationCode !== 'function') {
        const msg =
          'Email verification not available. Please check your email for confirmation link.';
        setLocalError(msg);
        pushToast(t('authModal.errors.authenticationFailed'), msg);
        setSubmitMode(null);
        return;
      }

      const emailAuthClient = client as unknown as EmailAuthCapableClient;
      await emailAuthClient.verifyEmailConfirmationCode(normalizedEmail, normalizedCode);
      setConfirmationEmail(normalizedEmail);
      setResendCooldown(0);
      transitionToSignInForm(normalizedEmail, t('authModal.notices.emailConfirmedSignIn'));
    } catch (authError) {
      const errorMsg = getAuthErrorMessage(
        authError,
        t('authModal.errors.confirmationCodeInvalid')
      );
      setLocalError(errorMsg);
      pushToast(t('authModal.errors.authenticationFailed'), errorMsg);
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
      showSocialSignInFailure(oidcError);
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
      setLocalError(getAuthErrorMessage(authError, t('authModal.errors.authenticationFailed')));
      setSubmitMode(null);
    }
  };

  const switchMode = (nextMode: AuthMode): void => {
    if (nextMode === mode && authStep === 'form') {
      return;
    }

    transitionToStep('form');
    setMode(nextMode);
    setEmail('');
    resetMessages();
    setPassword('');
    setConfirmPassword('');
    setPasswordMismatch(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setPasswordValidationError(null);
    setConfirmationCode('');
    setConfirmationCodeRequired(false);
    clearRequiredFields();
    emailLabelAnim.setValue(0);
    passwordLabelAnim.setValue(0);
    confirmLabelAnim.setValue(0);
    codeLabelAnim.setValue(0);
    if (nextMode === 'signup') {
      setConfirmationEmail(null);
      setResendCooldown(0);
    }
  };

  const closeSettingsMenu = (): void => {
    setSettingsMenuOpen(false);
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
            isCompactModal && styles.scrollContentModalCompact,
            isCompactModal ? { minHeight: undefined } : { minHeight: windowHeight },
          ]}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
          onTouchStart={() => {
            if (settingsMenuOpen) {
              closeSettingsMenu();
            }
          }}
        >
          <View
            style={[
              styles.card,
              isModal && styles.cardModal,
              isCompactModal && styles.cardModalCompact,
              { backgroundColor: p.cardBg, borderColor: p.cardBorder },
            ]}
          >
            <View
              style={[
                styles.header,
                isModal && styles.headerModal,
                isCompactModal && styles.headerModalCompact,
              ]}
            >
              {isCompactModal ? (
                <>
                  <View style={styles.headerModalCompactRow}>
                    <View
                      style={[
                        styles.titleLockup,
                        styles.titleLockupModal,
                        styles.titleLockupModalCompact,
                      ]}
                    >
                      <ExpoImage
                        source={wordmarkSource}
                        style={[
                          styles.titleWordmark,
                          styles.titleWordmarkModal,
                          styles.titleWordmarkModalCompact,
                        ]}
                        contentFit='contain'
                      />
                    </View>
                    <View style={styles.headerActionsCompact}>
                      <View style={styles.settingsMenuContainer}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => setSettingsMenuOpen((prev) => !prev)}
                          style={[
                            styles.settingsButton,
                            styles.settingsButtonCompact,
                            {
                              borderColor: settingsMenuOpen ? p.accent : p.cardBorder,
                              backgroundColor: settingsMenuOpen ? p.accentMuted : undefined,
                            },
                          ]}
                        >
                          <Settings size={15} color={settingsMenuOpen ? p.accent : p.iconDefault} />
                        </TouchableOpacity>
                      </View>
                      {onCancel ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={onCancel}
                          style={[
                            styles.closeButton,
                            styles.closeButtonCompact,
                            { borderColor: p.cardBorder },
                          ]}
                        >
                          <X size={16} color={p.iconDefault} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  <AnimatedCollapsibleContent
                    expanded={settingsMenuOpen}
                    style={[
                      styles.settingsDropdown,
                      styles.settingsDropdownCompact,
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
                </>
              ) : (
                <>
                  {!isCompactModal ? (
                    <View style={[styles.titleLockup, isModal && styles.titleLockupModal]}>
                      <ExpoImage
                        source={wordmarkSource}
                        style={[
                          styles.titleWordmark,
                          isModal && styles.titleWordmarkModal,
                          isCompactModal && styles.titleWordmarkModalCompact,
                        ]}
                        contentFit='contain'
                      />
                      {!isModal && !isCompactModal ? (
                        <Text style={[styles.subtitle, { color: p.textMuted }]}>
                          {t('authModal.notices.secureSignIn')}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  <View style={[styles.headerActions, isModal && styles.headerActionsModal]}>
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
                          onPress={() => {
                            cycleLanguage();
                            closeSettingsMenu();
                          }}
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
                          onPress={() => {
                            toggleThemeMode();
                            closeSettingsMenu();
                          }}
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
                </>
              )}
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
                    style={[styles.modeButton, mode === 'signin' && { backgroundColor: p.accent }]}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        { color: p.textMuted },
                        mode === 'signin' && { color: p.accentText },
                      ]}
                    >
                      {t('authModal.modes.signIn')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => switchMode('signup')}
                    style={[styles.modeButton, mode === 'signup' && { backgroundColor: p.accent }]}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        { color: p.textMuted },
                        mode === 'signup' && { color: p.accentText },
                      ]}
                    >
                      {t('authModal.modes.signUp')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Animated.Text
                    style={[
                      styles.inputLabel,
                      { color: p.accent },
                      {
                        opacity: emailLabelAnim,
                        transform: [
                          {
                            translateY: emailLabelAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-6, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    {t('authModal.placeholders.email')}
                  </Animated.Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: p.inputBg, borderColor: p.inputBorder },
                      hasEmailInputError && {
                        backgroundColor: p.errorBg,
                        borderColor: p.errorBorder,
                      },
                      focusedField === 'email' &&
                        !hasEmailInputError && {
                          borderColor: p.inputBorderFocus,
                        },
                    ]}
                  >
                    <View
                      style={[
                        styles.inputIconWrap,
                        {
                          backgroundColor: hasEmailInputError ? p.errorBg : 'transparent',
                        },
                      ]}
                    >
                      <AtSign
                        size={15}
                        color={hasEmailInputError ? p.errorIcon : p.accent}
                        strokeWidth={2.2}
                      />
                    </View>
                    <TextInput
                      ref={emailInputRef}
                      autoCapitalize='none'
                      autoCorrect={false}
                      keyboardType='email-address'
                      onChangeText={(value) => {
                        setEmail(value);
                        clearRequiredField('email');
                        setInvalidEmail(false);
                        setLocalError(null);
                        animateLabel(emailLabelAnim, value.length > 0);
                      }}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() =>
                        setFocusedField((current) => (current === 'email' ? null : current))
                      }
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
                </View>

                <View style={styles.inputGroup}>
                  <Animated.Text
                    style={[
                      styles.inputLabel,
                      { color: p.accent },
                      {
                        opacity: passwordLabelAnim,
                        transform: [
                          {
                            translateY: passwordLabelAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-6, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    {t('authModal.placeholders.password')}
                  </Animated.Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: p.inputBg, borderColor: p.inputBorder },
                      requiredFields.password && {
                        backgroundColor: p.errorBg,
                        borderColor: p.errorBorder,
                      },
                      focusedField === 'password' &&
                        !requiredFields.password && {
                          borderColor: p.inputBorderFocus,
                        },
                    ]}
                  >
                    <View
                      style={[
                        styles.inputIconWrap,
                        {
                          backgroundColor: requiredFields.password ? p.errorBg : 'transparent',
                        },
                      ]}
                    >
                      <LockKeyhole
                        size={15}
                        color={requiredFields.password ? p.errorIcon : p.accent}
                        strokeWidth={2.15}
                      />
                    </View>
                    <TextInput
                      ref={passwordInputRef}
                      autoCapitalize='none'
                      autoCorrect={false}
                      onChangeText={(value) => {
                        setPassword(value);
                        clearRequiredField('password');
                        setLocalError(null);
                        animateLabel(passwordLabelAnim, value.length > 0);
                        // Real-time password validation
                        if (value.length > 0) {
                          try {
                            parseSignUpPassword(value);
                            setPasswordValidationError(null);
                          } catch {
                            setPasswordValidationError(t('authModal.validation.passwordMin'));
                          }
                        } else {
                          setPasswordValidationError(null);
                        }
                      }}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() =>
                        setFocusedField((current) => (current === 'password' ? null : current))
                      }
                      placeholder={t('authModal.placeholders.password')}
                      placeholderTextColor={p.textPlaceholder}
                      secureTextEntry={!showPassword}
                      style={[styles.input, { color: p.textPrimary }]}
                      value={password}
                    />
                    {password.length > 0 && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setShowPassword((current) => !current)}
                        style={[
                          styles.visibilityToggle,
                          {
                            backgroundColor:
                              focusedField === 'password' ? p.accentMuted : p.inputBg,
                            borderColor:
                              focusedField === 'password' ? p.inputBorderFocus : p.inputBorder,
                          },
                        ]}
                      >
                        {showPassword ? (
                          <EyeOff size={16} color={p.accent} />
                        ) : (
                          <Eye size={16} color={p.accent} />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                  {requiredFields.password ? (
                    <Text style={[styles.requiredFieldText, { color: p.errorText }]}>
                      {t('authModal.validation.passwordRequired')}
                    </Text>
                  ) : passwordValidationError && mode === 'signup' ? (
                    <Text style={[styles.requiredFieldText, { color: p.errorText }]}>
                      {passwordValidationError}
                    </Text>
                  ) : null}
                </View>

                {mode === 'signup' && password.length > 0 ? (
                  <View style={styles.inputGroup}>
                    <Animated.Text
                      style={[
                        styles.inputLabel,
                        { color: p.accent },
                        {
                          opacity: confirmLabelAnim,
                          transform: [
                            {
                              translateY: confirmLabelAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-6, 0],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      {t('authModal.placeholders.confirmPassword')}
                    </Animated.Text>
                    <View
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: p.inputBg, borderColor: p.inputBorder },
                        (requiredFields.confirmPassword || passwordMismatch) && {
                          backgroundColor: p.errorBg,
                          borderColor: p.errorBorder,
                        },
                        focusedField === 'confirmPassword' &&
                          !requiredFields.confirmPassword &&
                          !passwordMismatch && {
                            borderColor: p.inputBorderFocus,
                          },
                      ]}
                    >
                      <View
                        style={[
                          styles.inputIconWrap,
                          {
                            backgroundColor:
                              requiredFields.confirmPassword || passwordMismatch
                                ? p.errorBg
                                : 'transparent',
                          },
                        ]}
                      >
                        <LockKeyhole
                          size={15}
                          color={
                            requiredFields.confirmPassword || passwordMismatch
                              ? p.errorIcon
                              : p.accent
                          }
                          strokeWidth={2.15}
                        />
                      </View>
                      <TextInput
                        ref={confirmPasswordInputRef}
                        autoCapitalize='none'
                        autoCorrect={false}
                        onChangeText={(value) => {
                          setConfirmPassword(value);
                          clearRequiredField('confirmPassword');
                          setLocalError(null);
                          setPasswordMismatch(value.length > 0 && value !== password);
                          animateLabel(confirmLabelAnim, value.length > 0);
                        }}
                        onFocus={() => setFocusedField('confirmPassword')}
                        onBlur={() =>
                          setFocusedField((current) =>
                            current === 'confirmPassword' ? null : current
                          )
                        }
                        placeholder={t('authModal.placeholders.confirmPassword')}
                        placeholderTextColor={p.textPlaceholder}
                        secureTextEntry={!showConfirmPassword}
                        style={[styles.input, { color: p.textPrimary }]}
                        value={confirmPassword}
                      />
                      {confirmPassword.length > 0 && (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => setShowConfirmPassword((current) => !current)}
                          style={[
                            styles.visibilityToggle,
                            {
                              backgroundColor:
                                focusedField === 'confirmPassword' ? p.accentMuted : p.inputBg,
                              borderColor:
                                focusedField === 'confirmPassword'
                                  ? p.inputBorderFocus
                                  : p.inputBorder,
                            },
                          ]}
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={16} color={p.accent} />
                          ) : (
                            <Eye size={16} color={p.accent} />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                    {requiredFields.confirmPassword ? (
                      <Text style={[styles.requiredFieldText, { color: p.errorText }]}>
                        {t('authModal.validation.confirmPasswordRequired')}
                      </Text>
                    ) : passwordMismatch ? (
                      <Text style={[styles.requiredFieldText, { color: p.errorText }]}>
                        {t('authModal.validation.passwordMismatch')}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                <LoadingButton
                  variant='primary'
                  label={
                    mode === 'signin'
                      ? t('authModal.actions.continueWithEmail')
                      : t('authModal.actions.createAccount')
                  }
                  loadingLabel={
                    mode === 'signin'
                      ? t('authModal.redirecting.email')
                      : t('authModal.redirecting.signup')
                  }
                  isLoading={submitMode === 'signin' || submitMode === 'signup'}
                  disabled={isBusy}
                  onPress={() => {
                    if (mode === 'signin') {
                      void handleEmailSignIn();
                    } else {
                      void handleEmailSignUp();
                    }
                  }}
                />

                {mode === 'signin' ? (
                  <>
                    <View style={styles.dividerRow}>
                      <View style={[styles.dividerLine, { backgroundColor: p.divider }]} />
                      <Text style={[styles.dividerText, { color: p.textMuted }]}>
                        {t('authModal.divider.or')}
                      </Text>
                      <View style={[styles.dividerLine, { backgroundColor: p.divider }]} />
                    </View>

                    <LoadingButton
                      variant='secondary'
                      label={t('authModal.actions.continueWithGoogle')}
                      loadingLabel={t('authModal.redirecting.google')}
                      isLoading={submitMode === 'google'}
                      disabled={isBusy}
                      onPress={() => {
                        void handleGoogleSignIn();
                      }}
                      icon={Chrome}
                    />

                    {shouldShowAuthentikSocialButtons ? (
                      <LoadingButton
                        variant='secondary'
                        label={t('authModal.actions.continueWithDiscord')}
                        loadingLabel={t('authModal.redirecting.discord')}
                        isLoading={submitMode === 'discord'}
                        disabled={isBusy}
                        onPress={() => {
                          void handleDiscordSignIn();
                        }}
                        icon={MessageSquare}
                      />
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
                    <AlertCircle
                      color={p.errorIcon}
                      size={18}
                      strokeWidth={2}
                      style={{ marginTop: 1, flexShrink: 0 }}
                    />
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
                  <Animated.Text
                    style={[
                      styles.inputLabel,
                      { color: p.accent },
                      {
                        opacity: codeLabelAnim,
                        transform: [
                          {
                            translateY: codeLabelAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-6, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    {t('authModal.placeholders.confirmationCode')}
                  </Animated.Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: p.inputBg, borderColor: p.inputBorder },
                      confirmationCodeRequired && {
                        backgroundColor: p.errorBg,
                        borderColor: p.errorBorder,
                      },
                      focusedField === 'confirmationCode' &&
                        !confirmationCodeRequired && {
                          borderColor: p.inputBorderFocus,
                        },
                    ]}
                  >
                    <View
                      style={[
                        styles.inputIconWrap,
                        {
                          backgroundColor: confirmationCodeRequired ? p.errorBg : 'transparent',
                        },
                      ]}
                    >
                      <KeyRound
                        size={15}
                        color={confirmationCodeRequired ? p.errorIcon : p.accent}
                        strokeWidth={2.15}
                      />
                    </View>
                    <TextInput
                      ref={confirmationCodeInputRef}
                      autoCapitalize='none'
                      autoCorrect={false}
                      keyboardType='number-pad'
                      onChangeText={(value) => {
                        const cleanedValue = value.replace(/\s+/g, '');
                        setConfirmationCode(cleanedValue);
                        setConfirmationCodeRequired(false);
                        setLocalError(null);
                        animateLabel(codeLabelAnim, cleanedValue.length > 0);
                      }}
                      onFocus={() => setFocusedField('confirmationCode')}
                      onBlur={() =>
                        setFocusedField((current) =>
                          current === 'confirmationCode' ? null : current
                        )
                      }
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
                    onPress={() => {
                      if (!isBusy) {
                        void handleVerifyConfirmationCode();
                      }
                    }}
                    style={[
                      styles.resendButton,
                      { borderColor: p.noticeBorder, backgroundColor: p.noticeBg },
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
                    <AlertCircle
                      color={p.errorIcon}
                      size={18}
                      strokeWidth={2}
                      style={{ marginTop: 1, flexShrink: 0 }}
                    />
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
                    onPress={() => {
                      if (!isBusy && resendCooldown === 0) {
                        void handleResendConfirmation();
                      }
                    }}
                    style={[styles.linkButton, resendCooldown > 0 && styles.buttonDisabled]}
                  >
                    {submitMode === 'resend' ? (
                      <ActivityIndicator color={p.accent} size='small' />
                    ) : (
                      <Text style={[styles.linkButtonText, { color: p.accent }]}>
                        {resendCooldown > 0
                          ? t('authModal.resend.sendAgainIn', { seconds: resendCooldown })
                          : t('authModal.resend.sendAgain')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    if (!isBusy) {
                      transitionToSignInForm(confirmationEmail ?? '');
                    }
                  }}
                  style={[styles.primaryButton, { backgroundColor: p.primaryBtnBg }]}
                >
                  <Text style={[styles.primaryButtonText, { color: p.primaryBtnText }]}>
                    {t('authModal.actions.alreadyConfirmedContinue')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (!isBusy) {
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
                      setSubmitMode(null);
                    }
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

      <ToastSystem toasts={toasts} onDismiss={dismissToast} />
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
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
    paddingVertical: 16,
  },
  scrollContentModalCompact: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(13,13,31,0.92)',
    padding: 18,
    gap: 10,
  },
  cardModal: {
    width: '100%',
    maxWidth: 520,
    paddingTop: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  cardModalCompact: {
    maxWidth: '100%',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 16,
    gap: 8,
    borderRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 4,
    zIndex: 50,
  },
  headerModal: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    minHeight: 88,
  },
  headerModalCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 0,
    gap: 12,
    width: '100%',
  },
  headerModalCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    gap: 12,
  },
  headerModalTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    zIndex: 9998,
  },
  headerActionsModal: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  headerActionsModalCompact: {
    gap: 10,
  },
  headerActionsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'flex-end',
  },
  settingsMenuContainer: {
    position: 'relative',
    zIndex: 9999,
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
  settingsButtonCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  settingsButtonActive: {
    borderColor: 'rgba(28,203,161,0.4)',
    backgroundColor: 'rgba(28,203,161,0.08)',
  },
  settingsDropdown: {
    position: 'absolute',
    top: 38,
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
  settingsDropdownCompact: {
    position: 'absolute',
    top: 36,
    right: 0,
    zIndex: 99999,
    minWidth: 180,
    alignSelf: 'flex-end',
    marginTop: 0,
    marginBottom: 0,
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
  titleLockupModal: {
    width: '100%',
    alignItems: 'center',
    gap: 0,
  },
  titleLockupModalCompact: {
    gap: 0,
    alignItems: 'flex-start',
    flex: 1,
  },
  titleWordmark: {
    width: 88,
    height: 30,
  },
  titleWordmarkModal: {
    width: 208,
    height: 73,
  },
  titleWordmarkModalCompact: {
    width: 140,
    height: 48,
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
  closeButtonCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  modeSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 4,
    gap: 0,
  },
  modeButton: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modeButtonActive: {
    backgroundColor: '#1EE6B5',
  },
  modeButtonText: {
    color: 'rgba(232,232,255,0.6)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modeButtonTextActive: {
    color: '#1ccba1',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.08)',
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapperRequired: {
    borderColor: 'rgba(248,113,113,0.65)',
    backgroundColor: 'rgba(248,113,113,0.08)',
  },
  inputIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: '#e8e8ff',
    fontSize: 16,
    paddingVertical: 2,
    paddingHorizontal: 4,
    letterSpacing: 0.3,
  },
  requiredFieldText: {
    marginTop: 2,
    marginLeft: 4,
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  visibilityToggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: '#1EE6B5',
    minHeight: 48,
    paddingHorizontal: 32,
  },
  primaryButtonText: {
    color: '#050510',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    minHeight: 48,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: '#e8e8ff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
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
    fontFamily: 'Sculpin-Bold',
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
    marginVertical: 0,
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
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(248,113,113,0.5)',
    backgroundColor: 'rgba(248,113,113,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 0,
    backgroundColor: 'rgba(59,130,246,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  infoText: {
    color: '#60a5fa',
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
    fontFamily: 'Sculpin-Bold',
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
  linkButton: {
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  linkButtonText: {
    color: '#66e6c5',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
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
