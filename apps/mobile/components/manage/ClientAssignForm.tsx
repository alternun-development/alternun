import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ManageField } from './ManageField';
import { manageStyles } from './styles';
import type { DetailPalette, Translate } from '../marketplace/types';
import type { AirsValues, AssignFailure } from './ClientAssignForm.types';
import {
  airsAmount,
  CLIENT_LIMITS,
  clientFormProblems,
  type ClientField,
  type ProjectClient,
  type ProofFile,
} from '../../utils/projectClients';

const EMPTY_AIRS: AirsValues = { amount: '', concept: '', documentNumber: '' };
const AIRS_FIELDS = ['amount', 'concept', 'documentNumber'] as const;

/** Text of a field problem (an i18n key), with the limits it mentions. */
export function clientFieldMessage(t: Translate, field: ClientField, key: string): string {
  return t(key, {
    min: CLIENT_LIMITS.conceptMin,
    max:
      field === 'name'
        ? CLIENT_LIMITS.nameMax
        : field === 'documentNumber'
        ? CLIENT_LIMITS.documentMax
        : CLIENT_LIMITS.conceptMax,
  });
}

/** Amount, reason, document and supporting file of an Airs assignment. */
export function ClientAirsFields({
  idPrefix,
  values,
  onChange,
  fieldError,
  palette,
  t,
  canPickFiles,
  busy,
  proof,
  onAttach,
}: {
  /** Test ids are `<idPrefix>-amount`, `<idPrefix>-concept-error`, ... */
  idPrefix: string;
  values: AirsValues;
  onChange: (patch: Partial<AirsValues>) => void;
  fieldError: (field: ClientField) => string | null;
  palette: DetailPalette;
  t: Translate;
  canPickFiles: boolean;
  busy: boolean;
  proof: ProofFile | null;
  onAttach: () => void;
}): React.JSX.Element {
  const error = (field: ClientField): React.JSX.Element | null => {
    const message = fieldError(field);
    return message ? (
      <Text testID={`${idPrefix}-${field}-error`} style={manageStyles.error}>
        {message}
      </Text>
    ) : null;
  };
  const conceptLength = values.concept.trim().length;
  return (
    <>
      <ManageField
        testID={`${idPrefix}-amount`}
        label={t('manage.clients.amount')}
        value={values.amount}
        onChange={(value) => onChange({ amount: value })}
        palette={palette}
      />
      {error('amount')}
      <ManageField
        testID={`${idPrefix}-concept`}
        label={t('manage.clients.concept')}
        value={values.concept}
        onChange={(value) => onChange({ concept: value })}
        palette={palette}
      />
      {error('concept') ?? (
        <Text
          testID={`${idPrefix}-concept-count`}
          style={[
            manageStyles.muted,
            {
              color: conceptLength >= CLIENT_LIMITS.conceptMin ? palette.muted : palette.text,
            },
          ]}
        >
          {t('manage.clients.conceptCount', {
            count: conceptLength,
            min: CLIENT_LIMITS.conceptMin,
          })}
        </Text>
      )}
      <ManageField
        testID={`${idPrefix}-document`}
        label={t('manage.clients.documentNumber')}
        value={values.documentNumber}
        onChange={(value) => onChange({ documentNumber: value })}
        palette={palette}
      />
      {error('documentNumber')}
      {canPickFiles ? (
        <View style={manageStyles.row}>
          <Pressable
            testID={`${idPrefix}-proof`}
            accessibilityRole='button'
            disabled={busy}
            onPress={onAttach}
            style={[
              manageStyles.secondaryButton,
              { borderColor: proof ? palette.primary : palette.border },
              !!proof && { backgroundColor: palette.mist },
            ]}
          >
            <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
              {t(proof ? 'manage.clients.proofChange' : 'manage.clients.proofAttach')}
            </Text>
          </Pressable>
          {proof ? (
            <Text style={[manageStyles.muted, { color: palette.muted }]}>
              {proof.name ?? t('manage.clients.proofReady')}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Text style={[manageStyles.muted, { color: palette.muted }]}>
        {t('manage.clients.airsHint')}
      </Text>
    </>
  );
}

/** Why an assignment failed: a message and, when the API says so, the fields to fix. */
/** Assigns Airs to a client that is already listed, inside that client's row. */
export function ClientAssignForm({
  item,
  palette,
  t,
  canPickFiles,
  pickFile,
  busy,
  submitting,
  onSubmit,
  onCancel,
}: {
  item: ProjectClient;
  palette: DetailPalette;
  t: Translate;
  canPickFiles: boolean;
  pickFile: () => Promise<ProofFile | null>;
  /** Another action of the section is running. */
  busy: boolean;
  submitting: boolean;
  /** Resolves to null once assigned (the row closes the form) or to what went wrong. */
  onSubmit: (
    airs: { amount: number; concept: string; documentNumber: string },
    proof: ProofFile | null
  ) => Promise<AssignFailure | null>;
  onCancel: () => void;
}): React.JSX.Element {
  const [values, setValues] = useState<AirsValues>(EMPTY_AIRS);
  const [proof, setProof] = useState<ProofFile | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [serverProblems, setServerProblems] = useState<Partial<Record<ClientField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const idPrefix = `manage-client-airs-${item.id}`;
  const problems = clientFormProblems(
    { email: item.email, name: item.name, ...values },
    { needsName: false, assign: true }
  );

  const change = (patch: Partial<AirsValues>): void => {
    setValues((current) => ({ ...current, ...patch }));
    setServerProblems((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch)) delete next[field as ClientField];
      return next;
    });
  };
  const fieldError = (field: ClientField): string | null => {
    const key = serverProblems[field] ?? (attempted ? problems[field] : undefined);
    return key ? clientFieldMessage(t, field, key) : null;
  };

  async function attach(): Promise<void> {
    const file = await pickFile();
    if (file) setProof(file);
  }

  async function submit(): Promise<void> {
    const amount = airsAmount(values.amount);
    if (amount === null || AIRS_FIELDS.some((field) => problems[field])) {
      setAttempted(true);
      setError(t('manage.clients.errors.reviewAssign'));
      return;
    }
    setError(null);
    const failure = await onSubmit(
      { amount, concept: values.concept, documentNumber: values.documentNumber },
      proof
    );
    if (!failure) return;
    setError(failure.message);
    setServerProblems(failure.fields);
    if (Object.keys(failure.fields).length > 0) setAttempted(true);
  }

  const disabled = busy || submitting;
  return (
    <View testID={idPrefix} style={[styles.form, { borderColor: palette.border }]}>
      <ClientAirsFields
        idPrefix={idPrefix}
        values={values}
        onChange={change}
        fieldError={fieldError}
        palette={palette}
        t={t}
        canPickFiles={canPickFiles}
        busy={disabled}
        proof={proof}
        onAttach={() => void attach()}
      />
      {error ? (
        <Text testID={`${idPrefix}-error`} style={manageStyles.error}>
          {error}
        </Text>
      ) : null}
      <View style={manageStyles.row}>
        <Pressable
          testID={`${idPrefix}-submit`}
          accessibilityRole='button'
          accessibilityState={{ disabled, busy: submitting }}
          disabled={disabled}
          onPress={() => void submit()}
          style={[
            manageStyles.primaryButton,
            { backgroundColor: palette.fill, opacity: disabled ? 0.6 : 1 },
          ]}
        >
          {submitting ? (
            <View style={styles.busyRow}>
              <ActivityIndicator size='small' color='#effff7' />
              <Text style={manageStyles.primaryButtonText}>{t('manage.clients.busy.assign')}</Text>
            </View>
          ) : (
            <Text style={manageStyles.primaryButtonText}>{t('manage.clients.assignSubmit')}</Text>
          )}
        </Pressable>
        <Pressable
          testID={`${idPrefix}-cancel`}
          accessibilityRole='button'
          disabled={submitting}
          onPress={onCancel}
          style={[manageStyles.secondaryButton, { borderColor: palette.border }]}
        >
          <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
            {t('manage.clients.assignCancel')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10, paddingTop: 10, borderTopWidth: 1, borderStyle: 'dashed' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
