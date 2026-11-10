import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { manageStyles } from './styles';
import type { ManageFieldProps } from './ManageField.types';

export function ManageField({
  label,
  value,
  onChange,
  palette,
  multiline = false,
  editable = true,
  testID,
  keyboardType = 'default',
}: ManageFieldProps): React.JSX.Element {
  return (
    <View style={manageStyles.field}>
      <Text style={[manageStyles.label, { color: palette.muted }]}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        editable={editable}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        style={[
          manageStyles.input,
          multiline && manageStyles.multiline,
          { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface },
          !editable && { opacity: 0.6 },
        ]}
      />
    </View>
  );
}
