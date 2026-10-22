import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Animated,
  Image,
  Linking,
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
  BadgeDollarSign,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Gift,
  HandHeart,
  Leaf,
  Lightbulb,
  MapPin,
  Play,
  Search,
  Send,
  Sparkles,
  Sprout,
  Users,
  type LucideProps,
} from 'lucide-react-native';
import { useAppTranslation } from '../components/i18n/useAppTranslation';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import ScreenShell from '../components/common/ScreenShell';
import { MarketplaceEnterpriseBrowser } from '../components/marketplace/MarketplaceEnterpriseDirectory';
import type {
  LoadMarketplaceProjects,
  MarketProject,
  MarketplaceMedia,
  MarketplaceProjectResponse,
  Palette,
  ProjectFilter,
  Translate,
} from './explorar.types';
import { resolveMobileApiBaseUrl } from '../utils/runtimeConfig';
import {
  resolveMarketplaceContactMailto,
  submitProjectProposal,
  validateProjectProposalInput,
} from '../services/projectProposal';

const CompassIcon = Compass as React.FC<LucideProps>;
const LeafIcon = Leaf as React.FC<LucideProps>;
const SearchIcon = Search as React.FC<LucideProps>;
const MapPinIcon = MapPin as React.FC<LucideProps>;
const UsersIcon = Users as React.FC<LucideProps>;
const SparklesIcon = Sparkles as React.FC<LucideProps>;
const SendIcon = Send as React.FC<LucideProps>;
const ChevronRightIcon = ChevronRight as React.FC<LucideProps>;
const ArrowUpRightIcon = ArrowUpRight as React.FC<LucideProps>;
const PlayIcon = Play as React.FC<LucideProps>;
const SproutIcon = Sprout as React.FC<LucideProps>;
const CircleDollarSignIcon = CircleDollarSign as React.FC<LucideProps>;
const BadgeDollarSignIcon = BadgeDollarSign as React.FC<LucideProps>;
const HandHeartIcon = HandHeart as React.FC<LucideProps>;
const LightbulbIcon = Lightbulb as React.FC<LucideProps>;
const GiftIcon = Gift as React.FC<LucideProps>;

