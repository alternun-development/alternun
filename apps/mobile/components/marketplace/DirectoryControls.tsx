import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, List, Rows3, Search, X } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DIRECTORY_VIEWS } from './directoryPaging';
import type {
  DirectoryControlsProps,
  DirectoryKeyEvent,
  DirectoryPaginationProps,
} from './DirectoryControls.types';
import type { DirectoryView } from './types';

const VIEW_ICONS = { list: List, grid: LayoutGrid, compact: Rows3 } as const;
const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);
const PREVIOUS_KEYS = new Set(['ArrowLeft', 'ArrowUp']);

/** Search field plus list / grid / compact switcher shared by the Explorer directories. */
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
}: DirectoryControlsProps): React.JSX.Element {
  const optionRefs = useRef<Partial<Record<DirectoryView, View | null>>>({});

  // Radio-group keyboard pattern on web: arrows move both the selection and the focus.
  const onSwitcherKeyDown = (event: DirectoryKeyEvent): void => {
    const step = NEXT_KEYS.has(event.nativeEvent.key)
      ? 1
      : PREVIOUS_KEYS.has(event.nativeEvent.key)
      ? -1
      : 0;
    if (step === 0) return;
    event.preventDefault?.();
    const index = DIRECTORY_VIEWS.indexOf(view);
    const next = DIRECTORY_VIEWS[(index + step + DIRECTORY_VIEWS.length) % DIRECTORY_VIEWS.length];
    onViewChange(next);
    optionRefs.current[next]?.focus?.();
  };
  const keyboardProps = Platform.OS === 'web' ? { onKeyDown: onSwitcherKeyDown } : {};

  return (
    <View testID={`${idPrefix}-directory-controls`} style={styles.controls}>
      <View
        style={[
          styles.searchBox,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Search size={18} color={palette.muted} />
        <TextInput
          testID={`${idPrefix}-search-input`}
          value={query}
          onChangeText={onQueryChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={palette.muted}
          accessibilityLabel={searchLabel}
          role='searchbox'
          returnKeyType='search'
          autoCorrect={false}
          style={[styles.searchInput, { color: palette.text }]}
        />
        {query ? (
          <Pressable
            testID={`${idPrefix}-search-clear`}
            accessibilityRole='button'
            accessibilityLabel={t('explorer.controls.clearSearch')}
            hitSlop={8}
            onPress={() => onQueryChange('')}
            style={styles.clearButton}
          >
            <X size={16} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>

      <View
        testID={`${idPrefix}-view-switcher`}
        accessibilityRole='radiogroup'
        accessibilityLabel={t('explorer.controls.view.label')}
        style={[styles.switcher, { backgroundColor: palette.surface, borderColor: palette.border }]}
        {...keyboardProps}
      >
        {DIRECTORY_VIEWS.map((item) => {
          const selected = item === view;
          const Icon = VIEW_ICONS[item];
          return (
            <Pressable
              key={item}
              ref={(node) => {
                optionRefs.current[item] = node;
              }}
              testID={`${idPrefix}-view-${item}`}
              accessibilityRole='radio'
              accessibilityLabel={t(`explorer.controls.view.${item}`)}
              accessibilityState={{ selected, checked: selected }}
              // react-native-web only exposes the checked state through aria-checked.
              aria-checked={selected}
              // Only the selected option is a Tab stop; arrows move inside the group.
              tabIndex={selected ? 0 : -1}
              onPress={() => {
                if (!selected) onViewChange(item);
              }}
              style={[styles.switcherOption, selected && { backgroundColor: palette.fill }]}
            >
              <Icon size={15} color={selected ? '#effff7' : palette.muted} />
              <Text style={[styles.switcherText, { color: selected ? '#effff7' : palette.muted }]}>
                {t(`explorer.controls.view.${item}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  controls: { gap: 10 },
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
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
