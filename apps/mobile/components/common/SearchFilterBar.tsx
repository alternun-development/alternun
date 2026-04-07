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
  type LucideProps,
} from 'lucide-react-native';
import { useTheme } from '@alternun/ui';

const SearchIcon = Search as React.FC<LucideProps>;
const FilterIcon = SlidersHorizontal as React.FC<LucideProps>;
const ChevronDownIcon = ChevronDown as React.FC<LucideProps>;
const CheckIcon = Check as React.FC<LucideProps>;

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
  filters: readonly SearchFilterOption[];
  activeFilter: string;
  onChangeFilter: (filterKey: string) => void;
  style?: ViewStyle;
  dropdownWidth?: number;
}

export default function SearchFilterBar({
  value,
  onChangeText,
  placeholder = 'Buscar...',
  filters,
  activeFilter,
  onChangeFilter,
  style,
  dropdownWidth = 208,
}: SearchFilterBarProps) {
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
    <View style={[styles.root, style, isOpen && styles.rootOpen]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.inputBg,
            borderColor: isOpen ? theme.inputBorderFocus : theme.inputBorder,
          },
        ]}
      >
        <SearchIcon size={16} color={theme.iconMuted} />
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={theme.textPlaceholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsOpen(false)}
        />
        <View ref={filterButtonRef} collapsable={false} style={styles.filterButtonAnchor}>
          <TouchableOpacity
            activeOpacity={0.8}
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
                  color: activeOption?.key !== filters[0]?.key ? theme.accent : theme.textSecondary,
                },
              ]}
            >
              {activeOption?.label ?? 'Filtro'}
            </Text>
            <ChevronDownIcon size={14} color={theme.iconMuted} />
          </TouchableOpacity>
        </View>
      </View>

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
            <Text style={[styles.dropdownLabel, { color: theme.dropdownMuted }]}>Filtrar por</Text>
            {filters.map((option, index) => {
              const active = option.key === activeFilter;
              const OptionIcon = option.icon;
              return (
                <TouchableOpacity
                  key={option.key}
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
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
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
    fontSize: 13,
    fontWeight: '600',
  },
});
