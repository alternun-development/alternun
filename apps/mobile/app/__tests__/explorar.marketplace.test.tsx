/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { MarketplaceProjectBrowser } from '../explorar';

jest.mock('../../components/common/ScreenShell', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

const palette = {
  background: '#fff',
  surface: '#fff',
  surfaceStrong: '#fff',
  border: '#ddd',
  text: '#111',
  muted: '#666',
  primary: '#087f63',
  primaryDeep: '#075440',
  mist: '#eee',
  hero: '#eee',
};

const productiveProject = {
  id: 'project-1',
  slug: 'productive-project',
  title: 'Productive project',
  place: 'Colombia',
  categoryCode: 'productive_enterprise',
  status: 'active' as const,
  theme: 'Local economy',
  description: 'Productive description',
  waysToContribute: ['Visit'],
  imageUrl: null,
};

const conservationProject = {
  ...productiveProject,
  id: 'project-2',
  slug: 'conservation-project',
  title: 'Conservation project',
  categoryCode: 'conservation',
};

const t = ((key: string): string => key) as never;

async function renderBrowser(
  loader: React.ComponentProps<typeof MarketplaceProjectBrowser>['loader']
): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <MarketplaceProjectBrowser locale='es' palette={palette} t={t} loader={loader} />
    );
    await Promise.resolve();
  });
  return renderer!;
}

describe('Explorer marketplace projects', () => {
  it('renders two projects returned by the API loader', async () => {
    const renderer = await renderBrowser(() =>
      Promise.resolve([productiveProject, conservationProject])
    );

    expect(renderer.root.findByProps({ testID: 'explorer-project-project-1' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'explorer-project-project-2' })).toBeTruthy();
  });

  it('renders the empty state for an empty published list', async () => {
    const renderer = await renderBrowser(() => Promise.resolve([]));

    expect(renderer.root.findByProps({ testID: 'explorer-empty' })).toBeTruthy();
  });

  it('renders a network error and retries without fallback projects', async () => {
    let calls = 0;
    const loader: NonNullable<
      React.ComponentProps<typeof MarketplaceProjectBrowser>['loader']
    > = () => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error('offline'))
        : Promise.resolve([productiveProject]);
    };
    const renderer = await renderBrowser(loader);

    expect(renderer.root.findByProps({ testID: 'explorer-error' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'explorer-project-project-1' })).toHaveLength(0);

    await act(async () => {
      renderer.root.findByProps({ testID: 'explorer-retry' }).props.onPress();
      await Promise.resolve();
    });

    expect(calls).toBe(2);
    expect(renderer.root.findByProps({ testID: 'explorer-project-project-1' })).toBeTruthy();
  });

  it('filters the loaded list by mapped category', async () => {
    const renderer = await renderBrowser(() =>
      Promise.resolve([productiveProject, conservationProject])
    );

    const categoryFilters = new Set(
      renderer.root
        .findAll(
          (node) =>
            typeof node.props.testID === 'string' &&
            node.props.testID.startsWith('explorer-filter-')
        )
        .map((node) => {
          const testId = node.props.testID as unknown;
          return typeof testId === 'string' ? testId : '';
        })
    );
    expect(categoryFilters.size).toBe(3);
    expect(renderer.root.findByProps({ testID: 'explorer-filter-all' })).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'explorer-filter-productive_enterprise' })
    ).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'explorer-filter-conservation' })).toBeTruthy();

    void act(() => {
      renderer.root.findByProps({ testID: 'explorer-filter-conservation' }).props.onPress();
    });

    expect(renderer.root.findAllByProps({ testID: 'explorer-project-project-1' })).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'explorer-project-project-2' })).toBeTruthy();
  });
});
