/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import React from 'react';
import * as ReactNative from 'react-native';
import { Linking } from 'react-native';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import DashboardSummaryCards from '../DashboardSummaryCards';
import { type WalletAccountRecord, listWalletAccounts } from '../../wallet/walletApiClient';

jest.mock('react-native', () => require('react-native-web'));

jest.mock('../../wallet/walletApiClient', () => ({
  listWalletAccounts: jest.fn(),
}));

jest.mock('../../i18n/useAppTranslation', () => {
  const translationMap: Record<string, string> = {
    'dashboard.summaryCards.rbi.title': 'Proyección RBI',
    'dashboard.summaryCards.rbi.subtitle': 'Tu proyección estimada',
    'dashboard.summaryCards.rbi.estimatedPool': 'Pool RBI estimado:',
    'dashboard.summaryCards.rbi.eligibleUsers': 'Usuarios elegibles:',
    'dashboard.summaryCards.rbi.airsScore': 'Tu puntaje Airs:',
    'dashboard.summaryCards.rbi.whatIsRbi': '¿Qué es el RBI?',
    'dashboard.summaryCards.rbi.explanation': 'RBI explanation',
    'dashboard.summaryCards.rbi.fullDocumentation': 'Full documentation',
    'dashboard.summaryCards.atn.title': 'Mis ATN',
    'dashboard.summaryCards.atn.subtitle': 'Tus tokens regenerativos',
    'dashboard.summaryCards.atn.availableLabel': 'ATN disponibles',
    'dashboard.summaryCards.atn.availableDesc': 'Listos para usar',
    'dashboard.summaryCards.atn.stackingLabel': 'ATN en stacking',
    'dashboard.summaryCards.atn.stackingDesc': 'Participando en proyectos',
    'dashboard.summaryCards.atn.totalLabel': 'ATN total',
    'dashboard.summaryCards.atn.primaryWalletLabel': 'Wallet principal',
    'dashboard.summaryCards.atn.primaryWalletMeta': 'Interna',
    'dashboard.summaryCards.comingSoon': 'Próximamente',
    'wallet.createButton': 'Create Alternun wallet',
    'wallet.manageWallet': 'Manage wallet',
    'wallet.noWalletAccount': 'No wallet data yet',
  };

  return {
    useAppTranslation: (): {
      t: (key: string, _options?: unknown, fallback?: string) => string;
    } => ({
      t: (key: string, _options?: unknown, fallback?: string): string =>
        translationMap[key] ?? fallback ?? key,
    }),
  };
});

jest.mock('../../../utils/runtimeConfig', () => ({
  resolveMobileApiBaseUrl: (): string => 'http://127.0.0.1:3000',
}));

const mockListWalletAccounts = listWalletAccounts as unknown as jest.MockedFunction<
  typeof listWalletAccounts
>;

type DashboardSummaryCardsProps = React.ComponentProps<typeof DashboardSummaryCards>;
type RenderState = {
  container: HTMLDivElement;
  root: Root;
};

function mockWindowDimensions(width: number): void {
  jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
    width,
    height: 800,
    scale: 2,
    fontScale: 2,
  });
}

function createClient(): NonNullable<DashboardSummaryCardsProps['client']> {
  return {
    getSessionToken: async (): Promise<string | null> => 'session-token',
  };
}

function createWalletAccount(): WalletAccountRecord {
  return {
    isPrimary: true,
    evmAddress: '0x1234567890abcdef1234567890abcdef12345678',
    bitcoinAddress: null,
    solanaAddress: null,
  };
}

async function flushEffects(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function renderDashboardSummaryCards(element: React.ReactElement): RenderState {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    root,
  };
}

function findElementByText(container: HTMLElement, text: string): HTMLElement {
  const elements = Array.from(container.querySelectorAll<HTMLElement>('*'));
  const matches = elements.filter((element) => element.textContent?.includes(text));

  if (matches.length === 0) {
    throw new Error(`Unable to find element containing text: ${text}`);
  }

  matches.sort((a, b) => (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0));
  return matches[0];
}

function clickElementByText(container: HTMLElement, text: string): void {
  const element = findElementByText(container, text);
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

describe('DashboardSummaryCards render', () => {
  const originalFetch = globalThis.fetch;
  let renderState: RenderState | null = null;

  beforeEach(() => {
    mockListWalletAccounts.mockReset();
    renderState = null;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = originalFetch;
    if (renderState) {
      act(() => {
        renderState.root.unmount();
      });
    }
    renderState?.container.remove();
  });

  it('renders the stacked mobile layout without overlapping cards', () => {
    mockWindowDimensions(375);

    renderState = renderDashboardSummaryCards(
      React.createElement(DashboardSummaryCards, {
        isDark: true,
        signedIn: false,
        airsBalance: null,
      })
    );

    expect(renderState.container.textContent).toContain('Mis ATN');
    expect(renderState.container.textContent).toContain('Proyección RBI');
  });

  it('renders the desktop layout above the mobile breakpoint', () => {
    mockWindowDimensions(1024);

    renderState = renderDashboardSummaryCards(
      React.createElement(DashboardSummaryCards, {
        isDark: false,
        signedIn: false,
        airsBalance: null,
      })
    );

    expect(renderState.container.textContent).toContain('Mis ATN');
    expect(renderState.container.textContent).toContain('Proyección RBI');
  });

  it('loads wallet and leaderboard state when signed in and expands the RBI help panel', async () => {
    mockWindowDimensions(375);
    const walletAccount = createWalletAccount();

    mockListWalletAccounts.mockResolvedValueOnce({
      accounts: [walletAccount],
    });

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async (): Promise<{ totalEligibleUsers: number }> => ({
        totalEligibleUsers: 27,
      }),
    }) as unknown as typeof fetch;
    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const navigationCalls: string[] = [];
    renderState = renderDashboardSummaryCards(
      React.createElement(DashboardSummaryCards, {
        isDark: true,
        onNavigate: (key: string): void => {
          navigationCalls.push(key);
        },
        client: createClient(),
        signedIn: true,
        airsBalance: undefined,
      })
    );

    await act(async () => {
      await flushEffects();
      await flushEffects();
    });

    expect(renderState.container.textContent).toContain('Manage wallet');
    expect(renderState.container.textContent).toContain('0x123456...345678');
    expect(renderState.container.textContent).toContain('27');
    expect(renderState.container.textContent).not.toContain('No wallet data yet');

    clickElementByText(renderState.container, '¿Qué es el RBI?');
    expect(renderState.container.textContent).toContain('RBI explanation');

    clickElementByText(renderState.container, 'Full documentation');
    expect(openUrlSpy).toHaveBeenCalledWith(
      'https://docs.alternun.io/docs/tutorial-basics/airs-tu-huella-regenerativa'
    );

    clickElementByText(renderState.container, 'Manage wallet');
    expect(navigationCalls).toContain('mi-perfil:wallet');
  });
});
