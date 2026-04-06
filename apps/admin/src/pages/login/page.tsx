import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authProvider } from '../../auth/authProvider';
import { adminEnv } from '../../config/env';

export function LoginPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loginError =
    searchParams.get('error') === 'unauthorized-email-domain'
      ? `Google sign-in is limited to @${adminEnv.allowedEmailDomain} accounts, unless you have an approved admin role.`
      : null;
  const releaseLabel = `v${adminEnv.appVersion} · ${adminEnv.appEnv}`;

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
        <p>
          Use Authentik for the credential step, then operate on the NestJS admin API surfaces with
          bearer tokens.
        </p>

        <div className='auth-methods'>
          <article className='auth-method'>
            <span className='panel-label'>Password Admin</span>
            <h2>Email and password</h2>
            <p>
              Use the hosted Authentik login form for the bootstrap admin or another approved
              internal admin account.
            </p>
          </article>
          <article className='auth-method'>
            <span className='panel-label'>Google Workspace</span>
            <h2>Company Google sign-in</h2>
            <p>
              Google sign-in is accepted only for <strong>@{adminEnv.allowedEmailDomain}</strong>{' '}
              accounts. Other Google accounts are rejected before dashboard access is granted.
            </p>
          </article>
        </div>

        <dl className='auth-facts'>
          <div>
            <dt>API</dt>
            <dd>{adminEnv.apiUrl}</dd>
          </div>
          <div>
            <dt>Issuer</dt>
            <dd>{adminEnv.authIssuer}</dd>
          </div>
          <div>
            <dt>Client</dt>
            <dd>{adminEnv.authClientId}</dd>
          </div>
          <div>
            <dt>Audience</dt>
            <dd>{adminEnv.authAudience}</dd>
          </div>
          <div>
            <dt>Google domain</dt>
            <dd>@{adminEnv.allowedEmailDomain}</dd>
          </div>
        </dl>

        <div className='auth-actions'>
          <button
            className='primary-button'
            type='button'
            onClick={() => {
              void handleLogin('google');
            }}
          >
            Continue with Google
          </button>

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

        <p className='auth-note'>
          Google sign-in now starts from an app-owned relay route so Authentik can hand control
          straight back to the dashboard callback. Password entry still stays on Authentik, and the
          dashboard never handles raw credentials directly.
        </p>

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
          <span className='auth-footer-label'>Deployed release</span>
          <strong>{releaseLabel}</strong>
        </footer>
      </section>
    </div>
  );
}
