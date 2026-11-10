import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RoleChips } from '../profile/RoleChips';
import { HEADER_BUTTON_SIZE, PageHeader } from '../common/PageHeader';
import { ManageClientsSection } from './ManageClientsSection';
import { ManageCommentsSection } from './ManageCommentsSection';
import { ManageImagesSection } from './ManageImagesSection';
import { ManageInfoSection } from './ManageInfoSection';
import { ManageTeamSection } from './ManageTeamSection';
import { manageStyles } from './styles';
import type { ManageTab, ProjectManageViewProps } from './types';
import {
  ManageRequestError,
  type ManageCapabilities,
  type ManageOverview,
  type ManagedProject,
} from '../../utils/projectManage';

/** Tabs the person can use, in display order. */
export function visibleTabs(can: ManageCapabilities, hasClients = false): ManageTab[] {
  return [
    ...(can.editContent ? (['info'] as const) : []),
    ...(can.media ? (['images'] as const) : []),
    ...(can.team ? (['team'] as const) : []),
    ...(hasClients && can.clients ? (['clients'] as const) : []),
    ...(can.comments ? (['comments'] as const) : []),
  ];
}

/** In-app "Manage project" view for project admins, sub admins and moderators. */
export function ProjectManageView({
  client,
  palette,
  t,
  onBack,
  canPickFiles,
  clientsClient,
}: ProjectManageViewProps): React.JSX.Element {
  const [overview, setOverview] = useState<ManageOverview | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading');
  const [tab, setTab] = useState<ManageTab | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(() => {
    setState('loading');
    void client
      .overview()
      .then((next) => {
        setOverview(next);
        setTab((current) => current ?? visibleTabs(next.can, !!clientsClient)[0] ?? null);
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

  const title = overview
    ? (
        overview.project.content[overview.project.defaultLocale] ??
        Object.values(overview.project.content)[0]
      )?.title ?? overview.project.slug
    : '';
  const tabs = overview ? visibleTabs(overview.can, !!clientsClient) : [];
  // Apply what the server saved right away; the refetch that follows only confirms it.
  const applySaved = (saved: ManagedProject): void =>
    setOverview((current) =>
      current ? { ...current, project: { ...current.project, ...saved } } : current
    );
  const sectionProps = overview
    ? { client, overview, palette, t, onChanged: changed, onProjectSaved: applySaved }
    : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      testID='project-manage'
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={styles.content}
    >
      <PageHeader
        testID='project-manage-heading'
        title={overview ? title : t('manage.title')}
        subtitle={overview ? t('manage.title') : undefined}
        palette={palette}
        leading={
          <Pressable
            testID='project-manage-back'
            accessibilityRole='button'
            accessibilityLabel={t('manage.back')}
            onPress={onBack}
            style={[styles.back, { borderColor: palette.border, backgroundColor: palette.surface }]}
          >
            <ArrowLeft size={18} color={palette.primaryDeep} />
          </Pressable>
        }
      />

      {state === 'loading' && !overview ? (
        <Text style={[manageStyles.muted, { color: palette.muted }]}>{t('manage.loading')}</Text>
      ) : null}
      {state === 'denied' ? (
        <Text testID='project-manage-denied' style={[manageStyles.muted, { color: palette.text }]}>
          {t('manage.denied')}
        </Text>
      ) : null}
      {state === 'error' ? (
        <Pressable
          testID='project-manage-retry'
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
              testID='project-manage-notice'
              style={[manageStyles.muted, { color: palette.primaryDeep }]}
            >
              {notice}
            </Text>
          ) : null}

          <View
            accessibilityRole='tablist'
            style={[styles.tabs, { borderColor: palette.border, backgroundColor: palette.surface }]}
          >
            {tabs.map((item) => {
              const selected = item === tab;
              return (
                <Pressable
                  key={item}
                  testID={`project-manage-tab-${item}`}
                  accessibilityRole='tab'
                  accessibilityState={{ selected }}
                  onPress={() => setTab(item)}
                  style={[styles.tab, selected && { backgroundColor: palette.fill }]}
                >
                  <Text style={[styles.tabText, { color: selected ? '#effff7' : palette.muted }]}>
                    {t(`manage.tabs.${item}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {sectionProps && tab === 'info' ? (
            <ManageInfoSection
              // Re-initialise the form only when the stored record changes, never with stale data.
              key={`info-${overview.project.updatedAt ?? ''}`}
              {...sectionProps}
            />
          ) : null}
          {sectionProps && tab === 'images' ? (
            <ManageImagesSection {...sectionProps} canPickFiles={canPickFiles} />
          ) : null}
          {sectionProps && tab === 'team' ? <ManageTeamSection {...sectionProps} /> : null}
          {clientsClient && tab === 'clients' ? (
            <ManageClientsSection
              client={clientsClient}
              can={overview.can}
              palette={palette}
              t={t}
              canPickFiles={canPickFiles}
            />
          ) : null}
          {sectionProps && tab === 'comments' ? <ManageCommentsSection {...sectionProps} /> : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
