import { DEFAULT_LOCALE, normalizeLocale, type AlternunLocale } from '@alternun/i18n';

export interface FooterPrimaryLink {
  labelKey: string;
  fallbackLabel: string;
  url: string;
}

export interface FooterViewport {
  isMobile: boolean;
  isWide: boolean;
}

export const FOOTER_PRIMARY_LINK_DEFINITIONS = [
  {
    labelKey: 'footer.links.project',
    fallbackLabel: 'Go Alternun.io',
  },
  {
    labelKey: 'footer.links.documentation',
    fallbackLabel: 'Documentacion',
  },
  {
    labelKey: 'footer.links.privacy',
    fallbackLabel: 'Privacidad',
  },
  {
    labelKey: 'footer.links.terms',
    fallbackLabel: 'Términos',
  },
] as const;

function resolveDocumentationUrl(locale: AlternunLocale): string {
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
  locale: AlternunLocale | string = DEFAULT_LOCALE
): ReadonlyArray<FooterPrimaryLink> {
  // Keep a single source of truth so desktop/mobile cannot drift.
  const resolvedLocale = normalizeLocale(locale);

  const projectUrl =
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://alternun.io';

  const docsBaseUrl =
    process.env.NODE_ENV === 'development' ? 'http://localhost:8083' : 'https://docs.alternun.io';

  return [
    {
      labelKey: FOOTER_PRIMARY_LINK_DEFINITIONS[0].labelKey,
      fallbackLabel: FOOTER_PRIMARY_LINK_DEFINITIONS[0].fallbackLabel,
      url: projectUrl,
    },
    {
      labelKey: FOOTER_PRIMARY_LINK_DEFINITIONS[1].labelKey,
      fallbackLabel: FOOTER_PRIMARY_LINK_DEFINITIONS[1].fallbackLabel,
      url: resolveDocumentationUrl(resolvedLocale),
    },
    {
      labelKey: FOOTER_PRIMARY_LINK_DEFINITIONS[2].labelKey,
      fallbackLabel: FOOTER_PRIMARY_LINK_DEFINITIONS[2].fallbackLabel,
      url: `${docsBaseUrl}/privacy`,
    },
    {
      labelKey: FOOTER_PRIMARY_LINK_DEFINITIONS[3].labelKey,
      fallbackLabel: FOOTER_PRIMARY_LINK_DEFINITIONS[3].fallbackLabel,
      url: `${docsBaseUrl}/terms`,
    },
  ];
}
