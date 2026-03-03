import type {
  AuthCapabilities,
  AuthClient,
  AuthRuntime,
  OAuthFlow,
  SignInOptions,
  User,
} from "@edcalderon/auth";
import { SupabaseClient as UniversalSupabaseClient } from "@edcalderon/auth/supabase";
import { createClient } from "@supabase/supabase-js";

const WALLET_PROVIDERS = ["metamask", "walletconnect"] as const;
export type WalletProvider = (typeof WALLET_PROVIDERS)[number];

interface LinkedWalletState {
  provider: WalletProvider;
  walletAddress: string;
  connectedAt: string;
  sessionToken: string | null;
  metadata: Record<string, unknown>;
}

export interface WalletConnectionResult {
  walletAddress: string;
  connectedAt?: string;
  sessionToken?: string | null;
  metadata?: Record<string, unknown>;
}

export interface WalletConnectionBridge {
  connect(provider: WalletProvider): Promise<WalletConnectionResult>;
  disconnect?: (provider: WalletProvider, walletAddress: string) => Promise<void>;
}

export interface AlternunMobileAuthClientOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  supabaseAnonKey?: string;
  walletBridge?: WalletConnectionBridge;
  allowMockWalletFallback?: boolean;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isMissingSessionError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("auth session missing");
}

function makeWalletAddress(): string {
  const seed = Math.random()
    .toString(16)
    .replace(".", "")
    .padEnd(40, "0")
    .slice(0, 40);
  return `0x${seed}`;
}

function extractWalletProvider(user: User | null): WalletProvider | null {
  if (!user) {
    return null;
  }

  if (typeof user.provider === "string" && user.provider.startsWith("wallet:")) {
    const provider = user.provider.replace("wallet:", "").toLowerCase();
    if (provider === "metamask" || provider === "walletconnect") {
      return provider;
    }
  }

  const metadata =
    user.metadata && typeof user.metadata === "object"
      ? (user.metadata as Record<string, unknown>)
      : {};

  const providerValue =
    typeof metadata.walletProvider === "string"
      ? metadata.walletProvider.toLowerCase()
      : typeof metadata.wallet_provider === "string"
      ? metadata.wallet_provider.toLowerCase()
      : null;

  if (providerValue === "metamask" || providerValue === "walletconnect") {
    return providerValue;
  }

  return null;
}

