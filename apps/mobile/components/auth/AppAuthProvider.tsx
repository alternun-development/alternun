import {
  AuthProvider as UniversalAuthProvider,
  useAuth as useUniversalAuth,
} from "@edcalderon/auth";
import { useMemo, type PropsWithChildren } from "react";
import { AlternunMobileAuthClient } from "./AlternunMobileAuthClient";

export function AppAuthProvider({ children }: PropsWithChildren): any {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.EXPO_PUBLIC_SUPABASE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const client = useMemo(
    () =>
      new AlternunMobileAuthClient({
        supabaseUrl,
        supabaseKey,
      }),
    [supabaseKey, supabaseUrl]
  );

  return (
    <UniversalAuthProvider client={client}>{children}</UniversalAuthProvider>
  );
}

export const useAuth = useUniversalAuth;
