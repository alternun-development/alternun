import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  parseAdminAuthentikRelayProvider,
  startAdminAuthentikRelaySignIn,
} from '../../auth/authentikRelay';
import { oidcClient } from '../../auth/oidc-client';

export function AuthRelayPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Preparing direct Google sign-in...');
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const provider = parseAdminAuthentikRelayProvider(searchParams.get('provider'));
    if (!provider) {
      void navigate('/login', { replace: true });
      return;
    }

    void startAdminAuthentikRelaySignIn({
      userManager: oidcClient,
      provider,
      returnTo: searchParams.get('next'),
    }).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : 'Google sign-in could not be started.');
    });
  }, [navigate, searchParams]);

  return (
    <div className='auth-stage'>
      <section className='auth-card'>
        <span className='panel-label'>Alternun Admin</span>
        <h1>Redirecting to Google</h1>
        <p>{message}</p>
      </section>
    </div>
  );
}
