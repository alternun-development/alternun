import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import {
  Check,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
  type LucideProps,
} from 'lucide-react-native';
import { useTheme } from '@alternun/ui';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';

const SearchIcon = Search as React.FC<LucideProps>;
const FilterIcon = SlidersHorizontal as React.FC<LucideProps>;
const ChevronDownIcon = ChevronDown as React.FC<LucideProps>;
const CheckIcon = Check as React.FC<LucideProps>;
const ClearIcon = X as React.FC<LucideProps>;

export interface SearchFilterOption {
  key: string;
  label: string;
  icon?: React.FC<LucideProps>;
}

interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SearchFilterBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  filterLabel?: string;
  filters: readonly SearchFilterOption[];
  activeFilter: string;
  onChangeFilter: (filterKey: string) => void;
  style?: ViewStyle;
  dropdownWidth?: number;
  /** Shown on the same line, right of the search box (e.g. a view-mode tray). */
  trailing?: React.ReactNode;
  /** Accessible name of the search input; defaults to the placeholder. */
  searchLabel?: string;
  /** Shows a clear button while there is text; its accessible name. */
  clearLabel?: string;
  /** Test ID prefix: `${testID}-search-input`, `-search-clear`, `-filter-button`, `-filter-<key>`. */
  testID?: string;
  /** Called on the keyboard's search/enter key. */
  onSubmitEditing?: () => void;
  keyboardType?: 'default' | 'email-address';
}

