/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { RoleChips, sortRoles } from '../RoleChips';

jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

function render(element: React.JSX.Element): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(element);
  });
  return renderer!;
}

function text(renderer: ReactTestRenderer): string {
  const collect = (node: unknown): string[] => {
    if (typeof node === 'string') return [node];
    if (Array.isArray(node)) return node.flatMap(collect);
    if (node && typeof node === 'object' && 'children' in node)
      return collect((node as { children: unknown }).children);
    return [];
  };
  return collect(renderer.toJSON()).join('|');
}

describe('RoleChips', () => {
  it('orders known roles from highest and drops unknown ones', () => {
    expect(sortRoles(['sub_admin', 'authenticated', 'platform_owner'])).toEqual([
      'platform_owner',
      'sub_admin',
    ]);
  });

  it('shows "User" when there are no admin roles', () => {
    const renderer = render(<RoleChips roles={['authenticated']} accent='#0f0' muted='#999' />);
    expect(renderer.root.findByProps({ testID: 'role-chips-none' })).toBeTruthy();
    expect(text(renderer)).toContain('profile.roles.none');
  });

  it('renders each role and, when asked, the projects it covers', () => {
    const renderer = render(
      <RoleChips
        roles={['partner_operator', 'platform_owner']}
        scopes={[
          {
            role: 'partner_operator',
            enterpriseId: 'e1',
            enterpriseSlug: 'hoteles-taybo',
            projectId: 'p1',
            projectSlug: 'fundacion-rio-gaira',
          },
        ]}
        showScopes
        accent='#0f0'
        muted='#999'
      />
    );
    expect(renderer.root.findByProps({ testID: 'role-chip-platform_owner' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'role-chip-partner_operator' })).toBeTruthy();
    expect(text(renderer)).toContain('profile.roles.scoped:{"target":"fundacion-rio-gaira"}');
  });
});
