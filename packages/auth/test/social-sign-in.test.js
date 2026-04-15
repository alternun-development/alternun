import assert from 'node:assert/strict';
import test from 'node:test';
import { resumePendingSocialSignIn, startSocialSignIn } from '../dist/index.js';

test('startSocialSignIn routes web social logins through the relay when enabled', async () => {
  const relayRoutes = [];

  const result = await startSocialSignIn({
    client: {},
    provider: 'google',
    authentikProviderHint: 'google',
    redirectTo: '/dashboard',
    forceFreshSession: true,
    strategy: {
      mode: 'relay',
      socialMode: 'authentik',
      executionProvider: 'supabase',
      providerFlowSlugs: {},
    },
    onRelayRoute: (route) => {
      relayRoutes.push(route);
    },
    dependencies: {
      resolveRuntime: () => 'web',
      shouldUseRelayEntry: () => true,
      webRedirectSignIn: async () => {
        throw new Error('unexpected web redirect');
      },
      nativeSignIn: async () => {
        throw new Error('unexpected native sign-in');
      },
    },
  });

  assert.equal(result, 'relay');
  assert.deepEqual(relayRoutes, [
    {
      pathname: '/auth-relay',
      params: {
        provider: 'google',
        fresh: '1',
        next: '/dashboard',
      },
    },
  ]);
});

test('startSocialSignIn delegates web social logins to the web redirect helper when relay is disabled', async () => {
  const webRedirectCalls = [];

  const result = await startSocialSignIn({
    client: { id: 'client' },
    provider: 'discord',
    authentikProviderHint: 'discord',
    redirectTo: '/profile',
    forceFreshSession: false,
    strategy: {
      mode: 'source',
      socialMode: 'authentik',
      executionProvider: 'supabase',
      providerFlowSlugs: {},
    },
    dependencies: {
      resolveRuntime: () => 'web',
      shouldUseRelayEntry: () => false,
      webRedirectSignIn: async (options) => {
        webRedirectCalls.push(options);
        return 'authentik';
      },
      nativeSignIn: async () => {
        throw new Error('unexpected native sign-in');
      },
    },
  });

  assert.equal(result, 'authentik');
  assert.equal(webRedirectCalls.length, 1);
  assert.deepEqual(webRedirectCalls[0], {
    client: { id: 'client' },
    provider: 'discord',
    authentikProviderHint: 'discord',
    redirectTo: '/profile',
    forceFreshSession: false,
    strategy: {
      mode: 'source',
      socialMode: 'authentik',
      executionProvider: 'supabase',
      providerFlowSlugs: {},
    },
  });
});

test('startSocialSignIn delegates native social logins to the native helper', async () => {
  const nativeSignInCalls = [];

  const result = await startSocialSignIn({
    client: { id: 'client' },
    provider: 'google',
    authentikProviderHint: 'google',
    strategy: {
      mode: 'source',
      socialMode: 'authentik',
      executionProvider: 'supabase',
      providerFlowSlugs: {},
    },
    dependencies: {
      resolveRuntime: () => 'native',
      shouldUseRelayEntry: () => false,
      webRedirectSignIn: async () => {
        throw new Error('unexpected web redirect');
      },
      nativeSignIn: async (options) => {
        nativeSignInCalls.push(options);
      },
    },
  });

  assert.equal(result, 'native');
  assert.equal(nativeSignInCalls.length, 1);
  assert.deepEqual(nativeSignInCalls[0], {
    client: { id: 'client' },
    provider: 'google',
  });
});

test('resumePendingSocialSignIn reads and clears the pending provider before dispatching', async () => {
  const observed = [];

  const result = await resumePendingSocialSignIn({
    client: { id: 'client' },
    redirectTo: '/dashboard',
    strategy: {
      mode: 'source',
      socialMode: 'authentik',
      executionProvider: 'supabase',
      providerFlowSlugs: {},
    },
    resolveProvider: (provider) => provider,
    readPendingProvider: () => 'google',
    clearPendingProvider: () => {
      observed.push('cleared');
    },
    dependencies: {
      resolveRuntime: () => 'web',
      shouldUseRelayEntry: () => false,
      webRedirectSignIn: async (options) => {
        observed.push(options.provider);
        return 'authentik';
      },
      nativeSignIn: async () => {
        throw new Error('unexpected native sign-in');
      },
    },
  });

  assert.equal(result, 'authentik');
  assert.deepEqual(observed, ['cleared', 'google']);
});
