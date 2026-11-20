import { useState } from 'react';
import { useMachine } from '@xstate/react';
import { createShareMachine } from './shareMachine';
import { defaultShareServices } from './shareTargets';
import type { ShareContent, ShareServices, SocialPlatform } from './share.types';

/** Runs the share machine for one piece of content (remount with a new key to change it). */
export function useShare(content: ShareContent, services?: Partial<ShareServices>) {
  // Services are fixed for the life of the component.
  const [machine] = useState(() => createShareMachine({ ...defaultShareServices, ...services }));
  const [state, send] = useMachine(machine, { input: { content } });
  const busy = !state.matches('idle');
  return {
    busy,
    preparing: state.matches('preparing'),
    copied: state.matches({ idle: 'copied' }),
    imageStatus: state.context.imageStatus,
    notice: state.context.notice,
    share: () => send({ type: 'SHARE' }),
    copy: () => send({ type: 'COPY' }),
    download: () => send({ type: 'DOWNLOAD' }),
    social: (platform: SocialPlatform) => send({ type: 'SOCIAL', platform }),
    dismiss: () => send({ type: 'DISMISS' }),
  };
}
