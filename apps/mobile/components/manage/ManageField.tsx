import React from 'react';
import { FormField } from '../common/FormField';
import type { ManageFieldProps } from './ManageField.types';

/** Field of the manage forms; same look as the sign-in fields (see FormField). */
export function ManageField({
  label,
  value,
  onChange,
  multiline = false,
  editable = true,
  testID,
  keyboardType = 'default',
}: ManageFieldProps): React.JSX.Element {
  return (
    <FormField
      testID={testID}
      label={label}
      value={value}
      onChangeText={onChange}
      multiline={multiline}
      editable={editable}
      keyboardType={keyboardType}
    />
  );
}
