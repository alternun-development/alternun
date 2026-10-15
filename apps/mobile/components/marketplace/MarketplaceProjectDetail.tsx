import React, { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ExternalLink, Leaf, MapPin, RotateCcw } from 'lucide-react-native';
import type { Translator } from '@alternun/i18n';
import AirsIntroVideoCard from '../onboarding/AirsIntroVideoCard';
import MarketplaceProjectComments from './MarketplaceProjectComments';
import { resolveMobileApiBaseUrl } from '../../utils/runtimeConfig';

type Translate = Translator['t'];

export interface MarketplaceProjectMedia {
  id: string;
  kind: 'logo' | 'cover' | 'gallery_image' | 'video' | 'canva';
  url: string;
  embedUrl: string | null;
  altText: Record<string, string>;
  caption: Record<string, string>;
  sortOrder: number;
  isActive: boolean;
}

export interface MarketplacePublicProject {
  id: string;
  slug: string;
  status: 'published';
  categoryCode: string;
  locale: string;
  availableLocales: string[];
  title: string;
  location: string;
  theme: string;
  description: string;
  waysToContribute: string[];
  enterprise: { displayName: string };
  media: MarketplaceProjectMedia[];
}

export interface DetailPalette {
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  primaryDeep: string;
  mist: string;
}

export class MarketplaceProjectRequestError extends Error {
  constructor(readonly status: number) {
    super(`Marketplace project request failed with ${status}.`);
  }
}

export function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function isPublicProject(value: unknown): value is MarketplacePublicProject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const project = value as Partial<MarketplacePublicProject>;
  return (
    typeof project.id === 'string' &&
    typeof project.slug === 'string' &&
    project.status === 'published' &&
    typeof project.title === 'string' &&
    typeof project.location === 'string' &&
    typeof project.theme === 'string' &&
    typeof project.description === 'string' &&
    typeof project.locale === 'string' &&
    Array.isArray(project.waysToContribute) &&
    Array.isArray(project.media)
  );
}

export async function loadMarketplaceProject(
  slug: string,
  locale: string,
  signal?: AbortSignal
): Promise<MarketplacePublicProject> {
  const response = await fetch(
    `${resolveMobileApiBaseUrl()}/v1/projects/${encodeURIComponent(
      slug
    )}?locale=${encodeURIComponent(locale)}`,
    { signal }
  );
  if (!response.ok) throw new MarketplaceProjectRequestError(response.status);
  const payload: unknown = await response.json();
  if (!isPublicProject(payload)) throw new MarketplaceProjectRequestError(502);
  return payload;
}

function localizedValue(values: Record<string, string>, locale: string): string {
  return values[locale] ?? Object.values(values).find(Boolean) ?? '';
}

