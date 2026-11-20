import React, { useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { ViewModeKeyEvent, ViewModeTrayProps } from './ViewModeTray.types';

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);
const PREVIOUS_KEYS = new Set(['ArrowLeft', 'ArrowUp']);

/** Minimal icon tray to switch between layouts (list, grid, ...); a keyboard radio group on web. */
export function ViewModeTray<T extends string>({
  options,
  value,
  onChange,
  label,
  idPrefix,
  activeColor,
  activeIconColor,
  inactiveIconColor,
  borderColor,
  backgroundColor,
}: ViewModeTrayProps<T>): React.JSX.Element {
  const optionRefs = useRef<Partial<Record<T, View | null>>>({});

  // Radio-group keyboard pattern on web: arrows move both the selection and the focus.
  const onKeyDown = (event: ViewModeKeyEvent): void => {
    const step = NEXT_KEYS.has(event.nativeEvent.key)
      ? 1
      : PREVIOUS_KEYS.has(event.nativeEvent.key)
      ? -1
      : 0;
    if (step === 0) return;
    event.preventDefault?.();
    const index = options.findIndex((option) => option.key === value);
    const next = options[(index + step + options.length) % options.length].key;
    onChange(next);
    optionRefs.current[next]?.focus?.();
  };
  const keyboardProps = Platform.OS === 'web' ? { onKeyDown } : {};

  return (
    <View
      testID={`${idPrefix}-view-switcher`}
      accessibilityRole='radiogroup'
      accessibilityLabel={label}
      style={[styles.tray, { borderColor, backgroundColor }]}
      {...keyboardProps}
    >
      {options.map((option) => {
        const selected = option.key === value;
        const Icon = option.icon;
        return (
          <Pressable
            key={option.key}
            ref={(node) => {
              optionRefs.current[option.key] = node;
            }}
            testID={`${idPrefix}-view-${option.key}`}
            accessibilityRole='radio'
            accessibilityLabel={option.label}
            accessibilityState={{ selected, checked: selected }}
            // react-native-web only exposes the checked state through aria-checked.
            aria-checked={selected}
            // Only the selected option is a Tab stop; arrows move inside the group.
            tabIndex={selected ? 0 : -1}
            onPress={() => {
              if (!selected) onChange(option.key);
            }}
            style={[styles.option, selected && { backgroundColor: activeColor }]}
          >
            <Icon size={16} color={selected ? activeIconColor : inactiveIconColor} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 2,
    borderWidth: 1,
    borderRadius: 18,
    padding: 5,
  },
  option: {
    width: 40,
    minHeight: 36,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
