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
  "walletBridge" | "allowMockWalletFallback"
>;

export interface AppAuthProviderProps extends PropsWithChildren {
  options?: MobileAuthOverrideOptions;
}

export function AppAuthProvider({
  children,
  options,
}: AppAuthProviderProps): any {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.EXPO_PUBLIC_SUPABASE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const walletBridge = options?.walletBridge;
  const allowMockWalletFallback = options?.allowMockWalletFallback;

  const client = useMemo(
    () =>
      new AlternunMobileAuthClient({
        supabaseUrl,
        supabaseKey,
        walletBridge,
        allowMockWalletFallback,
      }),
    [allowMockWalletFallback, supabaseKey, supabaseUrl, walletBridge]
  );

  return (
    <UniversalAuthProvider client={client}>{children}</UniversalAuthProvider>
  );
}

export const useAuth = useUniversalAuth;
