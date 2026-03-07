import type { OAuthFlow } from './AppAuthProvider';
import { parseEmailAddress, parseSignUpPassword } from '@alternun/auth';
import { Image as ExpoImage } from 'expo-image';
import { AlertCircle, Chrome, Eye, EyeOff, Lock, Mail, Wallet, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  View,
} from 'react-native';
import { createTypographyStyles, } from '../theme/typography';
import ShaderBackground from './ShaderBackground';
import WalletConnectModal from '../dashboard/WalletConnectModal';
import { useAppTranslation, } from '../i18n/useAppTranslation';
import { useAuth } from './AppAuthProvider';

const RESEND_COOLDOWN_SECONDS = 45;
const AIRS_LOGOTIPO_LIGHT = require('../../assets/AIRS-logotipo-light.svg');

type SubmitMode = 'signin' | 'signup' | 'resend' | 'google' | 'wallet' | null;
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
  signUpWithEmail?: (email: string, password: string) => Promise<SignUpResult>;
  resendEmailConfirmation?: (email: string) => Promise<void>;
}

export interface AuthSignInScreenProps {
  onCancel?: () => void;
  presentation?: 'screen' | 'modal';
}

function resolveGoogleFlow(supportedFlows: OAuthFlow[]): OAuthFlow {
  if (supportedFlows.includes('redirect')) {
    return 'redirect';
  }

  if (supportedFlows.includes('native')) {
    return 'native';
  }

  return 'popup';
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

function getMessage(error: unknown, fallbackMessage: string,): string {
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
}: AuthSignInScreenProps) {
  const { signInWithEmail, signIn, loading, error, client } = useAuth();
  const { t, } = useAppTranslation('mobile');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [submitMode, setSubmitMode] = useState<SubmitMode>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authStep, setAuthStep] = useState<AuthStep>('form');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [requiredFields, setRequiredFields] = useState<RequiredFieldState>(() =>
    createDefaultRequiredFieldState()
  );

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const googleFlow = useMemo(
    () => resolveGoogleFlow(client.capabilities().supportedFlows),
    [client]
  );

  const rawEffectiveError = localError ?? error;
  const effectiveError = rawEffectiveError
    ? getMessage(rawEffectiveError, t('authModal.errors.authenticationFailed'))
    : null;
  const isBusy = loading || submitMode !== null;
  const isModal = presentation === 'modal';
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
      setResendCooldown(seconds => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [resendCooldown]);

  const transitionToStep = (step: AuthStep) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAuthStep(step);
  };

  const resetMessages = () => {
    setLocalError(null);
    setNotice(null);
  };

  const clearRequiredFields = () => {
    setRequiredFields(createDefaultRequiredFieldState());
    setInvalidEmail(false);
  };

  const clearRequiredField = (field: RequiredField) => {
    setRequiredFields(current => {
      if (!current[field]) {
        return current;
      }

      return {
        ...current,
        [field]: false,
      };
    });
  };

  const focusRequiredField = (field: RequiredField) => {
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

      nextRequiredState[field] = isMissing;
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

  const handleEmailSignIn = async () => {
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
        setNotice(t('authModal.notices.unverifiedEmail'));
        transitionToStep('emailConfirmation');
      }
      setLocalError(message);
    } finally {
      setSubmitMode(null);
    }
  };

  const handleEmailSignUp = async () => {
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
      const result = await client.signUpWithEmail(normalizedEmail, password);

      if (result.needsEmailVerification) {
        setConfirmationEmail(normalizedEmail);
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

  const handleResendConfirmation = async () => {
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

  const handleGoogleSignIn = async () => {
    resetMessages();
    setSubmitMode('google');
    try {
      await signIn({
        provider: 'google',
        flow: googleFlow,
      });
    } catch (authError) {
      setLocalError(getMessage(authError, t('authModal.errors.authenticationFailed')));
    } finally {
      setSubmitMode(null);
    }
  };

  const handleWalletConnect = async (walletType: string) => {
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

  const switchMode = (nextMode: AuthMode) => {
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
    clearRequiredFields();
    if (nextMode === 'signup') {
      setConfirmationEmail(null);
      setResendCooldown(0);
    }
  };

  return (
    <View style={[styles.screen, isModal && styles.modalScreen]}>
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
          contentContainerStyle={[styles.scrollContent, isModal && styles.scrollContentModal]}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, isModal && styles.cardModal]}>
            <View style={styles.header}>
              <View style={styles.titleLockup}>
                <ExpoImage source={AIRS_LOGOTIPO_LIGHT} style={styles.titleWordmark} contentFit='contain' />
                <Text style={styles.subtitle}>{t('authModal.notices.secureSignIn')}</Text>
              </View>
              {onCancel ? (
                <TouchableOpacity activeOpacity={0.8} onPress={onCancel} style={styles.closeButton}>
                  <X size={16} color='rgba(232,232,255,0.75)' />
                </TouchableOpacity>
              ) : null}
            </View>

            {authStep === 'form' ? (
              <>
                <View style={styles.modeSwitch}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => switchMode('signin')}
                    style={[styles.modeButton, mode === 'signin' && styles.modeButtonActive]}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        mode === 'signin' && styles.modeButtonTextActive,
                      ]}
                    >
                      {t('authModal.modes.signIn')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => switchMode('signup')}
                    style={[styles.modeButton, mode === 'signup' && styles.modeButtonActive]}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        mode === 'signup' && styles.modeButtonTextActive,
                      ]}
                    >
                      {t('authModal.modes.signUp')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[styles.inputWrapper, hasEmailInputError && styles.inputWrapperRequired]}
                >
                  <Mail
                    size={16}
                    color={hasEmailInputError ? '#fca5a5' : 'rgba(232,232,255,0.55)'}
                  />
                  <TextInput
                    ref={emailInputRef}
                    autoCapitalize='none'
                    autoCorrect={false}
                    keyboardType='email-address'
                    onChangeText={value => {
                      setEmail(value);
                      clearRequiredField('email');
                      setInvalidEmail(false);
                    }}
                    placeholder={t('authModal.placeholders.email')}
                    placeholderTextColor='rgba(232,232,255,0.35)'
                    style={styles.input}
                    value={email}
                  />
                </View>
                {requiredFields.email ? (
                  <Text style={styles.requiredFieldText}>{t('authModal.validation.emailRequired')}</Text>
                ) : invalidEmail ? (
                  <Text style={styles.requiredFieldText}>{t('authModal.validation.validEmail')}</Text>
                ) : null}

                <View
                  style={[
                    styles.inputWrapper,
                    requiredFields.password && styles.inputWrapperRequired,
                  ]}
                >
                  <Lock
                    size={16}
                    color={requiredFields.password ? '#fca5a5' : 'rgba(232,232,255,0.55)'}
                  />
                  <TextInput
                    ref={passwordInputRef}
                    autoCapitalize='none'
                    autoCorrect={false}
                    onChangeText={value => {
                      setPassword(value);
                      clearRequiredField('password');
                    }}
                    placeholder={t('authModal.placeholders.password')}
                    placeholderTextColor='rgba(232,232,255,0.35)'
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    value={password}
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowPassword(current => !current)}
                    style={styles.visibilityToggle}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color='rgba(232,232,255,0.7)' />
                    ) : (
                      <Eye size={16} color='rgba(232,232,255,0.7)' />
                    )}
                  </TouchableOpacity>
                </View>
                {requiredFields.password ? (
                  <Text style={styles.requiredFieldText}>{t('authModal.validation.passwordRequired')}</Text>
                ) : null}

                {mode === 'signup' ? (
                  <>
                    <View
                      style={[
                        styles.inputWrapper,
                        requiredFields.confirmPassword && styles.inputWrapperRequired,
                      ]}
                    >
                      <Lock
                        size={16}
                        color={
                          requiredFields.confirmPassword ? '#fca5a5' : 'rgba(232,232,255,0.55)'
                        }
                      />
                      <TextInput
                        ref={confirmPasswordInputRef}
                        autoCapitalize='none'
                        autoCorrect={false}
                        onChangeText={value => {
                          setConfirmPassword(value);
                          clearRequiredField('confirmPassword');
                        }}
                        placeholder={t('authModal.placeholders.confirmPassword')}
                        placeholderTextColor='rgba(232,232,255,0.35)'
                        secureTextEntry={!showConfirmPassword}
                        style={styles.input}
                        value={confirmPassword}
                      />
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setShowConfirmPassword(current => !current)}
                        style={styles.visibilityToggle}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={16} color='rgba(232,232,255,0.7)' />
                        ) : (
                          <Eye size={16} color='rgba(232,232,255,0.7)' />
                        )}
                      </TouchableOpacity>
                    </View>
                    {requiredFields.confirmPassword ? (
                      <Text style={styles.requiredFieldText}>{t('authModal.validation.confirmPasswordRequired')}</Text>
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
                  style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                >
                  {submitMode === 'signin' || submitMode === 'signup' ? (
                    <ActivityIndicator color='#050510' size='small' />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {mode === 'signin'
                        ? t('authModal.actions.continueWithEmail')
                        : t('authModal.actions.createAccount')}
                    </Text>
                  )}
                </TouchableOpacity>

                {mode === 'signin' ? (
                  <>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>{t('authModal.divider.or')}</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={isBusy}
                      onPress={() => {
                        void handleGoogleSignIn();
                      }}
                      style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
                    >
                      {submitMode === 'google' ? (
                        <ActivityIndicator color='#e8e8ff' size='small' />
                      ) : (
                        <>
                          <Chrome size={16} color='#e8e8ff' />
                          <Text style={styles.secondaryButtonText}>{t('authModal.actions.continueWithGoogle')}</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={isBusy}
                      onPress={() => setWalletModalVisible(true)}
                      style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
                    >
                      {submitMode === 'wallet' ? (
                        <ActivityIndicator color='#e8e8ff' size='small' />
                      ) : (
                        <>
                          <Wallet size={16} color='#e8e8ff' />
                          <Text style={styles.secondaryButtonText}>{t('authModal.actions.connectWallet')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : null}

                {notice ? (
                  <View style={styles.noticeBox}>
                    <Text style={styles.noticeText}>{notice}</Text>
                  </View>
                ) : null}

                {effectiveError ? (
                  <View style={styles.errorBox}>
                    <AlertCircle color='#f87171' size={14} />
                    <Text style={styles.errorText}>{effectiveError}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isBusy}
                  onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                  style={styles.footerToggle}
                >
                  <Text style={styles.footerToggleText}>
                    {mode === 'signin'
                      ? t('authModal.footer.dontHaveAccount')
                      : t('authModal.footer.alreadyHaveAccount')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.confirmationIntro}>
                  <View style={styles.confirmationIconWrap}>
                    <Mail size={18} color='#66e6c5' />
                  </View>
                  <Text style={styles.confirmationTitle}>{t('authModal.confirmation.checkEmail')}</Text>
                  <Text style={styles.confirmationSubtitle}>{t('authModal.confirmation.linkSentTo')}</Text>
                  <Text style={styles.confirmationEmail}>{confirmationEmail ?? t('authModal.confirmation.emailFallback')}</Text>
                </View>

                {notice ? (
                  <View style={styles.noticeBox}>
                    <Text style={styles.noticeText}>{notice}</Text>
                  </View>
                ) : null}

                {effectiveError ? (
                  <View style={styles.errorBox}>
                    <AlertCircle color='#f87171' size={14} />
                    <Text style={styles.errorText}>{effectiveError}</Text>
                  </View>
                ) : null}

                <View style={styles.resendBox}>
                  <Text style={styles.resendSectionTitle}>{t('authModal.resend.title')}</Text>
                  <Text style={styles.resendText}>
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
                      (isBusy || resendCooldown > 0) && styles.buttonDisabled,
                    ]}
                  >
                    {submitMode === 'resend' ? (
                      <ActivityIndicator color='#1ccba1' size='small' />
                    ) : (
                      <Text style={styles.resendButtonText}>
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
                    const nextEmail = confirmationEmail ?? '';
                    transitionToStep('form');
                    setMode('signin');
                    setEmail(nextEmail);
                    setPassword('');
                    setConfirmPassword('');
                    clearRequiredFields();
                    resetMessages();
                  }}
                  style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                >
                  <Text style={styles.primaryButtonText}>{t('authModal.actions.alreadyConfirmedContinue')}</Text>
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
                    setResendCooldown(0);
                    clearRequiredFields();
                    resetMessages();
                  }}
                  style={styles.footerToggle}
                >
                  <Text style={styles.footerToggleText}>{t('authModal.actions.useAnotherEmail')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <WalletConnectModal
        visible={walletModalVisible}
        onClose={() => setWalletModalVisible(false)}
        onConnect={walletType => {
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
    justifyContent: 'center',
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
