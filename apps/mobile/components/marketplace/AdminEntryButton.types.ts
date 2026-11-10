export interface AdminEntryButtonProps {
  label: string;
  url: string;
  color: string;
  borderColor: string;
  testID?: string;
  openUrl?: (url: string) => Promise<unknown>;
  /** Anchored to the top-right corner of its card, over the card content. */
  floating?: boolean;
  /** Background, used when floating so it stays readable over banners. */
  backgroundColor?: string;
}
