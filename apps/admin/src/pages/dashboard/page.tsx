import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAccessToken } from '../../auth/oidc-client';
import { adminEnv } from '../../config/env';
import { adminResources } from '../../resources/catalog';

interface HealthState {
  service?: string;
  stage?: string;
  status: 'loading' | 'ok' | 'error';
  timestamp?: string;
  message?: string;
}

function useApiHealth(): HealthState {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const token = await getAccessToken();
        const response = await fetch(`${adminEnv.apiUrl}/v1/health`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const payload = (await response.json()) as {
          service?: string;
          stage?: string;
          status?: string;
          timestamp?: string;
        };

        if (cancelled) return;

        setHealth({
          service: payload.service,
          stage: payload.stage,
          status: response.ok ? 'ok' : 'error',
          timestamp: payload.timestamp,
          message: response.ok ? undefined : `Health request failed with ${response.status}.`,
        });
      } catch (error) {
        if (cancelled) return;
        setHealth({
          status: 'error',
          message: error instanceof Error ? error.message : 'Health request failed.',
        });
      }
    }

    void loadHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  return health;
}

export function DashboardPage() {
  const health = useApiHealth();

  const resources = adminResources.filter((resource) => resource.name !== 'dashboard');

  return (
    <section className='page-grid'>
      <article className='panel hero-panel'>
        <span className='panel-label'>Environment</span>
        <h2>{adminEnv.appEnv} control surface</h2>
        <p>
          The admin SPA is deployed separately from the API runtime, but both are managed by the
          same infrastructure pipeline family.
        </p>

        <div className='metric-row'>
          <div className='metric-card'>
            <span>API target</span>
            <strong>{adminEnv.apiUrl}</strong>
          </div>
          <div className='metric-card'>
            <span>Issuer</span>
            <strong>{adminEnv.authIssuer}</strong>
          </div>
          <div className='metric-card'>
            <span>Auth client</span>
            <strong>{adminEnv.authClientId}</strong>
          </div>
        </div>
      </article>

      <article className='panel'>
        <span className='panel-label'>API health</span>
        <h3>
          {health.status === 'loading'
            ? 'Checking backend'
            : health.status === 'ok'
            ? 'Backend reachable'
            : 'Backend unavailable'}
        </h3>
        <p>
          {health.message ??
            `Service ${health.service ?? 'unknown'} reported stage ${health.stage ?? 'unknown'}.`}
        </p>
        <small>{health.timestamp ?? 'No timestamp available yet.'}</small>
      </article>

      <section className='resource-grid'>
        {resources.map((resource) => (
          <article key={resource.name} className='panel resource-panel'>
            <span className='panel-label'>{resource.name}</span>
            <h3>{resource.meta.title}</h3>
            <p>{resource.meta.description}</p>
            <small>{resource.meta.endpoint}</small>
            <Link className='inline-link' to={resource.list}>
              Open {resource.meta.title}
            </Link>
          </article>
        ))}
      </section>
    </section>
  );
}
