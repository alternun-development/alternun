export type AirsTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface TierSpec {
  label: string;
  /** Primary foreground colour for text/dot */
  color: string;
  /** Semi-transparent badge border / progress track overlay */
  trackColor: string;
  min: number;
  max: number | null;
  next: AirsTier | null;
  nextLabel: string | null;
}
