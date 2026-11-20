/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import {
  adminEnterpriseUrl,
  adminProjectUrl,
  canManageEnterprise,
  canManageProject,
  loadRemoteAdminAccess,
  mergeAdminAccess,
  resolveAdminAccess,
  resolveAdminPanelUrl,
  resolveUserRoles,
} from '../adminAccess';

describe('resolveUserRoles', () => {
  it('merges session roles with the Authentik claims kept by the exchange', () => {
    expect(
      resolveUserRoles({
        roles: ['authenticated'],
        metadata: { rawClaims: { alternun_roles: ['platform_owner', 'authenticated'] } },
      })
    ).toEqual(['authenticated', 'platform_owner']);
    expect(resolveUserRoles({ metadata: { alternun_roles: 'sub_admin, moderator' } })).toEqual([
      'sub_admin',
      'moderator',
    ]);
    expect(resolveUserRoles(null)).toEqual([]);
    expect(resolveUserRoles({ roles: [1, null], metadata: 'x' })).toEqual([]);
  });
});

describe('resolveAdminAccess', () => {
  const withRoles = (roles: string[]) => ({ metadata: { rawClaims: { alternun_roles: roles } } });

  it('separates Alternun global admins from project and enterprise admins', () => {
    expect(resolveAdminAccess(withRoles(['platform_owner']))).toEqual({
      isGlobalAdmin: true,
      canOpenAdminPanel: true,
    });
    expect(resolveAdminAccess(withRoles(['internal_admin'])).isGlobalAdmin).toBe(true);
    for (const role of ['partner_operator', 'sub_admin', 'moderator', 'partner_readonly']) {
      expect(resolveAdminAccess(withRoles([role]))).toEqual({
        isGlobalAdmin: false,
        canOpenAdminPanel: true,
      });
    }
    expect(resolveAdminAccess({ roles: ['authenticated'] })).toEqual({
      isGlobalAdmin: false,
      canOpenAdminPanel: false,
    });
    expect(resolveAdminAccess(null).canOpenAdminPanel).toBe(false);
  });
});

describe('resolveAdminPanelUrl', () => {
  it('uses the configured URL first, then the environment of the API', () => {
    expect(resolveAdminPanelUrl('https://admin.example.test/')).toBe('https://admin.example.test');
    expect(resolveAdminPanelUrl('', 'http://localhost:8082', 'http://localhost:8081')).toBe(
      'http://localhost:5173'
    );
    expect(
      resolveAdminPanelUrl(
        '',
        'https://testnet.api.alternun.co',
        'https://testnet.airs.alternun.co'
      )
    ).toBe('https://testnet.admin.alternun.co');
    expect(resolveAdminPanelUrl('', 'https://api.alternun.co', 'https://airs.alternun.co')).toBe(
      'https://admin.alternun.co'
    );
  });

  it('builds project and enterprise admin links', () => {
    expect(adminProjectUrl('p 1', 'https://a.test')).toBe(
      'https://a.test/marketplace/projects/p%201'
    );
    expect(adminEnterpriseUrl('e1', 'https://a.test')).toBe(
      'https://a.test/marketplace/enterprises/e1'
    );
  });
});

describe('remote admin access', () => {
  const scope = {
    role: 'sub_admin',
    enterpriseId: 'e1',
    enterpriseSlug: 'hotel',
    projectId: 'p1',
    projectSlug: 'river',
  };

  it('loads and sanitizes the API answer', async () => {
    const fetcher = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            globalRole: 'platform_owner',
            isGlobalAdmin: true,
            scopes: [scope, { role: 1 }],
            roles: ['platform_owner', 'sub_admin'],
          }),
      } as unknown as Response)
    );
    const access = await loadRemoteAdminAccess('t', fetcher, 'http://api.test/');
    expect(fetcher).toHaveBeenCalledWith('http://api.test/v1/me/admin-access', {
      headers: { Authorization: 'Bearer t', Accept: 'application/json' },
    });
    expect(access).toEqual({
      globalRole: 'platform_owner',
      isGlobalAdmin: true,
      scopes: [scope],
      roles: ['platform_owner', 'sub_admin'],
    });
    const failing = jest.fn(() => Promise.resolve({ ok: false } as Response));
    await expect(loadRemoteAdminAccess('t', failing, 'http://api.test')).resolves.toBeNull();
  });

  it('merges session and API roles and scopes project management', () => {
    const remote = {
      globalRole: null,
      isGlobalAdmin: false,
      scopes: [scope],
      roles: ['sub_admin'],
    };
    const access = mergeAdminAccess({ roles: ['authenticated'] }, remote);
    expect(access).toEqual({
      roles: ['sub_admin'],
      scopes: [scope],
      isGlobalAdmin: false,
      canOpenAdminPanel: true,
    });
    expect(canManageProject(access, { id: 'p1' })).toBe(true);
    expect(canManageProject(access, { id: 'p2', enterprise: { id: 'e1' } })).toBe(false);
    expect(canManageEnterprise(access, 'e1')).toBe(true);
    expect(canManageEnterprise(access, 'e2')).toBe(false);

    const enterpriseWide = mergeAdminAccess(null, {
      ...remote,
      scopes: [{ ...scope, projectId: null, role: 'partner_operator' }],
    });
    expect(canManageProject(enterpriseWide, { id: 'p9', enterprise: { id: 'e1' } })).toBe(true);

    const global = mergeAdminAccess(null, { ...remote, isGlobalAdmin: true, scopes: [] });
    expect(global.isGlobalAdmin).toBe(true);
    expect(canManageProject(global, { id: 'any' })).toBe(true);
    expect(canManageProject(null, { id: 'any' })).toBe(false);
    expect(canManageEnterprise(null, 'e1')).toBe(false);
  });
});
