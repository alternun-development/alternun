import { useEffect, useState } from 'react';
import { useAuth } from '../components/auth/AppAuthProvider';
import { createAirsReviewClient } from '../utils/airsReports';

interface AirsReviewAuthContext {
  user: unknown;
  client: { getSessionToken(): Promise<string | null> };
}

/**
 * Whether the signed-in person approves Airs in review (GET /v1/me/airs-reports/access).
 * Only decides whether to show the entry point; the API authorizes every action again.
 */
export function useAirsReviewAccess(): boolean {
  const { user, client } = (useAuth as unknown as () => AirsReviewAuthContext)();
  const [canApprove, setCanApprove] = useState(false);

  useEffect(() => {
    setCanApprove(false);
    if (!user) return undefined;
    let cancelled = false;
    void createAirsReviewClient(() => client.getSessionToken())
      .access()
      .then((access) => {
        if (!cancelled) setCanApprove(access.canApprove === true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [client, user]);

  return canApprove;
}
