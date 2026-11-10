import React, { useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Animated,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ArrowUpRight,
  Award,
  Building2,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Gift,
  HandHeart,
  Leaf,
  Lightbulb,
  MapPin,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Sprout,
  UserPlus,
  Users,
  type LucideProps,
} from 'lucide-react-native';
import { useAppTranslation } from '../components/i18n/useAppTranslation';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import ScreenShell from '../components/common/ScreenShell';
import { MarketplaceEnterpriseBrowser } from '../components/marketplace/MarketplaceEnterpriseDirectory';
import {
  DirectoryControls,
  DirectoryPagination,
} from '../components/marketplace/DirectoryControls';
import {
  directoryPageCount,
  directoryPageItems,
  getRememberedDirectoryView,
  rememberDirectoryView,
} from '../components/marketplace/directoryPaging';
import type { DirectoryView } from '../components/marketplace/types';
import {
  canvaEmbedUrl,
  isDirectVideoUrl,
  safeHttpsUrl,
} from '../components/marketplace/MarketplaceProjectDetail';
import type {
  LoadMarketplaceProjects,
  MarketProject,
  MarketplaceMedia,
  MarketplaceProjectResponse,
  Palette,
  ProjectFilter,
  Translate,
  ProjectMarkProps,
} from './explore.types';
import { resolveMobileApiBaseUrl } from '../utils/runtimeConfig';
import { resolveAdminPanelUrl } from '../utils/adminAccess';
import { useAdminAccess } from '../hooks/useAdminAccess';
import { useTheme } from '@alternun/ui';
import { ExpandableCtaCard } from '../components/explore/ExpandableCtaCard';
import { EnterpriseApplicationForm } from '../components/explore/EnterpriseApplicationForm';
import { TipsSlider } from '../components/explore/TipsSlider';
import { INTENT_KEYS, IntentGuideModal, isIntentKey } from '../components/explore/IntentGuideModal';
import type { IntentGuideAction, IntentKey } from '../components/explore/types';
import { HEADER_BUTTON_SIZE, PageHeader, SectionHeading } from '../components/common/PageHeader';
import type { Tip } from '../components/explore/types';
import { getContentGutter } from '../utils/layout';
import {
  resolveMarketplaceContactMailto,
  submitProjectProposal,
  validateProjectProposalInput,
} from '../services/projectProposal';

const CompassIcon = Compass as React.FC<LucideProps>;
const LeafIcon = Leaf as React.FC<LucideProps>;
const MapPinIcon = MapPin as React.FC<LucideProps>;
const UsersIcon = Users as React.FC<LucideProps>;
const SparklesIcon = Sparkles as React.FC<LucideProps>;
const SendIcon = Send as React.FC<LucideProps>;
const ChevronRightIcon = ChevronRight as React.FC<LucideProps>;
const ArrowUpRightIcon = ArrowUpRight as React.FC<LucideProps>;
const PlayIcon = Play as React.FC<LucideProps>;
const SproutIcon = Sprout as React.FC<LucideProps>;
const CircleDollarSignIcon = CircleDollarSign as React.FC<LucideProps>;
const HandHeartIcon = HandHeart as React.FC<LucideProps>;
const LightbulbIcon = Lightbulb as React.FC<LucideProps>;
const GiftIcon = Gift as React.FC<LucideProps>;
const AwardIcon = Award as React.FC<LucideProps>;
const Building2Icon = Building2 as React.FC<LucideProps>;
const UserPlusIcon = UserPlus as React.FC<LucideProps>;
const RefreshIcon = RefreshCw as React.FC<LucideProps>;
const ShieldCheckIcon = ShieldCheck as React.FC<LucideProps>;

function safeImageUrl(
  media: MarketplaceMedia[],
  preferredKinds: readonly string[] = ['cover', 'gallery_image']
): string | null {
  for (const kind of preferredKinds) {
    const item = media.find((candidate) => candidate.isActive && candidate.kind === kind);
    if (!item) continue;
    try {
      const url = new URL(item.url);
      if (url.protocol === 'https:' && !url.username && !url.password) return url.toString();
    } catch {
      // Ignore malformed media; the card keeps its existing icon treatment.
    }
  }
  return null;
}

/** Card icon: the project's logo when it has one, the leaf otherwise. */
function ProjectMark({ logoUrl, size, color, style }: ProjectMarkProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const content =
    logoUrl && !failed ? (
      <Image
        testID='explorer-project-logo'
        source={{ uri: logoUrl }}
        accessibilityIgnoresInvertColors
        onError={() => setFailed(true)}
        style={{ width: size * 1.9, height: size * 1.9, borderRadius: 10 }}
        resizeMode='contain'
      />
    ) : (
      <LeafIcon size={size} color={color} strokeWidth={1.8} />
    );
  return style ? <View style={style}>{content}</View> : content;
}

/** Resolves the project's active canva and direct-video media for the featured banner. */
function presentationUrls(media: MarketplaceMedia[]): {
  canvaUrl: string | null;
  videoUrl: string | null;
} {
  const canvaUrl = canvaEmbedUrl(media.find((item) => item.isActive && item.kind === 'canva'));
  const video = media.find((item) => item.isActive && item.kind === 'video');
  const embedUrl = safeHttpsUrl(video?.embedUrl);
  if (isDirectVideoUrl(embedUrl)) return { canvaUrl, videoUrl: embedUrl };
  const url = safeHttpsUrl(video?.url);
  if (isDirectVideoUrl(url)) return { canvaUrl, videoUrl: url };
  return { canvaUrl, videoUrl: null };
}

function isMarketplaceProject(value: unknown): value is MarketplaceProjectResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const project = value as Partial<MarketplaceProjectResponse>;
  return (
    typeof project.id === 'string' &&
    typeof project.slug === 'string' &&
    project.status === 'published' &&
    typeof project.categoryCode === 'string' &&
    typeof project.title === 'string' &&
    typeof project.location === 'string' &&
    typeof project.theme === 'string' &&
    typeof project.description === 'string' &&
    Array.isArray(project.waysToContribute) &&
    project.waysToContribute.every((item) => typeof item === 'string') &&
    Array.isArray(project.media)
  );
}

