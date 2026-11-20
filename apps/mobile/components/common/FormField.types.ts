import type React from 'react';
import type { TextInputProps } from 'react-native';

export interface FormFieldProps {
  /** Always shown above the field; also the input's accessible name. */
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  editable?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  maxLength?: number;
  onSubmitEditing?: () => void;
  /** Icon on the left, like the sign-in fields. */
  icon?: React.ReactNode;
  /** Error under the field; also tints its border. */
  error?: string | null;
  /** Help under the field when there is no error. */
  hint?: string | null;
  testID?: string;
}
