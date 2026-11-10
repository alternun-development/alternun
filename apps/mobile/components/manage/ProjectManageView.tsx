import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw, ShieldCheck } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RoleChips } from '../profile/RoleChips';
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
export function visibleTabs(can: ManageCapabilities): ManageTab[] {
  return [
    ...(can.editContent ? (['info'] as const) : []),
    ...(can.media ? (['images'] as const) : []),
    ...(can.team ? (['team'] as const) : []),
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
        setTab((current) => current ?? visibleTabs(next.can)[0] ?? null);
        setState('ready');
      })
      .catch((error: unknown) =>
        setState(
          error instanceof ManageRequestError && [401, 403, 404].includes(error.status)
            ? 'denied'
            : 'error'
        )
      );
  }, [client]);

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
  const tabs = overview ? visibleTabs(overview.can) : [];
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
      testID='project-manage'
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={styles.content}
    >
      <Pressable accessibilityRole='button' onPress={onBack} style={styles.back}>
        <ArrowLeft size={18} color={palette.primaryDeep} />
        <Text style={[styles.backText, { color: palette.primaryDeep }]}>{t('manage.back')}</Text>
      </Pressable>

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
          <View
            style={[
              manageStyles.card,
              { borderColor: palette.border, backgroundColor: palette.surface },
            ]}
          >
            <View style={manageStyles.row}>
              <ShieldCheck size={18} color={palette.primary} />
              <Text style={[styles.eyebrow, { color: palette.primary }]}>{t('manage.title')}</Text>
            </View>
            <Text testID='project-manage-title' style={[styles.title, { color: palette.text }]}>
              {title}
            </Text>
            <RoleChips
              roles={overview.roles}
              accent={palette.primary}
              muted={palette.muted}
              align='flex-start'
            />
          </View>

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
          {sectionProps && tab === 'comments' ? <ManageCommentsSection {...sectionProps} /> : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120, gap: 16 },
  back: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 14, fontWeight: '800' },
  retry: { flexDirection: 'row', gap: 8 },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontFamily: 'Sculpin-Bold', fontSize: 26 },
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
