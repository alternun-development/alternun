import React from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, List, Rows3 } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import SearchFilterBar from '../common/SearchFilterBar';
import { ViewModeTray } from '../common/ViewModeTray';
import { DIRECTORY_VIEWS } from './directoryPaging';
import type { DirectoryControlsProps, DirectoryPaginationProps } from './DirectoryControls.types';

const VIEW_ICONS = { list: List, grid: LayoutGrid, compact: Rows3 } as const;

/**
 * Explorer directory toolbar: the shared search pattern (search, filters) with the layout tray
 * (list / grid / compact) on the same line.
 */
export function DirectoryControls({
  idPrefix,
  query,
  onQueryChange,
  searchLabel,
  searchPlaceholder,
  view,
  onViewChange,
  palette,
  t,
  filters = [],
  activeFilter = '',
  onFilterChange = () => undefined,
  filterLabel,
}: DirectoryControlsProps): React.JSX.Element {
  return (
    <View testID={`${idPrefix}-directory-controls`}>
      <SearchFilterBar
        testID={idPrefix}
        value={query}
        onChangeText={onQueryChange}
        placeholder={searchPlaceholder}
        searchLabel={searchLabel}
        clearLabel={t('explorer.controls.clearSearch')}
        filters={filters}
        activeFilter={activeFilter}
        onChangeFilter={onFilterChange}
        filterLabel={filterLabel}
        style={styles.bar}
        trailing={
          <ViewModeTray
            idPrefix={idPrefix}
            label={t('explorer.controls.view.label')}
            value={view}
            onChange={onViewChange}
            options={DIRECTORY_VIEWS.map((item) => ({
              key: item,
              label: t(`explorer.controls.view.${item}`),
              icon: VIEW_ICONS[item],
            }))}
            activeColor={palette.fill}
            activeIconColor='#effff7'
            inactiveIconColor={palette.muted}
            borderColor={palette.border}
            backgroundColor={palette.surface}
          />
        }
      />
    </View>
  );
}

export function DirectoryPagination({
  idPrefix,
  label,
  page,
  pageCount,
  palette,
  t,
  onChange,
}: DirectoryPaginationProps): React.JSX.Element | null {
  if (pageCount <= 1) return null;
  const hasPrevious = page > 1;
  const hasNext = page < pageCount;

  return (
    <View testID={`${idPrefix}-pagination`} accessibilityLabel={label} style={styles.pagination}>
      <Pressable
        testID={`${idPrefix}-page-previous`}
        accessibilityRole='button'
        accessibilityLabel={t('explorer.controls.pagination.previous')}
        accessibilityState={{ disabled: !hasPrevious }}
        disabled={!hasPrevious}
        onPress={() => onChange(page - 1)}
        style={[
          styles.pageButton,
          { borderColor: palette.border, backgroundColor: palette.surface },
          !hasPrevious && styles.pageButtonDisabled,
        ]}
      >
        <ChevronLeft size={16} color={palette.primaryDeep} />
        <Text style={[styles.pageButtonText, { color: palette.primaryDeep }]}>
          {t('explorer.controls.pagination.previous')}
        </Text>
      </Pressable>
      <Text
        testID={`${idPrefix}-page-indicator`}
        accessibilityLiveRegion='polite'
        style={[styles.pageIndicator, { color: palette.text }]}
      >
        {t('explorer.controls.pagination.page', { page, total: pageCount })}
      </Text>
      <Pressable
        testID={`${idPrefix}-page-next`}
        accessibilityRole='button'
        accessibilityLabel={t('explorer.controls.pagination.next')}
        accessibilityState={{ disabled: !hasNext }}
        disabled={!hasNext}
        onPress={() => onChange(page + 1)}
        style={[
          styles.pageButton,
          { borderColor: palette.border, backgroundColor: palette.surface },
          !hasNext && styles.pageButtonDisabled,
        ]}
      >
        <Text style={[styles.pageButtonText, { color: palette.primaryDeep }]}>
          {t('explorer.controls.pagination.next')}
        </Text>
        <ChevronRight size={16} color={palette.primaryDeep} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // The shared search bar brings its own bottom margin; the directory lays out its own gaps.
  bar: { marginBottom: 0 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pageButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pageButtonDisabled: { opacity: 0.4 },
  pageButtonText: { fontSize: 13, fontWeight: '900' },
  pageIndicator: { flexShrink: 1, fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
