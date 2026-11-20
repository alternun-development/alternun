export interface ColorPalette {
  bg: string;
  cardBg: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
}

export type TokenStatus = 'Free' | 'Deposited' | 'Consumed';

export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
