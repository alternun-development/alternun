import { AuthProvider as UniversalAuthProvider, useAuth as useUniversalAuth } from '@edcalderon/auth';
import { createElement, useMemo, } from 'react';
import { createAuthFacade } from '../facade/createAuthFacade.js';
const UniversalAuthProviderCompat = UniversalAuthProvider;
export function AppAuthProvider({ children, options }) {
    const client = useMemo(() => createAuthFacade({
        runtime: {
            supabaseUrl: options === null || options === void 0 ? void 0 : options.supabaseUrl,
            supabaseKey: options === null || options === void 0 ? void 0 : options.supabaseKey,
            allowMockWalletFallback: options === null || options === void 0 ? void 0 : options.allowMockWalletFallback,
            allowWalletOnlySession: options === null || options === void 0 ? void 0 : options.allowWalletOnlySession,
        },
        walletBridge: options === null || options === void 0 ? void 0 : options.walletBridge,
        allowMockWalletFallback: options === null || options === void 0 ? void 0 : options.allowMockWalletFallback,
        allowWalletOnlySession: options === null || options === void 0 ? void 0 : options.allowWalletOnlySession,
    }), [options === null || options === void 0 ? void 0 : options.allowMockWalletFallback, options === null || options === void 0 ? void 0 : options.allowWalletOnlySession, options === null || options === void 0 ? void 0 : options.supabaseKey, options === null || options === void 0 ? void 0 : options.supabaseUrl, options === null || options === void 0 ? void 0 : options.walletBridge]);
    return createElement(UniversalAuthProviderCompat, { client }, children);
}
export const useAuth = useUniversalAuth;
