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
import {
  getValidationErrorMessage,
  parseEmailAddress,
  parseSignInPassword,
  parseSignUpPassword,
} from "../validation/authInputValidation";

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
  allowWalletOnlySession?: boolean;
}

export interface EmailSignUpResult {
  needsEmailVerification: boolean;
  emailAlreadyRegistered: boolean;
  confirmationEmailSent: boolean;
}

interface WalletMetadataEntry {
  provider: WalletProvider;
  address: string;
  connectedAt: string;
  [key: string]: unknown;
}

interface PostgrestLikeError {
  message: string;
  code?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isEmailAlreadyRegisteredError(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase();
  return (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("user already exists")
  );
}

function isObfuscatedExistingUserSignUpResult(data: any): boolean {
  if (!data || data.session || !data.user) {
    return false;
  }

  const identities = Array.isArray(data.user.identities)
    ? data.user.identities.filter(Boolean)
    : null;

  return Array.isArray(identities) && identities.length === 0;
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
  private allowMockWalletFallback: boolean = false;
  private allowWalletOnlySession: boolean = false;

  constructor(options: AlternunMobileAuthClientOptions) {
    const supabaseKey = options.supabaseKey ?? options.supabaseAnonKey;
    this.walletBridge = options.walletBridge ?? null;
    this.allowMockWalletFallback = options.allowMockWalletFallback ?? false;
    this.allowWalletOnlySession = options.allowWalletOnlySession ?? false;

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

  private buildWalletMetadataPayload(
    baseUser: User,
    linkedWallet: LinkedWalletState
  ): Record<string, unknown> {
    const baseMetadata =
      baseUser.metadata && typeof baseUser.metadata === "object"
        ? (baseUser.metadata as Record<string, unknown>)
        : {};

    const nextWallet: WalletMetadataEntry = {
      provider: linkedWallet.provider,
      address: linkedWallet.walletAddress,
      connectedAt: linkedWallet.connectedAt,
      ...linkedWallet.metadata,
    };

    const existingLinkedWalletsRaw = baseMetadata.linkedWallets;
    const existingLinkedWallets = Array.isArray(existingLinkedWalletsRaw)
      ? existingLinkedWalletsRaw.filter(
          (entry): entry is WalletMetadataEntry =>
            Boolean(entry && typeof entry === "object")
        )
      : [];

    const filteredExisting = existingLinkedWallets.filter((entry) => {
      const providerValue =
        typeof entry.provider === "string" ? entry.provider.toLowerCase() : null;
      const addressValue =
        typeof entry.address === "string" ? entry.address.toLowerCase() : null;

      return !(
        providerValue === linkedWallet.provider &&
        addressValue === linkedWallet.walletAddress.toLowerCase()
      );
    });

    const walletObject =
      typeof baseMetadata.wallet === "object" && baseMetadata.wallet !== null
        ? (baseMetadata.wallet as Record<string, unknown>)
        : {};

    return {
      ...baseMetadata,
      walletProvider: linkedWallet.provider,
      walletAddress: linkedWallet.walletAddress,
      connectedAt: linkedWallet.connectedAt,
      wallet: {
        ...walletObject,
        ...nextWallet,
      },
      linkedWallets: [nextWallet, ...filteredExisting].slice(0, 5),
    };
  }

  private resolveWalletChain(linkedWallet: LinkedWalletState): string {
    const chainCandidate = linkedWallet.metadata.chain;
    if (typeof chainCandidate === "string" && chainCandidate.trim().length > 0) {
      return chainCandidate.trim().toLowerCase();
    }

    if (
      typeof linkedWallet.metadata.chainId === "string" ||
      typeof linkedWallet.metadata.chainId === "number"
    ) {
      return "ethereum";
    }

    return "ethereum";
  }

  private async upsertWalletRegistryEntry(
    baseUser: User,
    linkedWallet: LinkedWalletState
  ): Promise<void> {
    if (!this.supabase) {
      return;
    }

    const chain = this.resolveWalletChain(linkedWallet);
    const walletAddressNormalized = linkedWallet.walletAddress.toLowerCase();
    const { error } = await this.supabase.from("user_wallets").upsert(
      {
        user_id: baseUser.id,
        chain,
        wallet_provider: linkedWallet.provider,
        wallet_address: linkedWallet.walletAddress,
        wallet_address_normalized: walletAddressNormalized,
        is_primary: true,
        linked_at: linkedWallet.connectedAt,
        last_used_at: new Date().toISOString(),
        metadata: linkedWallet.metadata,
      },
      {
        onConflict: "user_id,chain,wallet_address_normalized",
      }
    );

    if (!error) {
      return;
    }

    const typedError = error as PostgrestLikeError;
    if (typedError.code === "42P01") {
      throw new Error(
        "CONFIG_ERROR: Missing public.user_wallets table. Run the wallet schema migration."
      );
    }

    throw new Error(
      `PROVIDER_ERROR: Failed to persist wallet registry record: ${typedError.message}`
    );
  }

  private async persistLinkedWalletOnBaseUser(
    baseUser: User,
    linkedWallet: LinkedWalletState
  ): Promise<User | null> {
    if (!this.supabase) {
      return this.applyLinkedWallet(baseUser);
    }

    await this.upsertWalletRegistryEntry(baseUser, linkedWallet);

    const metadata = this.buildWalletMetadataPayload(baseUser, linkedWallet);
    const { data, error } = await this.supabase.auth.updateUser({
      data: metadata,
    });

    if (error) {
      throw new Error(`PROVIDER_ERROR: Failed to link wallet: ${error.message}`);
    }

    if (!data?.user) {
      return this.applyLinkedWallet(baseUser);
    }

    const mappedUser = this.mapSupabaseUser(data.user);
    return this.applyLinkedWallet(mappedUser);
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
    let normalizedEmail: string;
    let validatedPassword: string;

    try {
      normalizedEmail = parseEmailAddress(email);
      validatedPassword = parseSignInPassword(password);
    } catch (validationError) {
      throw new Error(
        `VALIDATION_ERROR: ${getValidationErrorMessage(
          validationError,
          "Email and password are required."
        )}`
      );
    }

    this.walletUser = null;
    this.linkedWallet = null;
    this.walletSessionToken = null;
    const user = await this.ensureBaseClient().signInWithEmail(
      normalizedEmail,
      validatedPassword
    );
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
      return false;
    }

    const linkedWallet =
      this.hydrateWalletStateFromUser(baseUser);

    if (!linkedWallet) {
      throw new Error(
        "PROVIDER_ERROR: Wallet provider did not return a valid wallet identity."
      );
    }

    this.walletUser = null;
    this.linkedWallet = linkedWallet;
    this.walletSessionToken = linkedWallet.sessionToken;
    this.emit(this.applyLinkedWallet(baseUser));

    return true;
  }

  private async signInWalletWithBridge(
    provider: WalletProvider,
    existingBaseUser: User | null = null
  ): Promise<void> {
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

    const baseUser = existingBaseUser ?? (await this.safeGetBaseUser());
    if (baseUser) {
      this.walletUser = null;
      this.linkedWallet = linkedWallet;
      this.walletSessionToken = linkedWallet.sessionToken;
      const persistedUser = await this.persistLinkedWalletOnBaseUser(
        baseUser,
        linkedWallet
      );
      this.emit(persistedUser ?? this.applyLinkedWallet(baseUser));
      return;
    }

    if (!this.allowWalletOnlySession) {
      throw new Error(
        "UNSUPPORTED_FLOW: Wallet-only login is disabled. Sign in with email or Google first, then connect your wallet."
      );
    }

    this.linkedWallet = null;
    this.walletUser = this.getWalletUser(linkedWallet);
    this.walletSessionToken = linkedWallet.sessionToken;
    this.emit(this.walletUser);
  }

  private signInWalletWithFallback(
    provider: WalletProvider,
    existingBaseUser: User | null = null
  ): void {
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

    if (existingBaseUser) {
      this.walletUser = null;
      this.linkedWallet = linkedWallet;
      this.walletSessionToken = linkedWallet.sessionToken;
      this.emit(this.applyLinkedWallet(existingBaseUser));
      return;
    }

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

    const existingBaseUser = await this.safeGetBaseUser();
    if (existingBaseUser) {
      try {
        await this.signInWalletWithBridge(provider, existingBaseUser);
        return;
      } catch (error) {
        if (!this.walletBridge) {
          this.signInWalletWithFallback(provider, existingBaseUser);
          return;
        }

        throw error;
      }
    }

    // Provider-specific wallet UX (MetaMask / WalletConnect) must be launched by the app bridge first.
    if (this.walletBridge) {
      await this.signInWalletWithBridge(provider);
      return;
    }

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
  ): Promise<EmailSignUpResult> {
    let normalizedEmail: string;
    let validatedPassword: string;
    try {
      normalizedEmail = parseEmailAddress(email);
      validatedPassword = parseSignUpPassword(password);
    } catch (validationError) {
      throw new Error(
        `VALIDATION_ERROR: ${getValidationErrorMessage(
          validationError,
          "Enter a valid email address and password."
        )}`
      );
    }

    this.walletUser = null;
    this.linkedWallet = null;
    this.walletSessionToken = null;
    const supabase = this.ensureSupabase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: validatedPassword,
    });

