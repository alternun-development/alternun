export type HeroLayoutMetrics = {
  heroCopyTop: number;
  heroCopyMaxWidth: number;
  heroHeadlineSize: number;
  heroHeadlineLineHeight: number;
  heroKickerSize: number;
  heroKickerLineHeight: number;
  heroButtonWidth: number | string;
  heroButtonFontSize: number;
};

export function getHeroLayoutMetrics(
  screenWidth: number,
  heroHeight: number,
  isMobile: boolean
): HeroLayoutMetrics {
  const heroCopyTop = isMobile
    ? Math.min(heroHeight * 0.22, 194)
    : Math.min(heroHeight * 0.27, 250);
  const heroCopyMaxWidth = isMobile
    ? Math.min(screenWidth - 40, 620)
    : Math.min(screenWidth * 0.82, 1080);
  const heroHeadlineSize = isMobile
    ? Math.min(Math.max(screenWidth * 0.043, 30), 66)
    : Math.min(Math.max(screenWidth * 0.03, 30), 46);
  const heroHeadlineLineHeight = heroHeadlineSize * 1.08;
  const heroKickerSize = isMobile
    ? Math.min(Math.max(screenWidth * 0.036, 20), 32)
    : Math.min(Math.max(screenWidth * 0.022, 24), 32);
  const heroKickerLineHeight = heroKickerSize * 1.02;
  const heroButtonWidth = isMobile ? '100%' : Math.min(screenWidth * 0.24, 300);
  const heroButtonFontSize = isMobile
    ? Math.min(Math.max(screenWidth * 0.023, 18), 24)
    : Math.min(Math.max(screenWidth * 0.016, 17), 20);

  return {
    heroCopyTop,
    heroCopyMaxWidth,
    heroHeadlineSize,
    heroHeadlineLineHeight,
    heroKickerSize,
    heroKickerLineHeight,
    heroButtonWidth,
    heroButtonFontSize,
  };
}
