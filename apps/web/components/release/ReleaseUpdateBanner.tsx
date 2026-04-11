'use client';

import { ReleaseUpdateToast, ThemeProvider as UiThemeProvider } from '@alternun/ui';
import { useReleaseUpdate } from '@alternun/update';
import { useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: currentVersion } = require('../../package.json') as { version: string };

export default function ReleaseUpdateBanner() {
  const { resolvedTheme, mounted } = useTheme();
  const state = useReleaseUpdate({
    currentVersion,
    mode: process.env.NEXT_PUBLIC_RELEASE_UPDATE_MODE ?? 'auto',
  });

  const title = useMemo(() => {
    if (!state.remoteVersion) {
      return 'A newer release is ready.';
    }

    return `Release ${state.remoteVersion} is ready.`;
  }, [state.remoteVersion]);

  if (!mounted || !state.enabled || !state.available) {
    return null;
  }

  return (
    <UiThemeProvider mode={resolvedTheme}>
      <ReleaseUpdateToast
        eyebrow='Update available'
        title={title}
        message='Reload to pick up the latest changes and assets.'
        laterLabel='Later'
        reloadLabel='Reload'
        bottomOffset={16}
        onLater={state.dismiss}
        onReload={state.reload}
      />
    </UiThemeProvider>
  );
}
