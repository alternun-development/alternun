import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Leaf, ShieldCheck, TrendingUp, FolderKanban, type LucideProps } from 'lucide-react-native';
import { GlassCard, ProgressBar, SectionContainer, StatCard } from '@alternun/ui';
import { useAppPreferences } from '../components/settings/AppPreferencesProvider';
import HorizontalCardScroller from '../components/common/HorizontalCardScroller';
import ScreenShell from '../components/common/ScreenShell';
import { PageTabBar, type TabItem } from '../components/common/PageTabBar';
import SearchFilterBar, { type SearchFilterOption } from '../components/common/SearchFilterBar';

const LeafIcon = Leaf as React.FC<LucideProps>;
const ShieldCheckIcon = ShieldCheck as React.FC<LucideProps>;
const TrendingUpIcon = TrendingUp as React.FC<LucideProps>;
const FolderKanbanIcon = FolderKanban as React.FC<LucideProps>;

interface ColorPalette {
  bg: string;
  cardBg: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const HISTORY = [
  { id: '#001', date: 'Abr 2026' },
  { id: '#002', date: 'Mar 2026' },
  { id: '#003', date: 'Feb 2026' },
  { id: '#004', date: 'Ene 2026' },
];

type ProjectStatus = 'Activo' | 'Completado';

const PROJECTS: {
  title: string;
  location: string;
  status: ProjectStatus;
  progress: number;
}[] = [
  {
    title: 'Reforestación Amazonas',
    location: 'Brasil • 2.400 ha',
    status: 'Activo',
    progress: 0.75,
  },
  {
    title: 'Energía Solar Bolivia',
    location: 'Bolivia • 800 MW',
    status: 'Activo',
    progress: 0.55,
  },
  { title: 'Manglares Colombia', location: 'Colombia • 1.200 ha', status: 'Activo', progress: 0.9 },
  { title: 'Biodiversidad Perú', location: 'Perú • 3.100 ha', status: 'Completado', progress: 1.0 },
];

const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string; border: string }> = {
  Activo: { bg: 'rgba(30,230,181,0.14)', text: '#1EE6B5', border: 'rgba(30,230,181,0.3)' },
  Completado: { bg: 'rgba(99,179,237,0.14)', text: '#63b3ed', border: 'rgba(99,179,237,0.3)' },
};

const FILTER_OPTIONS: SearchFilterOption[] = [
  { key: 'all', label: 'Todos' },
  { key: 'Activo', label: 'Activos' },
  { key: 'Completado', label: 'Completados' },
];

// ─── Tab components ──────────────────────────────────────────────────────────

