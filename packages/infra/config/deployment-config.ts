import fs from 'node:fs';
import type { PipelineLocalConfig } from './pipelines/types.js';
import type { AdminSiteLocalConfig } from '../modules/admin-site.js';
import type { BackendApiLocalConfig } from '../modules/backend-api.js';
import type { IdentityLocalConfig } from '../modules/identity.js';

export interface ExpoLocalConfig {
  appPath?: string;
  subdomain?: string;
  enableCustomDomain?: boolean;
  requirePublicAuthEnv?: boolean;
  domains?: {
    production?: string;
    dev?: string;
    mobile?: string;
  };
  certArns?: {
    production?: string;
    dev?: string;
    mobile?: string;
  };
  build?: {
    command?: string;
    output?: string;
  };
  publicEnv?: {
    supabaseUrl?: string;
    supabaseKey?: string;
    walletConnectProjectId?: string;
    walletConnectChainId?: string;
    enableMockWalletAuth?: boolean;
    enableWalletOnlyAuth?: boolean;
    authentikIssuer?: string;
    authentikClientId?: string;
    authentikRedirectUri?: string;
  };
}

export interface RedirectLocalConfig {
  enableAirsToDev?: boolean;
  airsToDevSourceDomain?: string;
  enableDevToTestnet?: boolean;
  devToTestnetSourceDomain?: string;
  enableRootDomainRedirect?: boolean;
  rootDomainTarget?: string;
  certArns?: {
    airsToDev?: string;
    rootDomain?: string;
    devToTestnet?: string;
  };
}

export interface LocalDeploymentConfig {
  appName?: string;
  rootDomain?: string;
  pipeline?: PipelineLocalConfig;
  expo?: ExpoLocalConfig;
  backend?: {
    api?: BackendApiLocalConfig;
  };
  admin?: AdminSiteLocalConfig;
  redirects?: RedirectLocalConfig;
  identity?: IdentityLocalConfig;
}

export function readLocalDeploymentConfig(configPath: string): LocalDeploymentConfig {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw) as LocalDeploymentConfig;
  } catch {
    throw new Error(`Invalid JSON in INFRA_CONFIG_PATH file: ${configPath}`);
  }
}
