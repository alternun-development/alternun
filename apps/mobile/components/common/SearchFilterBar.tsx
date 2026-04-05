import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
  const [isOpen, setIsOpen] = useState(false);

  const activeOption = useMemo(
    () => filters.find((option) => option.key === activeFilter) ?? filters[0],
    [activeFilter, filters]
  );

  return (
    <View style={[styles.root, style, isOpen && styles.rootOpen]}>
      {isOpen ? <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)} /> : null}

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
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsOpen((open) => !open)}
          style={[
            styles.filterButton,
            {
              backgroundColor:
                activeOption?.key !== filters[0]?.key || isOpen ? theme.accentMuted : 'transparent',
              borderColor: isOpen ? theme.inputBorderFocus : theme.inputBorder,
            },
          ]}
        >
          <FilterIcon size={14} color={isOpen ? theme.accent : theme.iconDefault} />
          <Text
            numberOfLines={1}
            style={[
              styles.filterLabel,
              { color: activeOption?.key !== filters[0]?.key ? theme.accent : theme.textSecondary },
            ]}
          >
            {activeOption?.label ?? 'Filtro'}
          </Text>
          <ChevronDownIcon size={14} color={theme.iconMuted} />
        </TouchableOpacity>
      </View>

      {isOpen ? (
        <View
          style={[
            styles.dropdown,
            {
              width: dropdownWidth,
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
                <Text
                  style={[
                    styles.optionText,
                    { color: active ? theme.dropdownValue : theme.dropdownText },
                  ]}
                >
                  {option.label}
                </Text>
                {active ? <CheckIcon size={14} color={theme.dropdownValue} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    top: -12,
    left: -12,
    right: -12,
    bottom: -220,
    zIndex: 1,
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
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 148,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  dropdown: {
    position: 'absolute',
    top: 58,
    right: 0,
    borderWidth: 1,
    borderRadius: 18,
    padding: 8,
    zIndex: 10,
  },
  dropdownLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingTop: 2,
    paddingBottom: 8,
  },
  optionRow: {
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
