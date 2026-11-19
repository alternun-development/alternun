import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { HonorAwardRequestError, type HonorAwardClaimCode } from '../../utils/honorAwards';
import { useAppTranslation } from '../i18n/useAppTranslation';
import { formatHonorDate, honorText } from './honorAwardTheme';
import type {
  HonorAwardCodesPanelProps,
  HonorClaimCodeState as CodeState,
} from './honorAwards.types';

const MINT = '#1de9b6';

/** Whether a code can still be redeemed, and if not why. */
export function claimCodeState(code: HonorAwardClaimCode, now = Date.now()): CodeState {
  if (code.revokedAt) return 'revoked';
  if (Date.parse(code.expiresAt) <= now) return 'expired';
  if (code.redemptionCount >= code.maxRedemptions) return 'exhausted';
  return 'active';
}

const STATE_FALLBACK: Record<CodeState, string> = {
  active: 'Activo',
  expired: 'Vencido',
  exhausted: 'Agotado',
  revoked: 'Revocado',
};

/** A whole number within the range, or null. */
function wholeNumber(value: string, min: number, max: number): number | null {
  if (!/^\d{1,5}$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return parsed >= min && parsed <= max ? parsed : null;
}

/**
 * Claim codes of the ally's awards: create one (shown once, to copy and share), see how many
 * people used each, and revoke it. People redeem them in their profile, in Legado.
 */
export default function HonorAwardCodesPanel({
  desk,
  recipes,
  c,
}: HonorAwardCodesPanelProps): React.JSX.Element {
  const { t, locale } = useAppTranslation('mobile');
  const key = (name: string) => `profile.honorAwards.codes.${name}`;
  const [codes, setCodes] = useState<HonorAwardClaimCode[]>([]);
  const [recipeId, setRecipeId] = useState(recipes[0]?.id ?? null);
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState('100');
  const [days, setDays] = useState('7');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    desk
      .listCodes()
      .then(setCodes)
      .catch(() => setCodes([]));
  }, [desk]);

  useEffect(load, [load]);

  function failure(caught: unknown): string {
    const code = caught instanceof HonorAwardRequestError ? caught.code : undefined;
    if (code === 'HONOR_CODE_CREATOR_EMAIL_REQUIRED') {
      return honorText(t, key('emailRequired'), 'Verifica tu correo para crear códigos.');
    }
    if (code === 'HONOR_AWARD_AIRS_NOT_CONFIGURED') {
      return honorText(
        t,
        'profile.honorAwards.desk.airsNotConfigured',
        'Este galardón aún no está listo para entregar Airs. Pídelo al equipo de Airs.'
      );
    }
    if (code === 'PERMISSION_DENIED') {
      return honorText(
        t,
        'profile.honorAwards.desk.permissionDenied',
        'Tu rol no puede otorgar galardones.'
      );
    }
    return honorText(
      t,
      'profile.honorAwards.desk.genericError',
      'No pudimos completar la acción. Inténtalo de nuevo.'
    );
  }

  async function create(): Promise<void> {
    const maxRedemptions = wholeNumber(maxUses, 1, 10000);
    const validDays = wholeNumber(days, 1, 365);
    if (!recipeId || maxRedemptions === null || validDays === null) {
      setError(honorText(t, key('invalid'), 'Usos: de 1 a 10.000. Vigencia: de 1 a 365 días.'));
      return;
    }
    setBusy(true);
    setError(null);
    setCreated(null);
    setCopied(false);
    try {
      const result = await desk.createCode({ recipeId, label, maxRedemptions, validDays });
      setCreated(result.code);
      setLabel('');
      load();
    } catch (caught) {
      setError(failure(caught));
    } finally {
      setBusy(false);
    }
  }

  async function copy(): Promise<void> {
    if (!created) return;
    try {
      await Clipboard.setStringAsync(created);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function revoke(codeId: string): Promise<void> {
    setError(null);
    try {
      await desk.revokeCode(codeId);
      load();
    } catch (caught) {
      setError(failure(caught));
    }
  }

  const inputStyle = [
    styles.input,
    { color: c.text, borderColor: c.border ?? 'rgba(255,255,255,0.2)' },
  ];

  return (
    <View style={styles.panel}>
      <Text style={[styles.title, { color: c.text }]}>
        {honorText(t, key('title'), 'Códigos para reclamar')}
      </Text>
      <Text style={[styles.muted, { color: c.muted }]}>
        {honorText(
          t,
          key('intro'),
          'Comparte un código: cada persona lo usa una sola vez en su perfil (Legado → Reclamar medalla) y recibe el galardón y sus Airs. El código completo solo se ve al crearlo.'
        )}
      </Text>
      <View style={styles.chips}>
        {recipes.map((recipe) => {
          const selected = recipe.id === recipeId;
          const name = [recipe.title, recipe.eventName].filter(Boolean).join(' · ');
          return (
            <Pressable
              key={recipe.id}
              accessibilityRole='button'
              accessibilityState={{ selected }}
              accessibilityLabel={`${honorText(t, key('codeFor'), 'Código para')} ${name}`}
              onPress={() => setRecipeId(recipe.id)}
              style={[
                styles.chip,
                { borderColor: selected ? MINT : c.border ?? 'rgba(255,255,255,0.2)' },
              ]}
            >
              <Text style={[styles.chipText, { color: c.text }]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        accessibilityLabel={honorText(t, key('label'), 'Nombre del código (opcional)')}
        onChangeText={setLabel}
        placeholder={honorText(t, key('label'), 'Nombre del código (opcional)')}
        placeholderTextColor={c.muted}
        style={inputStyle}
        value={label}
      />
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.muted }]}>
            {honorText(t, key('maxUses'), 'Personas que pueden usarlo')}
          </Text>
          <TextInput
            accessibilityLabel={honorText(t, key('maxUses'), 'Personas que pueden usarlo')}
            keyboardType='number-pad'
            onChangeText={setMaxUses}
            style={inputStyle}
            value={maxUses}
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.muted }]}>
            {honorText(t, key('days'), 'Días de vigencia')}
          </Text>
          <TextInput
            accessibilityLabel={honorText(t, key('days'), 'Días de vigencia')}
            keyboardType='number-pad'
            onChangeText={setDays}
            style={inputStyle}
            value={days}
          />
        </View>
      </View>
      <Pressable
        accessibilityRole='button'
        disabled={busy}
        onPress={() => void create()}
        style={[styles.primary, busy && { opacity: 0.6 }]}
      >
        <Text style={styles.primaryText}>{honorText(t, key('create'), 'Crear código')}</Text>
      </Pressable>
      {created ? (
        <View style={[styles.created, { borderColor: MINT }]}>
          <Text selectable accessibilityLabel={created} style={[styles.code, { color: c.text }]}>
            {created}
          </Text>
          <Pressable accessibilityRole='button' onPress={() => void copy()} style={styles.copy}>
            <Text style={[styles.copyText, { color: c.text }]}>
              {copied
                ? honorText(t, key('copied'), 'Copiado')
                : honorText(t, key('copy'), 'Copiar')}
            </Text>
          </Pressable>
          <Text style={[styles.muted, { color: c.muted }]}>
            {honorText(
              t,
              key('onceNote'),
              'Guárdalo ahora: por seguridad no lo volveremos a mostrar.'
            )}
          </Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {codes.map((code) => {
        const state = claimCodeState(code);
        const name = [code.recipeTitle, code.recipeEventName].filter(Boolean).join(' · ');
        return (
          <View
            key={code.id}
            style={[styles.item, { borderColor: c.border ?? 'rgba(255,255,255,0.2)' }]}
          >
            <View style={styles.itemMain}>
              <Text style={[styles.itemTitle, { color: c.text }]}>
                {code.label ? `${code.label} · ` : ''}
                {`••••-••••-${code.hint}`}
              </Text>
              <Text style={[styles.muted, { color: c.muted }]}>{name}</Text>
              <Text style={[styles.muted, { color: c.muted }]}>
                {honorText(t, key('usage'), '{{used}} de {{max}} usos · vence {{date}}', {
                  used: code.redemptionCount,
                  max: code.maxRedemptions,
                  date: formatHonorDate(code.expiresAt, locale),
                })}
              </Text>
            </View>
            <View style={styles.itemSide}>
              <Text style={[styles.state, { color: state === 'active' ? c.text : c.muted }]}>
                {honorText(t, key(`state.${state}`), STATE_FALLBACK[state])}
              </Text>
              {state === 'active' ? (
                <Pressable
                  accessibilityRole='button'
                  accessibilityLabel={`${honorText(t, key('revoke'), 'Revocar')} ${code.hint}`}
                  onPress={() => void revoke(code.id)}
                  style={styles.revoke}
                >
                  <Text style={styles.revokeText}>{honorText(t, key('revoke'), 'Revocar')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8, marginTop: 18 },
  title: { fontSize: 16, fontWeight: '800' },
  muted: { fontSize: 12, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  row: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '600' },
  primary: {
    alignSelf: 'flex-start',
    backgroundColor: MINT,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  primaryText: { color: '#04231c', fontWeight: '800' },
  created: { borderWidth: 1.5, borderRadius: 12, padding: 12, gap: 8, alignItems: 'flex-start' },
  code: { fontFamily: 'SpaceMono', fontSize: 22, letterSpacing: 2 },
  copy: {
    borderWidth: 1,
    borderColor: 'rgba(127,127,127,0.5)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  copyText: { fontWeight: '700' },
  error: { color: '#d64545', fontSize: 13, fontWeight: '600' },
  item: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  itemMain: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 13, fontWeight: '800' },
  itemSide: { alignItems: 'flex-end', gap: 6 },
  state: { fontSize: 12, fontWeight: '700' },
  revoke: {
    borderWidth: 1,
    borderColor: '#d64545',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  revokeText: { color: '#d64545', fontSize: 12, fontWeight: '700' },
});
