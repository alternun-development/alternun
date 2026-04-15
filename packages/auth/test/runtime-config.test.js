import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAuthRuntimeConfig } from '../dist/index.js';

test('resolveAuthRuntimeConfig infers better-auth from the Better Auth url when the flag is absent', () => {
  const config = resolveAuthRuntimeConfig({
    EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co',
  });

  assert.equal(config.executionProvider, 'better-auth');
});

test('resolveAuthRuntimeConfig honors the public execution flag directly', () => {
  const config = resolveAuthRuntimeConfig({
    EXPO_PUBLIC_AUTH_EXECUTION_PROVIDER: 'better-auth',
  });

  assert.equal(config.executionProvider, 'better-auth');
});

test('resolveAuthRuntimeConfig still honors an explicit supabase rollback flag', () => {
  const config = resolveAuthRuntimeConfig({
    AUTH_EXECUTION_PROVIDER: 'supabase',
    EXPO_PUBLIC_BETTER_AUTH_URL: 'https://testnet.api.alternun.co',
  });

  assert.equal(config.executionProvider, 'supabase');
});
