import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { canAccessAdminDashboard, oidcClient } from '../../auth/oidc-client';

// React development Strict Mode re-runs effects. An authorization code can be
// redeemed exactly once, so both effect executions must await the same request.
const callbackOperations = new Map<string, ReturnType<typeof oidcClient.signinRedirectCallback>>();

function redeemSigninCallbackOnce(): ReturnType<typeof oidcClient.signinRedirectCallback> {
  const callbackUrl = typeof window === 'undefined' ? '' : window.location.href;
  const existing = callbackOperations.get(callbackUrl);
  if (existing) {
    return existing;
  }

  const operation = oidcClient.signinRedirectCallback();
  callbackOperations.set(callbackUrl, operation);
  return operation;
}

export function AuthCallbackPage(): JSX.Element {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finalizing admin session...');

  useEffect(() => {
    let cancelled = false;

    void redeemSigninCallbackOnce()
      .then(async (user) => {
        if (cancelled) {
          return;
        }

        if (!canAccessAdminDashboard(user)) {
          await oidcClient.removeUser();
          const origin =
            typeof window === 'undefined' ? 'http://localhost:4173' : window.location.origin;

          await oidcClient.signoutRedirect({
            post_logout_redirect_uri: `${origin}/login?error=unauthorized-admin`,
          });
          return;
        }

        const returnTo =
          typeof user.state === 'object' &&
          user.state !== null &&
          'returnTo' in user.state &&
          typeof user.state.returnTo === 'string'
            ? user.state.returnTo
            : '/dashboard';

        void navigate(returnTo, { replace: true });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setMessage(error instanceof Error ? error.message : 'Authentication callback failed.');
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className='auth-stage'>
      <section className='auth-card'>
        <span className='panel-label'>Authentik callback</span>
        <h1>Signing you in</h1>
        <p>{message}</p>
      </section>
    </div>
  );
}
