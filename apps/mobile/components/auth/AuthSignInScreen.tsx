import type { OAuthFlow } from './AppAuthProvider';
import { AlertCircle, Chrome, Lock, Mail, Wallet, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import WalletConnectModal from '../dashboard/WalletConnectModal';
import { useAuth } from './AppAuthProvider';

type SubmitMode = 'signin' | 'signup' | 'google' | 'wallet' | null;
type AuthMode = 'signin' | 'signup';

interface SignUpResult {
  needsEmailVerification: boolean;
}

interface SignUpCapableClient {
  signUpWithEmail?: (email: string, password: string) => Promise<SignUpResult>;
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

function getMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Authentication failed. Please try again.';
}

function isSignUpCapable(client: unknown): client is SignUpCapableClient {
  return Boolean(client && typeof (client as SignUpCapableClient).signUpWithEmail === 'function');
}

export default function AuthSignInScreen({
  onCancel,
  presentation = 'screen',
}: AuthSignInScreenProps) {
  const { signInWithEmail, signIn, loading, error, client } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [submitMode, setSubmitMode] = useState<SubmitMode>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const googleFlow = useMemo(
    () => resolveGoogleFlow(client.capabilities().supportedFlows),
    [client]
  );

  const effectiveError = localError || error;
  const isBusy = loading || submitMode !== null;
  const isModal = presentation === 'modal';

  const resetMessages = () => {
    setLocalError(null);
    setNotice(null);
  };

  const handleEmailSignIn = async () => {
    resetMessages();

    if (!email.trim() || !password.trim()) {
      setLocalError('Email and password are required.');
      return;
    }

    setSubmitMode('signin');
    try {
      await signInWithEmail(email.trim(), password);
    } catch (authError) {
      setLocalError(getMessage(authError));
    } finally {
      setSubmitMode(null);
    }
  };

  const handleEmailSignUp = async () => {
    resetMessages();

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setLocalError('Email, password, and confirmation are required.');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (!isSignUpCapable(client) || !client.signUpWithEmail) {
      setLocalError('CONFIG_ERROR: Sign-up is not available in this auth client.');
      return;
    }

    setSubmitMode('signup');
    try {
      const result = await client.signUpWithEmail(email.trim(), password);

      if (result.needsEmailVerification) {
        setNotice('Account created. Check your email to verify, then sign in.');
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
        return;
      }

      setNotice('Account created successfully. Signing you in...');
    } catch (authError) {
      setLocalError(getMessage(authError));
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
      setLocalError(getMessage(authError));
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
      setLocalError(getMessage(authError));
    } finally {
      setSubmitMode(null);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    if (nextMode === mode) {
      return;
    }

    setMode(nextMode);
    resetMessages();
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <View style={[styles.screen, isModal && styles.modalScreen]}>
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
              <View>
                <Text style={styles.title}>AIRS Access</Text>
                <Text style={styles.subtitle}>
                  Secure sign in.
                </Text>
              </View>
              {onCancel ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onCancel}
                  style={styles.closeButton}
                >
                  <X size={16} color='rgba(232,232,255,0.75)' />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.modeSwitch}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => switchMode('signin')}
                style={[styles.modeButton, mode === 'signin' && styles.modeButtonActive]}
              >
                <Text style={[styles.modeButtonText, mode === 'signin' && styles.modeButtonTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => switchMode('signup')}
                style={[styles.modeButton, mode === 'signup' && styles.modeButtonActive]}
              >
                <Text style={[styles.modeButtonText, mode === 'signup' && styles.modeButtonTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <Mail size={16} color='rgba(232,232,255,0.55)' />
              <TextInput
                autoCapitalize='none'
                autoCorrect={false}
                keyboardType='email-address'
                onChangeText={setEmail}
                placeholder='Email'
                placeholderTextColor='rgba(232,232,255,0.35)'
                style={styles.input}
                value={email}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={16} color='rgba(232,232,255,0.55)' />
              <TextInput
                autoCapitalize='none'
                autoCorrect={false}
                onChangeText={setPassword}
                placeholder='Password'
                placeholderTextColor='rgba(232,232,255,0.35)'
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            {mode === 'signup' ? (
              <View style={styles.inputWrapper}>
                <Lock size={16} color='rgba(232,232,255,0.55)' />
                <TextInput
                  autoCapitalize='none'
                  autoCorrect={false}
                  onChangeText={setConfirmPassword}
                  placeholder='Confirm Password'
                  placeholderTextColor='rgba(232,232,255,0.35)'
                  secureTextEntry
                  style={styles.input}
                  value={confirmPassword}
                />
              </View>
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
                  {mode === 'signin' ? 'Continue with Email' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {mode === 'signin' ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
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
                      <Text style={styles.secondaryButtonText}>Continue with Google</Text>
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
                      <Text style={styles.secondaryButtonText}>Connect Wallet</Text>
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
                  ? "Don't have an account? Sign Up"
                  : 'Already have an account? Sign In'}
              </Text>
            </TouchableOpacity>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050510',
  },
  modalScreen: {
    backgroundColor: 'rgba(5,5,16,0.82)',
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
  title: {
    color: '#e8e8ff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: 'rgba(232,232,255,0.55)',
    fontSize: 13,
    marginTop: 4,
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
  input: {
    flex: 1,
    color: '#e8e8ff',
    fontSize: 14,
    paddingVertical: 0,
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
