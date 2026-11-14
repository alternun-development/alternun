import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import HonorAwardsAllyDesk from '../HonorAwardsAllyDesk';
import { HonorAwardRequestError } from '../../../utils/honorAwards';

jest.mock('../HonorAwardEmblem', () => ({ __esModule: true, default: () => null }));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ locale: 'es', t: (_key, _params, fallback) => fallback }),
}));

const c = { text: '#fff', muted: '#999' };
const recipes = [
  {
    id: 'h1',
    tier: 'generic',
    kind: 'medal',
    title: 'Taybo Santa Marta',
    badgeImageUrl: null,
    artPreset: 'coast',
  },
  {
    id: 'h2',
    tier: 'generic',
    kind: 'medal',
    title: 'Taybo Medellín',
    badgeImageUrl: null,
    artPreset: 'coast',
  },
];

function makeDesk(overrides = {}) {
  return {
    listRecipes: jest.fn(() => Promise.resolve(recipes)),
    grant: jest.fn(() => Promise.resolve()),
    lookupGuest: jest.fn(() =>
      Promise.resolve({
        found: true,
        total: 3,
        byRecipe: [
          { recipeId: 'h1', title: 'Taybo Santa Marta', count: 2 },
          { recipeId: 'h2', title: 'Taybo Medellín', count: 1 },
        ],
      })
    ),
    ...overrides,
  };
}

async function render(desk) {
  let tree;
  await act(async () => {
    tree = renderer.create(<HonorAwardsAllyDesk desk={desk} c={c} />);
  });
  return tree;
}

const texts = (tree) =>
  tree.root.findAllByType(Text).map((node) => [].concat(node.props.children).join(''));
const press = (tree, label) =>
  tree.root
    .findAll((node) => typeof node.props.onPress === 'function')
    .find(
      (node) =>
        node.props.accessibilityLabel === label ||
        node.findAll(
          (child) => child.type === Text && [].concat(child.props.children).join('') === label
        ).length > 0
    );
const input = (tree, label) =>
  tree.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === label);

it('gives the selected hotel medal for a stay with the reservation number', async () => {
  const desk = makeDesk();
  const tree = await render(desk);
  await act(async () => press(tree, 'Taybo Medellín').props.onPress());
  await act(async () =>
    input(tree, 'Correo de la cuenta de Airs').props.onChangeText('guest@example.com')
  );
  await act(async () => input(tree, 'Número de reserva (opcional)').props.onChangeText('RES-9'));
  await act(async () => press(tree, 'Otorgar galardón').props.onPress());
  expect(desk.grant).toHaveBeenCalledWith({
    recipeId: 'h2',
    email: 'guest@example.com',
    reference: 'RES-9',
  });
  expect(texts(tree)).toContain('Galardón otorgado. La persona lo verá por reclamar en su perfil.');
});

it('asks for an email and explains a reservation that was already used', async () => {
  const desk = makeDesk({
    grant: jest.fn(() =>
      Promise.reject(new HonorAwardRequestError(409, 'HONOR_AWARD_ALREADY_GRANTED'))
    ),
  });
  const tree = await render(desk);
  await act(async () => press(tree, 'Otorgar galardón').props.onPress());
  expect(texts(tree)).toContain('Elige un galardón y escribe el correo.');
  await act(async () =>
    input(tree, 'Correo de la cuenta de Airs').props.onChangeText('guest@example.com')
  );
  await act(async () => press(tree, 'Otorgar galardón').props.onPress());
  expect(texts(tree)).toContain(
    'Esa persona ya tiene este galardón, o ese número de reserva ya se usó.'
  );
});

it('shows how many of the ally medals a guest holds', async () => {
  const desk = makeDesk();
  const tree = await render(desk);
  await act(async () => input(tree, 'Correo del huésped').props.onChangeText('guest@example.com'));
  await act(async () => press(tree, 'Consultar').props.onPress());
  expect(desk.lookupGuest).toHaveBeenCalledWith('guest@example.com');
  expect(texts(tree)).toEqual(
    expect.arrayContaining([
      'Galardones de tu organización: 3',
      'Taybo Santa Marta × 2',
      'Taybo Medellín × 1',
    ])
  );
});

it('says when the guest has no account and when there is nothing to give', async () => {
  const desk = makeDesk({
    listRecipes: jest.fn(() => Promise.resolve([])),
    lookupGuest: jest.fn(() => Promise.resolve({ found: false, total: 0, byRecipe: [] })),
  });
  const tree = await render(desk);
  expect(texts(tree)).toContain(
    'Tu organización aún no tiene galardones para otorgar. Pídelos al equipo de Airs.'
  );
  await act(async () => input(tree, 'Correo del huésped').props.onChangeText('nobody@example.com'));
  await act(async () => press(tree, 'Consultar').props.onPress());
  expect(texts(tree)).toContain('No hay una cuenta de Airs con ese correo.');
});
