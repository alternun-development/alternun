import { ReleaseUpdateToast } from '@alternun/ui';
import { useReleaseUpdate } from '@alternun/update';
import { useMemo } from 'react';
import { Alert, DevSettings } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: currentVersion } = require('../../package.json') as { version: string };

interface ReleaseUpdateBannerProps {
  bottomOffset?: number;
}

export default function ReleaseUpdateBanner({ bottomOffset = 24 }: ReleaseUpdateBannerProps) {
  const state = useReleaseUpdate({
    currentVersion,
    mode: process.env.EXPO_PUBLIC_RELEASE_UPDATE_MODE ?? 'auto',
    appOrigin: process.env.EXPO_PUBLIC_ORIGIN ?? null,
    onReload: () => {
      if (typeof DevSettings.reload === 'function') {
        DevSettings.reload();
        return;
      }

      Alert.alert(
        'Restart required',
        'Please close and reopen the app to pick up the latest changes.'
      );
    },
  });

  const title = useMemo(() => {
    if (!state.remoteVersion) {
      return 'A newer release is ready.';
    }

    return `Release ${state.remoteVersion} is ready.`;
  }, [state.remoteVersion]);

  if (!state.enabled || !state.available) {
    return null;
  }

  return (
    <ReleaseUpdateToast
      eyebrow='Update available'
      title={title}
      message='Reload to pick up the latest changes and assets.'
      laterLabel='Later'
      reloadLabel='Reload app'
      bottomOffset={bottomOffset}
      onLater={state.dismiss}
      onReload={state.reload}
    />
  );
}
