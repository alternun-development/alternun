/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { Platform } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { DirectoryControls, DirectoryPagination } from '../DirectoryControls';
import type { DirectoryView } from '../types';

const palette = {
  surface: '#fff',
  border: '#ddd',
  text: '#111',
  muted: '#666',
  primaryDeep: '#075440',
  fill: '#0f766e',
};
const t = ((key: string, params?: Record<string, unknown>): string =>
  params ? `${key}:${JSON.stringify(params)}` : key) as never;

type ControlsRender = {
  renderer: ReactTestRenderer;
  onQueryChange: jest.Mock;
  onViewChange: jest.Mock;
};

async function renderControls(
  overrides: Partial<React.ComponentProps<typeof DirectoryControls>> = {}
): Promise<ControlsRender> {
  const onQueryChange = jest.fn();
  const onViewChange = jest.fn();
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <DirectoryControls
        idPrefix='project'
        query=''
        onQueryChange={onQueryChange}
        searchLabel='Search projects'
        searchPlaceholder='Search by project'
        view='list'
        onViewChange={onViewChange}
        palette={palette}
        t={t}
        {...overrides}
      />
    );
    await Promise.resolve();
  });
  return { renderer: renderer!, onQueryChange, onViewChange };
}

function byTestId(renderer: ReactTestRenderer, testID: string): ReactTestInstance {
  return renderer.root.findAllByProps({ testID })[0];
}

async function run(callback: () => void): Promise<void> {
  await act(async () => {
    callback();
    await Promise.resolve();
  });
}

describe('DirectoryControls', () => {
  afterEach(() => jest.restoreAllMocks());

  it('renders a labelled search field that reports every change', async () => {
    const { renderer, onQueryChange } = await renderControls();
    const input = byTestId(renderer, 'project-search-input');

    expect(input.props.accessibilityLabel).toBe('Search projects');
    expect(input.props.placeholder).toBe('Search by project');
    expect(input.props.role).toBe('searchbox');
    await run(() => input.props.onChangeText('agua'));
    expect(onQueryChange).toHaveBeenCalledWith('agua');
    expect(renderer.root.findAllByProps({ testID: 'project-search-clear' })).toHaveLength(0);
  });

  it('offers a clear button only while there is a query', async () => {
    const { renderer, onQueryChange } = await renderControls({ query: 'agua' });
    const clear = byTestId(renderer, 'project-search-clear');

    expect(clear.props.accessibilityLabel).toBe('explorer.controls.clearSearch');
    await run(() => clear.props.onPress());
    expect(onQueryChange).toHaveBeenCalledWith('');
  });

  it.each(['list', 'grid', 'compact'] as const)(
    'marks %s as the only selected radio and only Tab stop',
    async (view) => {
      const { renderer } = await renderControls({ view });
      const group = byTestId(renderer, 'project-view-switcher');
      expect(group.props.accessibilityRole).toBe('radiogroup');
      expect(group.props.accessibilityLabel).toBe('explorer.controls.view.label');

      for (const item of ['list', 'grid', 'compact'] as const) {
        const option = byTestId(renderer, `project-view-${item}`);
        expect(option.props.accessibilityRole).toBe('radio');
        expect(option.props.accessibilityLabel).toBe(`explorer.controls.view.${item}`);
        expect(option.props.accessibilityState).toEqual({
          selected: item === view,
          checked: item === view,
        });
        expect(option.props['aria-checked']).toBe(item === view);
        expect(option.props.tabIndex).toBe(item === view ? 0 : -1);
      }
    }
  );

  it('changes the view on press and ignores the selected option', async () => {
    const { renderer, onViewChange } = await renderControls({ view: 'list' });
    await run(() => byTestId(renderer, 'project-view-grid').props.onPress());
    await run(() => byTestId(renderer, 'project-view-list').props.onPress());
    expect(onViewChange).toHaveBeenCalledTimes(1);
    expect(onViewChange).toHaveBeenCalledWith('grid');
  });

  it.each([
    ['ArrowRight', 'list', 'grid'],
    ['ArrowDown', 'grid', 'compact'],
    ['ArrowRight', 'compact', 'list'],
    ['ArrowLeft', 'list', 'compact'],
    ['ArrowUp', 'grid', 'list'],
  ] as const)(
    'on web, %s from %s selects %s',
    async (key, from: DirectoryView, to: DirectoryView) => {
      jest.replaceProperty(Platform, 'OS', 'web');
      const { renderer, onViewChange } = await renderControls({ view: from });
      const preventDefault = jest.fn();

      await run(() =>
        byTestId(renderer, 'project-view-switcher').props.onKeyDown({
          nativeEvent: { key },
          preventDefault,
        })
      );
      expect(onViewChange).toHaveBeenCalledWith(to);
      expect(preventDefault).toHaveBeenCalled();
    }
  );

  it('ignores other keys and adds no key handler on native', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const web = await renderControls();
    await run(() =>
      byTestId(web.renderer, 'project-view-switcher').props.onKeyDown({
        nativeEvent: { key: 'Enter' },
      })
    );
    expect(web.onViewChange).not.toHaveBeenCalled();

    jest.replaceProperty(Platform, 'OS', 'ios');
    const native = await renderControls();
    expect(byTestId(native.renderer, 'project-view-switcher').props.onKeyDown).toBeUndefined();
  });
});

describe('DirectoryPagination', () => {
  async function renderPagination(
    page: number,
    pageCount: number
  ): Promise<{ renderer: ReactTestRenderer; onChange: jest.Mock }> {
    const onChange = jest.fn();
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = create(
        <DirectoryPagination
          idPrefix='project'
          label='Project pages'
          page={page}
          pageCount={pageCount}
          palette={palette}
          t={t}
          onChange={onChange}
        />
      );
      await Promise.resolve();
    });
    return { renderer: renderer!, onChange };
  }

  it('renders nothing for a single page', async () => {
    const { renderer } = await renderPagination(1, 1);
    expect(renderer.toJSON()).toBeNull();
  });

  it('labels the pages and moves backwards and forwards', async () => {
    const { renderer, onChange } = await renderPagination(2, 3);
    expect(byTestId(renderer, 'project-pagination').props.accessibilityLabel).toBe('Project pages');
    expect(byTestId(renderer, 'project-page-indicator').props.children).toBe(
      'explorer.controls.pagination.page:{"page":2,"total":3}'
    );
    await run(() => byTestId(renderer, 'project-page-previous').props.onPress());
    await run(() => byTestId(renderer, 'project-page-next').props.onPress());
    expect(onChange.mock.calls).toEqual([[1], [3]]);
  });

  it('disables the edges', async () => {
    const first = (await renderPagination(1, 2)).renderer;
    expect(byTestId(first, 'project-page-previous').props.disabled).toBe(true);
    expect(byTestId(first, 'project-page-next').props.disabled).toBe(false);
    const last = (await renderPagination(2, 2)).renderer;
    expect(byTestId(last, 'project-page-next').props.accessibilityState).toEqual({
      disabled: true,
    });
  });
});
