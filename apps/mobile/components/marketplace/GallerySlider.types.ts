import type { EnterpriseGalleryImage } from './types';

export interface GallerySliderColors {
  /** Active dot and focus color. */
  accent: string;
  /** Inactive dots. */
  muted: string;
}

export interface GallerySliderProps {
  images: readonly EnterpriseGalleryImage[];
  /** Alt text for a photo without its own. */
  fallbackAlt: string;
  colors: GallerySliderColors;
  /** Off when the person turned animations off: no zoom on the photo in focus. */
  animated?: boolean;
  /** Accessible labels: previous and next arrows, and "photo {{index}} of {{total}}". */
  labels: { previous: string; next: string; photo: (index: number, total: number) => string };
}
