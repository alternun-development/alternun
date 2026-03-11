import { Refine } from '@refinedev/core';
import { authProvider } from './auth/authProvider';
import { AdminRouter } from './router';
import { accessControlProvider } from './providers/accessControlProvider';
import { dataProvider } from './providers/dataProvider';
import { adminResources } from './resources/catalog';

export function App() {
  return (
    <Refine
      authProvider={authProvider}
      accessControlProvider={accessControlProvider}
      dataProvider={dataProvider}
      resources={adminResources}
      options={{
        syncWithLocation: true,
        reactQuery: {
          clientConfig: {
            defaultOptions: {
              queries: {
                refetchOnWindowFocus: false,
                retry: false,
              },
            },
          },
        },
      }}
    >
      <AdminRouter />
    </Refine>
  );
}
