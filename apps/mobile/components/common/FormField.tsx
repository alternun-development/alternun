import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@alternun/ui';
import { ANEK_EXPANDED_FAMILY } from '../theme/fonts';
import type { FormFieldProps } from './FormField.types';

const ERROR_COLOR = '#f87171';

/**
 * Text field with the sign-in look: rounded filled input, the label as placeholder that moves
 * above the text once something is typed, focus border, and an error or hint underneath.
 */
export function FormField({
  label,
  value,
  onChangeText,
  multiline = false,
  editable = true,
  keyboardType = 'default',
  autoCapitalize,
  autoComplete,
  maxLength,
  onSubmitEditing,
  icon,
  error,
  hint,
  testID,
}: FormFieldProps): React.JSX.Element {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;
  const labelAnim = useRef(new Animated.Value(filled ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: filled ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [filled, labelAnim]);

  const borderColor = error ? ERROR_COLOR : focused ? theme.inputBorderFocus : theme.inputBorder;

  return (
    <View style={styles.group}>
      <Animated.Text
        accessibilityElementsHidden
        importantForAccessibility='no'
        style={[
          styles.label,
          { color: error ? ERROR_COLOR : theme.accent },
          {
            opacity: labelAnim,
            transform: [
              { translateY: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
            ],
          },
        ]}
      >
        {label}
      </Animated.Text>
      <View
        style={[
          styles.wrapper,
          multiline && styles.wrapperMultiline,
          { backgroundColor: theme.inputBg, borderColor },
          !editable && styles.disabled,
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          testID={testID}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          multiline={multiline}
          maxLength={maxLength}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={
            autoCapitalize ??
            (keyboardType === 'email-address' || keyboardType === 'url' ? 'none' : 'sentences')
          }
          placeholder={label}
          placeholderTextColor={theme.textPlaceholder}
          style={[styles.input, multiline && styles.inputMultiline, { color: theme.textPrimary }]}
        />
      </View>
      {error ? (
        <Text style={[styles.note, { color: ERROR_COLOR }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.note, { color: theme.textSecondary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 4 },
  label: {
    fontFamily: ANEK_EXPANDED_FAMILY,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  wrapperMultiline: { alignItems: 'flex-start', minHeight: 110 },
  disabled: { opacity: 0.6 },
  icon: { width: 18, alignItems: 'center' },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    paddingVertical: 2,
    paddingHorizontal: 4,
    letterSpacing: 0.3,
  },
  inputMultiline: { minHeight: 84, textAlignVertical: 'top' },
  note: { fontSize: 12.5, lineHeight: 17, marginLeft: 4 },
});
