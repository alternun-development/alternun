export interface AdminEntryButtonProps {
  label: string;
  url: string;
  color: string;
  borderColor: string;
  testID?: string;
  openUrl?: (url: string) => Promise<unknown>;
}
