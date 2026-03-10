import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { canAccessAdminDashboard, oidcClient } from '../../auth/oidc-client';

export function AuthCallbackPage(): JSX.Element {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finalizing admin session...');

  useEffect(() => {
    let cancelled = false;

    void oidcClient
      .signinRedirectCallback()
      .then(async user => {
        if (cancelled) {
          return;
        }

        if (!canAccessAdminDashboard(user)) {
          await oidcClient.removeUser();
          void navigate('/login?error=unauthorized-email-domain', { replace: true });
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
