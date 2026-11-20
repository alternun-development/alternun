import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import ProfileStats from '../ProfileStats';
import en from '../../../../../packages/i18n/src/catalogs/en.json';
import es from '../../../../../packages/i18n/src/catalogs/es.json';
import th from '../../../../../packages/i18n/src/catalogs/th.json';

const items = [
  { key: 'airs', label: 'Airs', value: '20', info: { title: 'Airs', description: 'Airs help' } },
  {
    key: 'projects',
    label: 'Proyectos',
    value: '0',
    info: { title: 'Proyectos', description: 'Projects help' },
  },
  { key: 'co2', label: 'CO₂', value: '0 t', info: { title: 'CO₂', description: 'CO2 help' } },
];

function render() {
  let tree;
  act(() => {
    tree = renderer.create(
      <ProfileStats
        items={items}
        isDark
        c={{ text: '#fff', muted: '#999' }}
        openInfoLabel={(label) => `Más información sobre ${label}`}
        closeInfoLabel='Cerrar'
      />
    );
  });
  return tree;
}

const texts = (tree) =>
  tree.root.findAllByType(Text).map((node) => [].concat(node.props.children).join(''));
const byTestId = (tree, id) => tree.root.findAll((node) => node.props.testID === id)[0];

it('shows each figure with its label and an info button', () => {
  const tree = render();
  expect(texts(tree)).toEqual(
    expect.arrayContaining(['20', 'Airs', '0', 'Proyectos', '0 t', 'CO₂'])
  );
  for (const key of ['airs', 'projects', 'co2']) {
    const trigger = byTestId(tree, `profile-stat-info-${key}-trigger`);
    expect(trigger).toBeDefined();
  }
  expect(byTestId(tree, 'profile-stat-info-co2-trigger').props.accessibilityLabel).toBe(
    'Más información sobre CO₂'
  );
  act(() => tree.unmount());
});

it('explains a figure when its info button is pressed', () => {
  const tree = render();
  expect(texts(tree)).not.toContain('Projects help');
  act(() => byTestId(tree, 'profile-stat-info-projects-trigger').props.onPress());
  expect(texts(tree)).toContain('Projects help');
  act(() => byTestId(tree, 'profile-stat-info-projects-close').props.onPress());
  expect(texts(tree)).not.toContain('Projects help');
  act(() => tree.unmount());
});

it.each([
  ['en', en],
  ['es', es],
  ['th', th],
])('has the %s explanations of the three figures', (_locale, catalog) => {
  const info = catalog.mobile.profile.statsInfo;
  for (const key of ['airs', 'projects', 'co2', 'airsTitle', 'projectsTitle', 'co2Title']) {
    expect(typeof info[key]).toBe('string');
    expect(info[key].trim().length).toBeGreaterThan(0);
  }
});
