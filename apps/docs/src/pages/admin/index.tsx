import { useEffect, useState, type JSX } from 'react';
import { buildDecapConfig } from '../../cms/decap-config';
import {
  canAccessCms,
  createDocsCmsUserManager,
  extractCmsIdentity,
  getActiveCmsSession,
} from '../../cms/auth';
import { buildDocsCmsAuthentikRelayPath } from '../../cms/authRelay';
import { useDocsCmsConfig } from '../../cms/site-config';
import type { CmsWindow } from '../../cms/types';
import styles from './styles.module.css';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

const DECAP_SCRIPT_ID = 'alternun-decap-cms';
const DECAP_SCRIPT_SRC = 'https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js';

function loadDecapCms(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  const browserWindow = window as CmsWindow;
  browserWindow.CMS_MANUAL_INIT = true;

  if (browserWindow.CMS) {
    return Promise.resolve();
  }

  const existingScript = document.getElementById(DECAP_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Decap CMS failed to load.')),
        {
          once: true,
        }
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = DECAP_SCRIPT_ID;
    script.src = DECAP_SCRIPT_SRC;
    script.async = true;
    script.onload = (): void => resolve();
    script.onerror = (): void => reject(new Error('Decap CMS failed to load.'));
    document.head.appendChild(script);
  });
}

export default function DocsCmsAdminPage(): JSX.Element {
  const config = useDocsCmsConfig();
  const userManager = createDocsCmsUserManager(config);
  const [state, setState] = useState<'loading' | 'ready' | 'locked'>('loading');
  const [message, setMessage] = useState('Checking editor session...');
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get('error') === 'unauthorized'
      ? 'This editor is restricted to Alternun admin/editor groups.'
      : null;
  });
  const [initialized, setInitialized] = useState(false);
  const [identitySummary, setIdentitySummary] = useState<string>('Not signed in');

  const cmsBackendConfigured =
    config.backend.mode === 'github' && config.backend.baseUrl.length > 0;

  useEffect(() => {
    let disposed = false;

    async function bootstrap(): Promise<void> {
      setError(null);
      setMessage('Checking editor session...');

      const session = await getActiveCmsSession(userManager);
      const identity = extractCmsIdentity(session);
      setIdentitySummary(
        identity ? [identity.name, identity.email].filter(Boolean).join(' · ') : 'Not signed in'
      );

      if (!session) {
        if (!disposed) {
          setState('locked');
          setMessage('Continue with Authentik to open the Decap editor.');
        }
        return;
      }

      if (!canAccessCms(session, config)) {
        await userManager.removeUser();
        if (!disposed) {
          setState('locked');
          setError('This editor is restricted to Alternun admin/editor groups.');
        }
        return;
      }

      try {
        await loadDecapCms();
        if (disposed) {
          return;
        }

        const browserWindow = window as CmsWindow;
        browserWindow.CMS?.init({
          config: buildDecapConfig(config),
        });

        setInitialized(true);
        setState('ready');
        setMessage('Decap CMS is ready.');
      } catch (cmsError) {
        if (disposed) {
          return;
        }

        setState('locked');
        setError(cmsError instanceof Error ? cmsError.message : 'Decap CMS failed to initialize.');
      }
    }

    void bootstrap();

    return () => {
      disposed = true;
    };
  }, [config, userManager]);

  const handleGoogleLogin = (): void => {
    setError(null);
    setMessage('Redirecting to Google...');
    window.location.assign(buildDocsCmsAuthentikRelayPath('google', '/admin'));
  };

  const handlePasswordLogin = async (): Promise<void> => {
    setError(null);
    setMessage('Redirecting to Authentik...');
    await userManager.removeUser();
    // Reuse any existing Authentik session here; the callback still enforces
    // the CMS group allowlist before Decap loads.
    await userManager.signinRedirect({
      state: {
        returnTo: '/admin',
      },
    });
  };

  const handleLogout = async (): Promise<void> => {
    await userManager.removeUser();
    await userManager.signoutRedirect({
      post_logout_redirect_uri: `${window.location.origin}/admin`,
    });
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.panel}>
            <p className={styles.eyebrow}>Alternun Docs CMS</p>
            <h1 className={styles.title}>Documentation editor</h1>
            <p className={styles.copy}>
              Authentik controls access to the editor. Google sign-in now starts from an
              Alternun-owned relay route, and Decap loads only after an approved Alternun
              admin/editor session is active.
            </p>

            <div className={styles.metaGrid}>
              <div className={styles.metaCard}>
                <span>Issuer</span>
                <strong>{config.auth.issuer}</strong>
              </div>
              <div className={styles.metaCard}>
                <span>Client</span>
                <strong>{config.auth.clientId}</strong>
              </div>
              <div className={styles.metaCard}>
                <span>Backend</span>
                <strong>{cmsBackendConfigured ? 'GitHub' : 'Preview/Test'}</strong>
              </div>
              <div className={styles.metaCard}>
                <span>Session</span>
                <strong>{identitySummary}</strong>
              </div>
            </div>

            <div className={styles.actions}>
              {state !== 'ready' ? (
                <>
                  <button
                    className={styles.primaryAction}
                    type='button'
                    onClick={() => void handleGoogleLogin()}
                  >
                    Continue with Google
                  </button>
                  <button
                    className={styles.secondaryAction}
                    type='button'
                    onClick={() => void handlePasswordLogin()}
                  >
                    Use email and password
                  </button>
                </>
              ) : (
                <button
                  className={styles.secondaryAction}
                  type='button'
                  onClick={() => void handleLogout()}
                >
                  Sign out
                </button>
              )}
            </div>

            {error ? <div className={styles.error}>{error}</div> : null}
            {!cmsBackendConfigured ? (
              <div className={styles.warning}>
                GitHub write-back is not configured yet. The editor is running in Decap test-repo
                mode until `DOCS_CMS_GITHUB_OAUTH_BASE_URL` is provided.
              </div>
            ) : null}
            {!error ? <div className={styles.status}>{message}</div> : null}
            <div className={styles.footer}>
              Allowed groups: {config.auth.allowedGroups.join(', ')}
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div id='nc-root' className={styles.root} />
          {state === 'ready' && initialized ? null : (
            <p className={styles.copy}>
              The editor surface appears here after a valid Authentik session is established.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
