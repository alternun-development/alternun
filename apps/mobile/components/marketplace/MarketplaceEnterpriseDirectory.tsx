import React, { useEffect, useState } from 'react';
import { Building2, ChevronRight, MapPin, RotateCcw } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Translator } from '@alternun/i18n';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';

type Translate = Translator['t'];

export interface EnterprisePalette {
  surface: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  primaryDeep: string;
  mist: string;
}

export interface MarketplaceEnterprise {
  id: string;
  slug: string;
  displayName: string;
  logo: { url: string; altText: string } | null;
  countryCode: string | null;
  websiteUrl: string | null;
  projectCount: number;
}

type LoadMarketplaceEnterprises = (
  locale: string,
  signal?: AbortSignal
) => Promise<MarketplaceEnterprise[]>;

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

function EnterpriseCard({
  enterprise,
  palette,
  t,
  onOpen,
}: {
  enterprise: MarketplaceEnterprise;
  palette: EnterprisePalette;
  t: Translate;
  onOpen: (slug: string) => void;
}): React.JSX.Element {
  return (
    <Pressable
      testID={`explorer-enterprise-${enterprise.id}`}
      accessibilityRole='button'
      onPress={() => onOpen(enterprise.slug)}
      style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={styles.cardHeader}>
        {enterprise.logo ? (
          <Image
            source={{ uri: enterprise.logo.url }}
            accessibilityLabel={enterprise.logo.altText || enterprise.displayName}
            style={styles.logo}
            resizeMode='contain'
          />
        ) : (
          <View style={[styles.logoFallback, { backgroundColor: palette.mist }]}>
            <Building2 size={25} color={palette.primary} />
          </View>
        )}
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{enterprise.displayName}</Text>
          {enterprise.countryCode ? (
            <View style={styles.countryRow}>
              <MapPin size={14} color={palette.muted} />
              <Text style={{ color: palette.muted }}>{enterprise.countryCode}</Text>
            </View>
          ) : null}
        </View>
        <ChevronRight size={20} color={palette.primaryDeep} />
      </View>
      <Text style={[styles.projectCount, { color: palette.primaryDeep }]}>
        {t('explorer.enterprises.projectCount', { count: enterprise.projectCount })}
      </Text>
    </Pressable>
  );
}

export function MarketplaceEnterpriseBrowser({
  locale,
  palette,
  t,
  loader = loadMarketplaceEnterprises,
  onOpenEnterprise = () => undefined,
}: {
  locale: string;
  palette: EnterprisePalette;
  t: Translate;
  loader?: LoadMarketplaceEnterprises;
  onOpenEnterprise?: (slug: string) => void;
}): React.JSX.Element {
  const [enterprises, setEnterprises] = useState<MarketplaceEnterprise[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    setEnterprises([]);
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
      {state === 'success'
        ? enterprises.map((enterprise) => (
            <EnterpriseCard
              key={enterprise.id}
              enterprise={enterprise}
              palette={palette}
              t={t}
              onOpen={onOpenEnterprise}
            />
          ))
        : null}
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
  logo: { width: 58, height: 58, borderRadius: 14 },
  logoFallback: {
    width: 58,
    height: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
