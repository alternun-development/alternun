// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const AIRS_VIDEO_EN = require('../../assets/videos/AIRS-intro-videoplayback-EN.mp4');
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const AIRS_VIDEO_ES = require('../../assets/videos/AIRS-intro-videoplayback-ES.mp4');

export function resolveLocalAssetUri(assetModule: unknown): string {
  if (typeof assetModule === 'string') {
    return assetModule;
  }

  if (assetModule && typeof assetModule === 'object') {
    const source = assetModule as {
      uri?: unknown;
      src?: unknown;
      default?: unknown;
    };

    if (typeof source.uri === 'string') {
      return source.uri;
    }

    if (typeof source.src === 'string') {
      return source.src;
    }

    if (typeof source.default === 'string') {
      return source.default;
    }

    if (source.default && typeof source.default === 'object') {
      const defaultSource = source.default as { uri?: unknown; src?: unknown };
      if (typeof defaultSource.uri === 'string') {
        return defaultSource.uri;
      }
      if (typeof defaultSource.src === 'string') {
        return defaultSource.src;
      }
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
    const resolver = require('react-native/Libraries/Image/resolveAssetSource').default as (
      source: unknown
    ) => { uri?: string } | null;
    return resolver(assetModule)?.uri ?? '';
  } catch {
    return '';
  }
}

export function getAirsIntroVideoUrl(language: string): string {
  return resolveLocalAssetUri(language === 'es' ? AIRS_VIDEO_ES : AIRS_VIDEO_EN);
}
