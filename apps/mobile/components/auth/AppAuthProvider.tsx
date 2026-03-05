import {
  AppAuthProvider as AlternunAuthProvider,
  useAuth as useAlternunAuth,
} from '@alternun/auth';
import { useMemo, type PropsWithChildren } from 'react';
import { createWeb3WalletBridge } from './walletBridge';

function getAllowMockWalletFallback(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_MOCK_WALLET_AUTH === 'true';
}

function getAllowWalletOnlySession(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_WALLET_ONLY_AUTH === 'true';
}

function getSupabaseUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_SUPABASE_URL;
}

function getSupabaseKey(): string | undefined {
  return process.env.EXPO_PUBLIC_SUPABASE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
}

export function AppAuthProvider({ children }: PropsWithChildren): any {
  const walletBridge = useMemo(() => createWeb3WalletBridge(), []);

  return (
    <AlternunAuthProvider
      options={{
        supabaseUrl: getSupabaseUrl(),
        supabaseKey: getSupabaseKey(),
        walletBridge,
        allowMockWalletFallback: getAllowMockWalletFallback(),
        allowWalletOnlySession: getAllowWalletOnlySession(),
      }}
    >
      {children}
    </AlternunAuthProvider>
  );
}

export const useAuth = useAlternunAuth;
export type { OAuthFlow, User } from '@alternun/auth';
