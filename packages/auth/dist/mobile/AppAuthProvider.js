import { jsx as _jsx } from "react/jsx-runtime";
import { AuthProvider as UniversalAuthProvider, useAuth as useUniversalAuth, } from "@edcalderon/auth";
import { useMemo } from "react";
import { AlternunMobileAuthClient, } from "./AlternunMobileAuthClient";
export function AppAuthProvider({ children, options, }) {
    var _a;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = (_a = process.env.EXPO_PUBLIC_SUPABASE_KEY) !== null && _a !== void 0 ? _a : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const walletBridge = options === null || options === void 0 ? void 0 : options.walletBridge;
    const allowMockWalletFallback = options === null || options === void 0 ? void 0 : options.allowMockWalletFallback;
    const client = useMemo(() => new AlternunMobileAuthClient({
        supabaseUrl,
        supabaseKey,
        walletBridge,
        allowMockWalletFallback,
    }), [allowMockWalletFallback, supabaseKey, supabaseUrl, walletBridge]);
    return (_jsx(UniversalAuthProvider, { client: client, children: children }));
}
export const useAuth = useUniversalAuth;
