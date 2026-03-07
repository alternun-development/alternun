import {
  AuthProvider as UniversalAuthProvider,
  useAuth as useUniversalAuth,
} from "@edcalderon/auth";
import { useMemo, type PropsWithChildren } from "react";
import {
  AlternunMobileAuthClient,
  type AlternunMobileAuthClientOptions,
} from "./AlternunMobileAuthClient";

type MobileAuthOverrideOptions = Pick<
  AlternunMobileAuthClientOptions,
  | "walletBridge"
  | "allowMockWalletFallback"
  | "allowWalletOnlySession"
  | "supabaseUrl"
  | "supabaseKey"
>;

export interface AppAuthProviderProps extends PropsWithChildren {
  options?: MobileAuthOverrideOptions;
}

export function AppAuthProvider({
  children,
  options,
}: AppAuthProviderProps): any {
  const supabaseUrl =
    options?.supabaseUrl ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URI;
  const supabaseKey =
    options?.supabaseKey ??
    process.env.EXPO_PUBLIC_SUPABASE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const walletBridge = options?.walletBridge;
  const allowMockWalletFallback = options?.allowMockWalletFallback;
  const allowWalletOnlySession = options?.allowWalletOnlySession;

  const client = useMemo(
    () =>
      new AlternunMobileAuthClient({
        supabaseUrl,
        supabaseKey,
        walletBridge,
        allowMockWalletFallback,
        allowWalletOnlySession,
      }),
    [
      allowMockWalletFallback,
      allowWalletOnlySession,
      supabaseKey,
      supabaseUrl,
      walletBridge,
    ]
  );

  return (
    <UniversalAuthProvider client={client}>{children}</UniversalAuthProvider>
  );
}

export const useAuth = useUniversalAuth;