export default function SearchFilterBar({
  value,
  onChangeText,
  placeholder = 'Buscar...',
  filterLabel = 'Filtrar por',
  filters,
  activeFilter,
  onChangeFilter,
  style,
  dropdownWidth = 208,
  trailing,
  searchLabel,
  clearLabel,
  testID,
  onSubmitEditing,
  keyboardType = 'default',
}: SearchFilterBarProps) {
  // A single option filters nothing, so the button only appears with real choices.
  const hasFilters = filters.length > 1;
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const filterButtonRef = useRef<View>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const dropdownActualWidth = Math.max(0, Math.min(dropdownWidth, windowWidth - 24));

  const activeOption = useMemo(
    () => filters.find((option) => option.key === activeFilter) ?? filters[0],
    [activeFilter, filters]
  );
  const ActiveFilterIcon = activeOption?.icon ?? FilterIcon;

  useEffect(() => {
    if (!isOpen) {
      setAnchorRect(null);
      return;
    }

    const frame = requestAnimationFrame(() => {
      filterButtonRef.current?.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setAnchorRect({ x, y, width, height });
        }
      );
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isOpen]);

  const dropdownLeft = anchorRect
    ? Math.max(
        12,
        Math.min(
          anchorRect.x + anchorRect.width - dropdownActualWidth,
          windowWidth - dropdownActualWidth - 12
        )
      )
    : windowWidth - dropdownActualWidth - 12;
  const dropdownTop = anchorRect ? anchorRect.y + anchorRect.height + 8 : 58;

  return (
    <View
      testID={testID}
      style={[styles.root, trailing ? styles.rootRow : null, style, isOpen && styles.rootOpen]}
    >
      <View
        style={[
          styles.bar,
          trailing ? styles.barFlex : null,
          {
            backgroundColor: theme.inputBg,
            borderColor: isOpen ? theme.inputBorderFocus : theme.inputBorder,
          },
        ]}
      >
        <SearchIcon size={16} color={theme.iconMuted} />
        <TextInput
          testID={testID ? `${testID}-search-input` : undefined}
          style={[styles.input, { color: theme.textPrimary }]}
          accessibilityLabel={searchLabel ?? placeholder}
          role='searchbox'
          returnKeyType='search'
          autoCorrect={false}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={theme.textPlaceholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsOpen(false)}
        />
        {clearLabel && value ? (
          <Pressable
            testID={testID ? `${testID}-search-clear` : undefined}
            accessibilityRole='button'
            accessibilityLabel={clearLabel}
            hitSlop={8}
            onPress={() => onChangeText('')}
          >
            <ClearIcon size={15} color={theme.iconMuted} />
          </Pressable>
        ) : null}
        {hasFilters ? (
          <View ref={filterButtonRef} collapsable={false} style={styles.filterButtonAnchor}>
            <TouchableOpacity
              testID={testID ? `${testID}-filter-button` : undefined}
              activeOpacity={0.8}
              accessibilityRole='button'
              accessibilityLabel={activeOption?.label}
              accessibilityState={{ expanded: isOpen }}
              onPress={() => setIsOpen((open) => !open)}
              style={[
                styles.filterButton,
                {
                  backgroundColor:
                    activeOption?.key !== filters[0]?.key || isOpen
                      ? theme.accentMuted
                      : 'transparent',
                  borderColor: isOpen ? theme.inputBorderFocus : theme.inputBorder,
                },
              ]}
            >
              <ActiveFilterIcon size={14} color={isOpen ? theme.accent : theme.iconDefault} />
              <Text
                numberOfLines={1}
                style={[
                  styles.filterLabel,
                  {
                    color:
                      activeOption?.key !== filters[0]?.key ? theme.accent : theme.textSecondary,
                  },
                ]}
              >
                {activeOption?.label ?? 'Filtro'}
              </Text>
              <ChevronDownIcon size={14} color={theme.iconMuted} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      {trailing}

      <Modal
        transparent
        visible={isOpen}
        animationType='none'
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsOpen(false)} />
          <View
            style={[
              styles.dropdown,
              {
                left: dropdownLeft,
                top: dropdownTop,
                width: dropdownActualWidth,
                backgroundColor: theme.dropdownBg,
                borderColor: theme.dropdownBorder,
                boxShadow: theme.isDark
                  ? '0px 18px 34px rgba(5, 16, 13, 0.34)'
                  : '0px 18px 34px rgba(15, 23, 42, 0.12)',
              },
            ]}
          >
            <Text style={[styles.dropdownLabel, { color: theme.dropdownMuted }]}>
              {filterLabel}
            </Text>
            {filters.map((option, index) => {
              const active = option.key === activeFilter;
              const OptionIcon = option.icon;
              return (
                <TouchableOpacity
                  key={option.key}
                  testID={testID ? `${testID}-filter-${option.key}` : undefined}
                  accessibilityRole='button'
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: active }}
                  activeOpacity={0.8}
                  onPress={() => {
                    onChangeFilter(option.key);
                    setIsOpen(false);
                  }}
                  style={[
                    styles.optionRow,
                    {
                      borderBottomColor: theme.dropdownDivider,
                      backgroundColor: active ? theme.accentMuted : 'transparent',
                    },
                    index === filters.length - 1 && styles.optionRowLast,
                  ]}
                >
                  <View style={styles.optionContent}>
                    {OptionIcon ? (
                      <OptionIcon
                        size={14}
                        color={active ? theme.dropdownValue : theme.dropdownText}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.optionText,
                        { color: active ? theme.dropdownValue : theme.dropdownText },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {active ? <CheckIcon size={14} color={theme.dropdownValue} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    zIndex: 8,
    marginBottom: 16,
  },
  rootOpen: {
    zIndex: 40,
  },
  rootRow: {
    flexDirection: 'row',
    // Trailing controls stretch to the search bar's height so the row reads as one unit.
    alignItems: 'stretch',
    gap: 10,
  },
  barFlex: {
    flex: 1,
    minWidth: 0,
  },
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  filterButtonAnchor: {
    alignSelf: 'flex-start',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 9,
    minHeight: 52,
    zIndex: 3,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    minWidth: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 154,
    minHeight: 38,
  },
  filterLabel: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  dropdown: {
    position: 'absolute',
    top: 58,
    right: 0,
    borderWidth: 1,
    borderRadius: 20,
    padding: 6,
    zIndex: 10,
  },
  dropdownLabel: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 10,
  },
  optionRow: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionRowLast: {
    borderBottomWidth: 0,
  },
  optionText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 13,
    fontWeight: '600',
  },
});
