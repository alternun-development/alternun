import { useEffect, useMemo, useState, type JSX } from 'react';
import { createDocsCmsUserManager, canAccessCms } from '../../../cms/auth';
import { useDocsCmsConfig } from '../../../cms/site-config';
import styles from '../styles.module.css';

export default function DocsCmsAuthCallbackPage(): JSX.Element {
  const config = useDocsCmsConfig();
  const userManager = useMemo(() => createDocsCmsUserManager(config), [config]);
  const [message, setMessage] = useState('Finalizing documentation editor session...');

  useEffect(() => {
    let disposed = false;

    void userManager
      .signinRedirectCallback()
      .then(async user => {
        if (disposed) {
          return;
        }

        if (!canAccessCms(user, config)) {
          await userManager.removeUser();
          await userManager.signoutRedirect({
            post_logout_redirect_uri: `${window.location.origin}/admin?error=unauthorized`,
          });
          return;
        }

        window.location.replace('/admin');
      })
      .catch((error: unknown) => {
        if (disposed) {
          return;
        }

        setMessage(error instanceof Error ? error.message : 'Authentication callback failed.');
      });

    return () => {
      disposed = true;
    };
  }, [config, userManager]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Authentik callback</p>
          <h1 className={styles.title}>Signing you in</h1>
          <p className={styles.copy}>{message}</p>
        </section>
      </div>
    </main>
  );
}
