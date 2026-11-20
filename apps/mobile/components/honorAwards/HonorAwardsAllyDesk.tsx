import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  HonorAwardRequestError,
  type HonorAwardGuestSummary,
  type HonorAwardRecipe,
  type HonorAwardSendResult,
} from '../../utils/honorAwards';
import { useAppTranslation } from '../i18n/useAppTranslation';
import HonorAwardEmblem from './HonorAwardEmblem';
import HonorAwardCodesPanel from './HonorAwardCodesPanel';
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
    'Esa persona ya tiene este galardón, o esa referencia ya se usó.',
  ],
  HONOR_AWARD_NOT_CLAIMABLE: ['notGrantable', 'Este galardón ya no se puede otorgar.'],
  PERMISSION_DENIED: ['permissionDenied', 'Tu rol no puede otorgar galardones.'],
  HONOR_AWARD_INPUT_INVALID: ['invalid', 'Revisa el correo y la referencia.'],
  PROJECT_SCOPE_DENIED: ['permissionDenied', 'Tu rol no puede otorgar galardones.'],
  AIRS_REPORT_RECIPIENT_NAME_REQUIRED: [
    'nameRequired',
    'Esa persona aún no tiene cuenta en Airs: escribe su nombre para enviarle el galardón.',
  ],
  HONOR_AWARD_AIRS_NOT_CONFIGURED: [
    'airsNotConfigured',
    'Este galardón aún no está listo para entregar Airs. Pídelo al equipo de Airs.',
  ],
};

/** The confirmation after a send: what happened with the award and its Airs. */
function sentMessage(
  result: HonorAwardSendResult | undefined,
  text: (name: string, fallback: string, params?: Record<string, string | number>) => string
): string {
  if (!result || result.kind === 'grant') {
    return text('granted', 'Galardón otorgado. La persona lo verá por reclamar en su perfil.');
  }
  const params = { amount: result.airsAmount };
  if (result.reportStatus === 'pending_approval') {
    return text(
      'sentPending',
      'Quedó en revisión: el galardón y los +{{amount}} Airs se entregan cuando un aprobador lo confirme.',
      params
    );
  }
  if (result.reportStatus === 'awaiting_claim') {
    return text(
      'sentAwaitingAccount',
      'La persona aún no tiene cuenta: le enviamos un correo para crearla y recibir el galardón y los +{{amount}} Airs.',
      params
    );
  }
  return text(
    'sentReleased',
    'Galardón enviado con +{{amount}} Airs. La persona recibió un correo y lo verá por reclamar en su perfil.',
    params
  );
}

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
  /** Why the medals could not be listed, e.g. a role that cannot give them. */
  const [loadError, setLoadError] = useState<unknown>(null);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
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
      .catch((error: unknown) => {
        if (!active) return;
        setRecipes([]);
        setLoadError(error);
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
      const result = await desk.grant({ recipeId, email, recipientName, reference });
      setMessage({
        tone: 'ok',
        text: sentMessage(result, (name, fallback, params) =>
          honorText(t, key(name), fallback, params)
        ),
      });
      setEmail('');
      setRecipientName('');
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

  // Without access the lookup fails too: only say why, instead of "nothing to give".
  if (loadError) {
    return (
      <View style={styles.desk}>
        <Text style={[styles.title, { color: c.text }]}>
          {honorText(t, key('grantTitle'), 'Otorgar un galardón')}
        </Text>
        <Text style={[styles.muted, { color: c.muted }]}>{errorText(loadError)}</Text>
      </View>
    );
  }

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
                  accessibilityLabel={[recipe.title, recipe.eventName].filter(Boolean).join(' · ')}
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
                  {/* Medals of one mission differ by event: "Tour Callaway Colombia", "Comunidad…". */}
                  {recipe.eventName ? (
                    <Text numberOfLines={2} style={[styles.recipeEvent, { color: c.muted }]}>
                      {recipe.eventName}
                    </Text>
                  ) : null}
                  {recipe.airsAmount > 0 ? (
                    <Text style={[styles.recipeAirs, { color: c.text }]}>
                      {honorText(t, 'profile.honorAwards.airsAmount', '+{{amount}} Airs', {
                        amount: recipe.airsAmount,
                      })}
                    </Text>
                  ) : null}
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
            accessibilityLabel={honorText(
              t,
              key('recipientName'),
              'Nombre (si aún no tiene cuenta en Airs)'
            )}
            onChangeText={setRecipientName}
            placeholder={honorText(
              t,
              key('recipientName'),
              'Nombre (si aún no tiene cuenta en Airs)'
            )}
            placeholderTextColor={c.muted}
            style={inputStyle}
            value={recipientName}
          />
          <TextInput
            accessibilityLabel={honorText(
              t,
              key('reference'),
              'Referencia (opcional): reserva, factura o compra'
            )}
            onChangeText={setReference}
            placeholder={honorText(
              t,
              key('reference'),
              'Referencia (opcional): reserva, factura o compra'
            )}
            placeholderTextColor={c.muted}
            style={inputStyle}
            value={reference}
          />
          <Text style={[styles.muted, { color: c.muted }]}>
            {honorText(
              t,
              key('referenceHint'),
              'Con referencia se otorga uno por cada una, por ejemplo por estadía o por compra; cada referencia se usa una sola vez.'
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

      {recipes.length > 0 ? <HonorAwardCodesPanel desk={desk} recipes={recipes} c={c} /> : null}

      <Text style={[styles.title, { color: c.text, marginTop: 18 }]}>
        {honorText(t, key('lookupTitle'), 'Consultar a una persona')}
      </Text>
      <TextInput
        accessibilityLabel={honorText(t, key('lookupEmail'), 'Correo de la persona')}
        autoCapitalize='none'
        keyboardType='email-address'
        onChangeText={setLookupEmail}
        placeholder={honorText(t, key('lookupEmail'), 'Correo de la persona')}
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
    width: 112,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 8,
  },
  recipeLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  recipeEvent: { fontSize: 10, textAlign: 'center' },
  recipeAirs: { fontSize: 11, fontWeight: '800' },
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
