import React from 'react';
import { useTheme } from '@alternun/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../../components/common/ScreenShell';
import { useAppTranslation } from '../../../components/i18n/useAppTranslation';
import { useAppPreferences } from '../../../components/settings/AppPreferencesProvider';
import { MarketplaceEnterpriseDetailView } from '../../../components/marketplace/MarketplaceEnterpriseDetail';
import type { DetailPalette } from '../../../components/marketplace/types';
import { useAdminAccess } from '../../../hooks/useAdminAccess';

export default function MarketplaceEnterpriseDetailScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const adminAccess = useAdminAccess();
  const { language, themeMode } = useAppPreferences();
  const { t } = useAppTranslation('mobile');
  const slug = Array.isArray(params.slug) ? params.slug[0] ?? '' : params.slug ?? '';
  const { theme } = useTheme();
  const basePalette: DetailPalette =
    themeMode === 'dark'
      ? {
          background: '#050f0c',
          surface: 'rgba(255, 255, 255, 0.04)',
          border: 'rgba(255, 255, 255, 0.08)',
          text: '#e8fff6',
          muted: 'rgba(232, 255, 246, 0.6)',
          primary: '#1ee6b5',
          primaryDeep: '#7ff3d6',
          fill: 'rgba(30, 230, 181, 0.14)',
          mist: 'rgba(30, 230, 181, 0.13)',
        }
      : {
          background: '#f0fdf9',
          surface: 'rgba(255, 255, 255, 0.85)',
          border: 'rgba(11, 90, 95, 0.12)',
          text: '#0b2d31',
          muted: 'rgba(11, 45, 49, 0.6)',
          primary: '#0d9488',
          primaryDeep: '#0b5a5f',
          fill: '#0f766e',
          mist: 'rgba(8, 127, 99, 0.11)',
        };
  // Cards use the shared theme surfaces, like the profile and dashboard sections.
  const palette: DetailPalette = {
    ...basePalette,
    surface: theme.cardBg,
    border: theme.cardBorder,
  };

  return (
    <ScreenShell activeSection='explore' backgroundColor={palette.background}>
      <MarketplaceEnterpriseDetailView
        slug={slug}
        locale={language}
        palette={palette}
        t={t}
        onBack={() => router.back()}
        adminAccess={adminAccess}
        onManageEnterprise={(enterpriseId) =>
          router.push({ pathname: '/manage/enterprise/[enterpriseId]', params: { enterpriseId } })
        }
        onOpenProject={(projectSlug) =>
          router.push({ pathname: '/explore/[slug]', params: { slug: projectSlug } })
        }
      />
    </ScreenShell>
  );
}
