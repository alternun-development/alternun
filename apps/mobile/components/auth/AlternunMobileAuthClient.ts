import type {
  AuthCapabilities,
  AuthClient,
  AuthRuntime,
  OAuthFlow,
  SignInOptions,
  User,
} from '@edcalderon/auth';
import { SupabaseClient as UniversalSupabaseClient } from '@edcalderon/auth/supabase';
import { createClient } from '@supabase/supabase-js';

const WALLET_PROVIDERS = ['metamask', 'walletconnect'] as const;
type WalletProvider = (typeof WALLET_PROVIDERS)[number];
interface LinkedWalletState {
  provider: WalletProvider;
  walletAddress: string;
  connectedAt: string;
}

function isWalletProvider(provider?: string): provider is WalletProvider {
  return Boolean(provider && WALLET_PROVIDERS.includes(provider.toLowerCase() as WalletProvider));
}

function makeWalletAddress(): string {
  const seed = Math.random().toString(16).replace('.', '').padEnd(40, '0').slice(0, 40);
  return `0x${seed}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isMissingSessionError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('auth session missing');
}

export interface AlternunMobileAuthClientOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  supabaseAnonKey?: string;
}

export class AlternunMobileAuthClient implements AuthClient {
  runtime: AuthRuntime = 'native';

  private baseClient: AuthClient | null;
  private supabase: any = null;
  private listeners: Set<(user: User | null) => void> = new Set();
  private walletUser: User | null = null;
  private linkedWallet: LinkedWalletState | null = null;
  private unsubscribeBase: (() => void) | null = null;

  constructor(options: AlternunMobileAuthClientOptions) {
    const supabaseKey = options.supabaseKey ?? options.supabaseAnonKey;

    if (options.supabaseUrl && supabaseKey) {
      const supabase = createClient(options.supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });

      this.baseClient = new UniversalSupabaseClient({
        supabase,
        runtime: 'native',
      });
      this.supabase = supabase;
    } else {
      this.baseClient = null;
      this.supabase = null;
    }
  }

  capabilities(): AuthCapabilities {
    const baseFlows = this.baseClient?.capabilities().supportedFlows ?? [];
    const flowSet = new Set<OAuthFlow>(['native', ...baseFlows]);

    return {
      runtime: this.runtime,
      supportedFlows: Array.from(flowSet),
    };
  }

  private emit(user: User | null): void {
    this.listeners.forEach((listener) => listener(user));
  }

  private ensureBaseClient(): AuthClient {
    if (!this.baseClient) {
      throw new Error(
        'CONFIG_ERROR: Auth is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY.',
      );
    }

    return this.baseClient;
  }

  private ensureSupabase(): any {
    if (!this.supabase) {
      throw new Error(
        'CONFIG_ERROR: Auth is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY.',
      );
    }

    return this.supabase;
  }

  private mapSupabaseUser(user: any): User | null {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      avatarUrl: user.user_metadata?.avatar_url,
      provider: user.app_metadata?.provider,
      providerUserId: user.app_metadata?.provider_id || user.user_metadata?.provider_id,
      metadata: user.user_metadata,
    };
  }

  private applyLinkedWallet(user: User | null): User | null {
    if (!user || !this.linkedWallet) {
      return user;
    }

    const metadata = user.metadata && typeof user.metadata === 'object'
      ? (user.metadata as Record<string, unknown>)
      : {};

    return {
      ...user,
      metadata: {
        ...metadata,
        walletProvider: this.linkedWallet.provider,
        walletAddress: this.linkedWallet.walletAddress,
        connectedAt: this.linkedWallet.connectedAt,
      },
    };
  }

  private getWalletUser(
    provider: WalletProvider,
    walletAddress: string = makeWalletAddress(),
    connectedAt: string = new Date().toISOString(),
  ): User {

    return {
      id: `wallet:${provider}:${walletAddress}`,
      provider: `wallet:${provider}`,
      providerUserId: walletAddress,
      metadata: {
        walletProvider: provider,
        walletAddress,
        connectedAt,
      },
    };
  }

  async getUser(): Promise<User | null> {
    if (this.walletUser) {
      return this.walletUser;
    }

    if (!this.baseClient) {
      return null;
    }

    try {
      const user = await this.baseClient.getUser();
      return this.applyLinkedWallet(user);
    } catch (error) {
      if (isMissingSessionError(error)) {
        return null;
      }

      throw error;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    this.walletUser = null;
    this.linkedWallet = null;
    const user = await this.ensureBaseClient().signInWithEmail(email, password);
    this.emit(user);
    return user;
  }

  async signIn(options: SignInOptions): Promise<void> {
    const provider = options.provider?.toLowerCase();

    if (isWalletProvider(provider)) {
      const connectedAt = new Date().toISOString();
      const walletAddress = makeWalletAddress();

      if (this.baseClient) {
        try {
          const baseUser = await this.baseClient.getUser();
          if (baseUser) {
            this.walletUser = null;
            this.linkedWallet = {
              provider,
              walletAddress,
              connectedAt,
            };
            this.emit(this.applyLinkedWallet(baseUser));
            return;
          }
        } catch (error) {
          if (!isMissingSessionError(error)) {
            throw error;
          }
        }
      }

      this.linkedWallet = null;
      this.walletUser = this.getWalletUser(provider, walletAddress, connectedAt);
      this.emit(this.walletUser);
      return;
    }

    this.walletUser = null;
    this.linkedWallet = null;
    await this.ensureBaseClient().signIn({
      provider: options.provider,
      flow: options.flow ?? 'native',
      redirectUri: options.redirectUri,
    });
  }

  async signInWithGoogle(redirectTo?: string): Promise<void> {
    await this.signIn({
      provider: 'google',
      flow: 'native',
      redirectUri: redirectTo,
    });
  }

  async signUpWithEmail(email: string, password: string): Promise<{ needsEmailVerification: boolean }> {
    this.walletUser = null;
    this.linkedWallet = null;
    const supabase = this.ensureSupabase();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(`PROVIDER_ERROR: ${error.message}`);
    }

    const hasSession = Boolean(data.session);

    if (hasSession) {
      this.emit(this.mapSupabaseUser(data.user));
    }

    return {
      needsEmailVerification: !hasSession,
    };
  }

  async signOut(): Promise<void> {
    const hadWallet = Boolean(this.walletUser);
    this.walletUser = null;
    this.linkedWallet = null;

    if (this.baseClient) {
      try {
        await this.baseClient.signOut();
      } catch (error) {
        if (!hadWallet) {
          throw error;
        }
      }
    }

    this.emit(null);
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.listeners.add(callback);

    if (!this.unsubscribeBase && this.baseClient) {
      this.unsubscribeBase = this.baseClient.onAuthStateChange((user) => {
        if (this.walletUser) {
          return;
        }
        this.emit(this.applyLinkedWallet(user));
      });
    }

    void this.getUser().then(callback).catch(() => callback(null));

    return () => {
      this.listeners.delete(callback);

      if (this.listeners.size === 0 && this.unsubscribeBase) {
        this.unsubscribeBase();
        this.unsubscribeBase = null;
      }
    };
  }

  async getSessionToken(): Promise<string | null> {
    if (this.walletUser?.providerUserId) {
      return this.walletUser.providerUserId;
    }

    if (!this.baseClient) {
      return null;
    }

    return this.baseClient.getSessionToken();
  }
}

export const SUPPORTED_WALLET_PROVIDERS = WALLET_PROVIDERS;
