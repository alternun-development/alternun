import React, { useState } from 'react';
import { Send } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  COMPANY_SIZES,
  enterpriseApplicationProblem,
  submitEnterpriseApplication,
  type EnterpriseApplicationRequest,
  type EnterpriseCompanySize,
} from '../../services/enterpriseApplication';
import type { EnterpriseApplicationFormProps, EnterpriseTextField as TextField } from './types';
import { FormField } from '../common/FormField';

const FIELDS: ReadonlyArray<{
  key: TextField;
  multiline?: boolean;
  email?: boolean;
  url?: boolean;
  phone?: boolean;
}> = [
  { key: 'companyName' },
  { key: 'legalName' },
  { key: 'sector' },
  { key: 'location' },
  { key: 'websiteUrl', url: true },
  { key: 'offer', multiline: true },
  { key: 'interest', multiline: true },
  { key: 'contactName' },
  { key: 'contactRole' },
  { key: 'contactEmail', email: true },
  { key: 'contactPhone', phone: true },
];

function emptyRequest(language: string): EnterpriseApplicationRequest {
  return {
    companyName: '',
    legalName: '',
    sector: '',
    location: '',
    websiteUrl: '',
    companySize: '',
    offer: '',
    interest: '',
    contactName: '',
    contactRole: '',
    contactEmail: '',
    contactPhone: '',
    language: (['es', 'en', 'th'].includes(language)
      ? language
      : 'en') as EnterpriseApplicationRequest['language'],
    faxNumber: '',
  };
}

/** Company enrolment form: identity, what customers would earn Airs with, and a contact. */
export function EnterpriseApplicationForm({
  language,
  palette,
  t,
  submit = submitEnterpriseApplication,
}: EnterpriseApplicationFormProps): React.JSX.Element {
  const [draft, setDraft] = useState(() => emptyRequest(language));
  const [invalid, setInvalid] = useState<keyof EnterpriseApplicationRequest | null>(null);
  const [state, setState] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const set = (key: keyof EnterpriseApplicationRequest, value: string): void => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (invalid === key) setInvalid(null);
  };

  async function send(): Promise<void> {
    if (state === 'submitting') return;
    const problem = enterpriseApplicationProblem(draft);
    if (problem) {
      setInvalid(problem);
      setState('error');
      setMessage(t('explorer.enterpriseForm.validationError'));
      return;
    }
    setState('submitting');
    setMessage('');
    try {
      await submit({ ...draft, language: emptyRequest(language).language });
      setDraft(emptyRequest(language));
      setState('sent');
      setMessage(t('explorer.enterpriseForm.sent'));
    } catch (error) {
      setState('error');
      setMessage(
        t(
          error instanceof Error && error.message === 'ENTERPRISE_APPLICATION_RATE_LIMITED'
            ? 'explorer.enterpriseForm.rateLimited'
            : 'explorer.enterpriseForm.submitError'
        )
      );
    }
  }

  return (
    <View testID='enterprise-application-form' style={styles.form}>
      {FIELDS.map((field) => (
        <FormField
          key={field.key}
          testID={`enterprise-application-${field.key}`}
          label={t(`explorer.enterpriseForm.${field.key}`)}
          value={draft[field.key]}
          onChangeText={(value) => set(field.key, value)}
          multiline={field.multiline}
          keyboardType={
            field.email
              ? 'email-address'
              : field.url
              ? 'url'
              : field.phone
              ? 'phone-pad'
              : 'default'
          }
          error={invalid === field.key ? t('explorer.enterpriseForm.fieldInvalid') : null}
        />
      ))}

      <Text style={[styles.label, { color: palette.muted }]}>
        {t('explorer.enterpriseForm.sizeLabel')}
      </Text>
      <View style={styles.sizes}>
        {COMPANY_SIZES.map((size: EnterpriseCompanySize) => {
          const selected = draft.companySize === size;
          return (
            <Pressable
              key={size}
              testID={`enterprise-application-size-${size}`}
              accessibilityRole='radio'
              accessibilityState={{ selected, checked: selected }}
              onPress={() => set('companySize', selected ? '' : size)}
              style={[
                styles.size,
                { borderColor: selected ? palette.primary : palette.border },
                selected && { backgroundColor: palette.mist },
              ]}
            >
              <Text
                style={[styles.sizeText, { color: selected ? palette.primaryDeep : palette.muted }]}
              >
                {t(`explorer.enterpriseForm.sizes.${size}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Honeypot: invisible to people, bots tend to fill it. */}
      <TextInput
        testID='enterprise-application-honeypot'
        value={draft.faxNumber}
        onChangeText={(value) => set('faxNumber', value)}
        accessibilityElementsHidden
        importantForAccessibility='no-hide-descendants'
        tabIndex={-1}
        style={styles.honeypot}
      />

      {message ? (
        <Text
          testID='enterprise-application-message'
          style={[styles.message, { color: state === 'sent' ? palette.primaryDeep : '#f87171' }]}
        >
          {message}
        </Text>
      ) : null}

      <Pressable
        testID='enterprise-application-submit'
        accessibilityRole='button'
        disabled={state === 'submitting'}
        onPress={() => void send()}
        style={[
          styles.submit,
          { backgroundColor: palette.primary, opacity: state === 'submitting' ? 0.6 : 1 },
        ]}
      >
        <Send size={16} color='#063c32' />
        <Text style={styles.submitText}>
          {t(
            state === 'submitting'
              ? 'explorer.enterpriseForm.submitting'
              : 'explorer.enterpriseForm.submit'
          )}
        </Text>
      </Pressable>
      <Text style={[styles.finePrint, { color: palette.muted }]}>
        {t('explorer.enterpriseForm.finePrint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  size: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  sizeText: { fontSize: 12, fontWeight: '800' },
  honeypot: { position: 'absolute', width: 1, height: 1, opacity: 0, left: -9999 },
  message: { fontSize: 13, fontWeight: '700' },
  submit: {
    minHeight: 50,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  submitText: { color: '#063c32', fontSize: 15, fontWeight: '900' },
  finePrint: { fontSize: 12, textAlign: 'center' },
});
