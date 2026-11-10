import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Mail, MailX, Sparkles, UserCheck, Users, type LucideProps } from 'lucide-react-native';
import SearchFilterBar from '../common/SearchFilterBar';
import { SectionHeading } from '../common/PageHeader';
import { ClientListItem } from './ClientListItem';
import { ProofViewer } from './ProofViewer';
import { ManageField } from './ManageField';
import { manageStyles } from './styles';
import type {
  ClientDraft,
  ClientFilter,
  ManageClientsSectionProps,
  ProofViewerState,
} from './types';
import { ManageRequestError, pickImageFile } from '../../utils/projectManage';
import {
  airsAmount,
  CLIENT_LIMITS,
  clientFormProblems,
  PROOF_TYPES,
  serverFieldProblems,
  type AddClientResult,
  type ClientField,
  type ClientLookup,
  type ClientsListing,
  type ProjectClient,
  type ProofFile,
} from '../../utils/projectClients';

const EMPTY_DRAFT: ClientDraft = {
  email: '',
  name: '',
  assign: false,
  amount: '',
  concept: '',
  documentNumber: '',
};

const ERROR_KEYS: Readonly<Record<string, string>> = {
  CLIENT_NAME_REQUIRED: 'manage.clients.errors.nameRequired',
  AIRS_REPORT_RECIPIENT_NAME_REQUIRED: 'manage.clients.errors.nameRequired',
  AIRS_REPORT_DOCUMENT_NUMBER_REQUIRED: 'manage.clients.errors.documentRequired',
  CLIENT_PROOF_INVALID: 'manage.clients.errors.proof',
  UPLOAD_TYPE: 'manage.clients.errors.proof',
  UPLOAD_SIZE: 'manage.clients.errors.proof',
  CLIENT_INVITE_RATE_LIMITED: 'manage.clients.errors.rateLimited',
  AIRS_REPORT_LOOKUP_RATE_LIMITED: 'manage.clients.errors.rateLimited',
};

const CLIENT_FILTERS: readonly ClientFilter[] = [
  'all',
  'member',
  'invitation',
  'cancelled',
  'withAirs',
];
const FILTER_ICONS: Record<ClientFilter, React.FC<LucideProps>> = {
  all: Users as React.FC<LucideProps>,
  member: UserCheck as React.FC<LucideProps>,
  invitation: Mail as React.FC<LucideProps>,
  cancelled: MailX as React.FC<LucideProps>,
  withAirs: Sparkles as React.FC<LucideProps>,
};

/** Whether a client belongs to the list filter. */
export function matchesClientFilter(item: ProjectClient, filter: ClientFilter): boolean {
  if (filter === 'withAirs') return item.reports.length > 0;
  return filter === 'all' || item.kind === filter;
}

