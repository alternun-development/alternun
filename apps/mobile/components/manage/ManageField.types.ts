import type { DetailPalette } from '../marketplace/types';

export interface ManageFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  palette: DetailPalette;
  multiline?: boolean;
  editable?: boolean;
  testID?: string;
  keyboardType?: 'default' | 'email-address';
}
