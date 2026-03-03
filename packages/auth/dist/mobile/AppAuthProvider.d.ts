import { useAuth as useUniversalAuth } from "@edcalderon/auth";
import { type PropsWithChildren } from "react";
import { type AlternunMobileAuthClientOptions } from "./AlternunMobileAuthClient";
type MobileAuthOverrideOptions = Pick<AlternunMobileAuthClientOptions, "walletBridge" | "allowMockWalletFallback">;
export interface AppAuthProviderProps extends PropsWithChildren {
    options?: MobileAuthOverrideOptions;
}
export declare function AppAuthProvider({ children, options, }: AppAuthProviderProps): any;
export declare const useAuth: typeof useUniversalAuth;
export {};
