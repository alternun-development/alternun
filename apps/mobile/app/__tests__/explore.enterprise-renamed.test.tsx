/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('../../components/common/ScreenShell', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../components/i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../components/settings/AppPreferencesProvider', () => ({
  useAppPreferences: () => ({ themeMode: 'light', language: 'es' }),
}));

jest.mock('../../components/theme/useAppTheme', () => ({
  useAppTheme: () => ({ cardBg: '#fff', cardBorder: '#ddd' }),
}));

jest.mock('../../hooks/useAdminAccess', () => ({
  useAdminAccess: () => null,
}));

jest.mock('../../components/marketplace/MarketplaceEnterpriseDetail', () => ({
  MarketplaceEnterpriseDetailView: 'MockEnterpriseDetail',
}));

import EnterpriseDetailScreen from '../explore/enterprise/[slug]';

function render(): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(<EnterpriseDetailScreen />);
  });
  return renderer!;
}

beforeEach(() => {
  mockReplace.mockClear();
});

it('opens a renamed enterprise under its current slug and updates the address', () => {
  mockParams = { slug: 'torneo-swing-golf-rincon-cajica' };
  const renderer = render();

  expect(renderer.root.findByType('MockEnterpriseDetail' as never).props.slug).toBe(
    'swing-golf-colombia'
  );
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/explore/enterprise/[slug]',
    params: { slug: 'swing-golf-colombia' },
  });
});

it('keeps any other slug as it is', () => {
  mockParams = { slug: 'swing-golf-colombia' };
  const renderer = render();

  expect(renderer.root.findByType('MockEnterpriseDetail' as never).props.slug).toBe(
    'swing-golf-colombia'
  );
  expect(mockReplace).not.toHaveBeenCalled();
});
