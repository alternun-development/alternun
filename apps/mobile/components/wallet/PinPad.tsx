import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Delete } from 'lucide-react-native';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import type { LucideProps } from 'lucide-react-native';

const DeleteIcon = Delete as React.FC<LucideProps>;

export const PIN_LENGTH = 4;

const KEYPAD_ROWS: Array<Array<string | null>> = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [null, '0', 'delete'],
];

interface PinPadProps {
  value: string;
  onChange: (next: string) => void;
  isDark: boolean;
  accent: string;
  disabled?: boolean;
}

export default function PinPad({
  value,
  onChange,
  isDark,
  accent,
  disabled = false,
}: PinPadProps): React.JSX.Element {
  const textColor = isDark ? '#e8e8ff' : '#0f172a';
  const keyBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.04)';
  const dotEmptyBorder = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.2)';

  const handlePress = (key: string | null): void => {
    if (disabled || key === null) return;

    if (key === 'delete') {
      onChange(value.slice(0, -1));
      return;
    }

    if (value.length >= PIN_LENGTH) return;
    onChange(value + key);
  };

  return (
    <View style={styles.container}>
      <View style={styles.dotsRow}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => {
          const filled = index < value.length;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: filled ? accent : 'transparent',
                  borderColor: filled ? accent : dotEmptyBorder,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.keypad}>
        {KEYPAD_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => {
              if (key === null) {
                return <View key={keyIndex} style={styles.key} />;
              }

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.key,
                    { backgroundColor: key === 'delete' ? 'transparent' : keyBg },
                  ]}
                  activeOpacity={0.6}
                  disabled={disabled}
                  onPress={() => handlePress(key)}
                  accessibilityRole='button'
                  accessibilityLabel={key === 'delete' ? 'Delete' : key}
                >
                  {key === 'delete' ? (
                    <DeleteIcon size={22} color={textColor} />
                  ) : (
                    <Text style={[styles.keyText, { color: textColor }]}>{key}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  keypad: {
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 20,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 28,
    fontWeight: '700',
  },
});
