import React, { useEffect, useState } from 'react';
import { Building2, ChevronRight, MapPin, RotateCcw } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';
import { EnterprisePagination, EnterpriseViewSwitcher } from './EnterpriseDirectoryControls';
import {
  enterprisePageCount,
  enterprisePageItems,
  getRememberedEnterpriseView,
  rememberEnterpriseView,
} from './enterpriseDirectoryPaging';
import type {
  EnterpriseDirectoryView,
  EnterprisePalette,
  LoadMarketplaceEnterprises,
  MarketplaceEnterprise,
  Translate,
} from './types';

export function safeEnterpriseUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isMarketplaceEnterprise(value: unknown): value is MarketplaceEnterprise {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const enterprise = value as Partial<MarketplaceEnterprise>;
  const validLogo =
    enterprise.logo === null ||
    (typeof enterprise.logo === 'object' &&
      typeof enterprise.logo.url === 'string' &&
      typeof enterprise.logo.altText === 'string');
  return (
    typeof enterprise.id === 'string' &&
    typeof enterprise.slug === 'string' &&
    typeof enterprise.displayName === 'string' &&
    validLogo &&
    (enterprise.countryCode === null || typeof enterprise.countryCode === 'string') &&
    (enterprise.websiteUrl === null || typeof enterprise.websiteUrl === 'string') &&
    Number.isInteger(enterprise.projectCount) &&
    Number(enterprise.projectCount) >= 1
  );
}

function normalizeEnterprise(enterprise: MarketplaceEnterprise): MarketplaceEnterprise {
  const logoUrl = safeEnterpriseUrl(enterprise.logo?.url);
  return {
    ...enterprise,
    logo: logoUrl && enterprise.logo ? { ...enterprise.logo, url: logoUrl } : null,
    websiteUrl: safeEnterpriseUrl(enterprise.websiteUrl),
  };
}

export const loadMarketplaceEnterprises: LoadMarketplaceEnterprises = async (locale, signal) => {
  const response = await fetch(
    `${resolveMobileApiBaseUrl()}/v1/enterprises?locale=${encodeURIComponent(locale)}&perPage=50`,
    { signal }
  );
  if (!response.ok) throw new Error(`Enterprise directory request failed with ${response.status}.`);
  const payload: unknown = await response.json();
  if (
    !payload ||
    typeof payload !== 'object' ||
    !Array.isArray((payload as { data?: unknown }).data)
  ) {
    throw new Error('Enterprise directory response is invalid.');
  }
  const enterprises = (payload as { data: unknown[] }).data;
  if (!enterprises.every(isMarketplaceEnterprise)) {
    throw new Error('Enterprise directory response is invalid.');
  }
  return enterprises.map(normalizeEnterprise);
};

function EnterpriseLogo({
  enterprise,
  palette,
  size,
}: {
  enterprise: MarketplaceEnterprise;
  palette: EnterprisePalette;
  size: number;
}): React.JSX.Element {
  const frame = { width: size, height: size, borderRadius: Math.round(size / 4) };
  return enterprise.logo ? (
    <Image
      source={{ uri: enterprise.logo.url }}
      accessibilityLabel={enterprise.logo.altText || enterprise.displayName}
      style={frame}
      resizeMode='contain'
    />
  ) : (
    <View style={[styles.logoFallback, frame, { backgroundColor: palette.mist }]}>
      <Building2 size={Math.round(size * 0.43)} color={palette.primary} />
    </View>
  );
}

