/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { MarketplaceEnterpriseBrowser } from '../../components/marketplace/MarketplaceEnterpriseDirectory';
import {
  DIRECTORY_PAGE_SIZE,
  directoryPageCount,
  directoryPageItems,
  getRememberedDirectoryView,
  rememberDirectoryView,
} from '../../components/marketplace/directoryPaging';
import type { MarketplaceEnterprise } from '../../components/marketplace/types';

const palette = {
  background: '#fff',
  surface: '#fff',
  border: '#ddd',
  text: '#111',
  muted: '#666',
  primary: '#087f63',
  primaryDeep: '#075440',
  fill: '#0f766e',
  mist: '#eee',
};
const t = ((key: string, params?: Record<string, unknown>): string =>
  params ? `${key}:${JSON.stringify(params)}` : key) as never;

function makeEnterprises(count: number): MarketplaceEnterprise[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `enterprise-${index + 1}`,
    slug: `enterprise-${index + 1}`,
    displayName: `Enterprise ${index + 1}`,
    logo: null,
    countryCode: index % 2 === 0 ? 'CO' : null,
    websiteUrl: null,
    projectCount: index + 1,
  }));
}

async function renderDirectory(
  count: number,
  onListNavigate = jest.fn()
): Promise<{ renderer: ReactTestRenderer; onListNavigate: jest.Mock }> {
  const items = makeEnterprises(count);
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <MarketplaceEnterpriseBrowser
        locale='en'
        palette={palette}
        t={t}
        loader={() => Promise.resolve(items)}
        onListNavigate={onListNavigate}
      />
    );
    await Promise.resolve();
  });
  return { renderer: renderer!, onListNavigate };
}

function visibleCards(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAll(
      (node: ReactTestInstance) =>
        typeof node.props.testID === 'string' &&
        node.props.testID.startsWith('explorer-enterprise-') &&
        typeof node.props.onPress === 'function'
    )
    .map((node) => node.props.testID as string);
}

async function press(renderer: ReactTestRenderer, testID: string): Promise<void> {
  await act(async () => {
    renderer.root.findByProps({ testID }).props.onPress();
    await Promise.resolve();
  });
}

function indicator(renderer: ReactTestRenderer): string {
  return renderer.root.findByProps({ testID: 'enterprise-page-indicator' }).props.children;
}

describe('Explorer enterprise directory pagination', () => {
  beforeEach(() => rememberDirectoryView('enterprises', 'list'));

  it.each([
    ['list', 3],
    ['grid', 4],
    ['compact', 6],
  ] as const)('shows %s view with %i enterprises per page', async (view, size) => {
    const { renderer } = await renderDirectory(13);
    if (view !== 'list') await press(renderer, `enterprise-view-${view}`);

    expect(renderer.root.findByProps({ testID: `enterprise-directory-${view}` })).toBeTruthy();
    expect(visibleCards(renderer)).toHaveLength(size);
    expect(visibleCards(renderer)[0]).toBe('explorer-enterprise-enterprise-1');
    expect(indicator(renderer)).toBe(
      `explorer.controls.pagination.page:${JSON.stringify({
        page: 1,
        total: Math.ceil(13 / size),
      })}`
    );
  });

  it('uses the list view by default', async () => {
    const { renderer } = await renderDirectory(5);
    expect(renderer.root.findByProps({ testID: 'enterprise-directory-list' })).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'enterprise-view-list' }).props.accessibilityState
    ).toEqual({ selected: true, checked: true });
  });

  it('moves between pages and asks the screen to scroll back to the list', async () => {
    const { renderer, onListNavigate } = await renderDirectory(7);
    expect(renderer.root.findByProps({ testID: 'enterprise-page-previous' }).props.disabled).toBe(
      true
    );

    await press(renderer, 'enterprise-page-next');
    expect(visibleCards(renderer)).toEqual([
      'explorer-enterprise-enterprise-4',
      'explorer-enterprise-enterprise-5',
      'explorer-enterprise-enterprise-6',
    ]);
    expect(onListNavigate).toHaveBeenCalledTimes(1);

    await press(renderer, 'enterprise-page-next');
    expect(visibleCards(renderer)).toEqual(['explorer-enterprise-enterprise-7']);
    expect(renderer.root.findByProps({ testID: 'enterprise-page-next' }).props.disabled).toBe(true);

    await press(renderer, 'enterprise-page-previous');
    expect(visibleCards(renderer)[0]).toBe('explorer-enterprise-enterprise-4');
    expect(onListNavigate).toHaveBeenCalledTimes(3);
  });

  it('changes view, returns to the first page, and remembers the view for the session', async () => {
    const { renderer, onListNavigate } = await renderDirectory(13);
    await press(renderer, 'enterprise-page-next');
    await press(renderer, 'enterprise-view-compact');

    expect(visibleCards(renderer)).toHaveLength(6);
    expect(visibleCards(renderer)[0]).toBe('explorer-enterprise-enterprise-1');
    expect(
      renderer.root.findByProps({ testID: 'enterprise-view-compact' }).props.accessibilityState
    ).toEqual({ selected: true, checked: true });
    expect(
      renderer.root.findByProps({ testID: 'enterprise-view-list' }).props.accessibilityState
    ).toEqual({ selected: false, checked: false });
    expect(onListNavigate).toHaveBeenCalledTimes(2);
    await act(async () => {
      renderer.unmount();
      await Promise.resolve();
    });

    const remounted = await renderDirectory(13);
    expect(
      remounted.renderer.root.findByProps({ testID: 'enterprise-directory-compact' })
    ).toBeTruthy();
  });

  it('does not navigate when the selected view is pressed again', async () => {
    const { renderer, onListNavigate } = await renderDirectory(7);
    await press(renderer, 'enterprise-view-list');
    expect(onListNavigate).not.toHaveBeenCalled();
  });

  it('hides the pagination controls when everything fits on one page', async () => {
    const { renderer } = await renderDirectory(3);
    expect(visibleCards(renderer)).toHaveLength(3);
    expect(renderer.root.findAllByProps({ testID: 'enterprise-pagination' })).toHaveLength(0);

    await press(renderer, 'enterprise-view-grid');
    expect(renderer.root.findAllByProps({ testID: 'enterprise-pagination' })).toHaveLength(0);
  });

  it('keeps the empty state without view switcher or pagination', async () => {
    const { renderer } = await renderDirectory(0);
    expect(renderer.root.findByProps({ testID: 'enterprise-directory-empty' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'enterprise-view-switcher' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'enterprise-pagination' })).toHaveLength(0);
  });

  it('exposes an accessible view switcher and pagination', async () => {
    const { renderer } = await renderDirectory(7);
    const switcher = renderer.root.findByProps({ testID: 'enterprise-view-switcher' });
    expect(switcher.props.accessibilityRole).toBe('radiogroup');
    expect(switcher.props.accessibilityLabel).toBe('explorer.controls.view.label');
    expect(
      renderer.root.findByProps({ testID: 'enterprise-view-grid' }).props.accessibilityRole
    ).toBe('radio');
    expect(
      renderer.root.findByProps({ testID: 'enterprise-page-next' }).props.accessibilityLabel
    ).toBe('explorer.controls.pagination.next');
  });
});

