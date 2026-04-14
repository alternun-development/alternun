import type { AuthRuntimeConfig } from '../core/types';
export declare function getProcessEnv(): Record<string, string | undefined>;
export declare function resolveAuthRuntime(): 'web' | 'native';
export declare function resolveAuthRuntimeConfig(env?: Record<string, string | undefined>): AuthRuntimeConfig;
export declare function resolveAuthProviderSelection(env?: Record<string, string | undefined>): Pick<AuthRuntimeConfig, 'executionProvider' | 'issuerProvider' | 'emailProvider'>;
