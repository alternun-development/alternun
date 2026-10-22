import React from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, List, Rows3 } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ENTERPRISE_DIRECTORY_VIEWS } from './enterpriseDirectoryPaging';
import type {
  EnterprisePaginationProps,
  EnterpriseViewSwitcherProps,
} from './EnterpriseDirectoryControls.types';

const VIEW_ICONS = { list: List, grid: LayoutGrid, compact: Rows3 } as const;

export function EnterpriseViewSwitcher({
  view,
  palette,
  t,
  onChange,
}: EnterpriseViewSwitcherProps): React.JSX.Element {
  return (
    <View
      testID='enterprise-view-switcher'
      accessibilityRole='radiogroup'
      accessibilityLabel={t('explorer.enterprises.view.label')}
      style={[styles.switcher, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      {ENTERPRISE_DIRECTORY_VIEWS.map((item) => {
        const selected = item === view;
        const Icon = VIEW_ICONS[item];
        return (
          <Pressable
            key={item}
            testID={`enterprise-view-${item}`}
            accessibilityRole='radio'
            accessibilityLabel={t(`explorer.enterprises.view.${item}`)}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => {
              if (!selected) onChange(item);
            }}
            style={[styles.switcherOption, selected && { backgroundColor: palette.primaryDeep }]}
          >
            <Icon size={15} color={selected ? '#effff7' : palette.muted} />
            <Text style={[styles.switcherText, { color: selected ? '#effff7' : palette.muted }]}>
              {t(`explorer.enterprises.view.${item}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EnterprisePagination({
  page,
  pageCount,
  palette,
  t,
  onChange,
}: EnterprisePaginationProps): React.JSX.Element | null {
  if (pageCount <= 1) return null;
  const hasPrevious = page > 1;
  const hasNext = page < pageCount;

  return (
    <View
      testID='enterprise-pagination'
      accessibilityLabel={t('explorer.enterprises.pagination.label')}
      style={styles.pagination}
    >
      <Pressable
        testID='enterprise-page-previous'
        accessibilityRole='button'
        accessibilityLabel={t('explorer.enterprises.pagination.previous')}
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
          {t('explorer.enterprises.pagination.previous')}
        </Text>
      </Pressable>
      <Text
        testID='enterprise-page-indicator'
        accessibilityLiveRegion='polite'
        style={[styles.pageIndicator, { color: palette.text }]}
      >
        {t('explorer.enterprises.pagination.page', { page, total: pageCount })}
      </Text>
      <Pressable
        testID='enterprise-page-next'
        accessibilityRole='button'
        accessibilityLabel={t('explorer.enterprises.pagination.next')}
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
          {t('explorer.enterprises.pagination.next')}
        </Text>
        <ChevronRight size={16} color={palette.primaryDeep} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  switcherOption: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  switcherText: { fontSize: 12, fontWeight: '900' },
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