function safeMedia(project: MarketplacePublicProject): MarketplaceProjectMedia[] {
  return project.media
    .filter((item) => item.isActive && safeHttpsUrl(item.url))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function MarketplaceProjectDetailView({
  slug,
  locale,
  palette,
  t,
  loader = loadMarketplaceProject,
  onBack,
  openUrl = async (url) => Linking.openURL(url),
  signedIn = false,
  getSessionToken = () => Promise.resolve(null),
  onSignIn = () => undefined,
}: {
  slug: string;
  locale: string;
  palette: DetailPalette;
  t: Translate;
  loader?: typeof loadMarketplaceProject;
  onBack: () => void;
  openUrl?: (url: string) => Promise<unknown>;
  signedIn?: boolean;
  getSessionToken?: () => Promise<string | null>;
  onSignIn?: () => void;
}): React.JSX.Element {
  const [project, setProject] = useState<MarketplacePublicProject | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  const [requestVersion, setRequestVersion] = useState(0);
  const [videoMuted, setVideoMuted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setProject(null);
    setState('loading');
    void loader(slug, locale, controller.signal)
      .then((nextProject) => {
        if (controller.signal.aborted) return;
        setProject(nextProject);
        setState('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState(
          error instanceof MarketplaceProjectRequestError && error.status === 404
            ? 'not-found'
            : 'error'
        );
      });
    return () => controller.abort();
  }, [loader, locale, requestVersion, slug]);

  const media = useMemo(() => (project ? safeMedia(project) : []), [project]);
  const logo = media.find((item) => item.kind === 'logo');
  const cover = media.find((item) => item.kind === 'cover');
  const gallery = media.filter((item) => item.kind === 'gallery_image');
  const video = media.find((item) => item.kind === 'video');
  const canva = media.find((item) => item.kind === 'canva');

  return (
    <ScrollView
      testID='project-detail'
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={styles.content}
    >
      <Pressable accessibilityRole='button' onPress={onBack} style={styles.backButton}>
        <ArrowLeft size={18} color={palette.primaryDeep} />
        <Text style={[styles.backText, { color: palette.primaryDeep }]}>
          {t('explorer.detail.back')}
        </Text>
      </Pressable>

      {state === 'loading' ? (
        <View
          testID='project-detail-loading'
          style={[styles.stateCard, { borderColor: palette.border }]}
        >
          <View style={[styles.skeletonWide, { backgroundColor: palette.mist }]} />
          <View style={[styles.skeletonShort, { backgroundColor: palette.mist }]} />
          <Text style={{ color: palette.muted }}>{t('explorer.detail.loading')}</Text>
        </View>
      ) : state === 'not-found' ? (
        <View
          testID='project-detail-not-found'
          style={[styles.stateCard, { borderColor: palette.border }]}
        >
          <Leaf size={30} color={palette.primary} />
          <Text style={[styles.stateTitle, { color: palette.text }]}>
            {t('explorer.detail.unavailable')}
          </Text>
        </View>
      ) : state === 'error' ? (
        <View
          testID='project-detail-error'
          style={[styles.stateCard, { borderColor: palette.border }]}
        >
          <Text style={[styles.stateTitle, { color: palette.text }]}>
            {t('explorer.detail.error')}
          </Text>
          <Pressable
            testID='project-detail-retry'
            accessibilityRole='button'
            onPress={() => setRequestVersion((value) => value + 1)}
            style={[styles.primaryButton, { backgroundColor: palette.primaryDeep }]}
          >
            <RotateCcw size={16} color='#effff7' />
            <Text style={styles.primaryButtonText}>{t('explorer.detail.retry')}</Text>
          </Pressable>
        </View>
      ) : project ? (
        <>
          <View
            style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            {cover ? (
              <Image
                testID='project-detail-cover'
                source={{ uri: safeHttpsUrl(cover.url)! }}
                accessibilityLabel={localizedValue(cover.altText, project.locale) || project.title}
                style={styles.cover}
                resizeMode='cover'
              />
            ) : null}
            <View style={styles.heroCopy}>
              {logo ? (
                <Image
                  testID='project-detail-logo'
                  source={{ uri: safeHttpsUrl(logo.url)! }}
                  accessibilityLabel={
                    localizedValue(logo.altText, project.locale) || project.enterprise.displayName
                  }
                  style={styles.logo}
                  resizeMode='contain'
                />
              ) : null}
              <Text style={[styles.theme, { color: palette.primary }]}>{project.theme}</Text>
              <Text style={[styles.title, { color: palette.text }]}>{project.title}</Text>
              <View style={styles.locationRow}>
                <MapPin size={16} color={palette.muted} />
                <Text style={{ color: palette.muted }}>{project.location}</Text>
              </View>
              <Text style={[styles.description, { color: palette.muted }]}>
                {project.description}
              </Text>
            </View>
          </View>

          {project.waysToContribute.length ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                {t('explorer.detail.waysToContribute')}
              </Text>
              <View style={styles.tags}>
                {project.waysToContribute.map((way) => (
                  <View
                    key={way}
                    style={[
                      styles.tag,
                      { borderColor: palette.border, backgroundColor: palette.surface },
                    ]}
                  >
                    <Text style={{ color: palette.text }}>{way}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {gallery.length ? (
            <View testID='project-detail-gallery' style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                {t('explorer.detail.gallery')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryRow}
              >
                {gallery.map((item) => (
                  <Image
                    key={item.id}
                    source={{ uri: safeHttpsUrl(item.url)! }}
                    accessibilityLabel={localizedValue(item.altText, project.locale)}
                    style={styles.galleryImage}
                    resizeMode='cover'
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {video ? (
            <View testID='project-detail-video' style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                {t('explorer.detail.video')}
              </Text>
              <AirsIntroVideoCard
                videoUri={safeHttpsUrl(video.embedUrl) ?? safeHttpsUrl(video.url)!}
                isMuted={videoMuted}
                isScreenFocused
                shouldPlayMainTrack
                showControls
                controlsIconOnly={false}
                onToggleMute={() => setVideoMuted((value) => !value)}
                style={styles.video}
              />
            </View>
          ) : null}

          {canva ? (
            <Pressable
              testID='project-detail-canva'
              accessibilityRole='link'
              onPress={() => void openUrl(safeHttpsUrl(canva.url)!)}
              style={[styles.primaryButton, { backgroundColor: palette.primaryDeep }]}
            >
              <Text style={styles.primaryButtonText}>{t('explorer.detail.openPresentation')}</Text>
              <ExternalLink size={16} color='#effff7' />
            </Pressable>
          ) : null}

          <MarketplaceProjectComments
            slug={project.slug}
            locale={locale}
            palette={palette}
            t={t}
            signedIn={signedIn}
            getSessionToken={getSessionToken}
            onSignIn={onSignIn}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120, gap: 24 },
  backButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 14, fontWeight: '800' },
  stateCard: {
    minHeight: 220,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  stateTitle: { fontFamily: 'Sculpin-Bold', fontSize: 22, textAlign: 'center' },
  skeletonWide: { width: '90%', height: 18, borderRadius: 9 },
  skeletonShort: { width: '55%', height: 14, borderRadius: 7 },
  hero: { overflow: 'hidden', borderWidth: 1, borderRadius: 24 },
  cover: { width: '100%', aspectRatio: 16 / 9 },
  heroCopy: { padding: 20, gap: 10 },
  logo: { width: 76, height: 76, borderRadius: 16 },
  theme: { fontSize: 11, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { fontFamily: 'Sculpin-Bold', fontSize: 30, lineHeight: 34 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  description: { fontSize: 15, lineHeight: 23 },
  section: { gap: 12 },
  sectionTitle: { fontFamily: 'Sculpin-Bold', fontSize: 21 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  galleryRow: { gap: 12 },
  galleryImage: { width: 260, height: 180, borderRadius: 18 },
  video: { width: '100%', height: 220, borderRadius: 18, overflow: 'hidden' },
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
});
