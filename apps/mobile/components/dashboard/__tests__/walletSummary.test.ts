/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, comma-dangle */
import { describe, expect, it } from '@jest/globals';
import { resolveWalletSummaryState } from '../walletSummary';

describe('resolveWalletSummaryState', () => {
  it('returns setup mode when the user has no local wallet', () => {
    expect(resolveWalletSummaryState(null)).toEqual({
      mode: 'setup',
      address: null,
    });
  });

  it('uses the first populated wallet address and ignores blank values', () => {
    expect(
      resolveWalletSummaryState({
        evmAddress: '   ',
        bitcoinAddress: '  bc1qexamplewalletaddress  ',
        solanaAddress: null,
      })
    ).toEqual({
      mode: 'ready',
      address: 'bc1qexamplewalletaddress',
    });
  });
});