function extractWalletAddress(user: User | null): string | null {
  if (!user) {
    return null;
  }

  const metadata =
    user.metadata && typeof user.metadata === "object"
      ? (user.metadata as Record<string, unknown>)
      : {};

  const walletObject =
    typeof metadata.wallet === "object" && metadata.wallet !== null
      ? (metadata.wallet as Record<string, unknown>)
      : null;

  const candidates = [
    metadata.walletAddress,
    metadata.wallet_address,
    metadata.address,
    walletObject?.address,
    walletObject?.walletAddress,
    user.providerUserId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

export function isWalletProvider(provider?: string): provider is WalletProvider {
  return Boolean(
    provider &&
      WALLET_PROVIDERS.includes(provider.toLowerCase() as WalletProvider)
  );
}

export class AlternunMobileAuthClient implements AuthClient {
  runtime: AuthRuntime = "native";

  private baseClient: AuthClient | null;
  private supabase: any = null;
  private listeners: Set<(user: User | null) => void> = new Set();
  private walletUser: User | null = null;
  private linkedWallet: LinkedWalletState | null = null;
  private walletSessionToken: string | null = null;
  private unsubscribeBase: (() => void) | null = null;
  private walletBridge: WalletConnectionBridge | null = null;
  private allowMockWalletFallback: boolean = true;

  constructor(options: AlternunMobileAuthClientOptions) {
    const supabaseKey = options.supabaseKey ?? options.supabaseAnonKey;
    this.walletBridge = options.walletBridge ?? null;
    this.allowMockWalletFallback = options.allowMockWalletFallback ?? true;

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
        runtime: "native",
      });
      this.supabase = supabase;
    } else {
      this.baseClient = null;
      this.supabase = null;
    }
  }

  capabilities(): AuthCapabilities {
    const baseFlows = this.baseClient?.capabilities().supportedFlows ?? [];
    const flowSet = new Set<OAuthFlow>(["native", ...baseFlows]);

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
        "CONFIG_ERROR: Auth is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY."
      );
    }

    return this.baseClient;
  }

  private ensureSupabase(): any {
    if (!this.supabase) {
      throw new Error(
        "CONFIG_ERROR: Auth is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY."
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
      providerUserId:
        user.app_metadata?.provider_id || user.user_metadata?.provider_id,
      metadata: user.user_metadata,
    };
  }

  private applyLinkedWallet(user: User | null): User | null {
    if (!user || !this.linkedWallet) {
      return user;
    }

    const metadata =
      user.metadata && typeof user.metadata === "object"
        ? (user.metadata as Record<string, unknown>)
        : {};

    return {
      ...user,
      metadata: {
        ...metadata,
        walletProvider: this.linkedWallet.provider,
        walletAddress: this.linkedWallet.walletAddress,
        connectedAt: this.linkedWallet.connectedAt,
        ...this.linkedWallet.metadata,
      },
    };
  }

  private getWalletUser(state: LinkedWalletState): User {
    return {
      id: `wallet:${state.provider}:${state.walletAddress}`,
      provider: `wallet:${state.provider}`,
      providerUserId: state.walletAddress,
      metadata: {
        walletProvider: state.provider,
        walletAddress: state.walletAddress,
        connectedAt: state.connectedAt,
        ...state.metadata,
      },
    };
  }

  private async safeGetBaseUser(): Promise<User | null> {
    if (!this.baseClient) {
      return null;
    }

    try {
      return await this.baseClient.getUser();
    } catch (error) {
      if (isMissingSessionError(error)) {
        return null;
      }

      throw error;
    }
  }

  private toLinkedWalletState(
    provider: WalletProvider,
    walletAddress: string,
    connectedAt: string = new Date().toISOString(),
    sessionToken: string | null = null,
    metadata: Record<string, unknown> = {}
  ): LinkedWalletState {
    return {
      provider,
      walletAddress,
      connectedAt,
      sessionToken: sessionToken ?? walletAddress,
      metadata,
    };
  }

  private hydrateWalletStateFromUser(user: User | null): LinkedWalletState | null {
    const provider = extractWalletProvider(user);
    if (!provider) {
      return null;
    }

    const walletAddress = extractWalletAddress(user);
    if (!walletAddress) {
      return null;
    }

    return this.toLinkedWalletState(provider, walletAddress);
  }

  async getUser(): Promise<User | null> {
    if (this.walletUser) {
      return this.walletUser;
    }

    const user = await this.safeGetBaseUser();
    if (!user) {
      return null;
    }

    if (!this.linkedWallet) {
      this.linkedWallet = this.hydrateWalletStateFromUser(user);
    }

    return this.applyLinkedWallet(user);
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    this.walletUser = null;
    this.linkedWallet = null;
    this.walletSessionToken = null;
    const user = await this.ensureBaseClient().signInWithEmail(email, password);
    this.emit(user);
    return user;
  }

  private async signInWalletWithBase(provider: WalletProvider): Promise<boolean> {
    if (!this.baseClient) {
      return false;
    }

    await this.baseClient.signIn({
      provider,
      flow: "native",
    });

    const baseUser = await this.safeGetBaseUser();
    if (!baseUser) {
      return true;
    }

    const linkedWallet =
      this.hydrateWalletStateFromUser(baseUser) ??
      this.toLinkedWalletState(provider, makeWalletAddress());

    this.walletUser = null;
    this.linkedWallet = linkedWallet;
    this.walletSessionToken = linkedWallet.sessionToken;
    this.emit(this.applyLinkedWallet(baseUser));

    return true;
  }

  private async signInWalletWithBridge(provider: WalletProvider): Promise<void> {
    if (!this.walletBridge) {
      throw new Error(
        `UNSUPPORTED_FLOW: ${provider} requires wallet bridge configuration.`
      );
    }

    const result = await this.walletBridge.connect(provider);
    const linkedWallet = this.toLinkedWalletState(
      provider,
      result.walletAddress,
      result.connectedAt,
      result.sessionToken ?? null,
      result.metadata ?? {}
    );

    const baseUser = await this.safeGetBaseUser();
    if (baseUser) {
      this.walletUser = null;
      this.linkedWallet = linkedWallet;
      this.walletSessionToken = linkedWallet.sessionToken;
      this.emit(this.applyLinkedWallet(baseUser));
      return;
    }

    this.linkedWallet = null;
    this.walletUser = this.getWalletUser(linkedWallet);
    this.walletSessionToken = linkedWallet.sessionToken;
    this.emit(this.walletUser);
  }

  private signInWalletWithFallback(provider: WalletProvider): void {
    if (!this.allowMockWalletFallback) {
      throw new Error(
        `UNSUPPORTED_FLOW: ${provider} is not configured. Add a wallet bridge or configure provider auth.`
      );
    }

    const linkedWallet = this.toLinkedWalletState(
      provider,
      makeWalletAddress(),
      new Date().toISOString(),
      null,
      {
        previewWallet: true,
      }
    );

    this.linkedWallet = null;
    this.walletUser = this.getWalletUser(linkedWallet);
    this.walletSessionToken = linkedWallet.sessionToken;
    this.emit(this.walletUser);
  }

  async signIn(options: SignInOptions): Promise<void> {
    const provider = options.provider?.toLowerCase();
    if (!isWalletProvider(provider)) {
      this.walletUser = null;
      this.linkedWallet = null;
      this.walletSessionToken = null;
      await this.ensureBaseClient().signIn({
        provider: options.provider,
        flow: options.flow ?? "native",
        redirectUri: options.redirectUri,
      });
      return;
    }

    this.walletUser = null;
    this.linkedWallet = null;
    this.walletSessionToken = null;

    let baseError: unknown = null;

    try {
      const handledByBase = await this.signInWalletWithBase(provider);
      if (handledByBase) {
        return;
      }
    } catch (error) {
      baseError = error;
    }

    try {
      await this.signInWalletWithBridge(provider);
      return;
    } catch (error) {
      if (!this.walletBridge) {
        this.signInWalletWithFallback(provider);
        return;
      }

      if (baseError) {
        throw new Error(
          `PROVIDER_ERROR: ${getErrorMessage(baseError)} | Wallet bridge fallback failed: ${getErrorMessage(
            error
          )}`
        );
      }

      throw error;
    }
  }

  async signInWithGoogle(redirectTo?: string): Promise<void> {
    await this.signIn({
      provider: "google",
      flow: "native",
      redirectUri: redirectTo,
    });
  }

  async signUpWithEmail(
    email: string,
    password: string
  ): Promise<{ needsEmailVerification: boolean }> {
    this.walletUser = null;
    this.linkedWallet = null;
    this.walletSessionToken = null;
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
    const walletState =
      this.linkedWallet ??
      (this.walletUser
        ? this.hydrateWalletStateFromUser(this.walletUser)
        : null);

    if (walletState && this.walletBridge?.disconnect) {
      try {
        await this.walletBridge.disconnect(
          walletState.provider,
          walletState.walletAddress
        );
      } catch {
        // Ignore bridge disconnect errors to avoid trapping users in signed-in state.
      }
    }

    const hadWallet = Boolean(this.walletUser || this.linkedWallet);
    this.walletUser = null;
    this.linkedWallet = null;
    this.walletSessionToken = null;

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

        if (!this.linkedWallet) {
          this.linkedWallet = this.hydrateWalletStateFromUser(user);
        }

        this.emit(this.applyLinkedWallet(user));
      });
    }

    void this.getUser()
      .then(callback)
      .catch(() => callback(null));

    return () => {
      this.listeners.delete(callback);

      if (this.listeners.size === 0 && this.unsubscribeBase) {
        this.unsubscribeBase();
        this.unsubscribeBase = null;
      }
    };
  }

  async getSessionToken(): Promise<string | null> {
    if (this.walletSessionToken) {
      return this.walletSessionToken;
    }

    if (this.walletUser?.providerUserId) {
      return this.walletUser.providerUserId;
    }

    if (!this.baseClient) {
      return null;
    }

    return this.baseClient.getSessionToken();
  }
}

export function createAlternunMobileAuthClient(
  options: AlternunMobileAuthClientOptions
): AlternunMobileAuthClient {
  return new AlternunMobileAuthClient(options);
}

export const SUPPORTED_WALLET_PROVIDERS = WALLET_PROVIDERS;
