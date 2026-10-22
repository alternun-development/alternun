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
    'dashboard.summaryCards.rbi.subtitle': 'Factor de participación (FP)',
    'dashboard.summaryCards.rbi.eligibleAirs': 'AIRS equivalentes',
    'dashboard.summaryCards.rbi.eligibleUsers': 'Usuarios elegibles',
    'dashboard.summaryCards.rbi.aliquot': 'Alícuota',
    'dashboard.summaryCards.rbi.notAvailable': 'Aún no disponible',
    'dashboard.summaryCards.rbi.estimated': 'estimado',
    'dashboard.summaryCards.rbi.participationNote': 'Para entender cómo funciona el FP, lee la',
    'dashboard.summaryCards.rbi.whatIsRbi': '¿Qué es el RBI?',
    'dashboard.summaryCards.rbi.explanation': 'RBI explanation',
    'dashboard.summaryCards.rbi.fullDocumentation': 'Full documentation',
    'dashboard.summaryCards.metricInfo.openLabel': 'Más información sobre {{metric}}',
    'dashboard.summaryCards.metricInfo.closeLabel': 'Cerrar',
    'dashboard.summaryCards.metricInfo.atnBalanceTitle': 'Saldo ATN',
    'dashboard.summaryCards.metricInfo.atnBalance':
      'Es tu saldo ATN disponible, informado por tu cuenta de recompensas.',
    'dashboard.summaryCards.metricInfo.participationFactor':
      'Es el factor de participación aplicado a tus AIRS según los Términos y Condiciones.',
    'dashboard.summaryCards.metricInfo.eligibleAirs': 'AIRS equivalentes = AIRS × FP.',
    'dashboard.summaryCards.metricInfo.eligibleUsers':
      'Es el total de usuarios elegibles informado por el sistema para la proyección RBI.',
    'dashboard.summaryCards.metricInfo.aliquot':
      'Alícuota = mis AIRS elegibles / suma de AIRS elegibles × 100 %.',
    'dashboard.summaryCards.atn.title': 'Mis ATN y recompensas regenerativas',
    'dashboard.summaryCards.atn.subtitle': 'Tus saldos de recompensas',
    'dashboard.summaryCards.atn.assetName': 'ATN',
    'dashboard.summaryCards.atn.primaryWalletLabel': 'Billetera de recompensas principal',
    'dashboard.summaryCards.atn.primaryWalletMeta': 'Interna',
    'dashboard.summaryCards.atn.redeemAction': 'Redimir y operar',
    'dashboard.summaryCards.comingSoon': 'Próximamente',
    'profile.wallet.createButton': 'Crear billetera de recompensas',
    'profile.wallet.manageWallet': 'Gestionar billetera de recompensas',
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

