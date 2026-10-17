import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../../components/common/ScreenShell';
import { useAppTranslation } from '../../../components/i18n/useAppTranslation';
import { useAppPreferences } from '../../../components/settings/AppPreferencesProvider';
import { MarketplaceEnterpriseDetailView } from '../../../components/marketplace/MarketplaceEnterpriseDetail';
import type { DetailPalette } from '../../../components/marketplace/MarketplaceProjectDetail';

export default function MarketplaceEnterpriseDetailScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const { language, themeMode } = useAppPreferences();
  const { t } = useAppTranslation('mobile');
  const slug = Array.isArray(params.slug) ? params.slug[0] ?? '' : params.slug ?? '';
  const palette: DetailPalette =
    themeMode === 'dark'
      ? {
          background: '#06130f',
          surface: '#0b211a',
          border: 'rgba(194, 255, 222, 0.13)',
          text: '#ecfff4',
          muted: 'rgba(221, 247, 230, 0.62)',
          primary: '#1ee6b5',
          primaryDeep: '#0a4c40',
          mist: 'rgba(30, 230, 181, 0.13)',
        }
      : {
          background: '#f5f2e9',
          surface: '#fffdf7',
          border: 'rgba(20, 75, 55, 0.14)',
          text: '#153d32',
          muted: 'rgba(21, 61, 50, 0.62)',
          primary: '#087f63',
          primaryDeep: '#075440',
          mist: 'rgba(8, 127, 99, 0.11)',
        };

  return (
    <ScreenShell activeSection='explorar' backgroundColor={palette.background}>
      <MarketplaceEnterpriseDetailView
        slug={slug}
        locale={language}
        palette={palette}
        t={t}
        onBack={() => router.back()}
        onOpenProject={(projectSlug) =>
          router.push({ pathname: '/explorar/[slug]', params: { slug: projectSlug } })
        }
      />
    </ScreenShell>
  );
}
