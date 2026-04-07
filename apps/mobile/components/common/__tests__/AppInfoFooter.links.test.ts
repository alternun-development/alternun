/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  FOOTER_PRIMARY_LINK_DEFINITIONS,
  resolvePrimaryLinksForViewport,
} from '../AppInfoFooter.links';

describe('AppInfoFooter links parity', () => {
  it('keeps project, documentation, privacy, and terms as footer primary link definitions', () => {
    expect(FOOTER_PRIMARY_LINK_DEFINITIONS).toEqual([
      { labelKey: 'footer.links.project', fallbackLabel: 'Go Alternun.io' },
      { labelKey: 'footer.links.documentation', fallbackLabel: 'Documentacion' },
      { labelKey: 'footer.links.privacy', fallbackLabel: 'Privacidad' },
      { labelKey: 'footer.links.terms', fallbackLabel: 'Términos' },
    ]);
  });

  it('uses the same primary link definitions for desktop, tablet, and mobile in english', () => {
    const desktop = resolvePrimaryLinksForViewport({ isWide: true, isMobile: false }, 'en');
    const tablet = resolvePrimaryLinksForViewport({ isWide: false, isMobile: false }, 'en');
    const mobile = resolvePrimaryLinksForViewport({ isWide: false, isMobile: true }, 'en');

    expect(desktop).toEqual(tablet);
    expect(tablet).toEqual(mobile);
    expect(desktop).toEqual([
      {
        labelKey: 'footer.links.project',
        fallbackLabel: 'Go Alternun.io',
        url: 'https://alternun.io',
      },
      {
        labelKey: 'footer.links.documentation',
        fallbackLabel: 'Documentacion',
        url: 'https://docs.alternun.io/',
      },
      {
        labelKey: 'footer.links.privacy',
        fallbackLabel: 'Privacidad',
        url: 'https://docs.alternun.io/privacy',
      },
      {
        labelKey: 'footer.links.terms',
        fallbackLabel: 'Términos',
        url: 'https://docs.alternun.io/terms',
      },
    ]);
  });

  it('resolves localized documentation URLs by locale', () => {
    const spanish = resolvePrimaryLinksForViewport({ isWide: false, isMobile: true }, 'es');
    const thai = resolvePrimaryLinksForViewport({ isWide: false, isMobile: true }, 'th');

    expect(spanish[1]?.url).toBe('https://docs.alternun.io/es/');
    expect(thai[1]?.url).toBe('https://docs.alternun.io/th/');
  });
});