/** blob: URL on web; a data: URL where object URLs are not available (native). */
function defaultLocalUrl(file: Blob): Promise<string> {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function')
    return Promise.resolve(URL.createObjectURL(file));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

function releaseLocalUrl(uri: string | undefined): void {
  if (uri?.startsWith('blob:') && typeof URL.revokeObjectURL === 'function')
    URL.revokeObjectURL(uri);
}

const defaultPickProof = (): Promise<ProofFile | null> =>
  pickImageFile(globalThis.document, PROOF_TYPES.join(','));

/** Clients of a project (or of every project of an enterprise) and the form to add them. */
export function ManageClientsSection({
  client,
  can,
  palette,
  t,
  canPickFiles,
  pickFile = defaultPickProof,
  toLocalUrl = defaultLocalUrl,
  multiProject = false,
  onToast,
}: ManageClientsSectionProps): React.JSX.Element {
  const [listing, setListing] = useState<ClientsListing | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ClientFilter>('all');
  const [draft, setDraft] = useState<ClientDraft>(EMPTY_DRAFT);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [lookup, setLookup] = useState<ClientLookup | null>(null);
  const [proof, setProof] = useState<ProofFile | null>(null);
  // What is running ('lookup', 'add', 'remove-<id>', 'proof-<id>'), shown on its own button.
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const busy = busyAction !== null;
  const [error, setError] = useState<string | null>(null);
  // Errors of the add form (lookup, validation, add) show next to its button.
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The supporting file being shown; its local URL is released when the viewer closes.
  const [viewer, setViewer] = useState<ProofViewerState | null>(null);
  const viewerUri = useRef<string | undefined>(undefined);
  useEffect(() => () => releaseLocalUrl(viewerUri.current), []);
  // Field messages show once the person tries to send; the API's own ones until edited.
  const [attempted, setAttempted] = useState(false);
  const [serverProblems, setServerProblems] = useState<Partial<Record<ClientField, string>>>({});

  const load = useCallback(() => {
    void client
      .list()
      .then((next) => {
        setListing(next);
        setProjectId((current) => current ?? next.projects[0]?.id ?? null);
      })
      .catch(() => setError(t('manage.error')));
  }, [client, t]);

  useEffect(load, [load]);

  const projectTitles = useMemo(
    () => new Map((listing?.projects ?? []).map((item) => [item.id, item.title])),
    [listing]
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (listing?.clients ?? []).filter(
      (item) =>
        matchesClientFilter(item, filter) &&
        (!needle ||
          item.email.toLowerCase().includes(needle) ||
          item.name.toLowerCase().includes(needle))
    );
  }, [listing, query, filter]);
  const filters = useMemo(
    () =>
      CLIENT_FILTERS.map((key) => ({
        key,
        label: t(`manage.clients.filters.${key}`),
        icon: FILTER_ICONS[key],
      })),
    [t]
  );

  const update = (patch: Partial<ClientDraft>): void => {
    setDraft((current) => ({ ...current, ...patch }));
    setServerProblems((current) => {
      const next = { ...current };
      for (const field of Object.keys(patch)) delete next[field as ClientField];
      return next;
    });
  };
  const problem = (failure: unknown): string =>
    t(
      (failure instanceof ManageRequestError && failure.code
        ? ERROR_KEYS[failure.code]
        : undefined) ?? 'manage.error'
    );

  async function run(
    key: string,
    action: () => Promise<void>,
    errorTitle = 'manage.clients.toasts.errorTitle'
  ): Promise<void> {
    const inForm = key === 'add' || key === 'lookup';
    setBusyAction(key);
    setError(null);
    setFormError(null);
    setNotice(null);
    try {
      await action();
    } catch (failure) {
      const message = problem(failure);
      if (failure instanceof ManageRequestError && failure.fieldErrors.length > 0) {
        setServerProblems(serverFieldProblems(failure.fieldErrors));
        setAttempted(true);
      }
      if (inForm) setFormError(message);
      else setError(message);
      onToast?.({ type: 'error', title: t(errorTitle), message });
    } finally {
      setBusyAction(null);
    }
  }

  const email = draft.email.trim();
  const amount = draft.assign ? airsAmount(draft.amount) : null;
  const needsName = lookup ? !lookup.hasAccount : true;
  const looked = !!projectId && !!lookup && lookup.email === email.toLowerCase();
  const problems = clientFormProblems(draft, { needsName, assign: draft.assign });
  const fieldError = (field: ClientField): string | null => {
    const key = serverProblems[field] ?? (attempted ? problems[field] : undefined);
    return key
      ? t(key, {
          min: CLIENT_LIMITS.conceptMin,
          max:
            field === 'name'
              ? CLIENT_LIMITS.nameMax
              : field === 'documentNumber'
              ? CLIENT_LIMITS.documentMax
              : CLIENT_LIMITS.conceptMax,
        })
      : null;
  };
  const renderFieldError = (field: ClientField): React.JSX.Element | null => {
    const message = fieldError(field);
    return message ? (
      <Text testID={`manage-clients-${field}-error`} style={manageStyles.error}>
        {message}
      </Text>
    ) : null;
  };
  const conceptLength = draft.concept.trim().length;

  const search = (): Promise<void> => {
    if (problems.email) {
      setAttempted(true);
      return Promise.resolve();
    }
    return run(
      'lookup',
      async () => {
        if (!projectId) return;
        setLookup(await client.lookup(projectId, email));
        // A fresh lookup starts the rest of the form without earlier messages.
        setAttempted(false);
      },
      'manage.clients.toasts.lookupErrorTitle'
    );
  };

  function resultMessage(result: AddClientResult): string {
    const base = result.alreadyClient
      ? t(
          result.reportStatus
            ? 'manage.clients.notices.airsAdded'
            : 'manage.clients.notices.alreadyClient'
        )
      : result.client.kind === 'member'
      ? t('manage.clients.notices.added')
      : !result.invitationSent
      ? t('manage.clients.notices.invitedNoEmail')
      : result.reportStatus === 'awaiting_claim'
      ? t('manage.clients.notices.invitedWithAirs')
      : t('manage.clients.notices.invited');
    return result.reportStatus === 'pending_approval'
      ? `${base} ${t('manage.clients.notices.pendingApproval')}`
      : base;
  }

  const add = (): Promise<void> => {
    if (!projectId || !looked) return Promise.resolve();
    if (Object.keys(problems).length > 0) {
      setAttempted(true);
      setFormError(t('manage.clients.errors.review'));
      return Promise.resolve();
    }
    return run('add', async () => {
      const result = await client.add(
        projectId,
        {
          email,
          ...(needsName ? { name: draft.name } : {}),
          ...(draft.assign && amount !== null
            ? {
                airs: {
                  amount,
                  concept: draft.concept,
                  documentNumber: draft.documentNumber,
                },
              }
            : {}),
        },
        draft.assign ? proof : null
      );
      const message = resultMessage(result);
      setDraft(EMPTY_DRAFT);
      setLookup(null);
      setProof(null);
      setAttempted(false);
      setNotice(message);
      onToast?.({
        type: 'success',
        title: t(
          result.alreadyClient || result.client.kind === 'member'
            ? 'manage.clients.toasts.addedTitle'
            : 'manage.clients.toasts.invitedTitle'
        ),
        message,
      });
      load();
    });
  };

  const remove = (item: ProjectClient): Promise<void> =>
    run(`remove-${item.id}`, async () => {
      if (item.kind === 'member')
        await client.remove(item.projectId, item.id, t('manage.clients.removeReason'));
      else await client.cancelInvitation(item.projectId, item.id);
      onToast?.({
        type: 'success',
        title: t(
          item.kind === 'member'
            ? 'manage.clients.toasts.removedTitle'
            : 'manage.clients.toasts.cancelledTitle'
        ),
        message: item.email,
      });
      load();
    });

  const showProof = (item: ProjectClient, reportId: string): Promise<void> => {
    setViewer({ status: 'loading' });
    return run(`proof-${reportId}`, async () => {
      try {
        const file = await client.proofFile(item.projectId, reportId);
        const uri = await toLocalUrl(file);
        releaseLocalUrl(viewerUri.current);
        viewerUri.current = uri;
        setViewer({ status: 'ready', uri, type: file.type });
      } catch (failure) {
        setViewer({ status: 'error' });
        throw failure;
      }
    });
  };

  const closeViewer = (): void => {
    releaseLocalUrl(viewerUri.current);
    viewerUri.current = undefined;
    setViewer(null);
  };

  function assignTo(item: ProjectClient): void {
    setProjectId(item.projectId);
    setDraft({ ...EMPTY_DRAFT, email: item.email, name: item.name, assign: true });
    setLookup({
      email: item.email.toLowerCase(),
      hasAccount: item.kind === 'member',
      displayName: item.name,
    });
    setProof(null);
    setAttempted(false);
    setServerProblems({});
  }

  // A cancelled invitation is sent again from the form, with its email and name filled in.
  function reinvite(item: ProjectClient): void {
    setProjectId(item.projectId);
    setDraft({ ...EMPTY_DRAFT, email: item.email, name: item.name });
    setLookup({ email: item.email.toLowerCase(), hasAccount: false, displayName: null });
    setProof(null);
    setAttempted(false);
    setServerProblems({});
  }

  const spinner = (label: string, color: string): React.JSX.Element => (
    <View style={styles.busyRow}>
      <ActivityIndicator size='small' color={color} />
      <Text style={[manageStyles.primaryButtonText, { color }]}>{label}</Text>
    </View>
  );

  async function attach(): Promise<void> {
    const file = await pickFile();
    if (file) setProof(file);
  }

  const card = [
    manageStyles.card,
    { borderColor: palette.border, backgroundColor: palette.surface },
  ];
  const chip = (selected: boolean) => [
    manageStyles.secondaryButton,
    { borderColor: selected ? palette.primary : palette.border },
    selected && { backgroundColor: palette.mist },
  ];

  return (
    <View testID='manage-clients' style={{ gap: 14 }}>
      <Text style={[manageStyles.muted, { color: palette.muted }]}>
        {t('manage.clients.intro')}
      </Text>
      {notice ? (
        <Text
          testID='manage-clients-notice'
          style={[manageStyles.muted, { color: palette.primaryDeep }]}
        >
          {notice}
        </Text>
      ) : null}
      {error ? (
        <Text testID='manage-clients-error' style={manageStyles.error}>
          {error}
        </Text>
      ) : null}

      <View style={card}>
        <SearchFilterBar
          testID='manage-clients-search'
          value={query}
          onChangeText={setQuery}
          placeholder={t('manage.clients.search')}
          clearLabel={t('manage.clients.clear')}
          filterLabel={t('manage.clients.filterLabel')}
          filters={filters}
          activeFilter={filter}
          onChangeFilter={(key) => setFilter(key as ClientFilter)}
          style={styles.bar}
        />
        {listing && visible.length === 0 ? (
          <Text style={[manageStyles.muted, { color: palette.muted }]}>
            {t(listing.clients.length === 0 ? 'manage.clients.empty' : 'manage.clients.noMatch')}
          </Text>
        ) : null}
        {visible.map((item) => (
          <ClientListItem
            key={`${item.kind}-${item.id}`}
            item={item}
            palette={palette}
            t={t}
            projectTitle={multiProject ? projectTitles.get(item.projectId) : undefined}
            canEdit={!!can.editClients}
            canAssign={!!can.assignAirs}
            busyAction={busyAction}
            onAssign={() => assignTo(item)}
            onReinvite={() => reinvite(item)}
            onRemove={() => void remove(item)}
            onShowProof={(reportId) => void showProof(item, reportId)}
          />
        ))}
      </View>

      {can.editClients ? (
        <View testID='manage-clients-form' style={card}>
          <SectionHeading title={t('manage.clients.addTitle')} color={palette.text} />
          {multiProject && (listing?.projects.length ?? 0) > 1 ? (
            <>
              <Text style={[manageStyles.label, { color: palette.muted }]}>
                {t('manage.clients.project')}
              </Text>
              <View style={manageStyles.row}>
                {(listing?.projects ?? []).map((item) => (
                  <Pressable
                    key={item.id}
                    testID={`manage-clients-project-${item.id}`}
                    accessibilityRole='radio'
                    accessibilityState={{
                      selected: item.id === projectId,
                      checked: item.id === projectId,
                    }}
                    onPress={() => {
                      setProjectId(item.id);
                      setLookup(null);
                    }}
                    style={chip(item.id === projectId)}
                  >
                    <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                      {item.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          <SearchFilterBar
            testID='manage-clients-email'
            value={draft.email}
            onChangeText={(value) => {
              update({ email: value });
              setLookup(null);
            }}
            placeholder={t('manage.clients.email')}
            searchLabel={t('manage.clients.email')}
            keyboardType='email-address'
            onSubmitEditing={() => void search()}
            filters={[]}
            activeFilter=''
            onChangeFilter={() => undefined}
            style={styles.bar}
            trailing={
              <Pressable
                testID='manage-clients-lookup'
                accessibilityRole='button'
                disabled={busy || !email}
                onPress={() => void search()}
                style={[
                  styles.lookup,
                  { backgroundColor: palette.fill, opacity: busy || !email ? 0.6 : 1 },
                ]}
              >
                {busyAction === 'lookup' ? (
                  spinner(t('manage.clients.busy.lookup'), '#effff7')
                ) : (
                  <Text style={manageStyles.primaryButtonText}>{t('manage.clients.lookup')}</Text>
                )}
              </Pressable>
            }
          />
          {renderFieldError('email')}
          {lookup ? (
            <Text
              testID='manage-clients-lookup-result'
              style={[manageStyles.muted, { color: palette.primaryDeep }]}
            >
              {lookup.hasAccount
                ? t('manage.clients.hasAccount', { name: lookup.displayName ?? lookup.email })
                : t('manage.clients.newPerson')}
            </Text>
          ) : null}
          {lookup && needsName ? (
            <ManageField
              testID='manage-clients-name'
              label={t('manage.clients.name')}
              value={draft.name}
              onChange={(value) => update({ name: value })}
              palette={palette}
            />
          ) : null}
          {lookup && needsName ? renderFieldError('name') : null}

          {lookup && can.assignAirs ? (
            <Pressable
              testID='manage-clients-assign'
              accessibilityRole='checkbox'
              accessibilityState={{ checked: draft.assign }}
              onPress={() => update({ assign: !draft.assign })}
              style={[chip(draft.assign), { alignSelf: 'flex-start' }]}
            >
              <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                {t('manage.clients.assignToggle')}
              </Text>
            </Pressable>
          ) : null}
          {lookup && draft.assign ? (
            <>
              <ManageField
                testID='manage-clients-amount'
                label={t('manage.clients.amount')}
                value={draft.amount}
                onChange={(value) => update({ amount: value })}
                palette={palette}
              />
              {renderFieldError('amount')}
              <ManageField
                testID='manage-clients-concept'
                label={t('manage.clients.concept')}
                value={draft.concept}
                onChange={(value) => update({ concept: value })}
                palette={palette}
              />
              {renderFieldError('concept') ?? (
                <Text
                  testID='manage-clients-concept-count'
                  style={[
                    manageStyles.muted,
                    {
                      color:
                        conceptLength >= CLIENT_LIMITS.conceptMin ? palette.muted : palette.text,
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
                testID='manage-clients-document'
                label={t('manage.clients.documentNumber')}
                value={draft.documentNumber}
                onChange={(value) => update({ documentNumber: value })}
                palette={palette}
              />
              {renderFieldError('documentNumber')}
              {canPickFiles ? (
                <View style={manageStyles.row}>
                  <Pressable
                    testID='manage-clients-proof'
                    accessibilityRole='button'
                    disabled={busy}
                    onPress={() => void attach()}
                    style={chip(!!proof)}
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
          ) : null}

          {formError ? (
            <Text testID='manage-clients-form-error' style={manageStyles.error}>
              {formError}
            </Text>
          ) : null}
          <Pressable
            testID='manage-clients-add'
            accessibilityRole='button'
            accessibilityState={{ disabled: busy || !looked, busy: busyAction === 'add' }}
            disabled={busy || !looked}
            onPress={() => void add()}
            style={[
              manageStyles.primaryButton,
              { backgroundColor: palette.fill, opacity: busy || !looked ? 0.6 : 1 },
            ]}
          >
            {busyAction === 'add' ? (
              spinner(t('manage.clients.busy.add'), '#effff7')
            ) : (
              <Text style={manageStyles.primaryButtonText}>{t('manage.clients.add')}</Text>
            )}
          </Pressable>
          {!looked && email ? (
            <Text style={[manageStyles.muted, { color: palette.muted }]}>
              {t('manage.clients.lookupFirst')}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={[manageStyles.muted, { color: palette.muted }]}>
          {t('manage.clients.readOnly')}
        </Text>
      )}
      <ProofViewer viewer={viewer} palette={palette} t={t} onClose={closeViewer} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { marginBottom: 0 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lookup: {
    borderRadius: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
