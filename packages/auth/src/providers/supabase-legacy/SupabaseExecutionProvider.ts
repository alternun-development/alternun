import type { AuthCapabilities, AuthClient, User } from '@edcalderon/auth';
import type {
  AuthExecutionResult,
  AuthExecutionSignInOptions,
  AuthExecutionSignUpInput,
  AuthLinkProviderInput,
  AuthUnlinkProviderInput,
  ExecutionSession,
  ExternalIdentity,
  LinkedAuthAccount,
  WalletConnectionBridge,
} from '../../core/types';
import type { AuthExecutionProvider } from '../../core/contracts';
import { AlternunProviderError } from '../../core/errors';

export interface LegacyExecutionClientLike extends AuthClient {
  signInWithEmail(email: string, password: string): Promise<User>;
  signUpWithEmail?(email: string, password: string, locale?: string): Promise<unknown>;
  resendEmailConfirmation?(email: string): Promise<void>;
  verifyEmailConfirmationCode?(email: string, code: string): Promise<void>;
  setOidcUser?(user: User | null): void;
  supabase?: unknown;
}

export interface SupabaseExecutionProviderOptions {
  client: LegacyExecutionClientLike;
  walletBridge?: WalletConnectionBridge | null;
}

function extractMetadata(user: User | null): Record<string, unknown> {
  if (!user?.metadata || typeof user.metadata !== 'object') {
    return {};
  }

  return user.metadata as Record<string, unknown>;
}

function mapUserToExternalIdentity(user: User | null): ExternalIdentity | null {
  if (!user) {
    return null;
  }

  const metadata = extractMetadata(user);
  const provider =
    user.provider ?? (typeof metadata.provider === 'string' ? metadata.provider : 'supabase');
  const providerUserId =
    user.providerUserId ??
    (typeof metadata.providerUserId === 'string' ? metadata.providerUserId : user.id);

  return {
    provider,
    providerUserId,
    email: user.email,
    emailVerified: typeof metadata.emailVerified === 'boolean' ? metadata.emailVerified : undefined,
    displayName:
      typeof metadata.name === 'string'
        ? metadata.name
        : typeof metadata.displayName === 'string'
        ? metadata.displayName
        : undefined,
    avatarUrl: user.avatarUrl,
    rawClaims: metadata,
  };
}

function extractLinkedAccounts(user: User | null): LinkedAuthAccount[] {
  if (!user) {
    return [];
  }

  const metadata = extractMetadata(user);
  const linkedAccountsRaw = metadata.linkedAccounts;
  if (Array.isArray(linkedAccountsRaw)) {
    const linkedAccounts: LinkedAuthAccount[] = [];
    for (const entry of linkedAccountsRaw) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }

      const typedEntry = entry as Partial<LinkedAuthAccount>;
      if (
        typeof typedEntry.provider !== 'string' ||
        typeof typedEntry.providerUserId !== 'string'
      ) {
        continue;
      }

      linkedAccounts.push({
        provider: typedEntry.provider,
        providerUserId: typedEntry.providerUserId,
        type: typedEntry.type ?? 'custom',
        email: typedEntry.email,
        displayName: typedEntry.displayName,
        linkedAt: typedEntry.linkedAt,
        metadata: (typedEntry.metadata as Record<string, unknown>) ?? {},
      });
    }

    if (linkedAccounts.length > 0) {
      return linkedAccounts;
    }
  }

  const walletProvider =
    typeof metadata.walletProvider === 'string' ? metadata.walletProvider : null;
  const walletObject =
    typeof metadata.wallet === 'object' && metadata.wallet !== null
      ? (metadata.wallet as Record<string, unknown>)
      : null;
  const walletAddress =
    typeof metadata.walletAddress === 'string'
      ? metadata.walletAddress
      : typeof walletObject?.address === 'string'
      ? walletObject.address
      : null;

  if (walletProvider && walletAddress) {
    return [
      {
        provider: walletProvider,
        providerUserId: walletAddress,
        type: 'wallet',
        email: user.email,
        displayName:
          typeof metadata.walletDisplayName === 'string' ? metadata.walletDisplayName : undefined,
        linkedAt: typeof metadata.connectedAt === 'string' ? metadata.connectedAt : undefined,
        metadata,
      },
    ];
  }

  return [];
}

function buildExecutionSession(
  client: LegacyExecutionClientLike,
  user: User | null
): Promise<ExecutionSession | null> {
  return client
    .getSessionToken()
    .then((token) => {
      if (!user) {
        return null;
      }

      const identity = mapUserToExternalIdentity(user);
      return {
        provider: user.provider ?? 'supabase',
        accessToken: token ?? null,
        refreshToken: null,
        idToken: null,
        expiresAt: null,
        externalIdentity: identity,
        linkedAccounts: extractLinkedAccounts(user),
        raw: {
          user,
          runtime: client.runtime,
        },
      };
    })
    .catch(() => null);
}

export class SupabaseExecutionProvider implements AuthExecutionProvider {
  readonly name = 'supabase' as const;

  constructor(private readonly client: LegacyExecutionClientLike) {}

