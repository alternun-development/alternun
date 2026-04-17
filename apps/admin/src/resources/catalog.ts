export interface AdminResourceDefinition {
  name: string;
  list: string;
  show?: string;
  meta: {
    title: string;
    description: string;
    endpoint: string;
    emptyState: string;
  };
}

export const adminResources: AdminResourceDefinition[] = [
  {
    name: 'dashboard',
    list: '/dashboard',
    meta: {
      title: 'Command Center',
      description: 'Platform health, quick links, and operational visibility.',
      endpoint: '/v1/health',
      emptyState: 'Dashboard metrics will appear as backend observability endpoints land.',
    },
  },
  {
    name: 'users',
    list: '/users',
    show: '/users/:id',
    meta: {
      title: 'Users',
      description: 'Identity principals and application users.',
      endpoint: '/v1/users',
      emptyState: 'User records will show here once the API exposes admin-safe list endpoints.',
    },
  },
  {
    name: 'wallets',
    list: '/wallets',
    show: '/wallets/:id',
    meta: {
      title: 'Wallets',
      description: 'Provisioning state, ownership, and signed actions.',
      endpoint: '/v1/wallets',
      emptyState: 'Wallet records will show here once wallet admin endpoints are ready.',
    },
  },
  {
    name: 'organizations',
    list: '/organizations',
    show: '/organizations/:id',
    meta: {
      title: 'Organizations',
      description: 'Tenants, org profiles, and lifecycle operations.',
      endpoint: '/v1/organizations',
      emptyState: 'Organization records will show here once the API exposes them.',
    },
  },
  {
    name: 'memberships',
    list: '/memberships',
    show: '/memberships/:id',
    meta: {
      title: 'Memberships',
      description: 'User-role assignments across organizations.',
      endpoint: '/v1/memberships',
      emptyState:
        'Membership routes can be remapped once nested organization endpoints are finalized.',
    },
  },
  {
    name: 'audit',
    list: '/audit',
    show: '/audit/:id',
    meta: {
      title: 'Audit',
      description: 'Operational history, actor trails, and event review.',
      endpoint: '/v1/audit',
      emptyState: 'Audit trails will populate once audit endpoints are published.',
    },
  },
];

export function getAdminResource(resourceName: string): AdminResourceDefinition {
  const resource = adminResources.find((entry) => entry.name === resourceName);
  if (!resource) {
    throw new Error(`Unknown admin resource: ${resourceName}`);
  }

  return resource;
}
