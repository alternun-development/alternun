/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { MarketplaceProjectBrowser } from '../explorar';
import {
  getRememberedDirectoryView,
  rememberDirectoryView,
} from '../../components/marketplace/directoryPaging';
import type { MarketProject } from '../explorar.types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('../../components/i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../components/settings/AppPreferencesProvider', () => ({
  useAppPreferences: () => ({ themeMode: 'light', language: 'en' }),
}));
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
  fill: '#0f766e',
  mist: '#eee',
  hero: '#eee',
};
const t = ((key: string, params?: Record<string, unknown>): string =>
  params ? `${key}:${JSON.stringify(params)}` : key) as never;

function makeProjects(count: number): MarketProject[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `project-${index + 1}`,
    slug: `project-${index + 1}`,
    title: `Project ${index + 1}`,
    place: 'Colombia',
    categoryCode: index % 2 === 0 ? 'conservation' : 'productive_enterprise',
    status: 'active' as const,
    theme: 'Local economy',
    description: 'Description',
    waysToContribute: ['Visit'],
    imageUrl: null,
    videoUrl: null,
    canvaUrl: null,
  }));
}

type BrowserRender = {
  renderer: ReactTestRenderer;
  onListNavigate: jest.Mock;
  onOpenProject: jest.Mock;
};

async function renderBrowser(
  loader: React.ComponentProps<typeof MarketplaceProjectBrowser>['loader']
): Promise<BrowserRender> {
  const onListNavigate = jest.fn();
  const onOpenProject = jest.fn();
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <MarketplaceProjectBrowser
        locale='es'
        palette={palette}
        t={t}
        loader={loader}
        onListNavigate={onListNavigate}
        onOpenProject={onOpenProject}
      />
    );
    await Promise.resolve();
  });
  return { renderer: renderer!, onListNavigate, onOpenProject };
}

function renderProjects(count: number): Promise<BrowserRender> {
  const projects = makeProjects(count);
  return renderBrowser(() => Promise.resolve(projects));
}

function first(renderer: ReactTestRenderer, testID: string): ReactTestInstance {
  return renderer.root.findAllByProps({ testID })[0];
}

function has(renderer: ReactTestRenderer, testID: string): boolean {
  return renderer.root.findAllByProps({ testID }).length > 0;
}

function visibleCards(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAll(
      (node: ReactTestInstance) =>
        typeof node.props.testID === 'string' &&
        /^explorer-project-project-\d+$/.test(node.props.testID) &&
        typeof node.props.onPress === 'function' &&
        typeof node.type !== 'string'
    )
    .map((node) => node.props.testID as string)
    .filter((testID, index, all) => all.indexOf(testID) === index);
}

async function press(renderer: ReactTestRenderer, testID: string): Promise<void> {
  await act(async () => {
    first(renderer, testID).props.onPress();
    await Promise.resolve();
  });
}

async function search(renderer: ReactTestRenderer, query: string): Promise<void> {
  await act(async () => {
    first(renderer, 'project-search-input').props.onChangeText(query);
    await Promise.resolve();
  });
}

function indicator(renderer: ReactTestRenderer): string {
  return first(renderer, 'project-page-indicator').props.children;
}

