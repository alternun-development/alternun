import { useEffect } from 'react';
import { useAuth } from '../auth/AppAuthProvider';
import { resolveSessionTokenWithRetry } from '../auth/sessionToken';
import {
  createUserAvatarClient,
  resetUserAvatarState,
  setUserAvatarState,
  socialAvatarUrl,
} from '../../utils/userAvatar';

const RETRY_MS = 1500;

/**
 * Keeps the shared avatar in sync with the session: the social photo of the account and the
 * avatar the person chose. Renders nothing.
 */
export default function UserAvatarSync(): null {
  const { user, loading, client } = useAuth();
  const userId = user?.id ?? null;
  const socialUrl = socialAvatarUrl(user);

  useEffect(() => {
    // Wait for the session to settle: its token is not ready while it loads.
    if (loading) return undefined;
    if (!userId) {
      resetUserAvatarState();
      return undefined;
    }
    setUserAvatarState({ socialUrl });
    let active = true;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const avatars = createUserAvatarClient(() =>
      resolveSessionTokenWithRetry(client, { attempts: 4, retryDelayMs: 250 })
    );
    const load = (retriesLeft: number): void => {
      avatars
        .get()
        .then((saved) => {
          // The session photo comes first; the one kept at sign-in covers sessions without it.
          if (active) {
            setUserAvatarState({ choice: saved.choice, socialUrl: socialUrl ?? saved.socialUrl });
          }
        })
        .catch(() => {
          // The token can arrive a moment late; try again before keeping the default.
          if (active && retriesLeft > 0) retry = setTimeout(() => load(retriesLeft - 1), RETRY_MS);
        });
    };
    load(2);
    return () => {
      active = false;
      if (retry) clearTimeout(retry);
    };
  }, [client, loading, socialUrl, userId]);

  return null;
}