export const loadMarketplaceProjects: LoadMarketplaceProjects = async (locale, signal) => {
  const url = `${resolveMobileApiBaseUrl()}/v1/projects?locale=${encodeURIComponent(locale)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Marketplace request failed with ${response.status}.`);
  const payload: unknown = await response.json();
  if (
    !payload ||
    typeof payload !== 'object' ||
    !Array.isArray((payload as { data?: unknown }).data)
  )
    throw new Error('Marketplace response is invalid.');
  const projects = (payload as { data: unknown[] }).data;
  if (!projects.every(isMarketplaceProject)) throw new Error('Marketplace response is invalid.');
  return projects.map((project) => ({
    id: project.id,
    slug: project.slug,
    title: project.title,
    place: project.location,
    categoryCode: project.categoryCode,
    status: 'active',
    theme: project.theme,
    description: project.description,
    waysToContribute: project.waysToContribute,
    imageUrl: safeImageUrl(project.media),
    logoUrl: safeImageUrl(project.media, ['logo']),
    ...presentationUrls(project.media),
  }));
};

function getFilters(
  t: Translate,
  projects: MarketProject[]
): { key: ProjectFilter; label: string }[] {
  const categories: string[] = Array.from(
    new Set<string>(projects.map((project) => project.categoryCode))
  );
  return [
    { key: 'all', label: t('explorer.filters.all') },
    ...categories.map((categoryCode) => ({
      key: categoryCode,
      label: categoryLabel(t, categoryCode),
    })),
  ];
}

function categoryLabel(t: Translate, categoryCode: string): string {
  const key = `explorer.categories.${categoryCode}`;
  const translated = t(key) as unknown;
  return typeof translated !== 'string' || !translated || translated === key
    ? categoryCode
    : translated;
}

const INTENT_ICONS: Record<IntentKey, React.FC<LucideProps>> = {
  collaborate: HandHeartIcon,
  propose: LightbulbIcon,
  donate: GiftIcon,
};

function getIntentActions(t: Translate): {
  key: IntentKey;
  label: string;
  description: string;
  icon: React.FC<LucideProps>;
}[] {
  return INTENT_KEYS.map((key) => ({
    key,
    label: t(`explorer.intents.${key}.label`),
    description: t(`explorer.intents.${key}.description`),
    icon: INTENT_ICONS[key],
  }));
}

function openMarketplaceContact(): void {
  const mailto = resolveMarketplaceContactMailto();
  if (mailto) void Linking.openURL(mailto);
}

