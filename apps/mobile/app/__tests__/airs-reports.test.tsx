/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import AirsReportsScreen from '../airs-reports';

const mockRouter = { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => false) };
let mockParams: Record<string, string | string[]> = {};
const mockView = jest.fn((_props: Record<string, unknown>) => null);

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
jest.mock('../../components/auth/AppAuthProvider', () => ({
  useAuth: () => ({ client: { getSessionToken: () => Promise.resolve('tok') } }),
}));
jest.mock('../../components/i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../components/manage/useManagePalette', () => ({
  useManagePalette: () => ({ background: '#000' }),
}));
jest.mock('../../components/common/ScreenShell', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../components/airsReports/AirsReviewView', () => ({
  AirsReviewView: (props: Record<string, unknown>) => mockView(props),
}));

function render(): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  void act(() => {
    renderer = create(<AirsReportsScreen />);
  });
  return renderer!;
}

const lastProps = () => mockView.mock.calls[mockView.mock.calls.length - 1][0];

beforeEach(() => {
  mockView.mockClear();
  mockRouter.back.mockClear();
  mockRouter.replace.mockClear();
});

describe('/airs-reports', () => {
  it('opens the report from a review email link first', () => {
    mockParams = { report: 'r1' };
    render();
    expect(lastProps().focusId).toBe('r1');
  });

  it('goes back, or to the Explorer when opened from an email', () => {
    mockParams = {};
    render();
    expect(lastProps().focusId).toBeUndefined();
    (lastProps().onBack as () => void)();
    expect(mockRouter.replace).toHaveBeenCalledWith('/explore');

    mockRouter.canGoBack.mockReturnValueOnce(true);
    (lastProps().onBack as () => void)();
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
