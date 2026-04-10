import type {
  WalletConnectionBridge,
  WalletConnectionResult,
  WalletProvider,
} from '@alternun/auth';
import { Platform, } from 'react-native';
import type { EthereumProvider, } from '@walletconnect/ethereum-provider';

interface Eip1193RequestArguments {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

interface Eip1193Provider {
  request: (args: Eip1193RequestArguments) => Promise<unknown>;
  isMetaMask?: boolean;
  isWalletConnect?: boolean;
  providers?: Eip1193Provider[];
}

interface WalletConnectEip1193Provider extends Eip1193Provider {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  session?: unknown;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

function getErrorMessage(error: unknown,): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error,);
}

function normalizeWalletAddress(result: unknown,): string {
  if (Array.isArray(result,)) {
    const first = result.find((entry,) => typeof entry === 'string',);
    if (typeof first === 'string' && first.length > 0) {
      return first;
    }
  }

  throw new Error('PROVIDER_ERROR: Wallet did not return an account address.',);
}

function getInjectedProviderCandidates(): Eip1193Provider[] {
  if (!window?.ethereum) {
    return [];
  }

  const rootProvider = window.ethereum;
  if (Array.isArray(rootProvider.providers,) && rootProvider.providers.length > 0) {
    return rootProvider.providers;
  }

  return [rootProvider,];
}

function getProviderHint(provider: WalletProvider,): string {
  if (provider === 'metamask') {
    return 'Install MetaMask browser extension and unlock it, then retry.';
  }

  return 'Set EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID and retry to open WalletConnect QR.';
}

function pickInjectedProvider(provider: WalletProvider,): Eip1193Provider | null {
  const candidates = getInjectedProviderCandidates();

  if (provider === 'metamask') {
    const explicitMetaMask = candidates.find((candidate,) => candidate.isMetaMask,);
    if (explicitMetaMask) {
      return explicitMetaMask;
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    if (window?.ethereum) {
      return window.ethereum;
    }

    return null;
  }

  return null;
}

let walletConnectProvider: WalletConnectEip1193Provider | null = null;

function getWalletConnectChainId(): number {
  const rawChainId = process.env.EXPO_PUBLIC_WALLETCONNECT_CHAIN_ID ?? '1';
  const parsed = Number.parseInt(rawChainId, 10,);
  if (Number.isNaN(parsed,) || parsed <= 0) {
    return 1;
  }
  return parsed;
}

async function getWalletConnectProvider(): Promise<WalletConnectEip1193Provider> {
  if (walletConnectProvider) {
    return walletConnectProvider;
  }

  const projectId = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (!projectId || projectId.trim().length === 0) {
    throw new Error(
      'UNSUPPORTED_FLOW: Missing EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID in environment.',
    );
  }

  const module = await import('@walletconnect/ethereum-provider');
  const EthereumProviderConstructor = module.EthereumProvider;
  const provider = (await EthereumProviderConstructor.init({
    projectId,
    chains: [getWalletConnectChainId(),],
    showQrModal: true,
    methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData', 'eth_signTypedData_v4',],
  },)) as unknown as WalletConnectEip1193Provider;

  walletConnectProvider = provider;
  return provider;
}

async function connectInjectedWallet(
  provider: Eip1193Provider,
  providerName: WalletProvider,
): Promise<WalletConnectionResult> {
  try {
    const accountResult = await provider.request({
      method: 'eth_requestAccounts',
    },);
    const walletAddress = normalizeWalletAddress(accountResult,);
    const chainResult = await provider.request({ method: 'eth_chainId', },);
    const chainId = typeof chainResult === 'string' ? chainResult : null;

    return {
      walletAddress,
      connectedAt: new Date().toISOString(),
      sessionToken: walletAddress,
      metadata: {
        web3Provider: providerName,
        chainId,
        transport: 'eip1193',
      },
    };
  } catch (error) {
    throw new Error(`PROVIDER_ERROR: ${getErrorMessage(error,)}`,);
  }
}

function getUnsupportedNativeMessage(provider: WalletProvider,): string {
  const providerName = provider === 'metamask' ? 'MetaMask' : 'WalletConnect';
  return `UNSUPPORTED_FLOW: ${providerName} native login is not configured yet. Use web wallet login or configure native wallet bridge.`;
}

export function createWeb3WalletBridge(): WalletConnectionBridge {
  return {
    async connect(provider,): Promise<WalletConnectionResult> {
      if (Platform.OS !== 'web') {
        throw new Error(getUnsupportedNativeMessage(provider,),);
      }

      if (provider === 'walletconnect') {
        const wcProvider = await getWalletConnectProvider();
        if (!wcProvider.session) {
          await wcProvider.connect();
        }
        return connectInjectedWallet(wcProvider, provider,);
      }

      const selectedProvider = pickInjectedProvider(provider,);
      if (!selectedProvider) {
        throw new Error(
          `UNSUPPORTED_FLOW: ${getProviderHint(provider,)}`,
        );
      }

      return connectInjectedWallet(selectedProvider, provider,);
    },
    async disconnect(provider,): Promise<void> {
      if (provider !== 'walletconnect') {
        return;
      }

      if (!walletConnectProvider) {
        return;
      }

      try {
        await walletConnectProvider.disconnect();
      } finally {
        walletConnectProvider = null;
      }
    },
  };
}
