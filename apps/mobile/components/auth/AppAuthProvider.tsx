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

export function AppAuthProvider({ children }: PropsWithChildren): any {
  const walletBridge = useMemo(() => createWeb3WalletBridge(), []);

  return (
    <AlternunAuthProvider
      options={{
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
