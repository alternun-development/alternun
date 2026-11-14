/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises */
import React from 'react';
import { Platform, Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { LayoutGrid, List } from 'lucide-react-native';
import SearchFilterBar from '../SearchFilterBar';
import { ViewModeTray } from '../ViewModeTray';

jest.mock('@alternun/ui', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: (_target, key) => (key === 'isDark' ? false : '#000') }),
  }),
}));

function render(element: React.JSX.Element): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(element);
  });
  return renderer!;
}

const byId = (renderer: ReactTestRenderer, testID: string) =>
  renderer.root.findAll((node) => node.props.testID === testID);

describe('SearchFilterBar', () => {
  it('keeps the trailing slot on the same line and hides a filter menu with one option', () => {
    const renderer = render(
      <SearchFilterBar
        testID='demo'
        value=''
        onChangeText={jest.fn()}
        filters={[{ key: 'all', label: 'All' }]}
        activeFilter='all'
        onChangeFilter={jest.fn()}
        trailing={<Text testID='demo-trailing'>tray</Text>}
      />
    );
    expect(byId(renderer, 'demo-trailing').length).toBeGreaterThan(0);
    expect(byId(renderer, 'demo-filter-button')).toHaveLength(0);
    const root = renderer.toJSON() as { props: { testID: string; style: unknown } };
    expect(root.props.testID).toBe('demo');
    expect(JSON.stringify(root.props.style)).toContain('"flexDirection":"row"');
  });

  it('clears the query and picks filters from the menu', () => {
    const onChangeText = jest.fn();
    const onChangeFilter = jest.fn();
    const renderer = render(
      <SearchFilterBar
        testID='demo'
        value='batis'
        onChangeText={onChangeText}
        searchLabel='Search projects'
        clearLabel='Clear search'
        filters={[
          { key: 'all', label: 'All' },
          { key: 'conservation', label: 'Conservation' },
        ]}
        activeFilter='all'
        onChangeFilter={onChangeFilter}
      />
    );
    expect(byId(renderer, 'demo-search-input')[0].props.accessibilityLabel).toBe('Search projects');
    act(() => byId(renderer, 'demo-search-clear')[0].props.onPress());
    expect(onChangeText).toHaveBeenCalledWith('');
    act(() => byId(renderer, 'demo-filter-button')[0].props.onPress());
    act(() => byId(renderer, 'demo-filter-conservation')[0].props.onPress());
    expect(onChangeFilter).toHaveBeenCalledWith('conservation');
  });

  it('shows no clear button without a label or text', () => {
    const renderer = render(
      <SearchFilterBar
        testID='demo'
        value='x'
        onChangeText={jest.fn()}
        filters={[]}
        activeFilter=''
        onChangeFilter={jest.fn()}
      />
    );
    expect(byId(renderer, 'demo-search-clear')).toHaveLength(0);
  });
});

describe('ViewModeTray', () => {
  const options = [
    { key: 'list' as const, label: 'List', icon: List },
    { key: 'grid' as const, label: 'Grid', icon: LayoutGrid },
  ];
  const colors = {
    activeColor: '#0f0',
    activeIconColor: '#fff',
    inactiveIconColor: '#999',
    borderColor: '#333',
    backgroundColor: '#111',
  };

  it('marks the active option and reports changes only for another option', () => {
    const onChange = jest.fn();
    const renderer = render(
      <ViewModeTray
        idPrefix='demo'
        label='Layout'
        options={options}
        value='list'
        onChange={onChange}
        {...colors}
      />
    );
    const list = byId(renderer, 'demo-view-list')[0];
    expect(list.props.accessibilityState).toEqual({ selected: true, checked: true });
    act(() => list.props.onPress());
    expect(onChange).not.toHaveBeenCalled();
    act(() => byId(renderer, 'demo-view-grid')[0].props.onPress());
    expect(onChange).toHaveBeenCalledWith('grid');
  });

  it('moves the selection with the arrow keys on web', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { get: () => 'web', configurable: true });
    try {
      const onChange = jest.fn();
      const renderer = render(
        <ViewModeTray
          idPrefix='demo'
          label='Layout'
          options={options}
          value='list'
          onChange={onChange}
          {...colors}
        />
      );
      const group = byId(renderer, 'demo-view-switcher')[0];
      act(() =>
        group.props.onKeyDown({ nativeEvent: { key: 'ArrowRight' }, preventDefault: jest.fn() })
      );
      expect(onChange).toHaveBeenLastCalledWith('grid');
      act(() => group.props.onKeyDown({ nativeEvent: { key: 'ArrowLeft' } }));
      expect(onChange).toHaveBeenLastCalledWith('grid');
      act(() => group.props.onKeyDown({ nativeEvent: { key: 'Enter' } }));
      expect(onChange).toHaveBeenCalledTimes(2);
    } finally {
      Object.defineProperty(Platform, 'OS', { get: () => original, configurable: true });
    }
  });
});