function CompensacionesTab({ isDark, c }: { isDark: boolean; c: ColorPalette }): React.JSX.Element {
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Stat cards */}
      <HorizontalCardScroller isDark={isDark}>
        <StatCard
          label='CO₂ Offset'
          value='24.8t'
          accentColor={c.accent}
          icon={<LeafIcon size={16} color={c.accent} />}
          style={styles.statCard}
        />
        <StatCard
          label='Proyectos'
          value='3'
          accentColor={c.accent}
          icon={<TrendingUpIcon size={16} color={c.accent} />}
          style={styles.statCard}
        />
        <StatCard
          label='Certificados'
          value='12'
          accentColor={c.accent}
          icon={<ShieldCheckIcon size={16} color={c.accent} />}
          style={styles.statCard}
        />
      </HorizontalCardScroller>

      {/* Historial */}
      <SectionContainer title='Historial'>
        <GlassCard style={styles.listCard}>
          {HISTORY.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.row,
                idx < HISTORY.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${c.accent}18` }]}>
                <LeafIcon size={18} color={c.accent} />
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.rowTitle, { color: c.text }]}>
                  {`Compensación Verde ${item.id}`}
                </Text>
                <Text style={[styles.rowSub, { color: c.muted }]}>{item.date}</Text>
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: `${c.accent}18`, borderColor: `${c.accent}44` },
                ]}
              >
                <Text style={[styles.badgeText, { color: c.accent }]}>Verificado</Text>
              </View>
            </View>
          ))}
        </GlassCard>
      </SectionContainer>

      {/* Mi Impacto */}
      <SectionContainer title='Mi Impacto'>
        <GlassCard style={styles.impactCard}>
          <ProgressBar
            progress={0.62}
            height={8}
            showLabel
            label='Meta anual'
            trailingLabel='62%'
          />
        </GlassCard>
      </SectionContainer>
    </ScrollView>
  );
}

function ProyectosTab({ isDark, c }: { isDark: boolean; c: ColorPalette }): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredProjects = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return PROJECTS.filter((project) => {
      const matchesFilter = activeFilter === 'all' || project.status === activeFilter;
      const matchesSearch =
        !normalizedQuery ||
        project.title.toLowerCase().includes(normalizedQuery) ||
        project.location.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, search]);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Stat cards */}
      <HorizontalCardScroller isDark={isDark}>
        <StatCard
          label='Activos'
          value='8'
          accentColor={c.accent}
          icon={<FolderKanbanIcon size={16} color={c.accent} />}
          style={styles.statCard}
        />
        <StatCard
          label='Completados'
          value='14'
          accentColor='#63b3ed'
          icon={<TrendingUpIcon size={16} color='#63b3ed' />}
          style={styles.statCard}
        />
      </HorizontalCardScroller>

      {/* Project list */}
      <SectionContainer title='Todos los Proyectos'>
        <SearchFilterBar
          value={search}
          onChangeText={setSearch}
          placeholder='Buscar proyecto o ubicación...'
          filters={FILTER_OPTIONS}
          activeFilter={activeFilter}
          onChangeFilter={setActiveFilter}
        />
        {filteredProjects.map((project, idx) => {
          const sc = STATUS_COLORS[project.status];
          return (
            <GlassCard
              key={project.title}
              style={
                idx === filteredProjects.length - 1 ? styles.projectCardLast : styles.projectCard
              }
            >
              <View style={styles.projectHeader}>
                <View style={[styles.iconCircle, { backgroundColor: `${c.accent}18` }]}>
                  <FolderKanbanIcon size={18} color={c.accent} />
                </View>
                <View style={styles.projectMeta}>
                  <Text style={[styles.projectTitle, { color: c.text }]}>{project.title}</Text>
                  <Text style={[styles.projectSub, { color: c.muted }]}>{project.location}</Text>
                </View>
                <View
                  style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}
                >
                  <Text style={[styles.statusText, { color: sc.text }]}>{project.status}</Text>
                </View>
              </View>
              <ProgressBar
                progress={project.progress}
                height={6}
                showLabel
                trailingLabel={`${Math.round(project.progress * 100)}%`}
              />
            </GlassCard>
          );
        })}
      </SectionContainer>
    </ScrollView>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const TABS: TabItem[] = [
  { key: 'compensaciones', label: 'Compensations', icon: LeafIcon },
  { key: 'proyectos', label: 'Projects', icon: FolderKanbanIcon },
];

export default function ExplorarScreen(): React.JSX.Element {
  const { themeMode } = useAppPreferences();
  const isDark = themeMode === 'dark';
  const [activeTab, setActiveTab] = useState<string>('proyectos');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: false }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const c = isDark
    ? {
        bg: '#050f0c',
        cardBg: 'rgba(255,255,255,0.04)',
        border: 'rgba(255,255,255,0.08)',
        text: '#e8fff6',
        muted: 'rgba(232,255,246,0.6)',
        accent: '#1EE6B5',
      }
    : {
        bg: '#f0fdf9',
        cardBg: 'rgba(255,255,255,0.85)',
        border: 'rgba(11,90,95,0.12)',
        text: '#0b2d31',
        muted: 'rgba(11,45,49,0.6)',
        accent: '#0d9488',
      };

  return (
    <ScreenShell activeSection='explorar' backgroundColor={c.bg}>
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        {/* Page Header + Tab Bar (Single Line) */}
        <View style={styles.headerBar}>
          <View style={styles.titleWithIcon}>
            <LeafIcon size={24} color={c.accent} strokeWidth={1.8} />
            <Text style={[styles.pageTitle, { color: c.text }]}>Explore</Text>
          </View>
          <PageTabBar
            tabs={TABS}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            isDark={isDark}
            accent={c.accent}
            muted={c.muted}
          />
        </View>

        {/* Tab Content */}
        <Animated.View
          style={[styles.tabContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {activeTab === 'compensaciones' && <CompensacionesTab isDark={isDark} c={c} />}
          {activeTab === 'proyectos' && <ProyectosTab isDark={isDark} c={c} />}
        </Animated.View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Sculpin-Bold',
  },
  tabContent: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    gap: 0,
  },
  statCard: {
    flex: 1,
    boxShadow: 'none',
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  impactCard: {
    padding: 16,
  },
  projectCard: {
    padding: 14,
    marginBottom: 12,
  },
  projectCardLast: {
    padding: 14,
    marginBottom: 0,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  projectMeta: {
    flex: 1,
    gap: 2,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  projectSub: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
