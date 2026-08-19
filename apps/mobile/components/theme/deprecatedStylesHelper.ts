import { Platform } from 'react-native';

interface ShadowStyle {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

interface BoxShadowStyle {
  boxShadow?: string;
}

interface PointerEventsStyle {
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
}

interface DeprecatedStyle extends ShadowStyle, PointerEventsStyle {
  [key: string]: unknown;
}

interface ConvertedStyle extends BoxShadowStyle {
  [key: string]: unknown;
}

function withShadowOpacity(color: string, opacity: number): string {
  const normalizedOpacity = Math.max(0, Math.min(1, opacity));
  const hex = color.trim().replace('#', '');

  if (/^[\da-f]{3}$/i.test(hex) || /^[\da-f]{6}$/i.test(hex)) {
    const expanded =
      hex.length === 3
        ? hex
            .split('')
            .map((component) => component.repeat(2))
            .join('')
        : hex;
    const red = Number.parseInt(expanded.slice(0, 2), 16);
    const green = Number.parseInt(expanded.slice(2, 4), 16);
    const blue = Number.parseInt(expanded.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${normalizedOpacity})`;
  }

  const rgb = color.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
  if (rgb) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${normalizedOpacity})`;
  }

  const rgba = color.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*[\d.]+\s*\)$/i);
  if (rgba) {
    return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${normalizedOpacity})`;
  }

  // Preserve a valid CSS color even when it cannot be safely converted to rgba.
  return color;
}

/**
 * Converts deprecated shadow style props to boxShadow for web platforms.
 * Keeps native shadow props for iOS/Android.
 */
export function convertShadowStyle(style: DeprecatedStyle): ConvertedStyle {
  if (Platform.OS !== 'web') {
    return style;
  }

  const { shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation, ...rest } = style;

  // Only convert if shadow props are provided
  if (!shadowColor && elevation === undefined) {
    return rest;
  }

  const color = shadowColor ?? '#000';
  const opacity = shadowOpacity ?? 0.3;
  const offsetX = shadowOffset?.width ?? 0;
  const offsetY = shadowOffset?.height ?? 0;
  const radius = shadowRadius ?? 4;

  return {
    ...rest,
    boxShadow: `${offsetX}px ${offsetY}px ${radius}px 0px ${withShadowOpacity(color, opacity)}`,
  };
}

/**
 * Converts pointerEvents style prop to the correct format.
 * Handles both direct prop and style object usage.
 */
export function convertPointerEventsStyle(style: {
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  [key: string]: unknown;
}): ConvertedStyle {
  if (Platform.OS !== 'web') {
    return style;
  }

  const { pointerEvents, ...rest } = style;

  if (!pointerEvents) {
    return rest;
  }

  // Map React Native pointerEvents values to CSS equivalents
  const pointerEventsMap: Record<string, string> = {
    auto: 'auto',
    none: 'none',
    'box-none': 'none',
    'box-only': 'auto',
  };

  return {
    ...rest,
    pointerEvents: pointerEventsMap[pointerEvents] ?? 'auto',
  };
}

/**
 * Converts both shadow and pointerEvents styles.
 * Use this as a one-stop utility for fixing deprecated style props.
 */
export function convertDeprecatedStyles(style: DeprecatedStyle): ConvertedStyle {
  let converted = convertShadowStyle(style);
  converted = convertPointerEventsStyle(converted);
  return converted;
}

/**
 * Helper to create shadow styles that work on both native and web.
 * Pass shadow props and this will handle the conversion automatically.
 */
export function createShadowStyle(config: {
  color?: string;
  offsetX?: number;
  offsetY?: number;
  opacity?: number;
  radius?: number;
  elevation?: number;
}): ShadowStyle & BoxShadowStyle {
  const color = config.color ?? '#000';
  const offsetX = config.offsetX ?? 0;
  const offsetY = config.offsetY ?? 2;
  const opacity = config.opacity ?? 0.3;
  const radius = config.radius ?? 4;
  const elevation = config.elevation ?? 3;

  if (Platform.OS === 'web') {
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px 0px ${withShadowOpacity(color, opacity)}`,
    };
  }

  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}
