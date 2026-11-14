import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  HonorAwardRequestError,
  type HonorAwardGuestSummary,
  type HonorAwardRecipe,
} from '../../utils/honorAwards';
import { useAppTranslation } from '../i18n/useAppTranslation';
import HonorAwardEmblem from './HonorAwardEmblem';
import { honorText } from './honorAwardTheme';
import type { HonorAwardsAllyDeskProps } from './honorAwards.types';

const MINT = '#1de9b6';

/** Error message key and fallback for each API code the desk can get. */
const ERRORS: Record<string, [string, string]> = {
  HONOR_AWARD_RECIPIENT_NOT_FOUND: [
    'recipientNotFound',
    'No hay una cuenta de Airs con ese correo.',
  ],
  HONOR_AWARD_ALREADY_GRANTED: [
    'alreadyGranted',
    'Esa persona ya tiene este galardón, o ese número de reserva ya se usó.',
  ],
  HONOR_AWARD_NOT_CLAIMABLE: ['notGrantable', 'Este galardón ya no se puede otorgar.'],
  PERMISSION_DENIED: ['permissionDenied', 'Tu rol no puede otorgar galardones.'],
  HONOR_AWARD_INPUT_INVALID: ['invalid', 'Revisa el correo y el número de reserva.'],
};

/**
 * The ally's honor award desk (for example a hotel front desk): give one of the ally's honor
 * awards to a person for a stay, and see how many of them a person already holds.
 */