    if (error) {
      if (isEmailAlreadyRegisteredError(error.message)) {
        return {
          needsEmailVerification: true,
          emailAlreadyRegistered: true,
          confirmationEmailSent: false,
        };
      }

      throw new Error(`PROVIDER_ERROR: ${error.message}`);
    }

    if (isObfuscatedExistingUserSignUpResult(data)) {
      return {
        needsEmailVerification: true,
        emailAlreadyRegistered: true,
        confirmationEmailSent: false,
      };
    }

    const hasSession = Boolean(data.session);

    if (hasSession) {
      this.emit(this.mapSupabaseUser(data.user));
    }

    return {
      needsEmailVerification: !hasSession,
      emailAlreadyRegistered: false,
      confirmationEmailSent: !hasSession,
    };
  }

  async resendEmailConfirmation(email: string): Promise<void> {
    let normalizedEmail: string;
    try {
      normalizedEmail = parseEmailAddress(email);
    } catch (validationError) {
      throw new Error(
        `VALIDATION_ERROR: ${getValidationErrorMessage(
          validationError,
          "Enter a valid email address."
        )}`
      );
    }

    const supabase = this.ensureSupabase();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
    });

    if (error) {
      throw new Error(`PROVIDER_ERROR: ${error.message}`);
    }
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
