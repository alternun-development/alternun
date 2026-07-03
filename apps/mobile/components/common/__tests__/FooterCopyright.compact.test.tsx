/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
jest.mock('expo-image', (): { __esModule: boolean; Image: () => null } => ({
  __esModule: true,
  Image: () => null,
}));

jest.mock('../../../utils/changelogData', () => ({
  APP_VERSION: '1.0.0-test',
}));

jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import React from 'react';
import { act, create } from 'react-test-renderer';
import { FooterCopyright } from '../Footer.shared';

describe('FooterCopyright', () => {
  it('renders compact mode without throwing', () => {
    void act(() => {
      create(<FooterCopyright color='#ffffff' compact={true} />);
    });
  });
});
