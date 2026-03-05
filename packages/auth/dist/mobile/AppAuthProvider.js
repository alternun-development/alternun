import { jsx as _jsx } from "react/jsx-runtime";
import { AuthProvider as UniversalAuthProvider, useAuth as useUniversalAuth, } from "@edcalderon/auth";
import { useMemo } from "react";
import { AlternunMobileAuthClient, } from "./AlternunMobileAuthClient";
export function AppAuthProvider({ children, options, }) {
    var _a, _b, _c;
    const supabaseUrl = (_a = options === null || options === void 0 ? void 0 : options.supabaseUrl) !== null && _a !== void 0 ? _a : process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = (_c = (_b = options === null || options === void 0 ? void 0 : options.supabaseKey) !== null && _b !== void 0 ? _b : process.env.EXPO_PUBLIC_SUPABASE_KEY) !== null && _c !== void 0 ? _c : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
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
    return (_jsx(UniversalAuthProvider, { client: client, children: children }));
}
export const useAuth = useUniversalAuth;
