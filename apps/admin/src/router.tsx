import { Authenticated, CanAccess } from '@refinedev/core';
import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import {
  getActiveAdminSession,
  getAdminRolesFromSession,
  resolveAdminLandingPath,
} from './auth/oidc-client';
import { AppShell } from './components/app-shell';
import { ForbiddenPage } from './components/forbidden-page';
import { AuthCallbackPage } from './pages/auth/callback-page';
import { AuthRelayPage } from './pages/auth/relay-page';
import { DashboardPage } from './pages/dashboard/page';
import { LoginPage } from './pages/login/page';
import { ResourceListPage } from './pages/resources/resource-list-page';
import { ResourceShowPage } from './pages/resources/resource-show-page';
import { adminResources } from './resources/catalog';

function AdminLandingRedirect(): React.ReactElement | null {
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    void getActiveAdminSession().then((session) => {
      setPath(resolveAdminLandingPath(getAdminRolesFromSession(session)));
    });
  }, []);

  return path ? <Navigate to={path} replace /> : null;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function AdminRouter() {
  const dataResources = adminResources.filter((resource) => resource.name !== 'dashboard');

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path='/login'
          element={
            <Authenticated key='login-route' fallback={<LoginPage />}>
              <AdminLandingRedirect />
            </Authenticated>
          }
        />
        <Route path='/auth/callback' element={<AuthCallbackPage />} />
        <Route path='/auth/relay' element={<AuthRelayPage />} />

        <Route
          element={
            <Authenticated key='protected-shell' fallback={<Navigate to='/login' replace />}>
              <AppShell />
            </Authenticated>
          }
        >
          <Route index element={<AdminLandingRedirect />} />
          <Route
            path='/dashboard'
            element={
              <CanAccess resource='dashboard' action='list' fallback={<ForbiddenPage />}>
                <DashboardPage />
              </CanAccess>
            }
          />

          {dataResources.map((resource) => (
            <Route
              key={`${resource.name}-list`}
              path={resource.list}
              element={
                <CanAccess resource={resource.name} action='list' fallback={<ForbiddenPage />}>
                  <ResourceListPage resourceName={resource.name} />
                </CanAccess>
              }
            />
          ))}

          {dataResources
            .filter((resource) => resource.show)
            .map((resource) => (
              <Route
                key={`${resource.name}-show`}
                path={resource.show}
                element={
                  <CanAccess resource={resource.name} action='show' fallback={<ForbiddenPage />}>
                    <ResourceShowPage resourceName={resource.name} />
                  </CanAccess>
                }
              />
            ))}
        </Route>

        <Route path='*' element={<AdminLandingRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
