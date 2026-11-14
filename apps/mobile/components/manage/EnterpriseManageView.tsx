import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RoleChips } from '../profile/RoleChips';
import { ToastSystem } from '@alternun/ui';
import { HEADER_BUTTON_SIZE, PageHeader } from '../common/PageHeader';
import { useToasts } from '../common/useToasts';
import { EnterpriseImagesSection } from './EnterpriseImagesSection';
import { EnterpriseInfoSection } from './EnterpriseInfoSection';
import { EnterpriseProductsSection } from './EnterpriseProductsSection';
import { ManageClientsSection } from './ManageClientsSection';
import { ManageTeamSection } from './ManageTeamSection';
import { manageStyles } from './styles';
import type { EnterpriseManageTab, EnterpriseManageViewProps } from './types';
import HonorAwardsSection from '../honorAwards/HonorAwardsSection';
import { ManageRequestError } from '../../utils/projectManage';
import type {
  EnterpriseManageCapabilities,
  EnterpriseManageOverview,
  ManagedEnterprise,
} from '../../utils/enterpriseManage';

/** Tabs the person can use, in display order. */
export function enterpriseTabs(
  can: EnterpriseManageCapabilities,
  hasClients = false,
  hasHonors = false
): EnterpriseManageTab[] {
  return [
    ...(can.editInfo ? (['info'] as const) : []),
    ...(can.images ? (['images'] as const) : []),
    ...(can.products ? (['products'] as const) : []),
    ...(can.team ? (['team'] as const) : []),
    ...(hasClients && can.clients ? (['clients'] as const) : []),
    ...(hasHonors ? (['honors'] as const) : []),
  ];
}

/** In-app "Manage enterprise" view for enterprise admins and Alternun global admins. */
export function EnterpriseManageView({
  client,
  palette,
  t,
  onBack,
  canPickFiles,
  clientsClient,
  honorAwardsClient,
}: EnterpriseManageViewProps): React.JSX.Element {
  const [overview, setOverview] = useState<EnterpriseManageOverview | null>(null);
  const toasts = useToasts();
  const [state, setState] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading');
  const [tab, setTab] = useState<EnterpriseManageTab | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(() => {
    setState('loading');
    void client
      .overview()
      .then((next) => {
        setOverview(next);
        setTab((current) => current ?? enterpriseTabs(next.can, !!clientsClient)[0] ?? null);
        setState('ready');
      })
      .catch((error: unknown) =>
        setState(
          error instanceof ManageRequestError && [401, 403, 404].includes(error.status)
            ? 'denied'
            : 'error'
        )
      );
  }, [client, clientsClient]);

  useEffect(load, [load, version]);

  const changed = (message?: string): void => {
    if (message) setNotice(message);
    setVersion((value) => value + 1);
  };
  const tabs = overview ? enterpriseTabs(overview.can, !!clientsClient, !!honorAwardsClient) : [];
  // Apply what the server saved right away; the refetch that follows only confirms it.
  const applySaved = (saved: ManagedEnterprise): void =>
    setOverview((current) =>
      current ? { ...current, enterprise: { ...current.enterprise, ...saved } } : current
    );
  const sectionProps = overview
    ? { client, overview, palette, t, onChanged: changed, onEnterpriseSaved: applySaved }
    : null;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        testID='enterprise-manage'
        style={{ backgroundColor: palette.background }}
        contentContainerStyle={styles.content}
      >
        <PageHeader
          testID='enterprise-manage-heading'
          title={overview ? overview.enterprise.displayName : t('manage.enterprise.title')}
          subtitle={overview ? t('manage.enterprise.title') : undefined}
          palette={palette}
          leading={
            <Pressable
              testID='enterprise-manage-back'
              accessibilityRole='button'
              accessibilityLabel={t('manage.enterprise.back')}
              onPress={onBack}
              style={[
                styles.back,
                { borderColor: palette.border, backgroundColor: palette.surface },
              ]}
            >
              <ArrowLeft size={18} color={palette.primaryDeep} />
            </Pressable>
          }
        />

        {state === 'loading' && !overview ? (
          <Text style={[manageStyles.muted, { color: palette.muted }]}>{t('manage.loading')}</Text>
        ) : null}
        {state === 'denied' ? (
          <Text
            testID='enterprise-manage-denied'
            style={[manageStyles.muted, { color: palette.text }]}
          >
            {t('manage.denied')}
          </Text>
        ) : null}
        {state === 'error' ? (
          <Pressable
            testID='enterprise-manage-retry'
            accessibilityRole='button'
            onPress={load}
            style={[manageStyles.primaryButton, styles.retry, { backgroundColor: palette.fill }]}
          >
            <RotateCcw size={16} color='#effff7' />
            <Text style={manageStyles.primaryButtonText}>{t('manage.retry')}</Text>
          </Pressable>
        ) : null}

        {overview && state !== 'denied' ? (
          <>
            <RoleChips
              roles={overview.roles}
              accent={palette.primary}
              muted={palette.muted}
              align='flex-start'
            />

            {notice ? (
              <Text
                testID='enterprise-manage-notice'
                style={[manageStyles.muted, { color: palette.primaryDeep }]}
              >
                {notice}
              </Text>
            ) : null}

            <View
              accessibilityRole='tablist'
              style={[
                styles.tabs,
                { borderColor: palette.border, backgroundColor: palette.surface },
              ]}
            >
              {tabs.map((item) => {
                const selected = item === tab;
                return (
                  <Pressable
                    key={item}
                    testID={`enterprise-manage-tab-${item}`}
                    accessibilityRole='tab'
                    accessibilityState={{ selected }}
                    onPress={() => setTab(item)}
                    style={[styles.tab, selected && { backgroundColor: palette.fill }]}
                  >
                    <Text style={[styles.tabText, { color: selected ? '#effff7' : palette.muted }]}>
                      {t(`manage.enterprise.tabs.${item}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {sectionProps && tab === 'info' ? (
              <EnterpriseInfoSection
                // Re-initialise the form only when the stored record changes, never with stale data.
                key={`info-${overview.enterprise.updatedAt ?? ''}`}
                {...sectionProps}
              />
            ) : null}
            {sectionProps && tab === 'images' ? (
              <EnterpriseImagesSection {...sectionProps} canPickFiles={canPickFiles} />
            ) : null}
            {sectionProps && tab === 'products' ? (
              <EnterpriseProductsSection {...sectionProps} />
            ) : null}
            {sectionProps && tab === 'team' ? (
              <>
                <Text style={[manageStyles.muted, { color: palette.muted }]}>
                  {t('manage.enterprise.team.intro')}
                </Text>
                <ManageTeamSection client={client} overview={overview} palette={palette} t={t} />
              </>
            ) : null}
            {clientsClient && tab === 'clients' ? (
              <ManageClientsSection
                client={clientsClient}
                can={overview.can}
                palette={palette}
                t={t}
                canPickFiles={canPickFiles}
                multiProject
                onToast={toasts.show}
              />
            ) : null}
            {honorAwardsClient && tab === 'honors' ? (
              <HonorAwardsSection
                scope={{ kind: 'enterprise-manage', enterpriseId: overview.enterprise.id }}
                client={honorAwardsClient}
                c={{
                  text: palette.text,
                  muted: palette.muted,
                  border: palette.border,
                  accent: palette.primaryDeep,
                }}
                subtitle={t('manage.enterprise.honors.intro')}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <ToastSystem toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120, gap: 16 },
  back: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retry: { flexDirection: 'row', gap: 8 },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  tab: {
    flexGrow: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  tabText: { fontSize: 13, fontWeight: '900' },
});
