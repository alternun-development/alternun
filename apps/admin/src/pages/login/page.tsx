import { authProvider } from '../../auth/authProvider';
import { adminEnv } from '../../config/env';

export function LoginPage() {
  return (
    <div className='auth-stage'>
      <section className='auth-card'>
        <span className='panel-label'>Alternun Admin</span>
        <h1>Operator sign in</h1>
        <p>
          Authenticate through Authentik, then operate on the NestJS admin API surfaces with bearer
          tokens.
        </p>

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
        </dl>

        <button
          className='primary-button'
          type='button'
          onClick={() => {
            void authProvider.login({});
          }}
        >
          Continue with Authentik
        </button>
      </section>
    </div>
  );
}