describe('Explorer project views and pagination', () => {
  beforeEach(() => {
    rememberDirectoryView('projects', 'list');
    rememberDirectoryView('enterprises', 'list');
  });

  it('uses the list view by default with the shared, labelled controls', async () => {
    const { renderer } = await renderProjects(5);
    expect(has(renderer, 'project-directory-list')).toBe(true);
    expect(first(renderer, 'project-view-list').props.accessibilityState).toEqual({
      selected: true,
      checked: true,
    });
    expect(first(renderer, 'project-search-input').props.accessibilityLabel).toBe(
      'explorer.controls.searchLabel.projects'
    );
    expect(first(renderer, 'project-search-input').props.placeholder).toBe(
      'explorer.searchPlaceholder'
    );
    expect(first(renderer, 'project-pagination').props.accessibilityLabel).toBe(
      'explorer.controls.pagination.label.projects'
    );
  });

  it.each([
    ['list', 3],
    ['grid', 4],
    ['compact', 6],
  ] as const)('shows the %s view with %i projects per page', async (view, size) => {
    const { renderer } = await renderProjects(13);
    if (view !== 'list') await press(renderer, `project-view-${view}`);

    expect(has(renderer, `project-directory-${view}`)).toBe(true);
    expect(visibleCards(renderer)).toHaveLength(size);
    expect(visibleCards(renderer)[0]).toBe('explorer-project-project-1');
    expect(indicator(renderer)).toBe(
      `explorer.controls.pagination.page:${JSON.stringify({
        page: 1,
        total: Math.ceil(13 / size),
      })}`
    );
  });

  it('pages forwards and backwards and asks the screen to scroll to the list', async () => {
    const { renderer, onListNavigate } = await renderProjects(7);
    expect(first(renderer, 'project-page-previous').props.disabled).toBe(true);

    await press(renderer, 'project-page-next');
    expect(visibleCards(renderer)).toEqual([
      'explorer-project-project-4',
      'explorer-project-project-5',
      'explorer-project-project-6',
    ]);
    await press(renderer, 'project-page-next');
    expect(visibleCards(renderer)).toEqual(['explorer-project-project-7']);
    expect(first(renderer, 'project-page-next').props.disabled).toBe(true);
    await press(renderer, 'project-page-previous');
    expect(visibleCards(renderer)[0]).toBe('explorer-project-project-4');
    expect(onListNavigate).toHaveBeenCalledTimes(3);
  });

  it('keeps the existing search fields and returns to the first page', async () => {
    const { renderer, onListNavigate } = await renderProjects(13);
    await press(renderer, 'project-page-next');
    await search(renderer, 'project 1');

    expect(visibleCards(renderer)).toEqual([
      'explorer-project-project-1',
      'explorer-project-project-10',
      'explorer-project-project-11',
    ]);
    expect(indicator(renderer)).toBe(
      `explorer.controls.pagination.page:${JSON.stringify({ page: 1, total: 2 })}`
    );
    // Place and theme still match, as before.
    await search(renderer, 'local ECONOMY');
    expect(visibleCards(renderer)).toHaveLength(3);
    // Typing never scrolls the screen.
    expect(onListNavigate).toHaveBeenCalledTimes(1);
  });

  it('keeps the category filters and returns to the first page when one changes', async () => {
    const { renderer } = await renderProjects(13);
    await press(renderer, 'project-page-next');
    await press(renderer, 'explorer-filter-productive_enterprise');

    expect(visibleCards(renderer)).toEqual([
      'explorer-project-project-2',
      'explorer-project-project-4',
      'explorer-project-project-6',
    ]);
    expect(indicator(renderer)).toBe(
      `explorer.controls.pagination.page:${JSON.stringify({ page: 1, total: 2 })}`
    );
  });

  it('returns to the first page when the view changes', async () => {
    const { renderer, onListNavigate } = await renderProjects(13);
    await press(renderer, 'project-page-next');
    await press(renderer, 'project-view-grid');

    expect(visibleCards(renderer)[0]).toBe('explorer-project-project-1');
    expect(onListNavigate).toHaveBeenCalledTimes(2);
  });

  it('remembers the projects view for the session, independently of enterprises', async () => {
    const { renderer } = await renderProjects(13);
    await press(renderer, 'project-view-compact');
    await act(async () => {
      renderer.unmount();
      await Promise.resolve();
    });

    const remounted = await renderProjects(13);
    expect(has(remounted.renderer, 'project-directory-compact')).toBe(true);
    expect(getRememberedDirectoryView('projects')).toBe('compact');
    expect(getRememberedDirectoryView('enterprises')).toBe('list');
  });

  it.each(['grid', 'compact'] as const)('opens a project from the %s card', async (view) => {
    const { renderer, onOpenProject } = await renderProjects(2);
    await press(renderer, `project-view-${view}`);
    await press(renderer, 'explorer-project-project-2');
    expect(onOpenProject).toHaveBeenCalledWith('project-2');
  });

  it('shows the no-match state, keeps the controls and hides the pagination', async () => {
    const { renderer } = await renderProjects(7);
    await search(renderer, 'zzz');

    expect(has(renderer, 'explorer-empty')).toBe(true);
    expect(visibleCards(renderer)).toHaveLength(0);
    expect(has(renderer, 'project-view-switcher')).toBe(true);
    expect(has(renderer, 'project-pagination')).toBe(false);

    await press(renderer, 'project-search-clear');
    expect(visibleCards(renderer)).toHaveLength(3);
  });

  it('shows the empty state for an empty marketplace without pagination', async () => {
    const { renderer } = await renderProjects(0);
    expect(has(renderer, 'explorer-empty')).toBe(true);
    expect(has(renderer, 'project-pagination')).toBe(false);
  });

  it('shows the error state without cards or pagination', async () => {
    const { renderer } = await renderBrowser(() => Promise.reject(new Error('offline')));
    expect(has(renderer, 'explorer-error')).toBe(true);
    expect(visibleCards(renderer)).toHaveLength(0);
    expect(has(renderer, 'project-pagination')).toBe(false);
  });
});