export default function HonorAwardsAllyDesk({
  desk,
  c,
}: HonorAwardsAllyDeskProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const key = (name: string) => `profile.honorAwards.desk.${name}`;
  const [recipes, setRecipes] = useState<HonorAwardRecipe[] | null>(null);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [lookupEmail, setLookupEmail] = useState('');
  const [summary, setSummary] = useState<HonorAwardGuestSummary | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    desk
      .listRecipes()
      .then((items) => {
        if (!active) return;
        setRecipes(items);
        setRecipeId(items[0]?.id ?? null);
      })
      .catch(() => {
        if (active) setRecipes([]);
      });
    return () => {
      active = false;
    };
  }, [desk]);

  function errorText(error: unknown): string {
    const code = error instanceof HonorAwardRequestError ? error.code ?? '' : '';
    const [name, fallback] = ERRORS[code] ?? [
      'genericError',
      'No pudimos completar la acción. Inténtalo de nuevo.',
    ];
    return honorText(t, key(name), fallback);
  }

  async function grant(): Promise<void> {
    if (!recipeId || !email.trim()) {
      setMessage({
        tone: 'error',
        text: honorText(t, key('missing'), 'Elige un galardón y escribe el correo.'),
      });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await desk.grant({ recipeId, email, reference });
      setMessage({
        tone: 'ok',
        text: honorText(
          t,
          key('granted'),
          'Galardón otorgado. La persona lo verá por reclamar en su perfil.'
        ),
      });
      setEmail('');
      setReference('');
    } catch (error) {
      setMessage({ tone: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  }

  async function lookup(): Promise<void> {
    if (!lookupEmail.trim()) return;
    setLookupError(null);
    setSummary(null);
    try {
      setSummary(await desk.lookupGuest(lookupEmail));
    } catch (error) {
      setLookupError(errorText(error));
    }
  }

  if (recipes === null) return <ActivityIndicator style={styles.loader} />;

  const inputStyle = [
    styles.input,
    { color: c.text, borderColor: c.border ?? 'rgba(255,255,255,0.2)' },
  ];

  return (
    <View style={styles.desk}>
      <Text style={[styles.title, { color: c.text }]}>
        {honorText(t, key('grantTitle'), 'Otorgar un galardón')}
      </Text>
      {recipes.length === 0 ? (
        <Text style={[styles.muted, { color: c.muted }]}>
          {honorText(
            t,
            key('noRecipes'),
            'Tu organización aún no tiene galardones para otorgar. Pídelos al equipo de Airs.'
          )}
        </Text>
      ) : (
        <>
          <View style={styles.recipes}>
            {recipes.map((recipe) => {
              const selected = recipe.id === recipeId;
              return (
                <Pressable
                  key={recipe.id}
                  accessibilityRole='button'
                  accessibilityState={{ selected }}
                  accessibilityLabel={recipe.title}
                  onPress={() => setRecipeId(recipe.id)}
                  style={[
                    styles.recipe,
                    { borderColor: selected ? MINT : c.border ?? 'rgba(255,255,255,0.2)' },
                  ]}
                >
                  <HonorAwardEmblem
                    tier={recipe.tier}
                    kind={recipe.kind}
                    title={recipe.title}
                    imageUrl={recipe.badgeImageUrl}
                    artPreset={recipe.artPreset}
                    size={40}
                  />
                  <Text numberOfLines={2} style={[styles.recipeLabel, { color: c.text }]}>
                    {recipe.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            accessibilityLabel={honorText(t, key('email'), 'Correo de la cuenta de Airs')}
            autoCapitalize='none'
            keyboardType='email-address'
            onChangeText={setEmail}
            placeholder={honorText(t, key('email'), 'Correo de la cuenta de Airs')}
            placeholderTextColor={c.muted}
            style={inputStyle}
            value={email}
          />
          <TextInput
            accessibilityLabel={honorText(t, key('reference'), 'Número de reserva (opcional)')}
            onChangeText={setReference}
            placeholder={honorText(t, key('reference'), 'Número de reserva (opcional)')}
            placeholderTextColor={c.muted}
            style={inputStyle}
            value={reference}
          />
          <Text style={[styles.muted, { color: c.muted }]}>
            {honorText(
              t,
              key('referenceHint'),
              'Con número de reserva se otorga uno por estadía; cada reserva se usa una sola vez.'
            )}
          </Text>
          <Pressable
            accessibilityRole='button'
            disabled={busy}
            onPress={() => void grant()}
            style={[styles.primary, busy && { opacity: 0.6 }]}
          >
            <Text style={styles.primaryText}>{honorText(t, key('grant'), 'Otorgar galardón')}</Text>
          </Pressable>
          {message ? (
            <Text style={[styles.message, { color: message.tone === 'ok' ? MINT : '#ff8a8a' }]}>
              {message.text}
            </Text>
          ) : null}
        </>
      )}

      <Text style={[styles.title, { color: c.text, marginTop: 18 }]}>
        {honorText(t, key('lookupTitle'), 'Consultar a un huésped')}
      </Text>
      <TextInput
        accessibilityLabel={honorText(t, key('lookupEmail'), 'Correo del huésped')}
        autoCapitalize='none'
        keyboardType='email-address'
        onChangeText={setLookupEmail}
        placeholder={honorText(t, key('lookupEmail'), 'Correo del huésped')}
        placeholderTextColor={c.muted}
        style={inputStyle}
        value={lookupEmail}
      />
      <Pressable accessibilityRole='button' onPress={() => void lookup()} style={styles.secondary}>
        <Text style={[styles.secondaryText, { color: c.text }]}>
          {honorText(t, key('lookup'), 'Consultar')}
        </Text>
      </Pressable>
      {lookupError ? (
        <Text style={[styles.message, { color: '#ff8a8a' }]}>{lookupError}</Text>
      ) : null}
      {summary && !summary.found ? (
        <Text style={[styles.message, { color: c.muted }]}>
          {honorText(t, key('recipientNotFound'), 'No hay una cuenta de Airs con ese correo.')}
        </Text>
      ) : null}
      {summary?.found ? (
        <View style={styles.summary}>
          <Text style={[styles.summaryTotal, { color: c.text }]}>
            {honorText(t, key('total'), 'Galardones de tu organización: {{count}}', {
              count: summary.total,
            })}
          </Text>
          {summary.byRecipe.map((item) => (
            <Text key={item.recipeId} style={[styles.muted, { color: c.muted }]}>
              {`${item.title} × ${item.count}`}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: 16 },
  desk: { marginHorizontal: 12, marginBottom: 16, gap: 8 },
  title: { fontSize: 16, fontWeight: '800' },
  muted: { fontSize: 12, lineHeight: 17 },
  recipes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recipe: {
    width: 96,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 8,
  },
  recipeLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  primary: {
    alignSelf: 'flex-start',
    backgroundColor: MINT,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  primaryText: { color: '#04231c', fontWeight: '800' },
  secondary: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  secondaryText: { fontWeight: '700' },
  message: { fontSize: 13, fontWeight: '600' },
  summary: { gap: 2 },
  summaryTotal: { fontSize: 14, fontWeight: '800' },
});
