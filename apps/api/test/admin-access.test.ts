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
    listActiveMemberships: async () => (options.scopes ?? []) as any,
  });
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
  assert.deepEqual(calls, ['email:user-1', 'global:edward@alternun.io']);
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
  assert.deepEqual(calls, ['email:user-1']);
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