function safeImageUrl(media: MarketplaceMedia[]): string | null {
  const preferredKinds = ['cover', 'gallery_image', 'logo'];
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

function getIntentActions(t: Translate): {
  label: string;
  description: string;
  icon: React.FC<LucideProps>;
  action: 'email' | 'form';
}[] {
  return [
    {
      label: t('explorer.intents.collaborate.label'),
      description: t('explorer.intents.collaborate.description'),
      icon: HandHeartIcon,
      action: 'email',
    },
    {
      label: t('explorer.intents.propose.label'),
      description: t('explorer.intents.propose.description'),
      icon: LightbulbIcon,
      action: 'form',
    },
    {
      label: t('explorer.intents.donate.label'),
      description: t('explorer.intents.donate.description'),
      icon: GiftIcon,
      action: 'email',
    },
  ];
}

function openMarketplaceContact(): void {
  const mailto = resolveMarketplaceContactMailto();
  if (mailto) void Linking.openURL(mailto);
}

function IntentRotator({
  palette,
  onProposeProject,
  t,
}: {
  palette: Palette;
  onProposeProject: () => void;
  t: Translate;
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
      style={[styles.intentCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={styles.intentQuestionRow}>
        <Text style={[styles.intentQuestion, { color: palette.text }]}>
          {t('explorer.intents.question')}
        </Text>
        <Text style={[styles.intentPrompt, { color: palette.muted }]}>
          {t('explorer.intents.prompt')}
        </Text>
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
          style={[styles.intentAction, { backgroundColor: palette.primaryDeep }]}
          onPress={intent.action === 'form' ? onProposeProject : openMarketplaceContact}
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

function HeroCarousel({
  palette,
  onProposeProject,
  t,
  isDark,
  featuredProject,
}: {
  palette: Palette;
  onProposeProject: () => void;
  t: Translate;
  isDark: boolean;
  featuredProject: MarketProject | null;
}): React.JSX.Element {
  const { width } = useWindowDimensions();
  const [activeSlide, setActiveSlide] = useState(0);
  const slideWidth = Math.max(width - 32, 290);
  const mediaHeight = Math.min(Math.max(slideWidth * 0.56, 208), 316);
  const launchKickerColor = isDark ? '#a6f7d6' : '#087f63';
  const launchTitleColor = isDark ? '#f0fff6' : '#073f32';
  const launchDescriptionColor = isDark ? 'rgba(240,255,246,0.7)' : '#315f52';

  return (
    <View style={styles.heroBlock}>
      <View style={styles.heroHeading}>
        <View>
          <Text style={[styles.overline, { color: palette.primary }]}>
            {t('explorer.marketplace')}
          </Text>
          <Text style={[styles.heroTitle, { color: palette.text }]}>{t('explorer.heroTitle')}</Text>
        </View>
        <View
          style={[styles.livePill, { backgroundColor: palette.mist, borderColor: palette.border }]}
        >
          <View style={[styles.liveDot, { backgroundColor: palette.primary }]} />
          <Text style={[styles.livePillText, { color: palette.primaryDeep }]}>
            {t('explorer.live')}
          </Text>
        </View>
      </View>

      <IntentRotator palette={palette} onProposeProject={onProposeProject} t={t} />

      <ScrollView
        horizontal
        pagingEnabled
        decelerationRate='fast'
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          setActiveSlide(Math.round(event.nativeEvent.contentOffset.x / slideWidth));
        }}
      >
        <View style={[styles.heroSlide, { width: slideWidth, backgroundColor: palette.hero }]}>
          <View
            style={[styles.heroMediaFrame, { height: mediaHeight, borderColor: palette.border }]}
          >
            {featuredProject?.imageUrl ? (
              <Image
                source={{ uri: featuredProject.imageUrl }}
                style={styles.projectImage}
                resizeMode='cover'
              />
            ) : (
              <View style={[styles.heroMediaFallback, { backgroundColor: palette.mist }]}>
                <LeafIcon size={42} color={palette.primary} strokeWidth={1.5} />
              </View>
            )}
            <View style={styles.heroMediaShade} pointerEvents='none' />
            <View style={styles.heroMediaLabel} pointerEvents='none'>
              <PlayIcon size={12} color='#edfff5' fill='#edfff5' />
              <Text style={styles.heroMediaLabelText}>{t('explorer.featured')}</Text>
            </View>
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroKicker, { color: launchKickerColor }]}>
              {featuredProject ? t('explorer.featuredProject') : t('explorer.globalMarket')}
            </Text>
            <Text style={[styles.heroProjectTitle, { color: launchTitleColor }]}>
              {featuredProject?.title ?? t('explorer.projectsToActivate')}
            </Text>
            <Text style={[styles.heroDescription, { color: launchDescriptionColor }]}>
              {featuredProject?.description ?? t('explorer.heroDescription')}
            </Text>
            <Pressable style={styles.heroAction} onPress={openMarketplaceContact}>
              <Text style={styles.heroActionText}>{t('explorer.collaborate')}</Text>
              <ArrowUpRightIcon size={16} color='#063c32' strokeWidth={2.6} />
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.heroSlide,
            styles.submitSlide,
            { width: slideWidth, backgroundColor: palette.primaryDeep },
          ]}
        >
          <View style={styles.submitOrbitOne} />
          <View style={styles.submitOrbitTwo} />
          <View style={styles.submitSlideIcon}>
            <SproutIcon size={30} color='#1ee6b5' strokeWidth={1.6} />
          </View>
          <Text style={styles.heroKicker}>{t('explorer.openMap')}</Text>
          <Text style={styles.submitTitle}>{t('explorer.submitBanner.title')}</Text>
          <Text style={styles.submitDescription}>{t('explorer.submitBanner.description')}</Text>
          <Pressable style={styles.submitAction} onPress={openMarketplaceContact}>
            <Text style={styles.submitActionText}>{t('explorer.submitProject')}</Text>
            <SendIcon size={15} color='#eafff4' />
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.sliderFooter}>
        <View style={styles.dots}>
          {[0, 1].map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === activeSlide ? palette.primary : palette.border },
                index === activeSlide && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <Text style={[styles.sliderHint, { color: palette.muted }]}>{t('explorer.swipeHint')}</Text>
      </View>
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
        <View style={[styles.projectMark, { backgroundColor: palette.mist }]}>
          <LeafIcon size={22} color={palette.primary} strokeWidth={1.8} />
        </View>
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

