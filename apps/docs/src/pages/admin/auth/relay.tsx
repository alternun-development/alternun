/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { useEffect, useRef, useState, type JSX } from 'react';
import { createDocsCmsUserManager } from '../../../cms/auth';
import {
  parseDocsCmsAuthentikRelayProvider,
  startDocsCmsAuthentikRelaySignIn,
} from '../../../cms/authRelay';
import { useDocsCmsConfig } from '../../../cms/site-config';
import styles from '../styles.module.css';

export default function DocsCmsAuthRelayPage(): JSX.Element {
  const config = useDocsCmsConfig();
  const userManager = createDocsCmsUserManager(config);
  const [message, setMessage] = useState('Preparing direct Google sign-in...');
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current || typeof window === 'undefined') {
      return;
    }

    hasStartedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const provider = parseDocsCmsAuthentikRelayProvider(params.get('provider'));

    if (!provider) {
      window.location.replace('/admin');
      return;
    }

    void startDocsCmsAuthentikRelaySignIn({
      userManager,
      provider,
      returnTo: params.get('next'),
    }).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : 'Google sign-in could not be started.');
    });
  }, [userManager]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Alternun Docs CMS</p>
          <h1 className={styles.title}>Redirecting to Google</h1>
          <p className={styles.copy}>{message}</p>
        </section>
      </div>
    </main>
  );
}
