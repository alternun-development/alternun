import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authProvider } from '../../auth/authProvider';
import { adminEnv } from '../../config/env';

export function LoginPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loginError =
    searchParams.get('error') === 'unauthorized-admin'
      ? 'Your Authentik account is not assigned to an approved Alternun admin group.'
      : null;
  // People signing in only need the version; endpoints, issuer and stage stay out of the screen.
  const releaseLabel = `v${adminEnv.appVersion}`;

  async function handleLogin(provider: 'google' | 'password'): Promise<void> {
    setErrorMessage(null);

    try {
      await authProvider.login({ provider });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : provider === 'google'
          ? 'Google sign-in could not be started.'
          : 'Authentik sign-in could not be started.'
      );
    }
  }

  return (
    <div className='auth-stage'>
      <section className='auth-card'>
        <span className='panel-label'>Alternun Admin</span>
        <h1>Operator sign in</h1>
        <p>Sign in with your Alternun account. Access is only for invited operators and allies.</p>

        <div className='auth-methods'>
          {adminEnv.authGoogleEnabled ? (
            <article className='auth-method'>
              <span className='panel-label'>Password Admin</span>
              <h2>Email and password</h2>
              <p>
                Use the hosted Authentik login form for invited internal operators and approved
                partner accounts.
              </p>
            </article>
          ) : null}
          <article className='auth-method'>
            <span className='panel-label'>Hosted Identity</span>
            <h2>Company or partner sign-in</h2>
            <p>
              Access is invitation-only. Internal operators and approved allies must be assigned to
              the correct Authentik admin group before this panel will open.
            </p>
          </article>
        </div>

        <div className='auth-actions'>
          {adminEnv.authGoogleEnabled ? (
            <button
              className='primary-button'
              type='button'
              onClick={() => {
                void handleLogin('google');
              }}
            >
              Continue with Google
            </button>
          ) : null}

          <button
            className='secondary-button'
            type='button'
            onClick={() => {
              void handleLogin('password');
            }}
          >
            Use email and password
          </button>
        </div>

        {loginError ? (
          <p className='error-text' role='alert'>
            {loginError}
          </p>
        ) : null}
        {errorMessage ? (
          <p className='error-text' role='alert'>
            {errorMessage}
          </p>
        ) : null}

        <footer className='auth-footer' aria-label='deployment version'>
          <span className='auth-footer-label'>Version</span>
          <strong>{releaseLabel}</strong>
        </footer>
      </section>
    </div>
  );
}