export function MarketplaceProjectBrowser({
  locale,
  palette,
  t,
  loader = loadMarketplaceProjects,
  onFeaturedProjectChange,
  onOpenProject = () => undefined,
}: {
  locale: string;
  palette: Palette;
  t: Translate;
  loader?: LoadMarketplaceProjects;
  onFeaturedProjectChange?: (project: MarketProject | null) => void;
  onOpenProject?: (slug: string) => void;
}): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [projects, setProjects] = useState<MarketProject[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [requestVersion, setRequestVersion] = useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    setProjects([]);
    void loader(locale, controller.signal)
      .then((loadedProjects) => {
        if (controller.signal.aborted) return;
        setProjects(loadedProjects);
        setState('success');
        onFeaturedProjectChange?.(loadedProjects[0] ?? null);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setProjects([]);
        setState('error');
        onFeaturedProjectChange?.(null);
      });
    return () => controller.abort();
  }, [loader, locale, onFeaturedProjectChange, requestVersion]);

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

      <View
        style={[
          styles.searchBox,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <SearchIcon size={18} color={palette.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('explorer.searchPlaceholder')}
          placeholderTextColor={palette.muted}
          style={[styles.searchInput, { color: palette.text }]}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map((item) => {
          const selected = filter === item.key;
          return (
            <Pressable
              key={item.key}
              testID={`explorer-filter-${item.key}`}
              style={[
                styles.filterChip,
                { borderColor: selected ? palette.primary : palette.border },
                selected && { backgroundColor: palette.primaryDeep },
              ]}
              onPress={() => setFilter(item.key)}
            >
              <Text
                style={[styles.filterChipText, { color: selected ? '#e9fff5' : palette.muted }]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
              style={[styles.retryButton, { backgroundColor: palette.primaryDeep }]}
              onPress={() => setRequestVersion((value) => value + 1)}
            >
              <Text style={styles.retryButtonText}>{t('explorer.marketplaceState.retry')}</Text>
            </Pressable>
          </View>
        ) : visibleProjects.length ? (
          visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              palette={palette}
              t={t}
              onOpen={onOpenProject}
            />
          ))
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
}: {
  language: string;
  palette: Palette;
  t: Translate;
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
      style={[
        styles.submitForm,
        { backgroundColor: palette.surfaceStrong, borderColor: palette.border },
      ]}
    >
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
  const isDark = themeMode === 'dark';
  const [featuredProject, setFeaturedProject] = useState<MarketProject | null>(null);
  const [directory, setDirectory] = useState<'projects' | 'enterprises'>('projects');
  const [projectFormOffset, setProjectFormOffset] = useState(0);
  const entrance = useRef(new Animated.Value(0)).current;
  const explorerScrollRef = useRef<ScrollView>(null);

  const palette: Palette = isDark
    ? {
        background: '#06130f',
        surface: '#0b211a',
        surfaceStrong: '#102c23',
        border: 'rgba(194, 255, 222, 0.13)',
        text: '#ecfff4',
        muted: 'rgba(221, 247, 230, 0.62)',
        primary: '#1ee6b5',
        primaryDeep: '#0a4c40',
        mist: 'rgba(30, 230, 181, 0.13)',
        hero: '#0a2d25',
      }
    : {
        background: '#f5f2e9',
        surface: '#fffdf7',
        surfaceStrong: '#f0f7ed',
        border: 'rgba(20, 75, 55, 0.14)',
        text: '#153d32',
        muted: 'rgba(21, 61, 50, 0.62)',
        primary: '#087f63',
        primaryDeep: '#075440',
        mist: 'rgba(8, 127, 99, 0.11)',
        hero: '#e2f3e7',
      };

  React.useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 520, useNativeDriver: true }).start();
  }, [entrance]);

  const handleProposeProject = (): void => {
    explorerScrollRef.current?.scrollTo({
      y: Math.max(projectFormOffset - 20, 0),
      animated: true,
    });
  };

  return (
    <ScreenShell activeSection='explorar' backgroundColor={palette.background}>
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
          <View style={styles.pageHeading}>
            <View style={[styles.compassMark, { backgroundColor: palette.primaryDeep }]}>
              <CompassIcon size={22} color='#dffff0' strokeWidth={1.7} />
            </View>
            <View>
              <Text style={[styles.pageTitle, { color: palette.text }]}>{t('explorer.title')}</Text>
              <Text style={[styles.pageSubtitle, { color: palette.muted }]}>
                {t('explorer.subtitle')}
              </Text>
            </View>
          </View>

          <HeroCarousel
            palette={palette}
            onProposeProject={handleProposeProject}
            t={t}
            isDark={isDark}
            featuredProject={featuredProject}
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
                  style={[
                    styles.directoryTab,
                    selected && { backgroundColor: palette.primaryDeep },
                  ]}
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
            <MarketplaceProjectBrowser
              locale={language}
              palette={palette}
              t={t}
              onFeaturedProjectChange={setFeaturedProject}
              onOpenProject={(slug) =>
                router.push({
                  pathname: '/explorar/[slug]',
                  params: { slug },
                })
              }
            />
          ) : (
            <MarketplaceEnterpriseBrowser
              locale={language}
              palette={palette}
              t={t}
              onOpenEnterprise={(slug) =>
                router.push({
                  pathname: '/explorar/empresa/[slug]',
                  params: { slug },
                })
              }
            />
          )}

          <View style={[styles.earnBanner, { backgroundColor: palette.primaryDeep }]}>
            <BadgeDollarSignIcon size={24} color='#1ee6b5' />
            <View style={styles.earnCopy}>
              <Text style={styles.earnTitle}>{t('explorer.earn.title')}</Text>
              <Text style={styles.earnText}>{t('explorer.earn.description')}</Text>
            </View>
          </View>

          <View
            onLayout={(event) => {
              setProjectFormOffset(event.nativeEvent.layout.y);
            }}
          >
            <SubmitProject language={language} palette={palette} t={t} />
          </View>
        </ScrollView>
      </Animated.View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 116, gap: 24 },
  pageHeading: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 4 },
  compassMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: { fontFamily: 'Sculpin-Bold', fontSize: 25, letterSpacing: -0.6 },
  pageSubtitle: { fontSize: 12, marginTop: 1 },
  directoryTabs: { borderWidth: 1, borderRadius: 16, padding: 4, flexDirection: 'row', gap: 4 },
  directoryTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directoryTabText: { fontSize: 14, fontWeight: '900' },
  heroBlock: { gap: 12 },
  heroHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  overline: { fontSize: 10, letterSpacing: 1.35, fontWeight: '800', marginBottom: 5 },
  heroTitle: {
    fontFamily: 'Sculpin-Bold',
    fontSize: 25,
    letterSpacing: -0.8,
    lineHeight: 29,
    maxWidth: 285,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 2,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  livePillText: { fontSize: 9, letterSpacing: 0.65, fontWeight: '800' },
  intentCard: { borderWidth: 1, borderRadius: 19, padding: 15 },
  intentQuestionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  intentQuestion: { fontFamily: 'Sculpin-Bold', fontSize: 19, letterSpacing: -0.45 },
  intentPrompt: { fontSize: 8, letterSpacing: 0.7, fontWeight: '800', textAlign: 'right' },
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
  submitSlide: { minHeight: 360, padding: 28, justifyContent: 'flex-end', position: 'relative' },
  submitOrbitOne: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: 'rgba(30,230,181,0.18)',
    top: -105,
    right: -78,
  },
  submitOrbitTwo: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    borderColor: 'rgba(30,230,181,0.12)',
    top: -60,
    right: -30,
  },
  submitSlideIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,230,181,0.12)',
    marginBottom: 'auto',
  },
  submitTitle: {
    color: '#ecfff4',
    fontFamily: 'Sculpin-Bold',
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 34,
    maxWidth: 360,
  },
  submitDescription: {
    color: 'rgba(236,255,244,0.7)',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
    maxWidth: 360,
  },
  submitAction: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(234,255,244,0.42)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  submitActionText: { color: '#eafff4', fontSize: 12, fontWeight: '800' },
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
  searchBox: {
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 9,
  },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 10 },
  filterRow: { gap: 8, paddingRight: 16 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  filterChipText: { fontSize: 11, fontWeight: '700' },
  projectList: { gap: 12 },
  projectCard: { borderWidth: 1, borderRadius: 21, padding: 18 },
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
  earnBanner: {
    flexDirection: 'row',
    gap: 13,
    borderRadius: 18,
    padding: 17,
    alignItems: 'flex-start',
  },
  earnCopy: { flex: 1 },
  earnTitle: { color: '#effff6', fontSize: 14, fontWeight: '800' },
  earnText: { color: 'rgba(239,255,246,0.68)', fontSize: 12, lineHeight: 17, marginTop: 3 },
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
