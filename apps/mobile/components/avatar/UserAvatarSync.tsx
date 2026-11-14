import { useEffect } from 'react';
import { useAuth } from '../auth/AppAuthProvider';
import { resolveSessionTokenWithRetry } from '../auth/sessionToken';
import {
  createUserAvatarClient,
  resetUserAvatarState,
  setUserAvatarState,
  socialAvatarUrl,
} from '../../utils/userAvatar';

/**
 * Keeps the shared avatar in sync with the session: the social photo of the account and the
 * avatar the person chose. Renders nothing.
 */
export default function UserAvatarSync(): null {
  const { user, client } = useAuth();
  const userId = user?.id ?? null;
  const socialUrl = socialAvatarUrl(user);

  useEffect(() => {
    if (!userId) {
      resetUserAvatarState();
      return undefined;
    }
    setUserAvatarState({ socialUrl });
    let active = true;
    createUserAvatarClient(() =>
      resolveSessionTokenWithRetry(client, { attempts: 3, retryDelayMs: 250 })
    )
      .get()
      .then((choice) => {
        if (active) setUserAvatarState({ choice });
      })
      .catch(() => {
        // Without the saved choice the default (photo or initials) is shown.
      });
    return () => {
      active = false;
    };
  }, [client, socialUrl, userId]);

  return null;
}