describe('Explorer enterprise directory search', () => {
  beforeEach(() => rememberDirectoryView('enterprises', 'list'));

  async function search(renderer: ReactTestRenderer, query: string): Promise<void> {
    await act(async () => {
      renderer.root
        .findAllByProps({ testID: 'enterprise-search-input' })[0]
        .props.onChangeText(query);
      await Promise.resolve();
    });
  }

  it('filters by name, ignoring case, and returns to the first page', async () => {
    const { renderer, onListNavigate } = await renderDirectory(13);
    await press(renderer, 'enterprise-page-next');
    await search(renderer, 'ENTERPRISE 1');

    expect(visibleCards(renderer)).toEqual([
      'explorer-enterprise-enterprise-1',
      'explorer-enterprise-enterprise-10',
      'explorer-enterprise-enterprise-11',
    ]);
    expect(indicator(renderer)).toBe(
      `explorer.controls.pagination.page:${JSON.stringify({ page: 1, total: 2 })}`
    );
    // Typing does not scroll the screen; only page and view changes do.
    expect(onListNavigate).toHaveBeenCalledTimes(1);
  });

  it('labels the search field and uses the enterprise placeholder', async () => {
    const { renderer } = await renderDirectory(4);
    const input = renderer.root.findAllByProps({ testID: 'enterprise-search-input' })[0];
    expect(input.props.accessibilityLabel).toBe('explorer.controls.searchLabel.enterprises');
    expect(input.props.placeholder).toBe('explorer.enterprises.searchPlaceholder');
  });

  it('shows a no-match state that keeps the controls, and clears back to the full list', async () => {
    const { renderer } = await renderDirectory(7);
    await search(renderer, 'zzz');

    expect(
      renderer.root.findAllByProps({ testID: 'enterprise-directory-no-matches' })
    ).not.toHaveLength(0);
    expect(visibleCards(renderer)).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'enterprise-view-switcher' })).not.toHaveLength(
      0
    );
    expect(renderer.root.findAllByProps({ testID: 'enterprise-pagination' })).toHaveLength(0);

    await press(renderer, 'enterprise-search-clear');
    expect(visibleCards(renderer)).toHaveLength(3);
    expect(
      renderer.root.findAllByProps({ testID: 'enterprise-directory-no-matches' })
    ).toHaveLength(0);
  });
});

describe('directory paging helpers', () => {
  it('uses 3, 4, and 6 items per page', () => {
    expect(DIRECTORY_PAGE_SIZE).toEqual({ list: 3, grid: 4, compact: 6 });
  });

  it('counts at least one page and clamps out-of-range pages', () => {
    expect(directoryPageCount(0, 'list')).toBe(1);
    expect(directoryPageCount(7, 'grid')).toBe(2);
    expect(directoryPageItems([1, 2, 3, 4, 5], 'list', 9)).toEqual([4, 5]);
    expect(directoryPageItems([1, 2, 3, 4, 5], 'list', 0)).toEqual([1, 2, 3]);
  });

  it('remembers the view of each directory independently', () => {
    rememberDirectoryView('projects', 'list');
    rememberDirectoryView('enterprises', 'compact');
    expect(getRememberedDirectoryView('projects')).toBe('list');
    expect(getRememberedDirectoryView('enterprises')).toBe('compact');
    rememberDirectoryView('enterprises', 'list');
  });
});