  async signIn(options: AuthExecutionSignInOptions): Promise<AuthExecutionResult> {
    const provider = options.provider?.toLowerCase();
    if (provider === 'email') {
      if (options.email && options.password) {
        await this.client.signInWithEmail(options.email, options.password);
      } else {
        throw new AlternunProviderError('Email sign-in requires email and password.');
      }
    } else {
      await this.client.signIn({
        provider: options.provider,
        flow: options.flow ?? (this.client.runtime === 'web' ? 'redirect' : 'native'),
        redirectUri: options.redirectUri,
        web3: options.web3,
      });
    }

    const session = await this.getExecutionSession();
    return {
      session,
      externalIdentity: session?.externalIdentity ?? null,
      redirectUrl: options.redirectUri ?? null,
      needsEmailVerification: false,
      emailAlreadyRegistered: false,
      confirmationEmailSent: false,
    };
  }

  async signUp(input: AuthExecutionSignUpInput): Promise<AuthExecutionResult> {
    if (!this.client.signUpWithEmail) {
      throw new AlternunProviderError('Supabase execution provider does not support sign-up.');
    }

    const outcome = await this.client.signUpWithEmail(input.email, input.password, input.locale);
    const session = await this.getExecutionSession();
    return {
      session,
      externalIdentity: session?.externalIdentity ?? null,
      needsEmailVerification:
        typeof outcome === 'object' && outcome !== null && 'needsEmailVerification' in outcome
          ? Boolean((outcome as { needsEmailVerification?: unknown }).needsEmailVerification)
          : !session,
      emailAlreadyRegistered:
        typeof outcome === 'object' && outcome !== null && 'emailAlreadyRegistered' in outcome
          ? Boolean((outcome as { emailAlreadyRegistered?: unknown }).emailAlreadyRegistered)
          : false,
      confirmationEmailSent:
        typeof outcome === 'object' && outcome !== null && 'confirmationEmailSent' in outcome
          ? Boolean((outcome as { confirmationEmailSent?: unknown }).confirmationEmailSent)
          : false,
    };
  }

  async signOut(): Promise<void> {
    await this.client.signOut();
  }

  async getExecutionSession(): Promise<ExecutionSession | null> {
    const user = await this.client.getUser().catch(() => null);
    return buildExecutionSession(this.client, user);
  }

  async refreshExecutionSession(): Promise<ExecutionSession | null> {
    return this.getExecutionSession();
  }

  async linkProvider(input: AuthLinkProviderInput): Promise<LinkedAuthAccount | null> {
    const session = await this.getExecutionSession();
    if (!session) {
      return null;
    }

    const linkedAccount: LinkedAuthAccount = {
      provider: input.provider,
      providerUserId: input.providerUserId,
      type: input.type,
      email: input.email ?? session.externalIdentity?.email,
      metadata: input.metadata ?? {},
    };

    const user = await this.client.getUser().catch(() => null);
    if (user && this.client.setOidcUser) {
      this.client.setOidcUser({
        ...user,
        metadata: {
          ...(extractMetadata(user) ?? {}),
          linkedAccounts: [...extractLinkedAccounts(user), linkedAccount],
        },
      });
    }

    return linkedAccount;
  }

  async unlinkProvider(input: AuthUnlinkProviderInput): Promise<void> {
    const user = await this.client.getUser().catch(() => null);
    if (!user || !this.client.setOidcUser) {
      return;
    }

    const metadata = extractMetadata(user);
    const linkedAccountsRaw = Array.isArray(metadata.linkedAccounts) ? metadata.linkedAccounts : [];
    const nextLinkedAccounts = linkedAccountsRaw.filter((entry) => {
      if (!entry || typeof entry !== 'object') {
        return false;
      }

      const typedEntry = entry as Partial<LinkedAuthAccount>;
      return !(
        typedEntry.provider === input.provider &&
        typedEntry.providerUserId === input.providerUserId &&
        typedEntry.type === input.type
      );
    });

    this.client.setOidcUser({
      ...user,
      metadata: {
        ...metadata,
        linkedAccounts: nextLinkedAccounts,
      },
    });
  }

  signInWithEmail(email: string, password: string): Promise<User> {
    return this.client.signInWithEmail(email, password);
  }

  signUpWithEmail(email: string, password: string, locale?: string): Promise<unknown> {
    if (!this.client.signUpWithEmail) {
      throw new AlternunProviderError('Supabase execution provider does not support sign-up.');
    }

    return this.client.signUpWithEmail(email, password, locale);
  }

  async resendEmailConfirmation(email: string): Promise<void> {
    if (!this.client.resendEmailConfirmation) {
      throw new AlternunProviderError(
        'Supabase execution provider does not support email confirmation resend.'
      );
    }

    await this.client.resendEmailConfirmation(email);
  }

  async verifyEmailConfirmationCode(email: string, code: string): Promise<void> {
    if (!this.client.verifyEmailConfirmationCode) {
      throw new AlternunProviderError(
        'Supabase execution provider does not support verification code confirmation.'
      );
    }

    await this.client.verifyEmailConfirmationCode(email, code);
  }

  async signInWithGoogle(redirectTo?: string): Promise<void> {
    await this.client.signIn({
      provider: 'google',
      flow: this.client.runtime === 'web' ? 'redirect' : 'native',
      redirectUri: redirectTo,
    });
  }

  capabilities(): AuthCapabilities {
    return this.client.capabilities();
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return this.client.onAuthStateChange(callback);
  }

  get supabase(): LegacyExecutionClientLike['supabase'] {
    return this.client.supabase;
  }

  get runtime() {
    return this.client.runtime;
  }

  async getUser(): Promise<User | null> {
    return this.client.getUser();
  }

  async getSessionToken(): Promise<string | null> {
    return this.client.getSessionToken();
  }
}

export type {
  AuthCapabilities,
  AuthClient,
  OAuthFlow,
  SignInOptions,
  User,
} from '@edcalderon/auth';
