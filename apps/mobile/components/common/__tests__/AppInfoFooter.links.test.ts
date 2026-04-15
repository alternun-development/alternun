/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  FOOTER_PRIMARY_LINK_DEFINITIONS,
  resolvePrimaryLinkPressHandler,
  resolvePrimaryLinksForViewport,
} from '../AppInfoFooter.links';

describe('AppInfoFooter links parity', () => {
  it('keeps privacy, terms, and documentation as footer primary link definitions', () => {
    expect(FOOTER_PRIMARY_LINK_DEFINITIONS).toEqual([
      { labelKey: 'footer.links.privacy', fallbackLabel: 'Privacy', action: 'privacy' },
      { labelKey: 'footer.links.terms', fallbackLabel: 'Terms', action: 'terms' },
      { labelKey: 'footer.links.documentation', fallbackLabel: 'Docs' },
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
        labelKey: 'footer.links.privacy',
        fallbackLabel: 'Privacy',
        url: 'https://docs.alternun.io/privacy',
        action: 'privacy',
      },
      {
        labelKey: 'footer.links.terms',
        fallbackLabel: 'Terms',
        url: 'https://docs.alternun.io/terms',
        action: 'terms',
      },
      {
        labelKey: 'footer.links.documentation',
        fallbackLabel: 'Docs',
        url: 'https://docs.alternun.io/',
        action: undefined,
      },
    ]);
  });

  it('routes privacy and terms through drawers while leaving documentation external', () => {
    const desktop = resolvePrimaryLinksForViewport({ isWide: true, isMobile: false }, 'en');
    const handlers = {
      privacy: () => undefined,
      terms: () => undefined,
    };

    expect(resolvePrimaryLinkPressHandler(desktop[0], handlers)).toBe(handlers.privacy);
    expect(resolvePrimaryLinkPressHandler(desktop[1], handlers)).toBe(handlers.terms);
    expect(resolvePrimaryLinkPressHandler(desktop[2], handlers)).toBeUndefined();
  });

  it('resolves localized documentation URLs by locale', () => {
    const spanish = resolvePrimaryLinksForViewport({ isWide: false, isMobile: true }, 'es');
    const thai = resolvePrimaryLinksForViewport({ isWide: false, isMobile: true }, 'th');

    expect(spanish[2]?.url).toBe('https://docs.alternun.io/es/');
    expect(thai[2]?.url).toBe('https://docs.alternun.io/th/');
  });
});
