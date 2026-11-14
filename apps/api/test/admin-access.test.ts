/* eslint-disable */
import 'reflect-metadata';
import assert = require('node:assert/strict');
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { AdminAccessController } from '../src/modules/marketplace/admin-access.controller';
import {
  AdminAccessService,
  buildAdminAccess,
} from '../src/modules/marketplace/admin-access.service';

const scope = {
  role: 'partner_operator',
  enterpriseId: 'e1',
  enterpriseSlug: 'hoteles-taybo',
  projectId: 'p1',
  projectSlug: 'fundacion-rio-gaira',
};

function service(options: {
  email?: string | null;
  globalRole?: string | null;
  scopes?: unknown[];
}) {
  const calls: string[] = [];
  const instance = new AdminAccessService({
    findVerifiedEmail: async (userId: string) => {
      calls.push(`email:${userId}`);
      return options.email ?? null;
    },
    findGlobalRole: async (email: string) => {
      calls.push(`global:${email}`);
      return options.globalRole ?? null;
    },
    listActiveMemberships: async () => {
      calls.push('memberships');
      return (options.scopes ?? []) as any;
    },
    syncDomainMemberships: async (userId: string, issuer: string) => {
      calls.push(`sync:${userId}:${issuer}`);
      return 0;
    },
  });
  instance.env = { ADMIN_AUTH_ISSUER: 'https://sso.example/admin/' };
  instance.resolveUser = async (token: string) =>
    token === 'Bearer good' ? 'user-1' : Promise.reject(new UnauthorizedException());
  return { instance, calls };
}

test('a verified Alternun global admin gets the global role', async () => {
  const { instance, calls } = service({
    email: 'edward@alternun.io',
    globalRole: 'platform_owner',
  });
  const access = await instance.forToken('Bearer good');
  assert.deepEqual(access, {
    globalRole: 'platform_owner',
    isGlobalAdmin: true,
    scopes: [],
    roles: ['platform_owner'],
  });
  assert.deepEqual(calls, [
    'sync:user-1:https://sso.example/admin/',
    'email:user-1',
    'memberships',
    'global:edward@alternun.io',
  ]);
});

test('without a verified email no global role is looked up', async () => {
  const { instance, calls } = service({
    email: null,
    globalRole: 'platform_owner',
    scopes: [scope],
  });
  const access = await instance.forToken('Bearer good');
  assert.equal(access.isGlobalAdmin, false);
  assert.equal(access.globalRole, null);
  assert.deepEqual(access.scopes, [scope]);
  assert.deepEqual(access.roles, ['partner_operator']);
  // Domain memberships are synced before the memberships are read.
  assert.deepEqual(calls, [
    'sync:user-1:https://sso.example/admin/',
    'email:user-1',
    'memberships',
  ]);
});

test('project and enterprise memberships are returned as scopes', () => {
  const access = buildAdminAccess(null, [
    scope,
    { ...scope, role: 'sub_admin', projectId: 'p2', projectSlug: 'x' },
    { ...scope, role: '', enterpriseId: 'e9' },
  ]);
  assert.equal(access.scopes.length, 2);
  assert.deepEqual(access.roles, ['partner_operator', 'sub_admin']);
  assert.equal(buildAdminAccess('unknown_role', []).isGlobalAdmin, false);
});

test('the endpoint requires a bearer token and rejects invalid ones', async () => {
  const { instance } = service({});
  const controller = new AdminAccessController(instance);
  assert.throws(() => controller.get(undefined), UnauthorizedException);
  await assert.rejects(controller.get('Bearer bad'), UnauthorizedException);
});

test('memberships resolve project slugs without embedding projects (no foreign key)', async () => {
  const { AdminAccessRepository } = await import('../src/modules/marketplace/admin-access.service');
  const selects: string[] = [];
  const tables: Record<string, unknown[]> = {
    project_memberships: [
      {
        role: 'project_moderator',
        enterprise_id: 'e1',
        project_id: 'p1',
        enterprises: { slug: 'taybo' },
      },
      {
        role: 'partner_operator',
        enterprise_id: 'e1',
        project_id: null,
        enterprises: [{ slug: 'taybo' }],
      },
    ],
    projects: [{ id: 'p1', slug: 'fundacion-rio-gaira' }],
  };
  const client = {
    from(table: string) {
      const query: any = {
        select(columns: string) {
          selects.push(`${table}:${columns}`);
          if (table === 'project_memberships' && columns.includes('projects('))
            return {
              ...query,
              then: (r: any) => r({ data: null, error: { message: 'no relationship' } }),
            };
          return query;
        },
        eq: () => query,
        in: () => query,
        then: (resolve: any) => resolve({ data: tables[table], error: null }),
      };
      return query;
    },
  };
  const repository = new AdminAccessRepository(client as any);
  assert.deepEqual(await repository.listActiveMemberships('user-1'), [
    {
      role: 'project_moderator',
      enterpriseId: 'e1',
      enterpriseSlug: 'taybo',
      projectId: 'p1',
      projectSlug: 'fundacion-rio-gaira',
    },
    {
      role: 'partner_operator',
      enterpriseId: 'e1',
      enterpriseSlug: 'taybo',
      projectId: null,
      projectSlug: null,
    },
  ]);
  assert.ok(selects.every((select) => !select.includes('projects(')));
});

test('the domain sync calls its RPC and never blocks access when it fails', async () => {
  const { AdminAccessRepository, memberIssuer } = await import(
    '../src/modules/marketplace/admin-access.service'
  );
  const calls: unknown[] = [];
  const ok = new AdminAccessRepository({
    rpc: async (name: string, params: unknown) => {
      calls.push([name, params]);
      return { data: { ok: true, granted: 2 }, error: null };
    },
  } as any);
  assert.equal(await ok.syncDomainMemberships('user-1', 'iss'), 2);
  assert.deepEqual(calls, [
    ['marketplace_sync_domain_memberships', { p_user_id: 'user-1', p_member_issuer: 'iss' }],
  ]);
  const failing = new AdminAccessRepository({
    rpc: async () => ({ data: null, error: { message: 'missing function' } }),
  } as any);
  assert.equal(await failing.syncDomainMemberships('user-1', 'iss'), 0);
  assert.equal(memberIssuer({}), 'airs-app');
  assert.equal(memberIssuer({ ADMIN_AUTH_ISSUER: ' https://sso/ ' }), 'https://sso/');
});
