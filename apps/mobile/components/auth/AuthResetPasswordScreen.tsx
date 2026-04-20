import {
  readWebAuthCallbackPayload,
  resolveAuthReturnTo,
  stripAuthCallbackTokensFromUrl,
} from '@alternun/auth';
import { getAuthErrorMessage } from './authErrorMessages';
import {
  buildAuthSignInRoute,
  buildPasswordResetRedirectUrl,
  resolveAuthAppOrigin,
} from './authPasswordResetFlow';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react-native';
import LoadingButton from '../common/LoadingButton';
import ShaderBackground from './ShaderBackground';
import { AuthFooter } from './AuthFooter';
import { createTypographyStyles } from '../theme/typography';
import { useAppPalette } from '../theme/useAppPalette';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import { useAuth } from './AppAuthProvider';
import { parseEmailAddress, parseSignUpPassword } from '@alternun/auth';
import {
  formatPasswordResetResendLabel,
  finalizePasswordResetRecoverySession,
  isPasswordResetResendDisabled,
  PASSWORD_RESET_RESEND_COOLDOWN_SECONDS,
  verifyPasswordResetCode,
} from './authPasswordResetFlow';

type ResetMode = 'request' | 'reset';
type SubmitMode = 'request' | 'code' | 'reset' | null;

