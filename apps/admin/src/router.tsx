import { Authenticated, CanAccess } from '@refinedev/core';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/app-shell';
import { ForbiddenPage } from './components/forbidden-page';
import { AuthCallbackPage } from './pages/auth/callback-page';
import { DashboardPage } from './pages/dashboard/page';
import { LoginPage } from './pages/login/page';
import { ResourceListPage } from './pages/resources/resource-list-page';
import { ResourceShowPage } from './pages/resources/resource-show-page';
import { adminResources } from './resources/catalog';

export function AdminRouter() {
  const dataResources = adminResources.filter(resource => resource.name !== 'dashboard');

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path='/login'
          element={
            <Authenticated key='login-route' fallback={<LoginPage />}>
              <Navigate to='/dashboard' replace />
            </Authenticated>
          }
        />
        <Route path='/auth/callback' element={<AuthCallbackPage />} />

        <Route
          element={
            <Authenticated key='protected-shell' fallback={<Navigate to='/login' replace />}>
              <AppShell />
            </Authenticated>
          }
        >
          <Route index element={<Navigate to='/dashboard' replace />} />
          <Route
            path='/dashboard'
            element={
              <CanAccess resource='dashboard' action='list' fallback={<ForbiddenPage />}>
                <DashboardPage />
              </CanAccess>
            }
          />

          {dataResources.map(resource => (
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
            .filter(resource => resource.show)
            .map(resource => (
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

        <Route path='*' element={<Navigate to='/dashboard' replace />} />
      </Routes>
    </BrowserRouter>
  );
}
