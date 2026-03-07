const AIRS_VIDEO_EN_URL = process.env.EXPO_PUBLIC_AIRS_VIDEO_EN_URL ?? '';
const AIRS_VIDEO_ES_URL = process.env.EXPO_PUBLIC_AIRS_VIDEO_ES_URL ?? AIRS_VIDEO_EN_URL;

export function getAirsIntroVideoUrl(language: string,): string {
  return language === 'es' ? AIRS_VIDEO_ES_URL : AIRS_VIDEO_EN_URL;
}
