/* eslint-disable */
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { MarketplaceApiError } from '../src/modules/marketplace/marketplace.errors';
import {
  manageOverview,
  ProjectManageAccess,
} from '../src/modules/marketplace/project-manage.service';

const project = {
  id: 'p1',
  enterpriseId: 'e1',
  slug: 'fundacion-rio-gaira',
  internalNotes: 'team only',
  pendingItems: ['logo'],
  internalContacts: [{ name: 'Gloria' }],
} as any;

function access(options: {
  email?: string | null;
  globalRole?: string | null;
  identities?: Array<{ role: string; issuer: string; subject: string }>;
  project?: unknown;
}) {
  const instance = new ProjectManageAccess(
    {
      findVerifiedEmail: async () => options.email ?? null,
      findGlobalRole: async () => options.globalRole ?? null,
      listProjectMembershipIdentities: async () => options.identities ?? [],
    } as any,
    { findProject: async () => (options.project === undefined ? project : options.project) } as any
  );
  instance.resolveUser = async () => 'user-1';
  instance.env = { ADMIN_AUTH_ISSUER: 'https://sso.example/application/o/alternun-admin/' };
  return instance;
}

const isError = (code: string) => (error: unknown) =>
  error instanceof MarketplaceApiError && error.code === code;

test('Alternun global admins act with their global role and the console issuer', async () => {
  const { principal, isGlobalAdmin } = await access({
    email: 'edward@alternun.io',
    globalRole: 'platform_owner',
  }).resolve('Bearer t', 'p1');
  assert.equal(isGlobalAdmin, true);
  assert.deepEqual(principal.roles, ['platform_owner']);
  assert.equal(principal.iss, 'https://sso.example/application/o/alternun-admin/');
  assert.equal(principal.sub, 'airs-user:user-1');
});

test('project members act with the roles and identity stored on their memberships', async () => {
  const identity = { issuer: 'https://sso.example/a/', subject: 'ak-123' };
  const { principal, isGlobalAdmin } = await access({
    email: 'gloria@taybo.test',
    identities: [
      { role: 'partner_operator', ...identity },
      { role: 'project_moderator', ...identity },
      { role: 'sub_admin', issuer: 'other', subject: 'other' },
    ],
  }).resolve('Bearer t', 'p1');
  assert.equal(isGlobalAdmin, false);
  assert.equal(principal.iss, identity.issuer);
  assert.equal(principal.sub, identity.subject);
  assert.deepEqual(principal.roles, ['partner_operator', 'project_moderator']);
});

test('people without a membership on the project, or unknown projects, are denied', async () => {
  await assert.rejects(
    access({ email: 'x@y.test' }).resolve('Bearer t', 'p1'),
    isError('PROJECT_SCOPE_DENIED')
  );
  await assert.rejects(
    access({ project: null }).resolve('Bearer t', 'p1'),
    isError('PROJECT_NOT_FOUND')
  );
  // An unverified email never unlocks the global role.
  await assert.rejects(
    access({ email: null, globalRole: 'platform_owner' }).resolve('Bearer t', 'p1'),
    isError('PROJECT_SCOPE_DENIED')
  );
});

test('capabilities follow the role and team-only fields stay hidden from project admins', () => {
  const principal = (roles: string[]) => ({
    iss: 'i',
    aud: 'a',
    sub: 's',
    roles,
    organizationIds: [],
  });
  const operator = manageOverview(principal(['partner_operator']), project, false);
  assert.deepEqual(operator.can, {
    editContent: true,
    editProfile: true,
    media: true,
    team: true,
    comments: true,
    clients: true,
    editClients: true,
    assignAirs: true,
  });
  assert.equal('internalNotes' in operator.project, false);
  assert.equal('pendingItems' in operator.project, false);
  assert.equal('internalContacts' in operator.project, false);

  const subAdmin = manageOverview(principal(['sub_admin']), project, false);
  assert.equal(subAdmin.can.editContent, true);
  assert.equal(subAdmin.can.editProfile, false);
  assert.equal(subAdmin.can.team, false);
  assert.equal(subAdmin.can.editClients, true);
  assert.equal(subAdmin.can.assignAirs, true);

  const moderator = manageOverview(principal(['project_moderator']), project, false);
  assert.deepEqual(moderator.can, {
    editContent: false,
    editProfile: false,
    media: true,
    team: false,
    comments: true,
    clients: true,
    editClients: false,
    assignAirs: false,
  });

  const global = manageOverview(principal(['platform_owner']), project, true);
  assert.equal((global.project as any).internalNotes, 'team only');
});

test('enterprise management needs a global role or an enterprise-wide membership', async () => {
  const { enterpriseManageOverview } = await import(
    '../src/modules/marketplace/project-manage.service'
  );
  const enterprise = {
    id: 'e1',
    slug: 'hoteles-taybo',
    internalNotes: 'team only',
    internalContacts: [{ name: 'Gloria' }],
    pendingItems: ['logo'],
  } as any;
  let requestedProject: unknown = 'unset';
  const instance = new ProjectManageAccess(
    {
      findVerifiedEmail: async () => 'owner@taybo.test',
      findGlobalRole: async () => null,
      listProjectMembershipIdentities: async (_u: string, _e: string, projectId: string | null) => {
        requestedProject = projectId;
        return [{ role: 'partner_operator', issuer: 'iss', subject: 'sub' }];
      },
    } as any,
    { findEnterprise: async (id: string) => (id === 'e1' ? enterprise : null) } as any
  );
  instance.resolveUser = async () => 'user-1';
  const { principal, isGlobalAdmin } = await instance.resolveEnterprise('Bearer t', 'e1');
  // Only enterprise-wide memberships count: no project is passed.
  assert.equal(requestedProject, null);
  assert.equal(isGlobalAdmin, false);
  assert.deepEqual(principal.roles, ['partner_operator']);
  await assert.rejects(
    instance.resolveEnterprise('Bearer t', 'missing'),
    isError('ENTERPRISE_NOT_FOUND')
  );

  const overview = enterpriseManageOverview(principal, enterprise, false);
  assert.deepEqual(overview.can, {
    editInfo: true,
    images: true,
    products: true,
    team: true,
    clients: true,
    editClients: true,
    assignAirs: true,
  });
  assert.equal('internalNotes' in overview.enterprise, false);
  assert.equal('pendingItems' in overview.enterprise, false);

  const denied = new ProjectManageAccess(
    {
      findVerifiedEmail: async () => null,
      findGlobalRole: async () => null,
      listProjectMembershipIdentities: async () => [],
    } as any,
    { findEnterprise: async () => enterprise } as any
  );
  denied.resolveUser = async () => 'user-2';
  await assert.rejects(
    denied.resolveEnterprise('Bearer t', 'e1'),
    isError('ENTERPRISE_SCOPE_DENIED')
  );
});
