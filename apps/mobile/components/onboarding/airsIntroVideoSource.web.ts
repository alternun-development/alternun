import AIRS_VIDEO_EN from '../../assets/videos/AIRS-intro-videoplayback-EN.mp4';
import AIRS_VIDEO_ES from '../../assets/videos/AIRS-intro-videoplayback-ES.mp4';

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

  return '';
}

export function getAirsIntroVideoUrl(language: string): string {
  const envUrl =
    language === 'es'
      ? process.env.EXPO_PUBLIC_AIRS_VIDEO_ES_URL
      : process.env.EXPO_PUBLIC_AIRS_VIDEO_EN_URL;

  if (envUrl) {
    return envUrl;
  }

  return resolveLocalAssetUri(language === 'es' ? AIRS_VIDEO_ES : AIRS_VIDEO_EN);
}
