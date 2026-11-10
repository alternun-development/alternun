import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Mail, Sparkles, UserCheck, Users, type LucideProps } from 'lucide-react-native';
import SearchFilterBar from '../common/SearchFilterBar';
import { SectionHeading } from '../common/PageHeader';
import { ManageField } from './ManageField';
import { manageStyles } from './styles';
import type { ClientDraft, ClientFilter, ManageClientsSectionProps } from './types';
import { ManageRequestError, pickImageFile } from '../../utils/projectManage';
import {
  airsAmount,
  PROOF_TYPES,
  type AddClientResult,
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

const CLIENT_FILTERS: readonly ClientFilter[] = ['all', 'member', 'invitation', 'withAirs'];
const FILTER_ICONS: Record<ClientFilter, React.FC<LucideProps>> = {
  all: Users as React.FC<LucideProps>,
  member: UserCheck as React.FC<LucideProps>,
  invitation: Mail as React.FC<LucideProps>,
  withAirs: Sparkles as React.FC<LucideProps>,
};

/** Whether a client belongs to the list filter. */
export function matchesClientFilter(item: ProjectClient, filter: ClientFilter): boolean {
  if (filter === 'withAirs') return item.reports.length > 0;
  return filter === 'all' || item.kind === filter;
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
  openUrl = (url) => Linking.openURL(url),
  multiProject = false,
}: ManageClientsSectionProps): React.JSX.Element {
  const [listing, setListing] = useState<ClientsListing | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ClientFilter>('all');
  const [draft, setDraft] = useState<ClientDraft>(EMPTY_DRAFT);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [lookup, setLookup] = useState<ClientLookup | null>(null);
  const [proof, setProof] = useState<ProofFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const update = (patch: Partial<ClientDraft>): void =>
    setDraft((current) => ({ ...current, ...patch }));
  const problem = (failure: unknown): string =>
    t(
      (failure instanceof ManageRequestError && failure.code
        ? ERROR_KEYS[failure.code]
        : undefined) ?? 'manage.error'
    );

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (failure) {
      setError(problem(failure));
    } finally {
      setBusy(false);
    }
  }

  const email = draft.email.trim();
  const amount = draft.assign ? airsAmount(draft.amount) : null;
  const needsName = lookup ? !lookup.hasAccount : true;
  const ready =
    !!projectId &&
    !!lookup &&
    lookup.email === email.toLowerCase() &&
    (!needsName || !!draft.name.trim()) &&
    (!draft.assign || (amount !== null && draft.concept.trim().length >= 3));

  const search = (): Promise<void> =>
    run(async () => {
      if (!projectId || !email) return;
      setLookup(await client.lookup(projectId, email));
    });

  function resultMessage(result: AddClientResult): string {
    const base = result.alreadyClient
      ? t('manage.clients.notices.airsAdded')
      : result.client.kind === 'member'
      ? t('manage.clients.notices.added')
      : result.invitationSent
      ? t('manage.clients.notices.invited')
      : t('manage.clients.notices.invitedWithAirs');
    return result.reportStatus === 'pending_approval'
      ? `${base} ${t('manage.clients.notices.pendingApproval')}`
      : base;
  }

  const add = (): Promise<void> =>
    run(async () => {
      if (!projectId || !ready) return;
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
      setDraft(EMPTY_DRAFT);
      setLookup(null);
      setProof(null);
      setNotice(resultMessage(result));
      load();
    });

  const remove = (item: ProjectClient): Promise<void> =>
    run(async () => {
      if (item.kind === 'member')
        await client.remove(item.projectId, item.id, t('manage.clients.removeReason'));
      else await client.cancelInvitation(item.projectId, item.id);
      load();
    });

  const showProof = (item: ProjectClient, reportId: string): Promise<void> =>
    run(async () => {
      await openUrl(await client.proofUrl(item.projectId, reportId));
    });

  function assignTo(item: ProjectClient): void {
    setProjectId(item.projectId);
    setDraft({ ...EMPTY_DRAFT, email: item.email, name: item.name, assign: true });
    setLookup({
      email: item.email.toLowerCase(),
      hasAccount: item.kind === 'member',
      displayName: item.name,
    });
    setProof(null);
  }

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
          <View
            key={`${item.kind}-${item.id}`}
            testID={`manage-client-${item.id}`}
            style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: palette.border }}
          >
            <View style={[manageStyles.row, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1, minWidth: 160 }}>
                <Text style={{ color: palette.text, fontWeight: '800' }}>
                  {item.name || item.email}
                </Text>
                <Text style={[manageStyles.muted, { color: palette.muted }]}>
                  {item.email}
                  {multiProject && projectTitles.get(item.projectId)
                    ? ` · ${projectTitles.get(item.projectId) ?? ''}`
                    : ''}
                </Text>
              </View>
              <Text
                style={[
                  manageStyles.secondaryButtonText,
                  { color: item.kind === 'member' ? palette.primary : palette.muted },
                ]}
              >
                {t(`manage.clients.kind.${item.kind}`)}
              </Text>
            </View>
            {item.reports.map((report) => (
              <View key={report.id} style={manageStyles.row}>
                <Text style={[manageStyles.muted, { color: palette.text, flex: 1 }]}>
                  {`${report.amount.toLocaleString('es-CO')} Airs · ${report.concept} · ${t(
                    `manage.clients.status.${report.status}`,
                    undefined,
                    report.status
                  )}`}
                </Text>
                {report.hasProof ? (
                  <Pressable
                    testID={`manage-client-proof-${report.id}`}
                    accessibilityRole='link'
                    disabled={busy}
                    onPress={() => void showProof(item, report.id)}
                  >
                    <Text
                      style={[manageStyles.secondaryButtonText, { color: palette.primaryDeep }]}
                    >
                      {t('manage.clients.viewProof')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            {can.editClients ? (
              <View style={manageStyles.row}>
                {can.assignAirs ? (
                  <Pressable
                    testID={`manage-client-assign-${item.id}`}
                    accessibilityRole='button'
                    disabled={busy}
                    onPress={() => assignTo(item)}
                    style={chip(false)}
                  >
                    <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                      {t('manage.clients.assignAirs')}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  testID={`manage-client-remove-${item.id}`}
                  accessibilityRole='button'
                  disabled={busy}
                  onPress={() => void remove(item)}
                  style={chip(false)}
                >
                  <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                    {t(
                      item.kind === 'member'
                        ? 'manage.clients.remove'
                        : 'manage.clients.cancelInvitation'
                    )}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
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
                <Text style={manageStyles.primaryButtonText}>{t('manage.clients.lookup')}</Text>
              </Pressable>
            }
          />
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
              <ManageField
                testID='manage-clients-concept'
                label={t('manage.clients.concept')}
                value={draft.concept}
                onChange={(value) => update({ concept: value })}
                palette={palette}
              />
              <ManageField
                testID='manage-clients-document'
                label={t('manage.clients.documentNumber')}
                value={draft.documentNumber}
                onChange={(value) => update({ documentNumber: value })}
                palette={palette}
              />
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

          <Pressable
            testID='manage-clients-add'
            accessibilityRole='button'
            disabled={busy || !ready}
            onPress={() => void add()}
            style={[
              manageStyles.primaryButton,
              { backgroundColor: palette.fill, opacity: busy || !ready ? 0.6 : 1 },
            ]}
          >
            <Text style={manageStyles.primaryButtonText}>{t('manage.clients.add')}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[manageStyles.muted, { color: palette.muted }]}>
          {t('manage.clients.readOnly')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { marginBottom: 0 },
  lookup: {
    borderRadius: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
