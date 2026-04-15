import type { AuthRuntimeConfig } from '../core/types';
import type { AuthLogger, CreateAuthFacadeInput, IdentityRepository } from '../core/contracts';
import { AlternunAuthFacade } from './AlternunAuthFacade';
export interface CreateAuthFacadeOptions {
    runtime?: Partial<AuthRuntimeConfig> & {
        env?: Record<string, string | undefined>;
    };
    executionProvider?: CreateAuthFacadeInput['executionProvider'];
    issuerProvider?: CreateAuthFacadeInput['issuerProvider'];
    emailProvider?: CreateAuthFacadeInput['emailProvider'];
    identityRepository?: IdentityRepository;
    walletBridge?: CreateAuthFacadeInput['walletBridge'];
    allowMockWalletFallback?: boolean;
    allowWalletOnlySession?: boolean;
    logger?: AuthLogger;
    fetchFn?: typeof fetch;
}
export declare function createAuthFacade(options?: CreateAuthFacadeOptions): AlternunAuthFacade;