function EnterpriseCard({
  enterprise,
  palette,
  t,
  view,
  onOpen,
}: {
  enterprise: MarketplaceEnterprise;
  palette: EnterprisePalette;
  t: Translate;
  view: EnterpriseDirectoryView;
  onOpen: (slug: string) => void;
}): React.JSX.Element {
  const projectCount = t('explorer.enterprises.projectCount', { count: enterprise.projectCount });
  const country = enterprise.countryCode ? (
    <View style={styles.countryRow}>
      <MapPin size={14} color={palette.muted} />
      <Text style={[styles.countryText, { color: palette.muted }]}>{enterprise.countryCode}</Text>
    </View>
  ) : null;
  const cardProps = {
    testID: `explorer-enterprise-${enterprise.id}`,
    accessibilityRole: 'button' as const,
    accessibilityLabel: `${enterprise.displayName}, ${projectCount}`,
    onPress: () => onOpen(enterprise.slug),
  };

  if (view === 'grid') {
    return (
      <Pressable
        {...cardProps}
        style={[styles.gridCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <EnterpriseLogo enterprise={enterprise} palette={palette} size={48} />
        <Text numberOfLines={2} style={[styles.gridTitle, { color: palette.text }]}>
          {enterprise.displayName}
        </Text>
        {country}
        <Text numberOfLines={2} style={[styles.projectCount, { color: palette.primaryDeep }]}>
          {projectCount}
        </Text>
      </Pressable>
    );
  }

  if (view === 'compact') {
    return (
      <Pressable
        {...cardProps}
        style={[
          styles.compactRow,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <EnterpriseLogo enterprise={enterprise} palette={palette} size={34} />
        <View style={styles.cardTitleBlock}>
          <Text numberOfLines={1} style={[styles.compactTitle, { color: palette.text }]}>
            {enterprise.displayName}
          </Text>
          <Text numberOfLines={1} style={[styles.compactMeta, { color: palette.primaryDeep }]}>
            {enterprise.countryCode ? `${enterprise.countryCode} · ${projectCount}` : projectCount}
          </Text>
        </View>
        <ChevronRight size={17} color={palette.primaryDeep} />
      </Pressable>
    );
  }

  return (
    <Pressable
      {...cardProps}
      style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={styles.cardHeader}>
        <EnterpriseLogo enterprise={enterprise} palette={palette} size={58} />
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{enterprise.displayName}</Text>
          {country}
        </View>
        <ChevronRight size={20} color={palette.primaryDeep} />
      </View>
      <Text style={[styles.projectCount, { color: palette.primaryDeep }]}>{projectCount}</Text>
    </Pressable>
  );
}

export function MarketplaceEnterpriseBrowser({
  locale,
  palette,
  t,
  loader = loadMarketplaceEnterprises,
  onOpenEnterprise = () => undefined,
  onListNavigate = () => undefined,
}: {
  locale: string;
  palette: EnterprisePalette;
  t: Translate;
  loader?: LoadMarketplaceEnterprises;
  onOpenEnterprise?: (slug: string) => void;
  /** Called after the page or the view changes, so the screen can scroll back to the list. */
  onListNavigate?: () => void;
}): React.JSX.Element {
  const [enterprises, setEnterprises] = useState<MarketplaceEnterprise[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [requestVersion, setRequestVersion] = useState(0);
  const [view, setView] = useState<EnterpriseDirectoryView>(getRememberedEnterpriseView);
  const [page, setPage] = useState(1);
  const pageCount = enterprisePageCount(enterprises.length, view);
  const currentPage = Math.min(page, pageCount);
  const pageItems = enterprisePageItems(enterprises, view, currentPage);

  const changeView = (next: EnterpriseDirectoryView): void => {
    rememberEnterpriseView(next);
    setView(next);
    setPage(1);
    onListNavigate();
  };

  const changePage = (next: number): void => {
    setPage(next);
    onListNavigate();
  };

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    setEnterprises([]);
    setPage(1);
    void loader(locale, controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        setEnterprises(items);
        setState('success');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setEnterprises([]);
        setState('error');
      });
    return () => controller.abort();
  }, [loader, locale, requestVersion]);

  return (
    <View style={styles.directory}>
      <View>
        <Text style={[styles.eyebrow, { color: palette.primary }]}>
          {t('explorer.enterprises.eyebrow')}
        </Text>
        <Text style={[styles.heading, { color: palette.text }]}>
          {t('explorer.enterprises.heading')}
        </Text>
        <Text style={[styles.intro, { color: palette.muted }]}>
          {t('explorer.enterprises.intro')}
        </Text>
      </View>

      {state === 'loading' ? (
        <View
          testID='enterprise-directory-loading'
          style={[styles.state, { borderColor: palette.border }]}
        >
          <Text style={{ color: palette.muted }}>{t('explorer.enterprises.loading')}</Text>
        </View>
      ) : null}
      {state === 'error' ? (
        <View
          testID='enterprise-directory-error'
          style={[styles.state, { borderColor: palette.border }]}
        >
          <Text style={[styles.stateTitle, { color: palette.text }]}>
            {t('explorer.enterprises.error')}
          </Text>
          <Pressable
            testID='enterprise-directory-retry'
            accessibilityRole='button'
            onPress={() => setRequestVersion((value) => value + 1)}
            style={[styles.retry, { backgroundColor: palette.primaryDeep }]}
          >
            <RotateCcw size={16} color='#effff7' />
            <Text style={styles.retryText}>{t('explorer.enterprises.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {state === 'success' && enterprises.length === 0 ? (
        <View
          testID='enterprise-directory-empty'
          style={[styles.state, { borderColor: palette.border }]}
        >
          <Building2 size={28} color={palette.primary} />
          <Text style={[styles.stateTitle, { color: palette.text }]}>
            {t('explorer.enterprises.empty')}
          </Text>
        </View>
      ) : null}
      {state === 'success' && enterprises.length > 0 ? (
        <>
          <EnterpriseViewSwitcher view={view} palette={palette} t={t} onChange={changeView} />
          <View
            testID={`enterprise-directory-${view}`}
            style={
              view === 'grid'
                ? styles.gridLayout
                : view === 'compact'
                ? styles.compactLayout
                : styles.listLayout
            }
          >
            {pageItems.map((enterprise) => (
              <EnterpriseCard
                key={enterprise.id}
                enterprise={enterprise}
                palette={palette}
                t={t}
                view={view}
                onOpen={onOpenEnterprise}
              />
            ))}
          </View>
          <EnterprisePagination
            page={currentPage}
            pageCount={pageCount}
            palette={palette}
            t={t}
            onChange={changePage}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  directory: { gap: 14 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  heading: { fontFamily: 'Sculpin-Bold', fontSize: 24 },
  intro: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  cardTitleBlock: { flex: 1, gap: 5 },
  cardTitle: { fontFamily: 'Sculpin-Bold', fontSize: 19 },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  countryText: { fontSize: 13 },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  listLayout: { gap: 14 },
  gridLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  gridCard: {
    width: '48.5%',
    minHeight: 178,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 8,
  },
  gridTitle: { fontFamily: 'Sculpin-Bold', fontSize: 16, lineHeight: 20 },
  compactLayout: { gap: 8 },
  compactRow: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  compactTitle: { fontFamily: 'Sculpin-Bold', fontSize: 15 },
  compactMeta: { fontSize: 12, fontWeight: '800' },
  projectCount: { fontSize: 13, fontWeight: '800' },
  state: {
    minHeight: 150,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 20,
  },
  stateTitle: { fontFamily: 'Sculpin-Bold', fontSize: 19, textAlign: 'center' },
  retry: {
    minHeight: 44,
    borderRadius: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryText: { color: '#effff7', fontWeight: '900' },
});
