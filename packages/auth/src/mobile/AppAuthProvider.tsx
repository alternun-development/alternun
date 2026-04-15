import {
  AuthProvider as UniversalAuthProvider,
  useAuth as useUniversalAuth,
} from '@edcalderon/auth';
import {
  createElement,
  useMemo,
  type ComponentType,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createAuthFacade } from '../facade/createAuthFacade';
import type { CreateAuthFacadeOptions } from '../facade/createAuthFacade';
import type { AuthClient } from '@edcalderon/auth';

type MobileAuthOverrideOptions = {
  walletBridge?: CreateAuthFacadeOptions['walletBridge'];
  allowMockWalletFallback?: boolean;
  allowWalletOnlySession?: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
};

export interface AppAuthProviderProps extends PropsWithChildren {
  options?: MobileAuthOverrideOptions;
}

type UniversalAuthProviderCompatProps = {
  client: AuthClient;
  children?: ReactNode;
};

const UniversalAuthProviderCompat =
  UniversalAuthProvider as unknown as ComponentType<UniversalAuthProviderCompatProps>;

export function AppAuthProvider({ children, options }: AppAuthProviderProps): ReactElement {
  const client = useMemo(
    () =>
      createAuthFacade({
        runtime: {
          supabaseUrl: options?.supabaseUrl,
          supabaseKey: options?.supabaseKey,
          allowMockWalletFallback: options?.allowMockWalletFallback,
          allowWalletOnlySession: options?.allowWalletOnlySession,
        },
        walletBridge: options?.walletBridge,
        allowMockWalletFallback: options?.allowMockWalletFallback,
        allowWalletOnlySession: options?.allowWalletOnlySession,
      }),
    [
      options?.allowMockWalletFallback,
      options?.allowWalletOnlySession,
      options?.supabaseKey,
      options?.supabaseUrl,
      options?.walletBridge,
    ]
  );

  return createElement(UniversalAuthProviderCompat, { client }, children);
}

export const useAuth = useUniversalAuth;