interface PasswordResetClientLike {
  requestPasswordResetEmail?: (email: string, redirectTo?: string) => Promise<void>;
  resetPassword?: (newPassword: string, token?: string) => Promise<void>;
  supabase?: {
    auth?: {
      setSession?: (payload: {
        access_token: string;
        refresh_token: string;
      }) => Promise<{ error?: { message?: string } | null }>;
      resetPasswordForEmail?: (
        email: string,
        options?: { redirectTo?: string }
      ) => Promise<{ error?: { message?: string } | null }>;
      verifyOtp?: (payload: {
        type: 'recovery';
        email: string;
        token: string;
      }) => Promise<{ error?: { message?: string } | null }>;
      updateUser?: (input: {
        password: string;
      }) => Promise<{ error?: { message?: string } | null }>;
    };
  };
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function isRecoveryCallbackPayload(
  payload: ReturnType<typeof readWebAuthCallbackPayload>
): boolean {
  const callbackType = payload.callbackType?.trim().toLowerCase();
  return callbackType === 'recovery' || callbackType === 'reset_password';
}

export default function AuthResetPasswordScreen(): JSX.Element {
  const { client, loading, signOutUser } = useAuth();
  const { t } = useAppTranslation('mobile');
  const { language } = useAppPreferences();
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const p = useAppPalette();

  const isDesktop = windowWidth >= 720;
  const isCompact = windowWidth < 560;
  const appOrigin = resolveAuthAppOrigin();

  const { next, token, email, error } = useLocalSearchParams<{
    next?: string | string[];
    token?: string | string[];
    email?: string | string[];
    error?: string | string[];
  }>();

  const resolvedNext = resolveAuthReturnTo(readSearchParam(next) ?? '/');
  const resetToken = readSearchParam(token);
  const initialEmail = readSearchParam(email) ?? '';
  const routeError = readSearchParam(error);

  const initialRequestNotice = useMemo(() => {
    if (!routeError) {
      return null;
    }

    return t(
      'authReset.errors.invalidLink',
      undefined,
      'This reset link is invalid or expired. Request a new one below.'
    );
  }, [routeError, t]);

  const callbackPayload = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return readWebAuthCallbackPayload(window.location.search, window.location.hash);
  }, []);

  const [mode, setMode] = useState<ResetMode>(resetToken ? 'reset' : 'request');
  const [submitMode, setSubmitMode] = useState<SubmitMode>(null);
  const [requestEmail, setRequestEmail] = useState(initialEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(initialRequestNotice);
  const [recoverySessionReady, setRecoverySessionReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [showResetCodeEntry, setShowResetCodeEntry] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [recovering, setRecovering] = useState(false);
  const [redirectingToSignIn, setRedirectingToSignIn] = useState(false);
  const [focusedField, setFocusedField] = useState<
    'email' | 'resetCode' | 'newPassword' | 'confirmPassword' | null
  >(null);

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const appClient = client as PasswordResetClientLike;
  const isBusy = loading || submitMode !== null || recovering;
  const isRequestLocked = isBusy || isPasswordResetResendDisabled(resendCooldown);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (!callbackPayload || !isRecoveryCallbackPayload(callbackPayload)) {
      return;
    }

    if (typeof window !== 'undefined') {
      stripAuthCallbackTokensFromUrl(window.location.href);
    }

    if (
      appClient.supabase?.auth?.setSession &&
      callbackPayload.accessToken &&
      callbackPayload.refreshToken &&
      typeof window !== 'undefined'
    ) {
      setMode('reset');
      setRecovering(true);
      setSubmitMode(null);

      void finalizePasswordResetRecoverySession(
        appClient,
        callbackPayload.accessToken,
        callbackPayload.refreshToken
      )
        .then(() => {
          setRecoverySessionReady(true);
          setNotice(
            t(
              'authReset.notices.recoveryReady',
              undefined,
              'Recovery session ready. Choose a new password to continue.'
            )
          );
          setLocalError(null);
        })
        .catch((callbackError: unknown) => {
          setShowResetCodeEntry(true);
          setMode('request');
          setNotice(
            t(
              'authReset.notices.enterResetCode',
              undefined,
              'Enter the reset code from your email to continue.'
            )
          );
          setLocalError(
            getAuthErrorMessage(
              callbackError,
              t(
                'authReset.errors.recoveryFinalizeFailed',
                undefined,
                'Unable to prepare the recovery session.'
              )
            )
          );
        })
        .finally(() => {
          setRecovering(false);
        });
      return;
    }

    setMode('request');
    setShowResetCodeEntry(true);
    setRecoverySessionReady(false);
    setLocalError(null);
    setNotice(
      t(
        'authReset.notices.enterResetCode',
        undefined,
        'Enter the reset code from your email to continue.'
      )
    );
  }, [appClient, callbackPayload, t]);

  useEffect(() => {
    if (!resetToken) {
      return;
    }

    setMode('reset');
  }, [resetToken]);

  useEffect(() => {
    if (!requestEmail && initialEmail) {
      setRequestEmail(initialEmail);
    }
  }, [initialEmail, requestEmail]);

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
    if (mode !== 'reset' && resetToken) {
      setMode('reset');
    }
  }, [mode, resetToken]);

  const transitionToMode = (nextMode: ResetMode): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(nextMode);
    setLocalError(null);
    setNotice(null);
  };

  const normalizeEmailOrSetError = (rawEmail: string): string | null => {
    try {
      const normalized = parseEmailAddress(rawEmail);
      return normalized;
    } catch {
      setLocalError(
        t('authReset.validation.validEmail', undefined, 'Enter a valid email address.')
      );
      emailInputRef.current?.focus();
      return null;
    }
  };

  const returnToSignInView = async (): Promise<void> => {
    setRedirectingToSignIn(true);

    try {
      await signOutUser();
    } catch {
      // Best effort: even if sign-out fails, continue the navigation attempt.
    }

    router.replace(buildAuthSignInRoute({ next: resolvedNext }));
  };

  const handleBackToSignIn = (): void => {
    if (isBusy || redirectingToSignIn) {
      return;
    }

    void returnToSignInView();
  };

  const handleRequestPasswordReset = async (): Promise<void> => {
    setLocalError(null);
    setNotice(null);

    if (!appOrigin) {
      setLocalError(
        t(
          'authReset.errors.originUnavailable',
          undefined,
          'Unable to determine the app origin for password reset.'
        )
      );
      return;
    }

    const normalizedEmail = normalizeEmailOrSetError(requestEmail);
    if (!normalizedEmail) {
      return;
    }

    if (!appClient.requestPasswordResetEmail && !appClient.supabase?.auth?.resetPasswordForEmail) {
      setLocalError(
        t(
          'authReset.errors.requestUnavailable',
          undefined,
          'Password reset is not available in this auth client.'
        )
      );
      return;
    }

    if (isPasswordResetResendDisabled(resendCooldown)) {
      return;
    }

    setSubmitMode('request');
    try {
      const redirectTo = buildPasswordResetRedirectUrl(appOrigin, {
        next: resolvedNext,
      });

      if (appClient.requestPasswordResetEmail) {
        await appClient.requestPasswordResetEmail(normalizedEmail, redirectTo);
      } else {
        const supabaseAuth = appClient.supabase?.auth;
        if (!supabaseAuth?.resetPasswordForEmail) {
          setLocalError(
            t(
              'authReset.errors.requestUnavailable',
              undefined,
              'Password reset is not available in this auth client.'
            )
          );
          return;
        }

        const result = await supabaseAuth.resetPasswordForEmail(normalizedEmail, { redirectTo });
        if (result?.error?.message) {
          throw new Error(result.error.message);
        }
      }

      setResendCooldown(PASSWORD_RESET_RESEND_COOLDOWN_SECONDS);
      setResetCode('');
      setShowResetCodeEntry(true);
      setNotice(
        t(
          'authReset.notices.emailSent',
          { email: normalizedEmail },
          `We sent a password reset link to ${normalizedEmail}.`
        )
      );
      setMode('request');
    } catch (requestError) {
      setLocalError(
        getAuthErrorMessage(
          requestError,
          t('authReset.errors.requestFailed', undefined, 'Unable to send password reset email.')
        )
      );
    } finally {
      setSubmitMode(null);
    }
  };

  const handleVerifyResetCode = async (): Promise<void> => {
    setLocalError(null);
    setNotice(null);

    if (!appClient.supabase?.auth?.verifyOtp) {
      setLocalError(
        t(
          'authReset.errors.codeVerificationUnavailable',
          undefined,
          'Password reset codes are not available in this auth client.'
        )
      );
      return;
    }

    const normalizedEmail = normalizeEmailOrSetError(requestEmail);
    if (!normalizedEmail) {
      return;
    }

    if (resetCode.trim().length === 0) {
      setLocalError(
        t(
          'authReset.validation.resetCodeRequired',
          undefined,
          'Enter the reset code from your email.'
        )
      );
      return;
    }

    setSubmitMode('code');
    try {
      await verifyPasswordResetCode(appClient, normalizedEmail, resetCode);
      setRecoverySessionReady(true);
      setShowResetCodeEntry(false);
      setResetCode('');
      setMode('reset');
      setNotice(
        t(
          'authReset.notices.recoveryCodeReady',
          undefined,
          'Reset code verified. Choose a new password to continue.'
        )
      );
      setLocalError(null);
    } catch (codeError) {
      setLocalError(
        getAuthErrorMessage(
          codeError,
          t(
            'authReset.errors.codeVerificationFailed',
            undefined,
            'Unable to verify the reset code.'
          )
        )
      );
    } finally {
      setSubmitMode(null);
    }
  };

  const handleResetPassword = async (): Promise<void> => {
    setLocalError(null);
    setNotice(null);

    if (!resetToken && !recoverySessionReady) {
      setLocalError(
        t(
          'authReset.errors.sessionRequired',
          undefined,
          'Open your recovery link first, then choose a new password.'
        )
      );
      return;
    }

    try {
      const validatedPassword = parseSignUpPassword(newPassword);
      if (confirmPassword.trim().length === 0) {
        setLocalError(
          t(
            'authReset.validation.confirmPasswordRequired',
            undefined,
            'Please confirm your new password.'
          )
        );
        confirmPasswordInputRef.current?.focus();
        return;
      }

      if (validatedPassword !== confirmPassword) {
        setLocalError(
          t('authReset.validation.passwordMismatch', undefined, 'Passwords do not match.')
        );
        return;
      }

      if (!appClient.resetPassword && !appClient.supabase?.auth?.updateUser) {
        setLocalError(
          t(
            'authReset.errors.resetUnavailable',
            undefined,
            'Password reset is not available in this auth client.'
          )
        );
        return;
      }

      setSubmitMode('reset');

      if (appClient.resetPassword && resetToken) {
        await appClient.resetPassword(validatedPassword, resetToken);
      } else {
        const supabaseAuth = appClient.supabase?.auth;
        if (!supabaseAuth?.updateUser) {
          setLocalError(
            t(
              'authReset.errors.resetUnavailable',
              undefined,
              'Password reset is not available in this auth client.'
            )
          );
          return;
        }

        const result = await supabaseAuth.updateUser({
          password: validatedPassword,
        });
        if (result?.error?.message) {
          throw new Error(result.error.message);
        }
      }

      setNotice(
        t(
          'authReset.notices.passwordUpdated',
          undefined,
          'Password updated. You can sign in with the new password now.'
        )
      );
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      void returnToSignInView();
    } catch (resetError) {
      setLocalError(
        getAuthErrorMessage(
          resetError,
          t('authReset.errors.resetFailed', undefined, 'Unable to reset your password.')
        )
      );
    } finally {
      setSubmitMode(null);
    }
  };

  const backLabel =
    mode === 'reset'
      ? t('authReset.actions.backToRequest', undefined, 'Request a new link')
      : t('authReset.actions.backToSignIn', undefined, 'Back to sign in');
  const requestButtonLabel = formatPasswordResetResendLabel(resendCooldown, {
    sendLink: t('authReset.actions.sendLink', undefined, 'Send reset link'),
    sendAgainIn: (seconds) =>
      t('authReset.actions.sendAgainIn', { seconds }, `Send again in ${seconds}s`),
  });

  return (
    <View style={[styles.screen, { backgroundColor: p.screenBg }]}>
      <View pointerEvents='none' style={styles.shaderBackdrop}>
        <ShaderBackground opacity={0.5} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isCompact && styles.scrollContentCompact,
            { minHeight: windowHeight },
          ]}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              isDesktop ? styles.cardDesktop : styles.cardMobile,
              { backgroundColor: p.cardBg, borderColor: p.cardBorder },
            ]}
          >
            <View style={styles.hero}>
              <View
                style={[
                  styles.heroBadge,
                  { borderColor: p.accent, backgroundColor: p.accentMuted },
                ]}
              >
                <ShieldCheck size={14} color={p.accent} />
                <Text style={[styles.heroBadgeText, { color: p.accent }]}>
                  {t('authReset.badge', undefined, 'Account recovery')}
                </Text>
              </View>

              <View style={styles.heroRow}>
                <View
                  style={[
                    styles.heroIconWrap,
                    { borderColor: p.accent, backgroundColor: p.accentMuted },
                  ]}
                >
                  <KeyRound size={18} color={p.accent} />
                </View>

                <View style={styles.heroCopy}>
                  <Text style={[styles.title, { color: p.textPrimary }]}>
                    {mode === 'reset'
                      ? t('authReset.titles.setPassword', undefined, 'Create a new password')
                      : t('authReset.titles.requestLink', undefined, 'Reset your password')}
                  </Text>
                  <Text style={[styles.subtitle, { color: p.textSecondary }]}>
                    {mode === 'reset'
                      ? t(
                          'authReset.subtitles.setPassword',
                          undefined,
                          'Choose a strong new password to restore access to your account.'
                        )
                      : t(
                          'authReset.subtitles.requestLink',
                          undefined,
                          'We will send a secure link to the email address on your account.'
                        )}
                  </Text>
                </View>
              </View>

              <View style={styles.heroSteps}>
                <View
                  style={[
                    styles.heroStep,
                    { borderColor: p.cardBorder, backgroundColor: p.inputBg },
                  ]}
                >
                  <Text style={[styles.heroStepIndex, { color: p.accent }]}>1</Text>
                  <Text style={[styles.heroStepText, { color: p.textSecondary }]}>
                    {t('authReset.steps.request', undefined, 'Request the reset link')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.heroStep,
                    { borderColor: p.cardBorder, backgroundColor: p.inputBg },
                  ]}
                >
                  <Text style={[styles.heroStepIndex, { color: p.accent }]}>2</Text>
                  <Text style={[styles.heroStepText, { color: p.textSecondary }]}>
                    {t(
                      'authReset.steps.complete',
                      undefined,
                      'Open the link and choose a new password'
                    )}
                  </Text>
                </View>
              </View>
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

            {localError ? (
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
                  style={styles.errorIcon}
                />
                <Text style={[styles.errorText, { color: p.errorText }]}>{localError}</Text>
              </View>
            ) : null}

            {redirectingToSignIn ? (
              <View style={styles.redirectingState}>
                <ActivityIndicator size='large' color={p.accent} />
                <Text style={[styles.redirectingTitle, { color: p.textPrimary }]}>
                  {t('authReset.notices.returningToSignIn', undefined, 'Returning to sign in...')}
                </Text>
                <Text style={[styles.redirectingText, { color: p.textSecondary }]}>
                  {t(
                    'authReset.notices.returningToSignInHelp',
                    undefined,
                    'Your password was updated. The sign-in view will open next.'
                  )}
                </Text>
              </View>
            ) : mode === 'request' ? (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: p.accent }]}>
                    {t('authReset.labels.email', undefined, 'Email address')}
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: p.inputBg, borderColor: p.inputBorder },
                      focusedField === 'resetCode' && { borderColor: p.inputBorderFocus },
                    ]}
                  >
                    <View style={styles.inputIconWrap}>
                      <Mail size={15} color={p.accent} strokeWidth={2.1} />
                    </View>
                    <TextInput
                      ref={emailInputRef}
                      autoCapitalize='none'
                      autoCorrect={false}
                      keyboardType='email-address'
                      onChangeText={(value) => {
                        setRequestEmail(value);
                        setLocalError(null);
                      }}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() =>
                        setFocusedField((current) => (current === 'email' ? null : current))
                      }
                      placeholder={t('authReset.placeholders.email', undefined, 'Email')}
                      placeholderTextColor={p.textPlaceholder}
                      style={[styles.input, { color: p.textPrimary }]}
                      value={requestEmail}
                      textContentType='emailAddress'
                    />
                  </View>
                </View>

                <LoadingButton
                  variant='primary'
                  label={requestButtonLabel}
                  loadingLabel={t(
                    'authReset.loading.sendingLink',
                    undefined,
                    'Sending reset link...'
                  )}
                  isLoading={submitMode === 'request'}
                  disabled={isRequestLocked}
                  onPress={() => {
                    void handleRequestPasswordReset();
                  }}
                />

                {showResetCodeEntry ? (
                  <View
                    style={[
                      styles.codeSection,
                      { borderColor: p.cardBorder, backgroundColor: p.inputBg },
                    ]}
                  >
                    <Text style={[styles.codeSectionTitle, { color: p.textPrimary }]}>
                      {t('authReset.code.title', undefined, 'Have a reset code?')}
                    </Text>
                    <Text style={[styles.codeSectionText, { color: p.textSecondary }]}>
                      {t(
                        'authReset.code.body',
                        undefined,
                        'Enter the code from your email to continue without the link.'
                      )}
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: p.accent }]}>
                        {t('authReset.labels.resetCode', undefined, 'Reset code')}
                      </Text>
                      <View
                        style={[
                          styles.inputWrapper,
                          { backgroundColor: p.inputBg, borderColor: p.inputBorder },
                          focusedField === 'email' && { borderColor: p.inputBorderFocus },
                        ]}
                      >
                        <View style={styles.inputIconWrap}>
                          <KeyRound size={15} color={p.accent} strokeWidth={2.1} />
                        </View>
                        <TextInput
                          autoCapitalize='none'
                          autoCorrect={false}
                          keyboardType='number-pad'
                          onChangeText={(value) => {
                            setResetCode(value);
                            setLocalError(null);
                          }}
                          onFocus={() => setFocusedField('resetCode')}
                          onBlur={() =>
                            setFocusedField((current) => (current === 'resetCode' ? null : current))
                          }
                          placeholder={t(
                            'authReset.placeholders.resetCode',
                            undefined,
                            'Reset code'
                          )}
                          placeholderTextColor={p.textPlaceholder}
                          style={[styles.input, { color: p.textPrimary }]}
                          textContentType='oneTimeCode'
                          autoComplete='one-time-code'
                          value={resetCode}
                        />
                      </View>
                    </View>

                    <LoadingButton
                      variant='secondary'
                      label={t('authReset.actions.verifyCode', undefined, 'Verify reset code')}
                      loadingLabel={t(
                        'authReset.loading.verifyingCode',
                        undefined,
                        'Verifying reset code...'
                      )}
                      isLoading={submitMode === 'code'}
                      disabled={isBusy || resetCode.trim().length === 0}
                      onPress={() => {
                        void handleVerifyResetCode();
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isBusy}
                    onPress={() => setShowResetCodeEntry(true)}
                    style={styles.linkButton}
                  >
                    <Text style={[styles.linkButtonText, { color: p.accent }]}>
                      {t('authReset.actions.haveResetCode', undefined, 'Have a reset code?')}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isBusy}
                  onPress={handleBackToSignIn}
                  style={styles.linkButton}
                >
                  <Text style={[styles.linkButtonText, { color: p.accent }]}>{backLabel}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: p.accent }]}>
                    {t('authReset.labels.newPassword', undefined, 'New password')}
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: p.inputBg, borderColor: p.inputBorder },
                      focusedField === 'newPassword' && { borderColor: p.inputBorderFocus },
                    ]}
                  >
                    <View style={styles.inputIconWrap}>
                      <LockKeyhole size={15} color={p.accent} strokeWidth={2.1} />
                    </View>
                    <TextInput
                      ref={passwordInputRef}
                      autoCapitalize='none'
                      autoCorrect={false}
                      onChangeText={(value) => {
                        setNewPassword(value);
                        setLocalError(null);
                      }}
                      onFocus={() => setFocusedField('newPassword')}
                      onBlur={() =>
                        setFocusedField((current) => (current === 'newPassword' ? null : current))
                      }
                      placeholder={t(
                        'authReset.placeholders.newPassword',
                        undefined,
                        'New password'
                      )}
                      placeholderTextColor={p.textPlaceholder}
                      secureTextEntry={!showPassword}
                      style={[styles.input, { color: p.textPrimary }]}
                      value={newPassword}
                    />
                    {newPassword.length > 0 ? (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setShowPassword((current) => !current)}
                        style={[
                          styles.visibilityToggle,
                          {
                            backgroundColor:
                              focusedField === 'newPassword' ? p.accentMuted : p.inputBg,
                            borderColor:
                              focusedField === 'newPassword' ? p.inputBorderFocus : p.inputBorder,
                          },
                        ]}
                      >
                        {showPassword ? (
                          <EyeOff size={16} color={p.accent} />
                        ) : (
                          <Eye size={16} color={p.accent} />
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: p.accent }]}>
                    {t('authReset.labels.confirmPassword', undefined, 'Confirm password')}
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: p.inputBg, borderColor: p.inputBorder },
                      focusedField === 'confirmPassword' && { borderColor: p.inputBorderFocus },
                    ]}
                  >
                    <View style={styles.inputIconWrap}>
                      <KeyRound size={15} color={p.accent} strokeWidth={2.1} />
                    </View>
                    <TextInput
                      ref={confirmPasswordInputRef}
                      autoCapitalize='none'
                      autoCorrect={false}
                      onChangeText={(value) => {
                        setConfirmPassword(value);
                        setLocalError(null);
                      }}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() =>
                        setFocusedField((current) =>
                          current === 'confirmPassword' ? null : current
                        )
                      }
                      placeholder={t(
                        'authReset.placeholders.confirmPassword',
                        undefined,
                        'Confirm password'
                      )}
                      placeholderTextColor={p.textPlaceholder}
                      secureTextEntry={!showConfirmPassword}
                      style={[styles.input, { color: p.textPrimary }]}
                      value={confirmPassword}
                    />
                    {confirmPassword.length > 0 ? (
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
                    ) : null}
                  </View>
                </View>

                <LoadingButton
                  variant='primary'
                  label={t('authReset.actions.updatePassword', undefined, 'Update password')}
                  loadingLabel={t(
                    'authReset.loading.updatingPassword',
                    undefined,
                    'Updating password...'
                  )}
                  isLoading={submitMode === 'reset'}
                  disabled={isBusy}
                  onPress={() => {
                    void handleResetPassword();
                  }}
                />

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isBusy}
                  onPress={() => transitionToMode('request')}
                  style={styles.linkButton}
                >
                  <Text style={[styles.linkButtonText, { color: p.accent }]}>{backLabel}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isBusy}
                  onPress={handleBackToSignIn}
                  style={[
                    styles.secondaryLink,
                    { borderColor: p.cardBorder, backgroundColor: p.inputBg },
                  ]}
                >
                  <ArrowLeft size={14} color={p.textSecondary} />
                  <Text style={[styles.secondaryLinkText, { color: p.textSecondary }]}>
                    {t('authReset.actions.backToSignIn', undefined, 'Back to sign in')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.footerWrap}>
              <AuthFooter locale={language} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = createTypographyStyles({
  screen: {
    flex: 1,
    backgroundColor: '#050510',
  },
  shaderBackdrop: {
    position: 'absolute',
    inset: 0,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  scrollContentCompact: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  cardDesktop: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  cardMobile: {
    width: '100%',
  },
  hero: {
    gap: 14,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    fontFamily: 'Sculpin-Bold',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  heroSteps: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexGrow: 1,
    minWidth: 180,
  },
  heroStepIndex: {
    fontSize: 13,
    fontWeight: '800',
  },
  heroStepText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  noticeBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  codeSection: {
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  redirectingState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  redirectingTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  redirectingText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  codeSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  codeSectionText: {
    fontSize: 12,
    lineHeight: 18,
  },
  form: {
    gap: 14,
    paddingTop: 6,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    letterSpacing: 0.2,
    paddingVertical: 2,
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
  linkButton: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  linkButtonText: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  secondaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 42,
    paddingHorizontal: 16,
  },
  secondaryLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerWrap: {
    paddingTop: 4,
  },
});
