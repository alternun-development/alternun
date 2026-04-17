import { DEFAULT_LOCALE, normalizeLocale, type AlternunLocale, } from '@alternun/i18n';

export interface FooterPrimaryLink {
  labelKey: string;
  fallbackLabel: string;
  url: string;
  action?: FooterPrimaryLinkAction;
}

export interface FooterViewport {
  isMobile: boolean;
  isWide: boolean;
}

export type FooterPrimaryLinkAction = 'privacy' | 'terms';

export const FOOTER_PRIMARY_LINK_DEFINITIONS = [
  {
    labelKey: 'footer.links.privacy',
    fallbackLabel: 'Privacy',
    action: 'privacy',
  },
  {
    labelKey: 'footer.links.terms',
    fallbackLabel: 'Terms',
    action: 'terms',
  },
  {
    labelKey: 'footer.links.documentation',
    fallbackLabel: 'Docs',
    action: undefined,
  },
] as const;

function resolveDocumentationUrl(locale: AlternunLocale,): string {
  // Use localhost in development builds, production URLs otherwise.
  const baseUrl =
    process.env.NODE_ENV === 'development' ? 'http://localhost:8083' : 'https://docs.alternun.io';

  if (locale === 'es') {
    return `${baseUrl}/es/`;
  }

  if (locale === 'th') {
    return `${baseUrl}/th/`;
  }

  return `${baseUrl}/`;
}

export function resolvePrimaryLinksForViewport(
  _viewport: FooterViewport,
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  locale: AlternunLocale | string = DEFAULT_LOCALE,
): ReadonlyArray<FooterPrimaryLink> {
  // Keep a single source of truth so desktop/mobile cannot drift.
  const resolvedLocale = normalizeLocale(locale,);

  const docsBaseUrl =
    process.env.NODE_ENV === 'development' ? 'http://localhost:8083' : 'https://docs.alternun.io';

  return [
    {
      labelKey: FOOTER_PRIMARY_LINK_DEFINITIONS[0].labelKey,
      fallbackLabel: FOOTER_PRIMARY_LINK_DEFINITIONS[0].fallbackLabel,
      url: `${docsBaseUrl}/privacy`,
      action: FOOTER_PRIMARY_LINK_DEFINITIONS[0].action,
    },
    {
      labelKey: FOOTER_PRIMARY_LINK_DEFINITIONS[1].labelKey,
      fallbackLabel: FOOTER_PRIMARY_LINK_DEFINITIONS[1].fallbackLabel,
      url: `${docsBaseUrl}/terms`,
      action: FOOTER_PRIMARY_LINK_DEFINITIONS[1].action,
    },
    {
      labelKey: FOOTER_PRIMARY_LINK_DEFINITIONS[2].labelKey,
      fallbackLabel: FOOTER_PRIMARY_LINK_DEFINITIONS[2].fallbackLabel,
      url: resolveDocumentationUrl(resolvedLocale,),
      action: FOOTER_PRIMARY_LINK_DEFINITIONS[2].action,
    },
  ];
}

export function resolvePrimaryLinkPressHandler(
  link: FooterPrimaryLink,
  handlers: Record<FooterPrimaryLinkAction, () => void>,
): (() => void) | undefined {
  if (!link.action) {
    return undefined;
  }

  return handlers[link.action];
}
