import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { authProvider } from '../auth/authProvider';
import { extractAdminIdentity, getActiveAdminSession } from '../auth/oidc-client';
import { adminEnv } from '../config/env';
import { adminResources } from '../resources/catalog';

type AdminIdentity = NonNullable<Awaited<ReturnType<typeof extractIdentity>>>;

async function extractIdentity(): Promise<Awaited<ReturnType<typeof extractAdminIdentity>>> {
  const session = await getActiveAdminSession();
  return extractAdminIdentity(session);
}

export function AppShell(): React.ReactElement {
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [isNavigationOpen, setNavigationOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    void extractIdentity().then(setIdentity);
  }, []);

  useEffect(() => {
    setNavigationOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isNavigationOpen) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setNavigationOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isNavigationOpen]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const onPointerDown = (event: MouseEvent): void => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isProfileMenuOpen]);

  const primaryResources = adminResources.filter((resource) => resource.name !== 'dashboard');
  const surfaceLabel = identity?.surface === 'partner' ? 'Allies Panel' : 'Internal Admin';
  const shellTitle = identity?.surface === 'partner' ? 'Allies Console' : 'Admin Control';
  const shellDescription =
    identity?.surface === 'partner'
      ? 'Restricted partner workspace with organization-scoped visibility.'
      : 'Internal operations surface for platform, support, and audit workflows.';
  const footerCopy =
    identity?.surface === 'partner' ? 'Partner operations console' : 'Internal operations console';
  const accessibleResources = primaryResources.filter((resource) =>
    identity
      ? identity.allowedResources.includes(resource.name)
      : resource.surfaces.includes('partner')
  );
  const displayName = identity?.name ?? 'Operator';
  const email = identity?.email ?? 'No email claim';
  const roles = identity?.roles.length ? identity.roles.join(', ') : 'No roles detected';
  const organizationScope = identity?.organizationIds.length
    ? identity.organizationIds.join(', ')
    : 'No organization scope detected';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join('')
    .toUpperCase();

  return (
    <div className='admin-shell'>
      <button
        aria-label='Close navigation'
        className={`sidebar-backdrop${isNavigationOpen ? ' is-open' : ''}`}
        onClick={() => setNavigationOpen(false)}
        tabIndex={isNavigationOpen ? 0 : -1}
        type='button'
      />

      <aside
        aria-label='Admin navigation'
        className={`admin-sidebar${isNavigationOpen ? ' is-open' : ''}`}
        id='admin-navigation'
      >
        <div className='brand-lockup'>
          <div className='brand-heading'>
            <div>
              <span className='brand-eyebrow'>Alternun</span>
              <h1>{shellTitle}</h1>
            </div>
            <button
              aria-label='Close navigation'
              className='sidebar-close'
              onClick={() => setNavigationOpen(false)}
              type='button'
            >
              <span aria-hidden='true'>×</span>
            </button>
          </div>
          <p>{shellDescription}</p>
        </div>

        <nav className='admin-nav'>
          <NavLink
            to='/dashboard'
            className='admin-nav-link'
            onClick={() => setNavigationOpen(false)}
          >
            <span className='admin-nav-title'>Command Center</span>
            <span className='admin-nav-meta'>Health and operator shortcuts</span>
          </NavLink>

          {accessibleResources.map((resource) => (
            <NavLink
              key={resource.name}
              to={resource.list}
              className='admin-nav-link'
              onClick={() => setNavigationOpen(false)}
            >
              <span className='admin-nav-title'>{resource.meta.title}</span>
              <span className='admin-nav-meta'>{resource.meta.description}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className='admin-main'>
        <header className='admin-topbar'>
          <div className='admin-heading'>
            <button
              aria-controls='admin-navigation'
              aria-expanded={isNavigationOpen}
              aria-label='Open navigation'
              className='mobile-nav-toggle'
              onClick={() => setNavigationOpen(true)}
              type='button'
            >
              <span aria-hidden='true' className='mobile-nav-icon'>
                <i />
                <i />
                <i />
              </span>
              <span>Menu</span>
            </button>
            <div>
              <span className='panel-label'>{surfaceLabel}</span>
              <h2>{displayName}</h2>
            </div>
          </div>

          <div className='topbar-actions'>
            <div className='profile-menu' ref={profileMenuRef}>
              <button
                aria-expanded={isProfileMenuOpen}
                aria-haspopup='menu'
                aria-label='Open operator profile menu'
                className='profile-trigger'
                onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}
                type='button'
              >
                <span aria-hidden='true' className='profile-avatar'>
                  {initials || 'OP'}
                </span>
                <span className='profile-trigger-copy'>
                  <strong>{displayName}</strong>
                  <span>{email}</span>
                </span>
                <span aria-hidden='true' className='profile-caret'>
                  ⌄
                </span>
              </button>

              {isProfileMenuOpen ? (
                <div aria-label='Operator profile' className='profile-popover' role='menu'>
                  <div className='profile-summary'>
                    <span className='profile-avatar profile-avatar-large' aria-hidden='true'>
                      {initials || 'OP'}
                    </span>
                    <div>
                      <strong>{displayName}</strong>
                      <span>{email}</span>
                    </div>
                  </div>
                  <div className='profile-role'>
                    <span>Authorized roles</span>
                    <strong title={roles}>{roles}</strong>
                  </div>
                  <div className='profile-role'>
                    <span>Organization scope</span>
                    <strong title={organizationScope}>{organizationScope}</strong>
                  </div>
                  <button
                    className='profile-sign-out'
                    onClick={() => {
                      void authProvider.logout({});
                    }}
                    role='menuitem'
                    type='button'
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <Outlet />

        <footer className='admin-footer' aria-label='Admin release information'>
          <div>
            <span className='admin-footer-label'>Alternun Admin</span>
            <span className='admin-footer-copy'>{footerCopy}</span>
          </div>
          <div className='admin-footer-meta'>
            <span>Release</span>
            <strong>v{adminEnv.appVersion}</strong>
            <span>Environment</span>
            <strong>{adminEnv.appEnv}</strong>
          </div>
        </footer>
      </main>
    </div>
  );
}
