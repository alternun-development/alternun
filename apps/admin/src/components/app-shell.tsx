import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { authProvider } from '../auth/authProvider';
import { extractAdminIdentity, getActiveAdminSession } from '../auth/oidc-client';
import { adminResources } from '../resources/catalog';

type AdminIdentity = NonNullable<Awaited<ReturnType<typeof extractIdentity>>>;

async function extractIdentity() {
  const session = await getActiveAdminSession();
  return extractAdminIdentity(session);
}

export function AppShell() {
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);

  useEffect(() => {
    void extractIdentity().then(setIdentity);
  }, []);

  const primaryResources = adminResources.filter((resource) => resource.name !== 'dashboard');

  return (
    <div className='admin-shell'>
      <aside className='admin-sidebar'>
        <div className='brand-lockup'>
          <span className='brand-eyebrow'>Alternun</span>
          <h1>Admin Control</h1>
          <p>Internal operations surface for platform, support, and audit workflows.</p>
        </div>

        <nav className='admin-nav'>
          <NavLink to='/dashboard' className='admin-nav-link'>
            <span className='admin-nav-title'>Command Center</span>
            <span className='admin-nav-meta'>Health and operator shortcuts</span>
          </NavLink>

          {primaryResources.map((resource) => (
            <NavLink key={resource.name} to={resource.list} className='admin-nav-link'>
              <span className='admin-nav-title'>{resource.meta.title}</span>
              <span className='admin-nav-meta'>{resource.meta.description}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className='admin-main'>
        <header className='admin-topbar'>
          <div>
            <span className='panel-label'>Internal Admin</span>
            <h2>{identity?.name ?? 'Operator session'}</h2>
          </div>

          <div className='topbar-actions'>
            <div className='identity-badge'>
              <span>{identity?.email ?? 'No email claim'}</span>
              <strong>
                {identity?.roles.length ? identity.roles.join(', ') : 'No roles detected'}
              </strong>
            </div>
            <button
              className='secondary-button'
              type='button'
              onClick={() => {
                void authProvider.logout({});
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
