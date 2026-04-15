import { ReleaseUpdateToast, ThemeProvider } from '@alternun/ui';
import { useReleaseUpdate } from '@alternun/update';
import { useAppPreferences } from '../settings/AppPreferencesProvider';
import { useAppTranslation } from '../i18n/useAppTranslation';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: currentVersion } = require('../../package.json') as { version: string };

export default function ReleaseUpdateBanner(): React.JSX.Element | null {
  const { themeMode } = useAppPreferences();
  const { t } = useAppTranslation('mobile');
  const state = useReleaseUpdate({
    currentVersion,
    mode: process.env.EXPO_PUBLIC_RELEASE_UPDATE_MODE ?? 'auto',
  });

  if (!state.enabled || !state.available) {
    return null;
  }

  return (
    <ThemeProvider mode={themeMode}>
      <ReleaseUpdateToast
        eyebrow={t('releaseUpdate.eyebrow', undefined, 'New version available')}
        title={
          state.remoteVersion
            ? t(
                'releaseUpdate.titleReady',
                { version: state.remoteVersion },
                'Version {{version}} is ready.'
              )
            : t('releaseUpdate.titleFallback', undefined, 'A new release is ready.')
        }
        message={
          state.remoteVersion
            ? t(
                'releaseUpdate.messageReady',
                {
                  currentVersion: state.currentVersion,
                  remoteVersion: state.remoteVersion,
                },
                'You are on v{{currentVersion}}. Reload to switch to v{{remoteVersion}}.'
              )
            : t(
                'releaseUpdate.messageFallback',
                undefined,
                'Reload to pick up the latest changes and assets.'
              )
        }
        laterLabel={t('releaseUpdate.later', undefined, 'Later')}
        reloadLabel={t('releaseUpdate.reload', undefined, 'Reload')}
        bottomOffset={72}
        onLater={state.dismiss}
        onReload={state.reload}
      />
    </ThemeProvider>
  );
}
