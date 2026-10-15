import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../components/common/ScreenShell';
import { useAuth } from '../../components/auth/AppAuthProvider';
import { useAppTranslation } from '../../components/i18n/useAppTranslation';
import { useAppPreferences } from '../../components/settings/AppPreferencesProvider';
import {
  MarketplaceProjectDetailView,
  type DetailPalette,
} from '../../components/marketplace/MarketplaceProjectDetail';

interface MarketplaceAuthContext {
  user: unknown;
  client: { getSessionToken(): Promise<string | null> };
}

export default function MarketplaceProjectDetailScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const { user, client } = (useAuth as unknown as () => MarketplaceAuthContext)();
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
      <MarketplaceProjectDetailView
        slug={slug}
        locale={language}
        palette={palette}
        t={t}
        onBack={() => router.back()}
        signedIn={Boolean(user)}
        getSessionToken={() => client.getSessionToken()}
        onSignIn={() =>
          router.push({
            pathname: '/auth',
            params: { next: `/explorar/${slug}` },
          })
        }
      />
    </ScreenShell>
  );
}
