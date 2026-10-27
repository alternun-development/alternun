import { marketplaceCopy } from '../marketplace/copy';

export interface AdminResourceDefinition {
  name: string;
  list: string;
  show?: string;
  surfaces: readonly ('internal' | 'partner')[];
  showInNavigation?: boolean;
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
    surfaces: ['internal', 'partner'],
    meta: {
      title: 'Command Center',
      description: 'Platform health, quick links, and operational visibility.',
      endpoint: '/v1/health',
      emptyState: 'Dashboard metrics will appear as backend observability endpoints land.',
    },
  },
  {
    name: 'marketplace-projects',
    list: '/marketplace',
    show: '/marketplace/projects/:id',
    surfaces: ['internal', 'partner'],
    meta: {
      title: marketplaceCopy.navigation.title,
      description: marketplaceCopy.navigation.description,
      endpoint: '/v1/admin/projects',
      emptyState: marketplaceCopy.projectsResource.empty,
    },
  },
  {
    name: 'marketplace-enterprises',
    list: '/marketplace/enterprises',
    show: '/marketplace/enterprises/:id',
    surfaces: ['internal', 'partner'],
    meta: {
      title: marketplaceCopy.enterprisesResource.title,
      description: marketplaceCopy.enterprisesResource.description,
      endpoint: '/v1/admin/enterprises',
      emptyState: marketplaceCopy.enterprisesResource.empty,
    },
  },
  {
    name: 'marketplace-airs-reports',
    list: '/airs-reports',
    surfaces: ['internal'],
    meta: {
      title: marketplaceCopy.airsReports.navigation.title,
      description: marketplaceCopy.airsReports.navigation.description,
      endpoint: '/v1/admin/airs-reports',
      emptyState: marketplaceCopy.airsReports.queue.empty,
    },
  },
  {
    name: 'users',
    list: '/users',
    show: '/users/:id',
    surfaces: ['internal'],
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
    surfaces: ['internal'],
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
    surfaces: ['internal', 'partner'],
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
    surfaces: ['internal', 'partner'],
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
    surfaces: ['internal'],
    meta: {
      title: 'Audit',
      description: 'Operational history, actor trails, and event review.',
      endpoint: '/v1/audit',
      emptyState: 'Audit trails will populate once audit endpoints are published.',
    },
  },
];

export const internalAdminResourceNames = adminResources.map((resource) => resource.name);
export const partnerAdminResourceNames = adminResources
  .filter((resource) => resource.surfaces.includes('partner'))
  .map((resource) => resource.name);

export function getAdminResource(resourceName: string): AdminResourceDefinition {
  const resource = adminResources.find((entry) => entry.name === resourceName);
  if (!resource) {
    throw new Error(`Unknown admin resource: ${resourceName}`);
  }

  return resource;
}
