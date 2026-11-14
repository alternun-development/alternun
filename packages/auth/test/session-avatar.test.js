/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-floating-promises */
import assert from 'node:assert/strict';
import test from 'node:test';
import { principalToUser } from '../dist/core/session.js';

function principal(metadata) {
  return { subject: 'user-1', email: 'ada@example.com', roles: [], metadata };
}

test('principalToUser keeps the social photo the provider sent', () => {
  assert.equal(
    principalToUser(principal({ picture: ' https://google.test/p.jpg ' })).avatarUrl,
    'https://google.test/p.jpg'
  );
  assert.equal(
    principalToUser(principal({ avatar_url: 'https://supabase.test/a.png' })).avatarUrl,
    'https://supabase.test/a.png'
  );
  assert.equal(
    principalToUser(principal({ image: 'https://discord.test/a.png' })).avatarUrl,
    'https://discord.test/a.png'
  );
  assert.equal(
    principalToUser(principal({ avatarUrl: 'https://cdn.test/a.png', picture: 'https://x.test' }))
      .avatarUrl,
    'https://cdn.test/a.png'
  );
});

test('principalToUser prefers an explicit avatar and ignores unsafe values', () => {
  assert.equal(
    principalToUser(principal({ picture: 'https://google.test/p.jpg' }), {
      avatarUrl: 'https://override.test/o.png',
    }).avatarUrl,
    'https://override.test/o.png'
  );
  assert.equal(
    principalToUser(principal({ picture: 'http://insecure.test/p.jpg' })).avatarUrl,
    undefined
  );
  assert.equal(principalToUser(principal({ picture: 42 })).avatarUrl, undefined);
  assert.equal(principalToUser(principal(undefined)).avatarUrl, undefined);
});