function IntentRotator({
  palette,
  onOpenIntent,
  t,
  embedded = false,
}: {
  palette: Palette;
  onOpenIntent: (intent: IntentKey) => void;
  t: Translate;
  /** Inside the hero card: no card chrome of its own, just a divider on top. */
  embedded?: boolean;
}): React.JSX.Element {
  const [activeIntent, setActiveIntent] = useState(0);
  const transition = useRef(new Animated.Value(1)).current;
  const intents = useMemo(() => getIntentActions(t), [t]);
  const intent = intents[activeIntent];
  const IntentIcon = intent.icon;

  React.useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(transition, { toValue: 0, duration: 180, useNativeDriver: true }).start(
        () => {
          setActiveIntent((current) => (current + 1) % intents.length);
          transition.setValue(0);
          Animated.spring(transition, {
            toValue: 1,
            friction: 8,
            tension: 90,
            useNativeDriver: true,
          }).start();
        }
      );
    }, 4200);

    return () => clearInterval(interval);
  }, [intents.length, transition]);

  return (
    <View
      testID='explorer-intents'
      style={
        embedded
          ? [styles.intentEmbedded, { borderTopColor: palette.border }]
          : [styles.intentCard, { backgroundColor: palette.surface, borderColor: palette.border }]
      }
    >
      <View style={styles.intentHeading}>
        <SectionHeading title={t('explorer.intents.question')} color={palette.text} />
      </View>
      <Animated.View
        style={{
          opacity: transition,
          transform: [
            {
              translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
            },
          ],
        }}
      >
        <Pressable
          testID={`explorer-intent-${intent.key}`}
          accessibilityRole='button'
          style={[styles.intentAction, { backgroundColor: palette.fill }]}
          onPress={() => onOpenIntent(intent.key)}
          accessibilityLabel={intent.label}
        >
          <View style={styles.intentIconWrap}>
            <IntentIcon size={19} color='#baffdf' strokeWidth={1.9} />
          </View>
          <View style={styles.intentActionCopy}>
            <Text style={styles.intentActionLabel}>{intent.label}</Text>
            <Text style={styles.intentActionDescription}>{intent.description}</Text>
          </View>
          <ArrowUpRightIcon size={18} color='#baffdf' strokeWidth={2.2} />
        </Pressable>
      </Animated.View>
      <View style={styles.intentSteps}>
        {intents.map((item, index) => (
          <View
            key={item.label}
            style={[
              styles.intentStep,
              { backgroundColor: index === activeIntent ? palette.primary : palette.border },
              index === activeIntent && styles.intentStepActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/** Projects with something to show (presentation, video or banner), in random order. */
export function buildShowcase(
  projects: readonly MarketProject[],
  random: () => number = Math.random
): MarketProject[] {
  const withMedia = projects.filter(
    (project) => project.canvaUrl ?? project.videoUrl ?? project.imageUrl
  );
  // Fisher–Yates shuffle.
  const shuffled = [...withMedia];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

function HeroSlideMedia({
  project,
  active,
  palette,
}: {
  project: MarketProject | null;
  active: boolean;
  palette: Palette;
}): React.JSX.Element {
  // Only the visible slide embeds a presentation or video; the others show their banner.
  if (Platform.OS === 'web' && active && project?.canvaUrl) {
    return React.createElement('iframe', {
      src: project.canvaUrl,
      title: project.title,
      loading: 'lazy',
      sandbox: 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox',
      allow: 'fullscreen',
      allowFullScreen: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
      style: { border: 0, display: 'block', width: '100%', height: '100%' },
    });
  }
  if (Platform.OS === 'web' && active && project?.videoUrl) {
    return React.createElement('video', {
      src: project.videoUrl,
      autoPlay: true,
      muted: true,
      loop: true,
      playsInline: true,
      'aria-label': project.title,
      style: {
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        backgroundColor: '#000',
      },
    });
  }
  const image = project?.imageUrl ?? project?.logoUrl;
  return image ? (
    <Image source={{ uri: image }} style={styles.projectImage} resizeMode='cover' />
  ) : (
    <View style={[styles.heroMediaFallback, { backgroundColor: palette.mist }]}>
      <LeafIcon size={42} color={palette.primary} strokeWidth={1.5} />
    </View>
  );
}

function HeroCarousel({
  palette,
  onProposeProject,
  onOpenIntent,
  onOpenProject,
  t,
  isDark,
  showcase,
}: {
  palette: Palette;
  onProposeProject: () => void;
  onOpenIntent: (intent: IntentKey) => void;
  onOpenProject: (slug: string) => void;
  t: Translate;
  isDark: boolean;
  /** Projects to feature, already in display order; empty shows the marketplace intro. */
  showcase: readonly MarketProject[];
}): React.JSX.Element {
  const { width } = useWindowDimensions();
  const [activeSlide, setActiveSlide] = useState(0);
  // Measured from the card itself: the screen width overestimates it when the content is capped.
  const [trackWidth, setTrackWidth] = useState(0);
  const slideWidth = trackWidth || Math.max(width - getContentGutter(width) * 2 - 26, 260);
  const mediaHeight = Math.min(Math.max(slideWidth * 0.56, 180), 316);
  const launchKickerColor = isDark ? '#a6f7d6' : '#087f63';
  const launchTitleColor = isDark ? '#f0fff6' : '#073f32';
  const launchDescriptionColor = isDark ? 'rgba(240,255,246,0.7)' : '#315f52';
  const slides: Array<MarketProject | null> = showcase.length ? [...showcase] : [null];
  const current = Math.min(activeSlide, slides.length - 1);

  return (
    <View
      testID='explorer-hero'
      style={[
        styles.heroBlock,
        styles.cardShadow,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <View
        testID='explorer-hero-track'
        onLayout={(event) => setTrackWidth(Math.floor(event.nativeEvent.layout.width))}
      >
        <ScrollView
          horizontal
          pagingEnabled
          decelerationRate='fast'
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            setActiveSlide(Math.round(event.nativeEvent.contentOffset.x / slideWidth));
          }}
        >
          {slides.map((project, index) => (
            <View
              key={project?.id ?? 'intro'}
              testID={project ? `explorer-hero-slide-${project.id}` : 'explorer-hero-slide-intro'}
              style={[styles.heroSlide, { width: slideWidth, backgroundColor: palette.hero }]}
            >
              <View
                style={[
                  styles.heroMediaFrame,
                  { height: mediaHeight, borderColor: palette.border },
                ]}
              >
                <HeroSlideMedia project={project} active={index === current} palette={palette} />
                <View style={styles.heroMediaShade} pointerEvents='none' />
                <View style={styles.heroMediaLabel} pointerEvents='none'>
                  <PlayIcon size={12} color='#edfff5' fill='#edfff5' />
                  <Text style={styles.heroMediaLabelText}>{t('explorer.featured')}</Text>
                </View>
              </View>
              <View style={styles.heroCopy}>
                <Text style={[styles.heroKicker, { color: launchKickerColor }]}>
                  {project ? t('explorer.featuredProject') : t('explorer.globalMarket')}
                </Text>
                <Text style={[styles.heroProjectTitle, { color: launchTitleColor }]}>
                  {project?.title ?? t('explorer.projectsToActivate')}
                </Text>
                <Text
                  numberOfLines={3}
                  style={[styles.heroDescription, { color: launchDescriptionColor }]}
                >
                  {project?.description ?? t('explorer.heroDescription')}
                </Text>
                <Pressable
                  testID={project ? `explorer-hero-open-${project.id}` : 'explorer-hero-propose'}
                  style={styles.heroAction}
                  onPress={() => (project ? onOpenProject(project.slug) : onProposeProject())}
                >
                  <Text style={styles.heroActionText}>
                    {project ? t('explorer.seeProject') : t('explorer.cta.project.action')}
                  </Text>
                  <ArrowUpRightIcon size={16} color='#063c32' strokeWidth={2.6} />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {slides.length > 1 ? (
        <View style={styles.sliderFooter}>
          <View style={styles.dots}>
            {slides.map((project, index) => (
              <View
                key={project?.id ?? index}
                style={[
                  styles.dot,
                  { backgroundColor: index === current ? palette.primary : palette.border },
                  index === current && styles.dotActive,
                ]}
              />
            ))}
          </View>
          <Text style={[styles.sliderHint, { color: palette.muted }]}>
            {t('explorer.swipeHint')}
          </Text>
        </View>
      ) : null}

      <IntentRotator palette={palette} onOpenIntent={onOpenIntent} t={t} embedded />
    </View>
  );
}

function ProjectCard({
  project,
  palette,
  t,
  onOpen,
}: {
  project: MarketProject;
  palette: Palette;
  t: Translate;
  onOpen: (slug: string) => void;
}): React.JSX.Element {
  return (
    <Pressable
      testID={`explorer-project-${project.id}`}
      accessibilityRole='button'
      onPress={() => onOpen(project.slug)}
      style={[
        styles.projectCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      {project.imageUrl ? (
        <Image
          source={{ uri: project.imageUrl }}
          style={styles.projectCardImage}
          resizeMode='cover'
        />
      ) : null}
      <View style={styles.projectTopline}>
        <ProjectMark
          logoUrl={project.logoUrl}
          size={22}
          style={[styles.projectMark, { backgroundColor: palette.mist }]}
          color={palette.primary}
        />
        <View style={styles.projectBadges}>
          <View style={[styles.statusPill, { backgroundColor: palette.mist }]}>
            <View style={[styles.statusDot, { backgroundColor: palette.primary }]} />
            <Text style={[styles.statusPillText, { color: palette.primaryDeep }]}>
              {t('explorer.active')}
            </Text>
          </View>
          <View style={[styles.typePill, { borderColor: palette.border }]}>
            <Text style={[styles.typePillText, { color: palette.muted }]}>
              {categoryLabel(t, project.categoryCode)}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.projectTheme, { color: palette.primary }]}>
        {project.theme.toUpperCase()}
      </Text>
      <Text style={[styles.projectTitle, { color: palette.text }]}>{project.title}</Text>
      <View style={styles.locationRow}>
        <MapPinIcon size={14} color={palette.muted} />
        <Text style={[styles.locationText, { color: palette.muted }]}>{project.place}</Text>
      </View>
      <Text style={[styles.projectDescription, { color: palette.muted }]}>
        {project.description}
      </Text>
      <View style={styles.contributionRow}>
        <UsersIcon size={15} color={palette.primary} />
        <Text style={[styles.contributionLabel, { color: palette.text }]}>
          {t('explorer.waysToCollaborate')}
        </Text>
      </View>
      <View style={styles.tagRow}>
        {project.waysToContribute.map((way) => (
          <View key={way} style={[styles.contributionTag, { borderColor: palette.border }]}>
            <Text style={[styles.contributionTagText, { color: palette.muted }]}>{way}</Text>
          </View>
        ))}
      </View>
      <Pressable
        style={[styles.projectAction, { borderColor: palette.primary }]}
        onPress={() => onOpen(project.slug)}
      >
        <Text style={[styles.projectActionText, { color: palette.primaryDeep }]}>
          {t('explorer.participateAndEarn')}
        </Text>
        <ChevronRightIcon size={17} color={palette.primaryDeep} />
      </Pressable>
    </Pressable>
  );
}

function ProjectGridCard({
  project,
  palette,
  t,
  onOpen,
}: {
  project: MarketProject;
  palette: Palette;
  t: Translate;
  onOpen: (slug: string) => void;
}): React.JSX.Element {
  return (
    <Pressable
      testID={`explorer-project-${project.id}`}
      accessibilityRole='button'
      accessibilityLabel={`${project.title}, ${project.place}`}
      onPress={() => onOpen(project.slug)}
      style={[
        styles.projectGridCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      {project.imageUrl ? (
        <Image
          source={{ uri: project.imageUrl }}
          style={styles.projectGridImage}
          resizeMode='cover'
        />
      ) : (
        <View
          style={[
            styles.projectGridImage,
            styles.projectGridMark,
            { backgroundColor: palette.mist },
          ]}
        >
          <ProjectMark logoUrl={project.logoUrl} size={22} color={palette.primary} />
        </View>
      )}
      <View style={[styles.typePill, styles.projectGridPill, { borderColor: palette.border }]}>
        <Text numberOfLines={1} style={[styles.typePillText, { color: palette.muted }]}>
          {categoryLabel(t, project.categoryCode)}
        </Text>
      </View>
      <Text numberOfLines={2} style={[styles.projectGridTitle, { color: palette.text }]}>
        {project.title}
      </Text>
      <View style={styles.locationRow}>
        <MapPinIcon size={13} color={palette.muted} />
        <Text numberOfLines={1} style={[styles.locationText, { color: palette.muted }]}>
          {project.place}
        </Text>
      </View>
    </Pressable>
  );
}

function ProjectCompactRow({
  project,
  palette,
  t,
  onOpen,
}: {
  project: MarketProject;
  palette: Palette;
  t: Translate;
  onOpen: (slug: string) => void;
}): React.JSX.Element {
  return (
    <Pressable
      testID={`explorer-project-${project.id}`}
      accessibilityRole='button'
      accessibilityLabel={`${project.title}, ${project.place}`}
      onPress={() => onOpen(project.slug)}
      style={[
        styles.projectCompactRow,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <ProjectMark
        logoUrl={project.logoUrl}
        size={16}
        style={[styles.projectCompactMark, { backgroundColor: palette.mist }]}
        color={palette.primary}
      />
      <View style={styles.projectCompactCopy}>
        <Text numberOfLines={1} style={[styles.projectCompactTitle, { color: palette.text }]}>
          {project.title}
        </Text>
        <Text numberOfLines={1} style={[styles.projectCompactMeta, { color: palette.primaryDeep }]}>
          {`${project.place} · ${categoryLabel(t, project.categoryCode)}`}
        </Text>
      </View>
      <ChevronRightIcon size={17} color={palette.primaryDeep} />
    </Pressable>
  );
}

export function MarketplaceProjectBrowser({
  locale,
  palette,
  t,
  loader = loadMarketplaceProjects,
  onProjectsLoaded,
  onOpenProject = () => undefined,
  onListNavigate = () => undefined,
  refreshKey = 0,
}: {
  locale: string;
  palette: Palette;
  t: Translate;
  /** Changing it reloads the projects (the screen's reload button). */
  refreshKey?: number;
  loader?: LoadMarketplaceProjects;
  /** Every loaded project (empty after an error), e.g. to build the hero showcase. */
  onProjectsLoaded?: (projects: MarketProject[]) => void;
  onOpenProject?: (slug: string) => void;
  /** Called after the page or the view changes, so the screen can scroll back to the list. */
  onListNavigate?: () => void;
}): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [view, setView] = useState<DirectoryView>(() => getRememberedDirectoryView('projects'));
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<MarketProject[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [requestVersion, setRequestVersion] = useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    setProjects([]);
    setPage(1);
    void loader(locale, controller.signal)
      .then((loadedProjects) => {
        if (controller.signal.aborted) return;
        setProjects(loadedProjects);
        setState('success');
        onProjectsLoaded?.(loadedProjects);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setProjects([]);
        setState('error');
        onProjectsLoaded?.([]);
      });
    return () => controller.abort();
  }, [loader, locale, onProjectsLoaded, requestVersion, refreshKey]);

  const filters = useMemo(() => getFilters(t, projects), [projects, t]);
  React.useEffect(() => {
    if (!filters.some((item) => item.key === filter)) setFilter('all');
  }, [filter, filters]);
  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesQuery =
        !normalizedQuery ||
        `${project.title} ${project.place} ${project.theme}`
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesFilter = filter === 'all' || project.categoryCode === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, projects, query]);
  const pageCount = directoryPageCount(visibleProjects.length, view);
  const currentPage = Math.min(page, pageCount);
  const pageItems = directoryPageItems(visibleProjects, view, currentPage);

  const changeQuery = (next: string): void => {
    setQuery(next);
    setPage(1);
  };

  const changeFilter = (next: ProjectFilter): void => {
    setFilter(next);
    setPage(1);
  };

  const changeView = (next: DirectoryView): void => {
    rememberDirectoryView('projects', next);
    setView(next);
    setPage(1);
    onListNavigate();
  };

  const changePage = (next: number): void => {
    setPage(next);
    onListNavigate();
  };

  return (
    <>
      <View style={styles.marketHeader}>
        <View>
          <Text style={[styles.sectionEyebrow, { color: palette.primary }]}>
            {t('explorer.globalMarket')}
          </Text>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t('explorer.projectsToActivate')}
          </Text>
        </View>
        <View style={[styles.marketCount, { borderColor: palette.border }]}>
          <SparklesIcon size={13} color={palette.primary} />
          <Text style={[styles.marketCountText, { color: palette.muted }]}>
            {t('explorer.available', { count: visibleProjects.length })}
          </Text>
        </View>
      </View>

      <DirectoryControls
        idPrefix='project'
        query={query}
        onQueryChange={changeQuery}
        searchLabel={t('explorer.controls.searchLabel.projects')}
        searchPlaceholder={t('explorer.searchPlaceholder')}
        view={view}
        onViewChange={changeView}
        palette={palette}
        t={t}
        filters={filters}
        activeFilter={filter}
        onFilterChange={changeFilter}
        filterLabel={t('explorer.filters.heading')}
      />

      <View style={styles.projectList}>
        {state === 'loading' ? (
          <View
            testID='explorer-loading'
            style={[styles.loadingState, { borderColor: palette.border }]}
          >
            <View style={[styles.loadingLine, { backgroundColor: palette.mist }]} />
            <View style={[styles.loadingLineShort, { backgroundColor: palette.mist }]} />
            <Text style={[styles.emptyText, { color: palette.muted }]}>
              {t('explorer.marketplaceState.loading')}
            </Text>
          </View>
        ) : state === 'error' ? (
          <View
            testID='explorer-error'
            style={[styles.emptyState, { borderColor: palette.border }]}
          >
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              {t('explorer.marketplaceState.error')}
            </Text>
            <Pressable
              testID='explorer-retry'
              style={[styles.retryButton, { backgroundColor: palette.fill }]}
              onPress={() => setRequestVersion((value) => value + 1)}
            >
              <Text style={styles.retryButtonText}>{t('explorer.marketplaceState.retry')}</Text>
            </Pressable>
          </View>
        ) : visibleProjects.length ? (
          <>
            <View
              testID={`project-directory-${view}`}
              style={
                view === 'grid'
                  ? styles.projectGridLayout
                  : view === 'compact'
                  ? styles.projectCompactLayout
                  : styles.projectList
              }
            >
              {pageItems.map((project) => {
                const Card =
                  view === 'grid'
                    ? ProjectGridCard
                    : view === 'compact'
                    ? ProjectCompactRow
                    : ProjectCard;
                return (
                  <Card
                    key={project.id}
                    project={project}
                    palette={palette}
                    t={t}
                    onOpen={onOpenProject}
                  />
                );
              })}
            </View>
            <DirectoryPagination
              idPrefix='project'
              label={t('explorer.controls.pagination.label.projects')}
              page={currentPage}
              pageCount={pageCount}
              palette={palette}
              t={t}
              onChange={changePage}
            />
          </>
        ) : (
          <View
            testID='explorer-empty'
            style={[styles.emptyState, { borderColor: palette.border }]}
          >
            <LeafIcon size={24} color={palette.primary} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              {projects.length ? t('explorer.empty.title') : t('explorer.marketplaceState.empty')}
            </Text>
            {projects.length ? (
              <Text style={[styles.emptyText, { color: palette.muted }]}>
                {t('explorer.empty.description')}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </>
  );
}

function SubmitProject({
  language,
  palette,
  t,
  embedded = false,
}: {
  language: string;
  palette: Palette;
  t: Translate;
  /** Inside the expandable CTA card, which already shows the title and the card chrome. */
  embedded?: boolean;
}): React.JSX.Element {
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<'productive' | 'conservation'>('productive');
  const [location, setLocation] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const handleSubmit = async (): Promise<void> => {
    if (submitState === 'submitting') return;
    const input = {
      projectName,
      location,
      category: projectType,
      message,
      contactEmail,
      contactName,
      language: (['es', 'en', 'th'].includes(language) ? language : 'en') as 'es' | 'en' | 'th',
      website,
    };
    if (!validateProjectProposalInput(input)) {
      setSubmitState('error');
      setSubmitMessage(t('explorer.form.validationError'));
      return;
    }

    setSubmitState('submitting');
    setSubmitMessage('');
    try {
      await submitProjectProposal(input);
      setSubmitState('sent');
      setSubmitMessage(t('explorer.form.sent'));
      setProjectName('');
      setLocation('');
      setContactName('');
      setContactEmail('');
      setMessage('');
      setWebsite('');
    } catch {
      setSubmitState('error');
      setSubmitMessage(t('explorer.form.submitError'));
    }
  };

  return (
    <View
      testID='project-proposal-form'
      style={
        embedded
          ? styles.submitFormEmbedded
          : [
              styles.submitForm,
              { backgroundColor: palette.surfaceStrong, borderColor: palette.border },
            ]
      }
    >
      {embedded ? null : (
        <View style={styles.formHeader}>
          <View style={[styles.formIcon, { backgroundColor: palette.mist }]}>
            <CircleDollarSignIcon size={20} color={palette.primary} />
          </View>
          <View style={styles.formHeaderCopy}>
            <Text style={[styles.formTitle, { color: palette.text }]}>
              {t('explorer.form.title')}
            </Text>
            <Text style={[styles.formSubtitle, { color: palette.muted }]}>
              {t('explorer.form.subtitle')}
            </Text>
          </View>
        </View>
      )}
      <TextInput
        value={projectName}
        onChangeText={setProjectName}
        placeholder={t('explorer.form.projectName')}
        placeholderTextColor={palette.muted}
        style={[styles.input, { color: palette.text, borderColor: palette.border }]}
      />
      <TextInput
        value={location}
        onChangeText={setLocation}
        placeholder={t('explorer.form.location')}
        placeholderTextColor={palette.muted}
        style={[styles.input, { color: palette.text, borderColor: palette.border }]}
      />
      <TextInput
        value={contactName}
        onChangeText={setContactName}
        placeholder={t('explorer.form.contactName')}
        placeholderTextColor={palette.muted}
        autoComplete='name'
        style={[styles.input, { color: palette.text, borderColor: palette.border }]}
      />
      <TextInput
        value={contactEmail}
        onChangeText={setContactEmail}
        placeholder={t('explorer.form.contactEmail')}
        placeholderTextColor={palette.muted}
        autoCapitalize='none'
        autoComplete='email'
        keyboardType='email-address'
        style={[styles.input, { color: palette.text, borderColor: palette.border }]}
      />
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder={t('explorer.form.message')}
        placeholderTextColor={palette.muted}
        multiline
        maxLength={2000}
        style={[
          styles.input,
          styles.messageInput,
          { color: palette.text, borderColor: palette.border },
        ]}
      />
      <TextInput
        value={website}
        onChangeText={setWebsite}
        testID='explorer-project-proposal-honeypot'
        accessibilityElementsHidden
        importantForAccessibility='no-hide-descendants'
        autoComplete='off'
        tabIndex={-1}
        style={styles.honeypotInput}
      />
      <View style={styles.typeSelector}>
        {(
          [
            ['productive', t('explorer.form.productive')],
            ['conservation', t('explorer.form.conservation')],
          ] as const
        ).map(([value, label]) => {
          const selected = projectType === value;
          return (
            <Pressable
              key={value}
              style={[
                styles.typeButton,
                { borderColor: selected ? palette.primary : palette.border },
                selected && { backgroundColor: palette.mist },
              ]}
              onPress={() => setProjectType(value)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  { color: selected ? palette.primaryDeep : palette.muted },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        testID='explorer-project-proposal-submit'
        style={[
          styles.telegramSubmit,
          { backgroundColor: palette.primary },
          submitState === 'submitting' && styles.submitDisabled,
        ]}
        disabled={submitState === 'submitting'}
        onPress={() => void handleSubmit()}
      >
        <SendIcon size={16} color='#063c32' />
        <Text style={styles.telegramSubmitText}>
          {t(submitState === 'submitting' ? 'explorer.form.submitting' : 'explorer.form.submit')}
        </Text>
      </Pressable>
      {submitMessage ? (
        <Text
          testID={`explorer-project-proposal-${submitState}`}
          accessibilityRole='alert'
          style={[
            styles.formFeedback,
            { color: submitState === 'sent' ? palette.primaryDeep : '#a61b1b' },
          ]}
        >
          {submitMessage}
        </Text>
      ) : null}
      <Text style={[styles.formFinePrint, { color: palette.muted }]}>
        {t('explorer.form.finePrint')}
      </Text>
    </View>
  );
}

export default function ExplorarScreen(): React.JSX.Element {
  const { themeMode, language } = useAppPreferences();
  const { t } = useAppTranslation('mobile');
  const router = useRouter();
  const isGlobalAdmin = useAdminAccess()?.isGlobalAdmin === true;
  // Bumped by the header reload button; the directories reload when it changes.
  const [refreshKey, setRefreshKey] = useState(0);
  const isDark = themeMode === 'dark';
  const [showcase, setShowcase] = useState<MarketProject[]>([]);
  // Shuffled once per load, so the hero order changes between visits but not while browsing.
  const handleProjectsLoaded = React.useCallback(
    (projects: MarketProject[]) => setShowcase(buildShowcase(projects)),
    []
  );
  const [directory, setDirectory] = useState<'projects' | 'enterprises'>('projects');
  // `/explore?intent=propose` opens that guide directly, so it can be shared as a link.
  const params = useLocalSearchParams<{ intent?: string | string[] }>();
  const linkedIntent = Array.isArray(params.intent) ? params.intent[0] : params.intent;
  const [intent, setIntent] = useState<IntentKey | null>(() =>
    isIntentKey(linkedIntent) ? linkedIntent : null
  );
  const [projectFormOffset, setProjectFormOffset] = useState(0);
  const [enterpriseFormOffset, setEnterpriseFormOffset] = useState(0);
  // Which call-to-action card is open; only one form at a time.
  const [openForm, setOpenForm] = useState<'project' | 'enterprise' | null>(null);
  const [enterpriseListOffset, setEnterpriseListOffset] = useState(0);
  const [projectListOffset, setProjectListOffset] = useState(0);
  const entrance = useRef(new Animated.Value(0)).current;
  const explorerScrollRef = useRef<ScrollView>(null);

  const { theme } = useTheme();
  const basePalette: Palette = isDark
    ? {
        background: '#050f0c',
        surface: 'rgba(255, 255, 255, 0.04)',
        surfaceStrong: 'rgba(255, 255, 255, 0.07)',
        border: 'rgba(255, 255, 255, 0.08)',
        text: '#e8fff6',
        muted: 'rgba(232, 255, 246, 0.6)',
        primary: '#1ee6b5',
        primaryDeep: '#7ff3d6',
        fill: 'rgba(30, 230, 181, 0.14)',
        mist: 'rgba(30, 230, 181, 0.13)',
        hero: '#0a1a16',
      }
    : {
        background: '#f0fdf9',
        surface: 'rgba(255, 255, 255, 0.85)',
        surfaceStrong: 'rgba(255, 255, 255, 0.95)',
        border: 'rgba(11, 90, 95, 0.12)',
        text: '#0b2d31',
        muted: 'rgba(11, 45, 49, 0.6)',
        primary: '#0d9488',
        primaryDeep: '#0b5a5f',
        fill: '#0f766e',
        mist: 'rgba(8, 127, 99, 0.11)',
        hero: '#dff5ef',
      };
  // Cards use the shared theme surfaces, like the profile and dashboard sections.
  const palette: Palette = {
    ...basePalette,
    surface: theme.cardBg,
    surfaceStrong: theme.cardBg,
    border: theme.cardBorder,
  };

  React.useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 520, useNativeDriver: true }).start();
  }, [entrance]);

  const scrollToEnterpriseList = (): void => {
    explorerScrollRef.current?.scrollTo({
      y: Math.max(enterpriseListOffset - 12, 0),
      animated: true,
    });
  };

  const scrollToProjectList = (): void => {
    explorerScrollRef.current?.scrollTo({
      y: Math.max(projectListOffset - 12, 0),
      animated: true,
    });
  };

  // Each tab ends with its own enrolment card; opening one may switch tabs first, so the scroll
  // waits for the card's layout instead of using an offset from the other tab.
  const pendingFormScroll = useRef<'project' | 'enterprise' | null>(null);
  const scrollToPendingForm = (form: 'project' | 'enterprise', y: number): void => {
    if (pendingFormScroll.current !== form) return;
    pendingFormScroll.current = null;
    explorerScrollRef.current?.scrollTo({ y: Math.max(y - 20, 0), animated: true });
  };

  const openFormCard = (form: 'project' | 'enterprise'): void => {
    const sameTab = directory === (form === 'project' ? 'projects' : 'enterprises');
    setOpenForm(form);
    setDirectory(form === 'project' ? 'projects' : 'enterprises');
    if (sameTab) {
      const offset = form === 'project' ? projectFormOffset : enterpriseFormOffset;
      explorerScrollRef.current?.scrollTo({ y: Math.max(offset - 20, 0), animated: true });
    } else {
      pendingFormScroll.current = form;
    }
  };

  const handleProposeProject = (): void => openFormCard('project');

  const contactAction: IntentGuideAction[] = resolveMarketplaceContactMailto()
    ? [
        {
          testID: 'explorer-intent-guide-contact',
          label: t('explorer.intents.guide.contact'),
          onPress: openMarketplaceContact,
        },
      ]
    : [];
  const intentActions: IntentGuideAction[] = [
    intent === 'propose'
      ? {
          testID: 'explorer-intent-guide-form',
          label: t('explorer.intents.guide.openForm'),
          primary: true,
          onPress: () => {
            setIntent(null);
            handleProposeProject();
          },
        }
      : {
          testID: 'explorer-intent-guide-projects',
          label: t('explorer.intents.guide.seeProjects'),
          primary: true,
          onPress: () => {
            setIntent(null);
            setDirectory('projects');
            scrollToProjectList();
          },
        },
    ...contactAction,
  ];

  const tips: Tip[] = [
    {
      key: 'reputation',
      icon: AwardIcon,
      title: t('explorer.tips.items.reputation.title'),
      text: t('explorer.tips.items.reputation.text'),
      action: {
        label: t('explorer.tips.items.reputation.action'),
        onPress: () => router.push('/profile'),
      },
    },
    {
      key: 'projects',
      icon: LeafIcon,
      title: t('explorer.tips.items.projects.title'),
      text: t('explorer.tips.items.projects.text'),
      action: {
        label: t('explorer.tips.items.projects.action'),
        onPress: () => {
          setDirectory('projects');
          scrollToProjectList();
        },
      },
    },
    {
      key: 'enterprises',
      icon: Building2Icon,
      title: t('explorer.tips.items.enterprises.title'),
      text: t('explorer.tips.items.enterprises.text'),
      action: {
        label: t('explorer.tips.items.enterprises.action'),
        onPress: () => {
          setDirectory('enterprises');
          scrollToEnterpriseList();
        },
      },
    },
    {
      key: 'invite',
      icon: UserPlusIcon,
      title: t('explorer.tips.items.invite.title'),
      text: t('explorer.tips.items.invite.text'),
      action: {
        label: t('explorer.tips.items.invite.action'),
        onPress: () => router.push('/profile'),
      },
    },
    {
      key: 'together',
      icon: SproutIcon,
      title: t('explorer.tips.items.together.title'),
      text: t('explorer.tips.items.together.text'),
    },
  ];

  return (
    <ScreenShell activeSection='explore' backgroundColor={palette.background}>
      <Animated.View
        style={[
          styles.root,
          {
            backgroundColor: palette.background,
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
              },
            ],
          },
        ]}
      >
        <ScrollView
          ref={explorerScrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <PageHeader
            testID='explorer-heading'
            title={t('explorer.title')}
            subtitle={t('explorer.subtitle')}
            icon={<CompassIcon size={19} color='#dffff0' strokeWidth={1.8} />}
            palette={palette}
            actions={
              <>
                {isGlobalAdmin ? (
                  <Pressable
                    testID='explorer-admin-panel'
                    accessibilityRole='link'
                    accessibilityLabel={t('explorer.admin.openPanel')}
                    onPress={() => void Linking.openURL(`${resolveAdminPanelUrl()}/marketplace`)}
                    style={[
                      styles.headerIconButton,
                      { borderColor: palette.border, backgroundColor: palette.surface },
                    ]}
                  >
                    <ShieldCheckIcon size={17} color={palette.primaryDeep} />
                  </Pressable>
                ) : null}
                <Pressable
                  testID='explorer-reload'
                  accessibilityRole='button'
                  accessibilityLabel={t('explorer.reload')}
                  onPress={() => setRefreshKey((value) => value + 1)}
                  style={[
                    styles.headerIconButton,
                    { borderColor: palette.border, backgroundColor: palette.surface },
                  ]}
                >
                  <RefreshIcon size={17} color={palette.primaryDeep} />
                </Pressable>
              </>
            }
          />

          <HeroCarousel
            palette={palette}
            onProposeProject={handleProposeProject}
            onOpenIntent={setIntent}
            t={t}
            isDark={isDark}
            showcase={showcase}
            onOpenProject={(slug) => router.push({ pathname: '/explore/[slug]', params: { slug } })}
          />

          <View
            accessibilityRole='tablist'
            accessibilityLabel={t('explorer.directory.label')}
            style={[
              styles.directoryTabs,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            {(['projects', 'enterprises'] as const).map((item) => {
              const selected = directory === item;
              return (
                <Pressable
                  key={item}
                  testID={`explorer-directory-${item}`}
                  accessibilityRole='tab'
                  accessibilityState={{ selected }}
                  onPress={() => setDirectory(item)}
                  style={[styles.directoryTab, selected && { backgroundColor: palette.fill }]}
                >
                  <Text
                    style={[
                      styles.directoryTabText,
                      { color: selected ? '#effff7' : palette.muted },
                    ]}
                  >
                    {t(`explorer.directory.${item}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {directory === 'projects' ? (
            <View
              testID='explorer-project-list'
              style={styles.projectBrowser}
              onLayout={(event) => setProjectListOffset(event.nativeEvent.layout.y)}
            >
              <MarketplaceProjectBrowser
                locale={language}
                palette={palette}
                t={t}
                onProjectsLoaded={handleProjectsLoaded}
                onListNavigate={scrollToProjectList}
                refreshKey={refreshKey}
                onOpenProject={(slug) =>
                  router.push({
                    pathname: '/explore/[slug]',
                    params: { slug },
                  })
                }
              />
            </View>
          ) : (
            <View
              testID='explorer-enterprise-list'
              onLayout={(event) => setEnterpriseListOffset(event.nativeEvent.layout.y)}
            >
              <MarketplaceEnterpriseBrowser
                locale={language}
                palette={palette}
                t={t}
                onListNavigate={scrollToEnterpriseList}
                refreshKey={refreshKey}
                onOpenEnterprise={(slug) =>
                  router.push({
                    pathname: '/explore/enterprise/[slug]',
                    params: { slug },
                  })
                }
              />
            </View>
          )}

          <TipsSlider tips={tips} palette={palette} t={t} />

          {directory === 'projects' ? (
            <View
              onLayout={(event) => {
                setProjectFormOffset(event.nativeEvent.layout.y);
                scrollToPendingForm('project', event.nativeEvent.layout.y);
              }}
            >
              <ExpandableCtaCard
                testID='explorer-project-cta'
                title={t('explorer.cta.project.title')}
                description={t('explorer.cta.project.description')}
                actionLabel={t('explorer.cta.project.action')}
                closeLabel={t('explorer.cta.close')}
                icon={LightbulbIcon}
                palette={palette}
                expanded={openForm === 'project'}
                onExpandedChange={(open) => setOpenForm(open ? 'project' : null)}
              >
                <SubmitProject language={language} palette={palette} t={t} embedded />
              </ExpandableCtaCard>
            </View>
          ) : (
            <View
              onLayout={(event) => {
                setEnterpriseFormOffset(event.nativeEvent.layout.y);
                scrollToPendingForm('enterprise', event.nativeEvent.layout.y);
              }}
            >
              <ExpandableCtaCard
                testID='explorer-enterprise-cta'
                title={t('explorer.cta.enterprise.title')}
                description={t('explorer.cta.enterprise.description')}
                actionLabel={t('explorer.cta.enterprise.action')}
                closeLabel={t('explorer.cta.close')}
                icon={Building2Icon}
                palette={palette}
                expanded={openForm === 'enterprise'}
                onExpandedChange={(open) => setOpenForm(open ? 'enterprise' : null)}
              >
                <EnterpriseApplicationForm language={language} palette={palette} t={t} />
              </ExpandableCtaCard>
            </View>
          )}
        </ScrollView>
        <IntentGuideModal
          intent={intent}
          icon={intent ? INTENT_ICONS[intent] : undefined}
          palette={palette}
          t={t}
          actions={intentActions}
          onClose={() => setIntent(null)}
        />
      </Animated.View>
    </ScreenShell>
  );
}

// Same lift as the profile and dashboard section cards.
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18,
  shadowRadius: 10,
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 116, gap: 24 },
  projectBrowser: { gap: 24 },
  directoryTabs: { borderWidth: 1, borderRadius: 16, padding: 4, flexDirection: 'row', gap: 4 },
  directoryTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directoryTabText: { fontSize: 14, fontWeight: '900' },
  heroBlock: { gap: 12, borderWidth: 1, borderRadius: 26, padding: 12 },
  cardShadow: CARD_SHADOW,
  intentCard: { borderWidth: 1, borderRadius: 19, padding: 15 },
  intentEmbedded: { borderTopWidth: 1, paddingTop: 14, paddingHorizontal: 4 },
  headerIconButton: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentHeading: { marginBottom: 10 },
  intentAction: {
    minHeight: 66,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  intentIconWrap: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: 'rgba(186,255,223,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentActionCopy: { flex: 1 },
  intentActionLabel: { color: '#f0fff6', fontSize: 14, fontWeight: '900' },
  intentActionDescription: {
    color: 'rgba(240,255,246,0.66)',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  intentSteps: { flexDirection: 'row', gap: 5, marginTop: 11 },
  intentStep: { height: 3, flex: 1, borderRadius: 3 },
  intentStepActive: { flex: 2 },
  heroSlide: { borderRadius: 24, overflow: 'hidden' },
  heroMediaFrame: {
    margin: 8,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#092c25',
  },
  projectImage: { width: '100%', height: '100%' },
  heroMediaFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroMediaShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 29, 22, 0.08)' },
  heroMediaLabel: {
    position: 'absolute',
    top: 11,
    left: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(2, 30, 23, 0.76)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  heroMediaLabelText: { color: '#edfff5', fontSize: 8, letterSpacing: 0.7, fontWeight: '800' },
  heroCopy: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 22 },
  heroKicker: {
    color: '#a6f7d6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  heroProjectTitle: {
    color: '#f0fff6',
    fontFamily: 'Sculpin-Bold',
    fontSize: 31,
    letterSpacing: -0.8,
  },
  heroDescription: {
    color: 'rgba(240,255,246,0.7)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    maxWidth: 400,
  },
  heroAction: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1ee6b5',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroActionText: { color: '#063c32', fontSize: 12, fontWeight: '800' },
  sliderFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 20 },
  sliderHint: { fontSize: 11 },
  marketHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.15, marginBottom: 5 },
  sectionTitle: { fontFamily: 'Sculpin-Bold', fontSize: 22, letterSpacing: -0.5 },
  marketCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  marketCountText: { fontSize: 10, fontWeight: '700' },
  projectList: { gap: 12 },
  projectGridLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  projectGridCard: {
    ...CARD_SHADOW,
    width: '48.5%',
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    gap: 7,
  },
  projectGridImage: { width: '100%', height: 96, borderRadius: 12 },
  projectGridMark: { alignItems: 'center', justifyContent: 'center' },
  projectGridPill: { alignSelf: 'flex-start' },
  projectGridTitle: { fontFamily: 'Sculpin-Bold', fontSize: 16, lineHeight: 20 },
  projectCompactLayout: { gap: 8 },
  projectCompactRow: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  projectCompactMark: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectCompactCopy: { flex: 1, gap: 3 },
  projectCompactTitle: { fontFamily: 'Sculpin-Bold', fontSize: 15 },
  projectCompactMeta: { fontSize: 12, fontWeight: '800' },
  projectCard: { borderWidth: 1, borderRadius: 21, padding: 18, ...CARD_SHADOW },
  projectCardImage: { width: '100%', height: 180, borderRadius: 14, marginBottom: 14 },
  projectTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  projectMark: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusPillText: { fontSize: 8, letterSpacing: 0.65, fontWeight: '800' },
  typePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 5 },
  typePillText: { fontSize: 8, letterSpacing: 0.5, fontWeight: '800' },
  projectTheme: { fontSize: 10, letterSpacing: 1, fontWeight: '800', marginTop: 17 },
  projectTitle: { fontFamily: 'Sculpin-Bold', fontSize: 28, letterSpacing: -0.7, marginTop: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  locationText: { fontSize: 12 },
  projectDescription: { fontSize: 13, lineHeight: 19, marginTop: 13 },
  contributionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 },
  contributionLabel: { fontSize: 12, fontWeight: '800' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  contributionTag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  contributionTagText: { fontSize: 10, fontWeight: '600' },
  projectAction: {
    marginTop: 19,
    minHeight: 43,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
  },
  projectActionText: { fontSize: 12, fontWeight: '800' },
  emptyState: {
    padding: 28,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 12, textAlign: 'center' },
  loadingState: { padding: 28, borderWidth: 1, borderRadius: 18, gap: 10 },
  loadingLine: { height: 18, width: '76%', borderRadius: 9 },
  loadingLineShort: { height: 12, width: '48%', borderRadius: 6 },
  retryButton: { marginTop: 4, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  retryButtonText: { color: '#effff6', fontSize: 12, fontWeight: '800' },
  submitFormEmbedded: { gap: 12 },
  submitForm: { borderWidth: 1, borderRadius: 21, padding: 18 },
  formHeader: { flexDirection: 'row', gap: 11, alignItems: 'center', marginBottom: 17 },
  formIcon: {
    width: 41,
    height: 41,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formHeaderCopy: { flex: 1 },
  formTitle: { fontFamily: 'Sculpin-Bold', fontSize: 19, letterSpacing: -0.35 },
  formSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  input: {
    minHeight: 47,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 13,
    paddingHorizontal: 13,
    marginBottom: 9,
  },
  messageInput: { minHeight: 88, textAlignVertical: 'top' },
  honeypotInput: { position: 'absolute', left: -10000, width: 1, height: 1, opacity: 0 },
  typeSelector: { flexDirection: 'row', gap: 8, marginTop: 1 },
  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeButtonText: { fontSize: 11, fontWeight: '800' },
  telegramSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 47,
    borderRadius: 12,
    marginTop: 14,
  },
  telegramSubmitText: { color: '#063c32', fontSize: 12, fontWeight: '900' },
  submitDisabled: { opacity: 0.65 },
  formFeedback: { fontSize: 12, fontWeight: '700', lineHeight: 18 },
  formFinePrint: { fontSize: 10, textAlign: 'center', marginTop: 9 },
});
