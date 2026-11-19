import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { HonorAwardRequestError } from '../../utils/honorAwards';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { honorText } from './honorAwardTheme';
import type { HonorAwardRedeemModalProps } from './honorAwards.types';

const MINT = '#1de9b6';
const UNAVAILABLE: [string, string] = [
  'unavailable',
  'Este código no se puede usar ahora. Escríbele al aliado que te lo compartió.',
];

/** Message key and fallback for each refusal of a code. */
const ERRORS: Record<string, [string, string]> = {
  HONOR_CODE_INVALID: ['invalid', 'Ese código no existe. Revísalo e inténtalo de nuevo.'],
  HONOR_AWARD_INPUT_INVALID: ['invalid', 'Ese código no existe. Revísalo e inténtalo de nuevo.'],
  HONOR_CODE_EXPIRED: ['expired', 'Ese código ya venció.'],
  HONOR_CODE_REVOKED: ['revoked', 'Ese código ya no está activo.'],
  HONOR_CODE_NOT_STARTED: ['notStarted', 'Ese código aún no está activo.'],
  HONOR_CODE_EXHAUSTED: ['exhausted', 'Ese código ya alcanzó su límite de usos.'],
  HONOR_CODE_ALREADY_REDEEMED: ['alreadyRedeemed', 'Ya usaste este código.'],
  HONOR_CODE_RATE_LIMITED: [
    'rateLimited',
    'Hiciste demasiados intentos. Espera 15 minutos e inténtalo de nuevo.',
  ],
  HONOR_CODE_ACCOUNT_UNVERIFIED: [
    'unverified',
    'Verifica el correo de tu cuenta para reclamar medallas.',
  ],
  HONOR_CODE_ISSUER_INACTIVE: UNAVAILABLE,
  HONOR_AWARD_NOT_CLAIMABLE: UNAVAILABLE,
  HONOR_AWARD_AIRS_NOT_CONFIGURED: UNAVAILABLE,
  PROJECT_SCOPE_DENIED: UNAVAILABLE,
  PERMISSION_DENIED: UNAVAILABLE,
};

/**
 * "Reclamar medalla": the person types the code an ally shared with them and gets the medal
 * and its Airs. When the medal is given right away the section plays the claim; when its Airs
 * wait for an approver, this says so.
 */
export default function HonorAwardRedeemModal({
  visible,
  redeem,
  onRedeemed,
  onClose,
}: HonorAwardRedeemModalProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const key = (name: string) => `profile.honorAwards.redeem.${name}`;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCode('');
    setError(null);
    setWaiting(false);
  }, [visible]);

  async function submit(): Promise<void> {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await redeem(code);
      onRedeemed(result);
      if (result.grantId) {
        onClose();
      } else {
        setWaiting(true);
      }
    } catch (caught) {
      const reason = caught instanceof HonorAwardRequestError ? caught.code ?? '' : '';
      const [name, fallback] = ERRORS[reason] ?? [
        'genericError',
        'No pudimos reclamar la medalla. Inténtalo de nuevo.',
      ];
      setError(honorText(t, key(name), fallback));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal transparent visible={visible} animationType='fade' onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{honorText(t, key('title'), 'Reclamar medalla')}</Text>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel={honorText(t, 'profile.honorAwards.inspect.close', 'Cerrar')}
              onPress={onClose}
              style={styles.close}
            >
              <X size={18} color='#ffffff' />
            </Pressable>
          </View>
          {waiting ? (
            <Text style={styles.body}>
              {honorText(
                t,
                key('pending'),
                'Código aceptado. Tu medalla y sus Airs quedaron en revisión: te avisaremos por correo cuando estén en tu perfil.'
              )}
            </Text>
          ) : (
            <>
              <Text style={styles.body}>
                {honorText(
                  t,
                  key('intro'),
                  'Escribe el código que te compartió el aliado. Cada código se usa una sola vez por persona.'
                )}
              </Text>
              <TextInput
                accessibilityLabel={honorText(t, key('input'), 'Código de la medalla')}
                autoCapitalize='characters'
                autoCorrect={false}
                maxLength={20}
                onChangeText={setCode}
                onSubmitEditing={() => void submit()}
                placeholder='XXXX-XXXX-XXXX'
                placeholderTextColor='rgba(255,255,255,0.4)'
                style={styles.input}
                value={code}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable
                accessibilityRole='button'
                accessibilityState={{ disabled: busy || !code.trim() }}
                disabled={busy || !code.trim()}
                onPress={() => void submit()}
                style={[styles.primary, (busy || !code.trim()) && { opacity: 0.5 }]}
              >
                {busy ? (
                  <ActivityIndicator color='#04231c' />
                ) : (
                  <Text style={styles.primaryText}>{honorText(t, key('submit'), 'Reclamar')}</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,8,7,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#04110d',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(29,233,182,0.25)',
    padding: 20,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: MINT, fontSize: 22, fontFamily: 'Sculpin-Bold' },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  body: { color: 'rgba(255,255,255,0.88)', fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(29,233,182,0.5)',
    borderRadius: 12,
    color: '#ffffff',
    fontFamily: 'SpaceMono',
    fontSize: 20,
    letterSpacing: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: 'center',
  },
  error: { color: '#ff8a8a', fontSize: 13, fontWeight: '600' },
  primary: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: MINT,
    borderRadius: 999,
    paddingVertical: 12,
  },
  primaryText: { color: '#04231c', fontWeight: '800', fontSize: 15 },
});
