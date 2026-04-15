import type { AuthClient, AuthRuntime } from '@edcalderon/auth';
import type {
  AuthentikLoginStrategy,
  AuthentikRelayProvider,
  AuthentikRelayRoute,
} from './authEntry';
import { buildAuthentikRelayRoute, shouldUseAuthentikRelayEntry } from './authEntry';
import {
  clearPendingAuthentikOAuthProvider,
  readPendingAuthentikOAuthProvider,
} from './authentikClient';
import { nativeSignIn, resolveAuthRuntime, webRedirectSignIn } from './runtimeSignIn';

export type SocialSignInOutcome = 'relay' | 'authentik' | 'supabase' | 'better-auth' | 'native';

export interface SocialSignInDependencies {
  resolveRuntime?: () => AuthRuntime;
  shouldUseRelayEntry?: () => boolean;
  webRedirectSignIn?: typeof webRedirectSignIn;
  nativeSignIn?: typeof nativeSignIn;
}

export interface StartSocialSignInOptions {
  client: AuthClient;
  provider: string;
  authentikProviderHint: AuthentikRelayProvider;
  redirectTo?: string | null;
  forceFreshSession?: boolean;
  strategy?: AuthentikLoginStrategy;
  onRelayRoute?: (route: AuthentikRelayRoute) => void | Promise<void>;
  dependencies?: SocialSignInDependencies;
}

export interface ResumePendingSocialSignInOptions
  extends Omit<
    StartSocialSignInOptions,
    'provider' | 'authentikProviderHint' | 'forceFreshSession'
  > {
  forceFreshSession?: boolean;
  resolveProvider?: (provider: AuthentikRelayProvider) => string;
  readPendingProvider?: typeof readPendingAuthentikOAuthProvider;
  clearPendingProvider?: typeof clearPendingAuthentikOAuthProvider;
}

function resolveRuntime(dependencies?: SocialSignInDependencies): AuthRuntime {
  return dependencies?.resolveRuntime?.() ?? resolveAuthRuntime();
}

function resolveRelayEntryMode(dependencies?: SocialSignInDependencies): boolean {
  return dependencies?.shouldUseRelayEntry?.() ?? shouldUseAuthentikRelayEntry();
}

export async function startSocialSignIn({
  client,
  provider,
  authentikProviderHint,
  redirectTo,
  forceFreshSession = false,
  strategy,
  onRelayRoute,
  dependencies,
}: StartSocialSignInOptions): Promise<SocialSignInOutcome> {
  const runtime = resolveRuntime(dependencies);
  const shouldUseRelayEntry = resolveRelayEntryMode(dependencies);
  const normalizedRedirectTo =
    typeof redirectTo === 'string' && redirectTo.trim().length > 0 ? redirectTo.trim() : undefined;

  if (runtime === 'web' && shouldUseRelayEntry) {
    if (!onRelayRoute) {
      throw new Error(
        'CONFIG_ERROR: startSocialSignIn requires onRelayRoute when relay entry is enabled'
      );
    }

    await onRelayRoute(
      buildAuthentikRelayRoute(authentikProviderHint, {
        next: normalizedRedirectTo,
        forceFreshSession,
      })
    );
    return 'relay';
  }

  if (runtime === 'web') {
    return (dependencies?.webRedirectSignIn ?? webRedirectSignIn)({
      client,
      provider,
      authentikProviderHint,
      redirectTo: normalizedRedirectTo,
      forceFreshSession,
      strategy,
    });
  }

  await (dependencies?.nativeSignIn ?? nativeSignIn)({
    client,
    provider,
  });
  return 'native';
}

export async function resumePendingSocialSignIn({
  client,
  redirectTo,
  forceFreshSession = false,
  strategy,
  onRelayRoute,
  dependencies,
  resolveProvider,
  readPendingProvider = readPendingAuthentikOAuthProvider,
  clearPendingProvider = clearPendingAuthentikOAuthProvider,
}: ResumePendingSocialSignInOptions): Promise<SocialSignInOutcome | null> {
  const pendingProvider = readPendingProvider();
  if (pendingProvider !== 'google' && pendingProvider !== 'discord') {
    return null;
  }

  clearPendingProvider();

  return startSocialSignIn({
    client,
    provider: resolveProvider?.(pendingProvider) ?? pendingProvider,
    authentikProviderHint: pendingProvider,
    redirectTo,
    forceFreshSession,
    strategy,
    onRelayRoute,
    dependencies,
  });
}
