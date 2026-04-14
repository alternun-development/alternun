import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeGoogleSourceLoginFlowMode,
  type IdentitySourceLoginFlowMode,
} from '../config/google-source-login-flow.ts';

void test('defaults the Google source login flow mode to source', () => {
  const mode: IdentitySourceLoginFlowMode = normalizeGoogleSourceLoginFlowMode(undefined);

  assert.equal(mode, 'source');
});

void test('accepts logout-then-source for the Google source login flow mode', () => {
  const mode = normalizeGoogleSourceLoginFlowMode('logout-then-source');

  assert.equal(mode, 'logout-then-source');
});

void test('normalizes alternate logout-first spellings to logout-then-source', () => {
  const mode = normalizeGoogleSourceLoginFlowMode('logout-before-source');

  assert.equal(mode, 'logout-then-source');
});
