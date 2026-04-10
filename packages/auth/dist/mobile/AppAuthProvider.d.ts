import { useAuth as useUniversalAuth } from '@edcalderon/auth';
import { type PropsWithChildren, type ReactElement } from 'react';
import { type AlternunMobileAuthClientOptions } from './AlternunMobileAuthClient';
type MobileAuthOverrideOptions = Pick<AlternunMobileAuthClientOptions, 'walletBridge' | 'allowMockWalletFallback' | 'allowWalletOnlySession' | 'supabaseUrl' | 'supabaseKey'>;
export interface AppAuthProviderProps extends PropsWithChildren {
    options?: MobileAuthOverrideOptions;
}
export declare function AppAuthProvider({ children, options }: AppAuthProviderProps): ReactElement;
export declare const useAuth: typeof useUniversalAuth;
export {};
