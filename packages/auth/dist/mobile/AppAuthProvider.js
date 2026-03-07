import { AuthProvider as UniversalAuthProvider, useAuth as useUniversalAuth, } from '@edcalderon/auth';
import { createElement, useMemo, } from 'react';
import { AlternunMobileAuthClient, } from './AlternunMobileAuthClient';
const UniversalAuthProviderCompat = UniversalAuthProvider;
export function AppAuthProvider({ children, options, }) {
    var _a, _b, _c, _d;
    const supabaseUrl = (_b = (_a = options === null || options === void 0 ? void 0 : options.supabaseUrl) !== null && _a !== void 0 ? _a : process.env.EXPO_PUBLIC_SUPABASE_URL) !== null && _b !== void 0 ? _b : process.env.EXPO_PUBLIC_SUPABASE_URI;
    const supabaseKey = (_d = (_c = options === null || options === void 0 ? void 0 : options.supabaseKey) !== null && _c !== void 0 ? _c : process.env.EXPO_PUBLIC_SUPABASE_KEY) !== null && _d !== void 0 ? _d : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const walletBridge = options === null || options === void 0 ? void 0 : options.walletBridge;
    const allowMockWalletFallback = options === null || options === void 0 ? void 0 : options.allowMockWalletFallback;
    const allowWalletOnlySession = options === null || options === void 0 ? void 0 : options.allowWalletOnlySession;
    const client = useMemo(() => new AlternunMobileAuthClient({
        supabaseUrl,
        supabaseKey,
        walletBridge,
        allowMockWalletFallback,
        allowWalletOnlySession,
    }), [
        allowMockWalletFallback,
        allowWalletOnlySession,
        supabaseKey,
        supabaseUrl,
        walletBridge,
    ]);
    return createElement(UniversalAuthProviderCompat, { client, }, children);
}
export const useAuth = useUniversalAuth;
