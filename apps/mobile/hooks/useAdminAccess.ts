import { useEffect, useState } from 'react';
import { useAuth } from '../components/auth/AppAuthProvider';
import {
  loadRemoteAdminAccess,
  mergeAdminAccess,
  type RemoteAdminAccess,
  type ResolvedAdminAccess,
} from '../utils/adminAccess';

interface AdminAccessAuthContext {
  user: unknown;
  client: { getSessionToken(): Promise<string | null> };
}

/**
 * Admin roles of the signed-in user: the session's own roles plus GET /v1/me/admin-access.
 * Returns null while signed out. Only decides which admin entry points to show; the admin panel
 * authorizes every action again.
 */
export function useAdminAccess(): ResolvedAdminAccess | null {
  const { user, client } = (useAuth as unknown as () => AdminAccessAuthContext)();
  const [remote, setRemote] = useState<RemoteAdminAccess | null>(null);

  useEffect(() => {
    setRemote(null);
    if (!user) return undefined;
    let cancelled = false;
    void client
      .getSessionToken()
      .then((token) => (token ? loadRemoteAdminAccess(token) : null))
      .then((access) => {
        if (!cancelled) setRemote(access);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [client, user]);

  return user ? mergeAdminAccess(user, remote) : null;
}
