import { DEFAULT_LOCALE, normalizeLocale, type AlternunLocale, } from '@alternun/i18n';

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
    fallbackLabel: 'El Proyecto',
  },
  {
    labelKey: 'footer.links.documentation',
    fallbackLabel: 'Documentacion',
  },
] as const;

function resolveDocumentationUrl(locale: AlternunLocale,): string {
  if (locale === 'es') {
    return 'https://docs.alternun.io/es/';
  }

  if (locale === 'th') {
    return 'https://docs.alternun.io/th/';
  }

  return 'https://docs.alternun.io/';
}

export function resolvePrimaryLinksForViewport(
  _viewport: FooterViewport,
  locale: AlternunLocale | string = DEFAULT_LOCALE,
): ReadonlyArray<FooterPrimaryLink> {
  // Keep a single source of truth so desktop/mobile cannot drift.
  const resolvedLocale = normalizeLocale(locale,);

  return [
    {
      labelKey: FOOTER_PRIMARY_LINK_DEFINITIONS[0].labelKey,
      fallbackLabel: FOOTER_PRIMARY_LINK_DEFINITIONS[0].fallbackLabel,
      url: 'https://alternun.io',
    },
    {
      labelKey: FOOTER_PRIMARY_LINK_DEFINITIONS[1].labelKey,
      fallbackLabel: FOOTER_PRIMARY_LINK_DEFINITIONS[1].fallbackLabel,
      url: resolveDocumentationUrl(resolvedLocale,),
    },
  ];
}
