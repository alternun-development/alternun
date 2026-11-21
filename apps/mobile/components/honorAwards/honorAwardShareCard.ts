import { Asset } from 'expo-asset';
import { Platform, type ImageSourcePropType } from 'react-native';
import type { HonorCardContext, HonorShareCard, HonorShareCardLine } from './honorAwards.types';

/**
 * The image a legacy medal is shared with, drawn on the device: the medal with its mission and
 * the person's name, laid out like the milestone share images (1080 × 1080, dark card, gold
 * frame). Every line shrinks, then ends in "…", to fit the card.
 */

export const HONOR_SHARE_CARD_SIZE = 1080;
/** Widest a line of text may be, inside the frame. */
export const HONOR_SHARE_CARD_TEXT_WIDTH = 920;

const COLORS = {
  background: '#071d19',
  frame: '#b5985e',
  mint: '#18d9ac',
  cream: '#f3e8cf',
  muted: '#a9c7bd',
} as const;
const FRAME = { inset: 25, radius: 60 } as const;
const MEDAL_BOX = { x: 280, y: 160, width: 520, height: 484 } as const;
const FONTS = ['Sculpin-Bold', 'Sculpin-Medium'] as const;

const LINES: readonly HonorShareCardLine[] = [
  {
    field: 'brand',
    font: 'Sculpin-Bold',
    size: 34,
    minSize: 20,
    baseline: 128,
    color: COLORS.mint,
  },
  {
    field: 'title',
    font: 'Sculpin-Bold',
    size: 76,
    minSize: 40,
    baseline: 726,
    color: COLORS.cream,
  },
  {
    field: 'detail',
    font: 'Sculpin-Medium',
    size: 34,
    minSize: 22,
    baseline: 786,
    color: COLORS.mint,
  },
  {
    field: 'holder',
    font: 'Sculpin-Bold',
    size: 52,
    minSize: 26,
    baseline: 870,
    color: COLORS.cream,
  },
  {
    field: 'site',
    font: 'Sculpin-Medium',
    size: 30,
    minSize: 20,
    baseline: 974,
    color: COLORS.muted,
  },
];

/** The canvas calls the card uses (a 2D context, or a fake one in tests). */
export function honorShareCardFont(family: string, size: number): string {
  return `${size}px "${family}", sans-serif`;
}

/**
 * The largest size from `maxSize` down to `minSize` at which the text fits `maxWidth`; if it
 * still does not fit, the text is cut and ends in "…".
 */
export function fitCardText(
  measure: (text: string, size: number) => number,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number
): { text: string; size: number } {
  let size = maxSize;
  while (size > minSize && measure(text, size) > maxWidth) size -= 1;
  let fitted = text;
  while (Array.from(fitted).length > 1 && measure(fitted, size) > maxWidth) {
    const chars = Array.from(fitted.replace(/…$/, ''));
    fitted = `${chars.slice(0, -1).join('').trimEnd()}…`;
  }
  return { text: fitted, size };
}

function roundedRect(
  context: HonorCardContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

/** Draws the card; without a medal image its place stays empty. */
export function drawHonorShareCard(
  context: HonorCardContext,
  card: HonorShareCard,
  medal: HTMLImageElement | null
): void {
  const size = HONOR_SHARE_CARD_SIZE;
  context.fillStyle = COLORS.background;
  context.fillRect(0, 0, size, size);
  roundedRect(
    context,
    FRAME.inset,
    FRAME.inset,
    size - FRAME.inset * 2,
    size - FRAME.inset * 2,
    FRAME.radius
  );
  context.strokeStyle = COLORS.frame;
  context.lineWidth = 2;
  context.stroke();

  const medalWidth = medal ? medal.naturalWidth || medal.width : 0;
  const medalHeight = medal ? medal.naturalHeight || medal.height : 0;
  if (medal && medalWidth > 0 && medalHeight > 0) {
    const scale = Math.min(MEDAL_BOX.width / medalWidth, MEDAL_BOX.height / medalHeight);
    const width = medalWidth * scale;
    const height = medalHeight * scale;
    context.drawImage(
      medal,
      MEDAL_BOX.x + (MEDAL_BOX.width - width) / 2,
      MEDAL_BOX.y + (MEDAL_BOX.height - height) / 2,
      width,
      height
    );
  }

  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  for (const line of LINES) {
    const text = card[line.field].trim();
    if (!text) continue;
    const fitted = fitCardText(
      (value, px) => {
        context.font = honorShareCardFont(line.font, px);
        return context.measureText(value).width;
      },
      text,
      HONOR_SHARE_CARD_TEXT_WIDTH,
      line.size,
      line.minSize
    );
    context.font = honorShareCardFont(line.font, fitted.size);
    context.fillStyle = line.color;
    context.fillText(fitted.text, size / 2, line.baseline);
  }
}

/** The card can be drawn where there is a document with a canvas (the web app). */
export function canDrawHonorShareCard(): boolean {
  return Platform.OS === 'web' && typeof document !== 'undefined';
}

function imageUri(source: ImageSourcePropType | string): string | null {
  if (typeof source === 'string') return source;
  if (source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source) {
    return source.uri ?? null;
  }
  return typeof source === 'number' ? Asset.fromModule(source).uri : null;
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    // Images from another origin load only with CORS, so they never block the export.
    image.crossOrigin = 'anonymous';
    image.onload = (): void => resolve(image);
    image.onerror = (): void => reject(new Error('Medal image unavailable'));
    image.src = uri;
  });
}

/** The first medal image that loads, or none. */
async function loadMedal(
  sources: ReadonlyArray<ImageSourcePropType | string>
): Promise<HTMLImageElement | null> {
  for (const source of sources) {
    const uri = imageUri(source);
    if (!uri) continue;
    try {
      return await loadImage(uri);
    } catch {
      // Try the next one.
    }
  }
  return null;
}

/** Draws the card on a canvas and returns it as a PNG data URI (web only). */
export async function renderHonorShareCard(
  card: HonorShareCard,
  medals: ReadonlyArray<ImageSourcePropType | string>
): Promise<string> {
  if (!canDrawHonorShareCard()) throw new Error('Share card unavailable');
  const canvas = document.createElement('canvas');
  canvas.width = HONOR_SHARE_CARD_SIZE;
  canvas.height = HONOR_SHARE_CARD_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  // The app fonts are registered on the page; wait for them so the text is not drawn in another.
  const fonts = document.fonts as FontFaceSet | undefined;
  if (fonts && typeof fonts.load === 'function') {
    await Promise.all(
      FONTS.map((family) => fonts.load(honorShareCardFont(family, 48)).catch(() => []))
    );
  }
  drawHonorShareCard(context, card, await loadMedal(medals));
  return canvas.toDataURL('image/png');
}
