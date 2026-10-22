import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  ExternalLink,
  MapPin,
  RotateCcw,
} from 'lucide-react-native';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';
import { isPublicProject } from './MarketplaceProjectDetail';
import { isMarketplaceEnterprise, safeEnterpriseUrl } from './MarketplaceEnterpriseDirectory';
import type { DetailPalette, MarketplaceEnterpriseDetail, Translate } from './types';

export class MarketplaceEnterpriseRequestError extends Error {
  constructor(readonly status: number) {
    super(`Marketplace enterprise request failed with ${status}.`);
  }
}

function isMarketplaceEnterpriseDetail(value: unknown): value is MarketplaceEnterpriseDetail {
  if (!isMarketplaceEnterprise(value)) return false;
  const detail = value as Partial<MarketplaceEnterpriseDetail>;
  return Array.isArray(detail.projects) && detail.projects.every(isPublicProject);
}

export async function loadMarketplaceEnterprise(
  slug: string,
  locale: string,
  signal?: AbortSignal
): Promise<MarketplaceEnterpriseDetail> {
  const response = await fetch(
    `${resolveMobileApiBaseUrl()}/v1/enterprises/${encodeURIComponent(
      slug
    )}?locale=${encodeURIComponent(locale)}`,
    { signal }
  );
  if (!response.ok) throw new MarketplaceEnterpriseRequestError(response.status);
  const payload: unknown = await response.json();
  if (!isMarketplaceEnterpriseDetail(payload)) throw new MarketplaceEnterpriseRequestError(502);
  return {
    ...payload,
    logo:
      payload.logo && safeEnterpriseUrl(payload.logo.url)
        ? { ...payload.logo, url: safeEnterpriseUrl(payload.logo.url)! }
        : null,
    websiteUrl: safeEnterpriseUrl(payload.websiteUrl),
  };
}

export function MarketplaceEnterpriseDetailView({
  slug,
  locale,
  palette,
  t,
  loader = loadMarketplaceEnterprise,
  onBack,
  onOpenProject,
  openUrl = async (url) => Linking.openURL(url),
}: {
  slug: string;
  locale: string;
  palette: DetailPalette;
  t: Translate;
  loader?: typeof loadMarketplaceEnterprise;
  onBack: () => void;
  onOpenProject: (slug: string) => void;
  openUrl?: (url: string) => Promise<unknown>;
}): React.JSX.Element {
  const [enterprise, setEnterprise] = useState<MarketplaceEnterpriseDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setEnterprise(null);
    setState('loading');
    void loader(slug, locale, controller.signal)
      .then((item) => {
        if (controller.signal.aborted) return;
        setEnterprise(item);
        setState('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState(
          error instanceof MarketplaceEnterpriseRequestError && error.status === 404
            ? 'not-found'
            : 'error'
        );
      });
    return () => controller.abort();
  }, [loader, locale, requestVersion, slug]);

  return (
    <ScrollView
      testID='enterprise-detail'
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={styles.content}
    >
      <Pressable accessibilityRole='button' onPress={onBack} style={styles.backButton}>
        <ArrowLeft size={18} color={palette.primaryDeep} />
        <Text style={[styles.backText, { color: palette.primaryDeep }]}>
          {t('explorer.enterprises.detail.back')}
        </Text>
      </Pressable>

      {state === 'loading' ? (
        <View
          testID='enterprise-detail-loading'
          style={[styles.state, { borderColor: palette.border }]}
        >
          <Text style={{ color: palette.muted }}>{t('explorer.enterprises.detail.loading')}</Text>
        </View>
      ) : null}
      {state === 'not-found' ? (
        <View
          testID='enterprise-detail-not-found'
          style={[styles.state, { borderColor: palette.border }]}
        >
          <Building2 size={30} color={palette.primary} />
          <Text style={[styles.stateTitle, { color: palette.text }]}>
            {t('explorer.enterprises.detail.unavailable')}
          </Text>
        </View>
      ) : null}
      {state === 'error' ? (
        <View
          testID='enterprise-detail-error'
          style={[styles.state, { borderColor: palette.border }]}
        >
          <Text style={[styles.stateTitle, { color: palette.text }]}>
            {t('explorer.enterprises.detail.error')}
          </Text>
          <Pressable
            testID='enterprise-detail-retry'
            accessibilityRole='button'
            onPress={() => setRequestVersion((value) => value + 1)}
            style={[styles.primaryButton, { backgroundColor: palette.fill }]}
          >
            <RotateCcw size={16} color='#effff7' />
            <Text style={styles.primaryButtonText}>{t('explorer.enterprises.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {state === 'ready' && enterprise ? (
        <>
          <View
            style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            {enterprise.logo ? (
              <Image
                testID='enterprise-detail-logo'
                source={{ uri: enterprise.logo.url }}
                accessibilityLabel={enterprise.logo.altText || enterprise.displayName}
                style={styles.logo}
                resizeMode='contain'
              />
            ) : (
              <View style={[styles.logoFallback, { backgroundColor: palette.mist }]}>
                <Building2 size={34} color={palette.primary} />
              </View>
            )}
            <Text style={[styles.title, { color: palette.text }]}>{enterprise.displayName}</Text>
            {enterprise.countryCode ? (
              <View style={styles.metaRow}>
                <MapPin size={16} color={palette.muted} />
                <Text style={{ color: palette.muted }}>{enterprise.countryCode}</Text>
              </View>
            ) : null}
            {enterprise.websiteUrl ? (
              <Pressable
                testID='enterprise-detail-website'
                accessibilityRole='link'
                onPress={() => void openUrl(enterprise.websiteUrl!)}
                style={styles.websiteLink}
              >
                <Text style={{ color: palette.primaryDeep }}>
                  {t('explorer.enterprises.detail.website')}
                </Text>
                <ExternalLink size={15} color={palette.primaryDeep} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.projectsSection}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {t('explorer.enterprises.detail.projects')}
            </Text>
            {enterprise.projects.map((project) => (
              <Pressable
                key={project.id}
                testID={`enterprise-detail-project-${project.id}`}
                accessibilityRole='button'
                onPress={() => onOpenProject(project.slug)}
                style={[
                  styles.projectCard,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <View style={styles.projectCopy}>
                  <Text style={[styles.projectTitle, { color: palette.text }]}>
                    {project.title}
                  </Text>
                  <Text style={{ color: palette.muted }}>{project.location}</Text>
                </View>
                <ChevronRight size={20} color={palette.primaryDeep} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120, gap: 22 },
  backButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 14, fontWeight: '800' },
  state: {
    minHeight: 220,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  stateTitle: { fontFamily: 'Sculpin-Bold', fontSize: 22, textAlign: 'center' },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  primaryButtonText: { color: '#effff7', fontSize: 14, fontWeight: '900' },
  hero: { borderWidth: 1, borderRadius: 24, padding: 22, alignItems: 'center', gap: 12 },
  logo: { width: 96, height: 96, borderRadius: 20 },
  logoFallback: {
    width: 96,
    height: 96,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: 'Sculpin-Bold', fontSize: 30, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  websiteLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  projectsSection: { gap: 12 },
  sectionTitle: { fontFamily: 'Sculpin-Bold', fontSize: 22 },
  projectCard: {
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  projectCopy: { flex: 1, gap: 5 },
  projectTitle: { fontFamily: 'Sculpin-Bold', fontSize: 18 },
});
