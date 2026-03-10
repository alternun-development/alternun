import {
  AuthProvider as UniversalAuthProvider,
  useAuth as useUniversalAuth,
} from '@edcalderon/auth';
import {
  createElement,
  useMemo,
  type ComponentType,
  type PropsWithChildren,
  type ReactNode,
  type ReactElement,
} from 'react';
import {
  AlternunMobileAuthClient,
  type AlternunMobileAuthClientOptions,
} from './AlternunMobileAuthClient';

type MobileAuthOverrideOptions = Pick<
  AlternunMobileAuthClientOptions,
  | 'walletBridge'
  | 'allowMockWalletFallback'
  | 'allowWalletOnlySession'
  | 'supabaseUrl'
  | 'supabaseKey'
>;

export interface AppAuthProviderProps extends PropsWithChildren {
  options?: MobileAuthOverrideOptions;
}

type UniversalAuthProviderCompatProps = {
  client: AlternunMobileAuthClient;
  children?: ReactNode;
};

const UniversalAuthProviderCompat =
  UniversalAuthProvider as unknown as ComponentType<UniversalAuthProviderCompatProps>;

export function AppAuthProvider({ children, options }: AppAuthProviderProps): ReactElement {
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
    [allowMockWalletFallback, allowWalletOnlySession, supabaseKey, supabaseUrl, walletBridge]
  );

  return createElement(UniversalAuthProviderCompat, { client }, children);
}

export const useAuth = useUniversalAuth;
