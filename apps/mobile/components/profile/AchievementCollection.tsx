import AchievementDetailsModal from './AchievementDetailsModal';
import { SectionContainer } from '@alternun/ui';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import SearchFilterBar from '../common/SearchFilterBar';
import { useAppTranslation } from '../i18n/useAppTranslation';
import {
  AchievementBadge,
  ACHIEVEMENT_CATALOG,
  AIRS_MILESTONES,
  isAchievementUnlocked,
  type ColorPalette,
  type AchievementDef,
} from './AchievementBadge';

const ACCOUNT_KEYS = [
  'account_confirmed',
  'profile_complete',
  'bio_added',
  'avatar_uploaded',
  'wallet_connected',
  'seven_day_streak',
];
const COMMUNITY_KEYS = ['referral_invited', 'ambassador'];
const CATEGORIES = ['all', 'account', 'airs', 'impact', 'community'] as const;
const PAGE_SIZE = 8;
const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .trim();

export function badgeCategory(key: string): Exclude<(typeof CATEGORIES)[number], 'all'> {
  if (ACCOUNT_KEYS.includes(key)) return 'account';
  if (AIRS_MILESTONES[key] != null) return 'airs';
  return COMMUNITY_KEYS.includes(key) ? 'community' : 'impact';
}

export default function AchievementCollection({
  achievements,
  score,
  c,
}: {
  achievements: Array<{ key: string; unlocked: boolean; unlockedAt: string | null }>;
  score: number | null;
  c: ColorPalette;
}): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AchievementDef | null>(null);
  const labels = {
    all: 'All',
    account: 'Account',
    airs: 'AIRS milestones',
    impact: 'Impact',
    community: 'Community',
  };
  const items = Object.entries(ACHIEVEMENT_CATALOG)
    .map(([key, def]) => ({
      ...def,
      key,
      category: badgeCategory(key),
      label: t(`profile.achievementBadges.${key}`, undefined, def.label),
      unlocked: isAchievementUnlocked(
        key,
        score,
        achievements.some((item) => item.key === key && item.unlocked)
      ),
    }))
    .sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      const categoryOrder = CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
      if (categoryOrder) return categoryOrder;
      if (a.category === 'account')
        return ACCOUNT_KEYS.indexOf(a.key) - ACCOUNT_KEYS.indexOf(b.key);
      return (AIRS_MILESTONES[a.key] ?? 0) - (AIRS_MILESTONES[b.key] ?? 0);
    })
    .filter(
      (item) =>
        (category === 'all' || item.category === category) &&
        normalize(
          `${item.label} ${AIRS_MILESTONES[item.key] ?? ''} ${
            AIRS_MILESTONES[item.key] >= 1000 ? `${AIRS_MILESTONES[item.key] / 1000}k` : ''
          }`
        ).includes(normalize(search))
    );
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const visible = items.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const reset = (): void => {
    setPage(0);
    setSelected(null);
  };

  return (
    <View style={{ margin: 12, gap: 12 }}>
      <SearchFilterBar
        filterLabel={t('profile.badgeBrowser.filterBy', undefined, 'Filter by')}
        value={search}
        onChangeText={(value) => {
          setSearch(value);
          reset();
        }}
        placeholder={t('profile.badgeBrowser.search', undefined, 'Search badges…')}
        filters={CATEGORIES.map((key) => ({
          key,
          label: t(`profile.badgeBrowser.${key}`, undefined, labels[key]),
        }))}
        activeFilter={category}
        onChangeFilter={(value) => {
          setCategory(value);
          reset();
        }}
      />
      <SectionContainer
        title={t('profile.sections.achievements', undefined, 'Achievements')}
        style={{ marginHorizontal: 0, marginBottom: 0 }}
        contentStyle={{ gap: 16 }}
      >
        {visible.length ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'flex-start',
              rowGap: 16,
            }}
          >
            {visible.map((def) => (
              <AchievementBadge
                key={def.key}
                def={def}
                textColor={c.text}
                onPress={() =>
                  setSelected({
                    ...def,
                    unlockedAt: achievements.find((item) => item.key === def.key)?.unlockedAt,
                  })
                }
              />
            ))}
          </View>
        ) : (
          <Text style={{ color: c.muted, paddingVertical: 20, textAlign: 'center' }}>
            {t('profile.badgeBrowser.empty', undefined, 'No badges match your search.')}
          </Text>
        )}
        {selected && (
          <AchievementDetailsModal
            key={selected.key}
            def={selected}
            score={score}
            c={c}
            onClose={() => setSelected(null)}
          />
        )}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Text accessibilityLiveRegion='polite' style={{ color: c.muted, fontSize: 12, flex: 1 }}>
            {t(
              'profile.badgeBrowser.results',
              {
                from: items.length ? currentPage * PAGE_SIZE + 1 : 0,
                to: Math.min((currentPage + 1) * PAGE_SIZE, items.length),
                total: items.length,
              },
              '{{from}}–{{to}} of {{total}}'
            )}
          </Text>
          <TouchableOpacity
            accessibilityRole='button'
            accessibilityLabel={t('profile.badgeBrowser.previous', undefined, 'Previous page')}
            accessibilityState={{ disabled: currentPage === 0 }}
            disabled={currentPage === 0}
            onPress={() => {
              setPage(currentPage - 1);
              setSelected(null);
            }}
            style={{
              padding: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: c.border,
              opacity: currentPage === 0 ? 0.35 : 1,
            }}
          >
            <ChevronLeft size={18} color={c.text} />
          </TouchableOpacity>
          <Text style={{ color: c.text, fontSize: 12 }}>
            {currentPage + 1} / {totalPages}
          </Text>
          <TouchableOpacity
            accessibilityRole='button'
            accessibilityLabel={t('profile.badgeBrowser.next', undefined, 'Next page')}
            accessibilityState={{ disabled: currentPage >= totalPages - 1 }}
            disabled={currentPage >= totalPages - 1}
            onPress={() => {
              setPage(currentPage + 1);
              setSelected(null);
            }}
            style={{
              padding: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: c.border,
              opacity: currentPage >= totalPages - 1 ? 0.35 : 1,
            }}
          >
            <ChevronRight size={18} color={c.text} />
          </TouchableOpacity>
        </View>
      </SectionContainer>
    </View>
  );
}
