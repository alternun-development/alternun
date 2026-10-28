import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

let viteServer;
let marketplaceCopy;
let marketplaceErrorMessage;
let members;
let TeamEditor;

const project = { id: 'project-1', enterpriseId: 'enterprise-1' };

function membership(overrides = {}) {
  return {
    id: 'm-1',
    member: { issuer: 'issuer', subject: 'subject-1' },
    memberUserId: null,
    enterpriseId: 'enterprise-1',
    projectId: 'project-1',
    scopeType: 'project',
    role: 'sub_admin',
    status: 'active',
    ...overrides,
  };
}

before(async () => {
  viteServer = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  ({ marketplaceCopy, marketplaceErrorMessage } = await viteServer.ssrLoadModule(
    '/src/marketplace/copy.ts'
  ));
  members = await viteServer.ssrLoadModule('/src/marketplace/team-members.ts');
  ({ TeamEditor } = await viteServer.ssrLoadModule(
    '/src/pages/marketplace/editors/team-editor.tsx'
  ));
});

after(async () => {
  await viteServer?.close();
});

test('only a well-formed email passes, ignoring case and spaces', () => {
  for (const good of ['ada@example.test', '  Ada.L@Example.Test ']) {
    assert.equal(members.isValidMemberEmail(good), true, good);
  }
  for (const bad of [
    '',
    '   ',
    'ada',
    'ada@',
    '@example.test',
    'ada@example',
    'a b@example.test',
  ]) {
    assert.equal(members.isValidMemberEmail(bad), false, bad);
  }
  assert.equal(members.isValidMemberEmail(`${'a'.repeat(320)}@example.test`), false);
});

test('the add request carries the normalized email and the project scope, never an identity id', () => {
  assert.equal(members.memberByEmailPath, '/v1/admin/project-memberships/by-email');
  assert.deepEqual(members.buildAddMemberBody(project, ' Ada@Example.Test ', 'sub_admin'), {
    email: 'ada@example.test',
    enterpriseId: 'enterprise-1',
    projectId: 'project-1',
    scopeType: 'project',
    role: 'sub_admin',
  });
});

test('members are named by email, or numbered when the person has not signed in', () => {
  assert.equal(members.memberLabel({ memberEmail: 'ada@example.test' }, 0), 'ada@example.test');
  assert.equal(
    members.memberLabel({ memberEmail: null }, 1),
    `${marketplaceCopy.projectDetail.team.member} 2`
  );
  assert.equal(
    members.memberLabel({ memberEmail: '   ' }, 0),
    `${marketplaceCopy.projectDetail.team.member} 1`
  );
});

test('the success message warns when the sign-in group was not updated', () => {
  assert.equal(members.addedMessage({ groupSync: 'added' }), marketplaceCopy.teamEditor.added);
  for (const status of ['skipped', 'failed']) {
    assert.equal(
      members.addedMessage({ groupSync: status }),
      marketplaceCopy.teamEditor.addedGroupNotSynced
    );
  }
});

test('an email without an account gets a friendly sentence, not a raw code', () => {
  const message = marketplaceErrorMessage({ code: 'MEMBERSHIP_USER_NOT_FOUND' });
  assert.match(message, /sign in to Airs once/);
  assert.doesNotMatch(message, /MEMBERSHIP_USER_NOT_FOUND/);
});

test('the team list shows each member by email and offers the email field to add one', () => {
  const html = renderToString(
    createElement(TeamEditor, {
      project: { ...project, id: 'project-1' },
      memberships: [
        membership({ memberEmail: 'ada@example.test' }),
        membership({ id: 'm-2', memberEmail: null }),
        membership({ id: 'm-3', status: 'revoked', memberEmail: 'gone@example.test' }),
      ],
      roles: ['platform_owner'],
      onChanged: () => {},
    })
  );

  assert.match(html, /ada@example\.test/);
  assert.match(html, new RegExp(`${marketplaceCopy.projectDetail.team.member} 2`));
  assert.doesNotMatch(html, /gone@example\.test/);
  assert.match(html, new RegExp(marketplaceCopy.teamEditor.add));
});