function mockWindowDimensions(width: number, fontScale = 1): void {
  jest.spyOn(ReactNative, 'useWindowDimensions').mockReturnValue({
    width,
    height: 800,
    scale: 2,
    fontScale,
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

function getElementByTestId(container: HTMLElement, testID: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-testid="${testID}"]`);

  if (!element) {
    throw new Error(`Unable to find element with testID ${testID}`);
  }

  return element;
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

  it('uses panelized mobile styles at narrow and wide-mobile viewports', () => {
    mockWindowDimensions(375, 2);
    renderState = renderDashboardSummaryCards(
      React.createElement(DashboardSummaryCards, {
        isDark: true,
        signedIn: false,
        airsBalance: null,
      })
    );

    const narrowStatus = getElementByTestId(renderState.container, 'dashboard-rbi-status');
    const narrowMetric = getElementByTestId(renderState.container, 'dashboard-rbi-eligible-airs');
    const narrowAtnMetric = getElementByTestId(renderState.container, 'dashboard-atn-asset-atn');

    expect(narrowStatus.className).not.toBe('');
    expect(narrowMetric.className).not.toBe('');
    expect(narrowAtnMetric.className).not.toBe('');

    act(() => {
      renderState?.root.unmount();
    });
    renderState.container.remove();

    mockWindowDimensions(600, 1);
    renderState = renderDashboardSummaryCards(
      React.createElement(DashboardSummaryCards, {
        isDark: true,
        signedIn: false,
        airsBalance: null,
      })
    );

    const wideStatus = getElementByTestId(renderState.container, 'dashboard-rbi-status');
    const wideMetric = getElementByTestId(renderState.container, 'dashboard-rbi-eligible-airs');
    const wideAtnMetric = getElementByTestId(renderState.container, 'dashboard-atn-asset-atn');

    expect(wideStatus.className).toBe(narrowStatus.className);
    expect(wideMetric.className).not.toBe(narrowMetric.className);
    expect(wideAtnMetric.className).not.toBe(narrowAtnMetric.className);
  });

  it('sizes mobile cards to their content instead of collapsing to minHeight', () => {
    // Regression test: SummaryCard applies `typeof minHeight === 'number' ? {
    // flex: 1 } : { flex: 0 }` after styles.cardMobile. On mobile, minHeight
    // is undefined (only the desktop layout passes a numeric minHeight), so
    // this resolved to `{ flex: 0 }` — which, like `flex: 1`, still compiles
    // to CSS flex-basis: 0%. In a shrink-wrapped mobile slot with no
    // available space to grow into, that collapsed the card to exactly its
    // `minHeight` (100) instead of its content height, so the hero pill,
    // stat rows, and button all rendered visually outside the card's own
    // border. Confirmed via a live browser: card height was 100px (should be
    // ~429px) and the pill's bottom edge sat 39px past the card's own.
    mockWindowDimensions(390);

    renderState = renderDashboardSummaryCards(
      React.createElement(DashboardSummaryCards, {
        isDark: true,
        signedIn: false,
        airsBalance: null,
      })
    );

    const rbiCard = getElementByTestId(renderState.container, 'dashboard-rbi-card');
    const atnCard = getElementByTestId(renderState.container, 'dashboard-atn-card');

    for (const card of [rbiCard, atnCard]) {
      const computed = getComputedStyle(card);
      expect(computed.flexBasis).toBe('auto');
    }
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
    expect(
      getComputedStyle(getElementByTestId(renderState.container, 'dashboard-rbi-card')).minHeight
    ).toBe('480px');
    expect(
      getComputedStyle(getElementByTestId(renderState.container, 'dashboard-atn-card')).minHeight
    ).toBe('100px');
  });

  it('renders the participation factor marker, metrics, and terms link', async () => {
    mockWindowDimensions(1024);
    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    renderState = renderDashboardSummaryCards(
      React.createElement(DashboardSummaryCards, {
        isDark: false,
        signedIn: false,
        airsBalance: 200,
        participationFactor: 0.15,
        communityEligibleAirs: 300,
      })
    );
    await act(async () => {
      await flushEffects();
    });

    const factorBar = getElementByTestId(renderState.container, 'dashboard-rbi-factor-progress');
    const factorMarker = getElementByTestId(renderState.container, 'dashboard-rbi-factor-marker');
    expect(factorBar.getAttribute('role')).toBe('progressbar');
    expect(factorBar.getAttribute('aria-label')).toBe('Factor de participación (FP)');
    expect(factorBar.getAttribute('aria-valuemin')).toBe('0');
    expect(factorBar.getAttribute('aria-valuemax')).toBe('100');
    expect(factorBar.getAttribute('aria-valuenow')).toBe('15');
    expect(factorBar.getAttribute('aria-valuetext')).toBe('FP 15 %');
    expect(
      getElementByTestId(renderState.container, 'dashboard-rbi-status').getAttribute('role')
    ).toBeNull();
    expect(factorMarker.style.left).toBe('15%');
    expect(
      [0, 15, 50, 100].map(
        (mark) =>
          getElementByTestId(
            renderState?.container ?? document.body,
            `dashboard-rbi-factor-mark-${mark}`
          ).textContent
      )
    ).toEqual(['0 %', '15 %', '50 %', '100 %']);
    expect(
      getElementByTestId(renderState.container, 'dashboard-rbi-eligible-airs').textContent
    ).toContain('30');
    expect(
      getElementByTestId(renderState.container, 'dashboard-rbi-eligible-users').textContent
    ).toContain('—');
    expect(
      getElementByTestId(renderState.container, 'dashboard-rbi-aliquot').textContent
    ).toContain('10.00 %');

    clickElementByText(renderState.container, 'Full documentation');
    expect(openUrlSpy).toHaveBeenCalledWith(
      'https://docs.alternun.io/docs/tutorial-basics/airs-tu-huella-regenerativa'
    );
  });

  it('labels a provisional participation factor as estimated', () => {
    mockWindowDimensions(1024);

    renderState = renderDashboardSummaryCards(
      React.createElement(DashboardSummaryCards, {
        isDark: false,
        signedIn: false,
        airsBalance: 200,
        participationFactor: 0.5,
        participationFactorEstimated: true,
        communityEligibleAirs: 400,
      })
    );

    expect(
      getElementByTestId(renderState.container, 'dashboard-rbi-factor-value').textContent
    ).toBe('FP 50 % · estimado');
    expect(
      getElementByTestId(renderState.container, 'dashboard-rbi-eligible-airs').textContent
    ).toContain('100');
    expect(
      getElementByTestId(renderState.container, 'dashboard-rbi-aliquot').textContent
    ).toContain('25.00 %');
  });

  it('renders an unavailable neutral factor state without false values', () => {
    mockWindowDimensions(375);

    renderState = renderDashboardSummaryCards(
      React.createElement(DashboardSummaryCards, {
        isDark: true,
        signedIn: false,
        airsBalance: 200,
        participationFactor: null,
        communityEligibleAirs: null,
      })
    );

    const factorBar = getElementByTestId(renderState.container, 'dashboard-rbi-factor-progress');
    const neutralTrack = getElementByTestId(renderState.container, 'dashboard-rbi-factor-track');
    expect(factorBar.getAttribute('aria-valuetext')).toBe('Aún no disponible');
    expect(factorBar.getAttribute('aria-disabled')).toBe('true');
    expect(factorBar.getAttribute('aria-valuenow')).toBeNull();
    expect(
      renderState.container.querySelector('[data-testid="dashboard-rbi-factor-fill"]')
    ).toBeNull();
    expect(getComputedStyle(neutralTrack).backgroundColor).toBe('rgb(113, 128, 158)');
    for (const mark of [0, 15, 50, 100]) {
      const label = getElementByTestId(
        renderState.container,
        `dashboard-rbi-factor-mark-label-${mark}`
      );
      expect(getComputedStyle(label).color).toBe('rgb(208, 216, 232)');
    }
    expect(
      renderState.container.querySelector('[data-testid="dashboard-rbi-factor-marker"]')
    ).toBeNull();
    expect(
      getElementByTestId(renderState.container, 'dashboard-rbi-eligible-airs').textContent
    ).toContain('—');
    expect(
      getElementByTestId(renderState.container, 'dashboard-rbi-aliquot').textContent
    ).toContain('—');
    expect(renderState.container.textContent).not.toContain('Pool RBI estimado');
    expect(renderState.container.textContent).not.toContain('Tu puntaje Airs');
  });

  it('uses the high-contrast neutral factor colors in the light theme', () => {
    mockWindowDimensions(1024);

    renderState = renderDashboardSummaryCards(
      React.createElement(DashboardSummaryCards, {
        isDark: false,
        signedIn: false,
        airsBalance: null,
        participationFactor: null,
      })
    );

    const neutralTrack = getElementByTestId(renderState.container, 'dashboard-rbi-factor-track');
    expect(getComputedStyle(neutralTrack).backgroundColor).toBe('rgb(100, 116, 139)');
    for (const mark of [0, 15, 50, 100]) {
      const label = getElementByTestId(
        renderState.container,
        `dashboard-rbi-factor-mark-label-${mark}`
      );
      expect(getComputedStyle(label).color).toBe('rgb(71, 85, 105)');
    }
  });

  it('renders ATN first, appends reward assets, and keeps future actions disabled', () => {
    mockWindowDimensions(1024);

    renderState = renderDashboardSummaryCards(
      React.createElement(DashboardSummaryCards, {
        isDark: false,
        signedIn: false,
        airsBalance: null,
        rewardAssets: [
          {
            id: 'future-reward',
            name: 'Recompensa futura',
            value: '—',
            icon: React.createElement(ReactNative.View),
          },
          {
            id: 'atn',
            name: 'ATN',
            value: null,
            icon: React.createElement(ReactNative.View),
          },
        ],
      })
    );

    const assetRows = Array.from(
      renderState.container.querySelectorAll<HTMLElement>('[data-testid^="dashboard-atn-asset-"]')
    );
    expect(assetRows.map((row) => row.dataset.testid)).toEqual([
      'dashboard-atn-asset-atn',
      'dashboard-atn-asset-future-reward',
    ]);
    expect(assetRows[0]?.textContent).toContain('Próximamente');
    expect(renderState.container.textContent).toContain('Recompensa futura');
    expect(renderState.container.textContent).toContain('Mis ATN y recompensas regenerativas');
    expect(
      renderState.container.querySelector('[data-testid="dashboard-atn-stacking"]')
    ).toBeNull();
    expect(renderState.container.textContent).not.toContain('dashboard.summaryCards.atn.stacking');
    expect(renderState.container.textContent).not.toContain(
      'dashboard.summaryCards.atn.totalLabel'
    );
    expect(assetRows[0]?.querySelector('[role="img"][aria-label="ATN"]')).not.toBeNull();

    const redeemAction = getElementByTestId(renderState.container, 'dashboard-atn-redeem-action');
    const atnHeader = getElementByTestId(renderState.container, 'dashboard-atn-header');
    expect(redeemAction.getAttribute('aria-disabled')).toBe('true');
    expect(atnHeader.contains(redeemAction)).toBe(true);
    expect(redeemAction.textContent).toContain('Redimir y operar');
    expect(redeemAction.textContent).toContain('Próximamente');
    expect(renderState.container.textContent).toContain('Billetera de recompensas principal');
    expect(renderState.container.textContent).toContain('Crear billetera de recompensas');
    expect(renderState.container.textContent?.toLowerCase()).not.toContain('wallet');
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

    expect(renderState.container.textContent).toContain('Gestionar billetera de recompensas');
    expect(renderState.container.textContent).not.toContain('Manage rewards wallet');
    expect(renderState.container.textContent).not.toContain(
      '0x1234567890abcdef1234567890abcdef12345678'
    );
    expect(renderState.container.textContent).not.toContain('0x123456...345678');
    expect(renderState.container.textContent).toContain('27');
    expect(renderState.container.textContent).not.toContain(
      'Aún no hay datos de tu billetera de recompensas'
    );

    clickElementByText(renderState.container, '¿Qué es el RBI?');
    expect(renderState.container.textContent).toContain('RBI explanation');

    clickElementByText(renderState.container, 'Full documentation');
    expect(openUrlSpy).toHaveBeenCalledWith(
      'https://docs.alternun.io/docs/tutorial-basics/airs-tu-huella-regenerativa'
    );

    clickElementByText(renderState.container, 'Gestionar billetera de recompensas');
    expect(navigationCalls).toContain('mi-perfil:wallet');
  });

  it('shows accessible help for every ATN and RBI metric', () => {
    mockWindowDimensions(1024);

    renderState = renderDashboardSummaryCards(
      React.createElement(DashboardSummaryCards, {
        isDark: false,
        signedIn: false,
        airsBalance: 200,
        participationFactor: 0.15,
        communityEligibleAirs: 300,
      })
    );

    const metrics = [
      ['atn-balance', 'Es tu saldo ATN disponible'],
      ['participation-factor', 'factor de participación aplicado'],
      ['eligible-airs', 'AIRS equivalentes = AIRS × FP'],
      ['eligible-users', 'total de usuarios elegibles'],
      ['aliquot', 'mis AIRS elegibles / suma de AIRS elegibles × 100 %'],
    ] as const;

    for (const [metric, explanation] of metrics) {
      const baseTestID = `dashboard-metric-info-${metric}`;
      const trigger = getElementByTestId(renderState.container, `${baseTestID}-trigger`);
      expect(trigger.textContent).toBe('');
      expect(trigger.querySelector('rnsvgsvgview')).not.toBeNull();
      expect(trigger.getAttribute('aria-label')).toContain('Más información');

      act(() => {
        trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });

      const popover = getElementByTestId(document.body, `${baseTestID}-popover`);
      expect(popover.textContent).toContain(explanation);

      const closeButton = getElementByTestId(document.body, `${baseTestID}-close`);
      act(() => {
        closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      expect(document.body.querySelector(`[data-testid="${baseTestID}-popover"]`)).toBeNull();
    }

    const trigger = getElementByTestId(
      renderState.container,
      'dashboard-metric-info-atn-balance-trigger'
    );
    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    const backdrop = getElementByTestId(
      document.body,
      'dashboard-metric-info-atn-balance-backdrop'
    );
    act(() => {
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(
      document.body.querySelector('[data-testid="dashboard-metric-info-atn-balance-popover"]')
    ).toBeNull();
  });
});
