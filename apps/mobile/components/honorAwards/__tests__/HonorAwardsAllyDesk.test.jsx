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

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

function makeDesk(overrides = {}) {
  return {
    listCodes: jest.fn(() => Promise.resolve([])),
    createCode: jest.fn(() => Promise.resolve({ code: 'ABCD-EFGH-JKMN', record: {} })),
    revokeCode: jest.fn(() => Promise.resolve({})),
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
  await act(async () =>
    input(tree, 'Referencia (opcional): reserva, factura o compra').props.onChangeText('RES-9')
  );
  await act(async () => press(tree, 'Otorgar galardón').props.onPress());
  expect(desk.grant).toHaveBeenCalledWith({
    recipeId: 'h2',
    email: 'guest@example.com',
    recipientName: '',
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
  expect(texts(tree)).toContain('Esa persona ya tiene este galardón, o esa referencia ya se usó.');
});

it('shows how many of the ally medals a guest holds', async () => {
  const desk = makeDesk();
  const tree = await render(desk);
  await act(async () =>
    input(tree, 'Correo de la persona').props.onChangeText('guest@example.com')
  );
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
  await act(async () =>
    input(tree, 'Correo de la persona').props.onChangeText('nobody@example.com')
  );
  await act(async () => press(tree, 'Consultar').props.onPress());
  expect(texts(tree)).toContain('No hay una cuenta de Airs con ese correo.');
});

it('tells apart the medals of one mission by their event (Swing Golf torneo and comunidad)', async () => {
  const golf = [
    {
      id: 't',
      tier: 'generic',
      kind: 'medal',
      title: 'Manglar Verde',
      eventName: 'Tour Callaway Colombia',
      badgeImageUrl: null,
      artPreset: 'golf_mangrove',
    },
    {
      id: 'c',
      tier: 'generic',
      kind: 'medal',
      title: 'Manglar Verde',
      eventName: 'Comunidad Swing Golf',
      badgeImageUrl: null,
      artPreset: 'golf_mangrove_community',
    },
  ];
  const desk = makeDesk({ listRecipes: jest.fn(() => Promise.resolve(golf)) });
  const tree = await render(desk);
  expect(texts(tree)).toEqual(
    expect.arrayContaining(['Tour Callaway Colombia', 'Comunidad Swing Golf'])
  );
  await act(async () => press(tree, 'Manglar Verde · Comunidad Swing Golf').props.onPress());
  await act(async () =>
    input(tree, 'Correo de la cuenta de Airs').props.onChangeText('player@example.com')
  );
  await act(async () => press(tree, 'Otorgar galardón').props.onPress());
  expect(desk.grant).toHaveBeenCalledWith({
    recipeId: 'c',
    email: 'player@example.com',
    recipientName: '',
    reference: '',
  });
});

it('says when the role cannot give medals instead of saying there are none', async () => {
  const desk = makeDesk({
    listRecipes: jest.fn(() =>
      Promise.reject(new HonorAwardRequestError(403, 'PERMISSION_DENIED'))
    ),
  });
  const tree = await render(desk);
  expect(texts(tree)).toContain('Tu rol no puede otorgar galardones.');
  expect(texts(tree)).not.toContain(
    'Tu organización aún no tiene galardones para otorgar. Pídelos al equipo de Airs.'
  );
  expect(input(tree, 'Correo de la persona')).toBeUndefined();
});

describe('sending a medal with Airs', () => {
  const golf = [
    {
      id: 't',
      tier: 'generic',
      kind: 'medal',
      title: 'Manglar Verde',
      eventName: 'Tour Callaway Colombia',
      airsAmount: 5,
      badgeImageUrl: null,
      artPreset: 'golf_mangrove',
    },
  ];
  async function send(result, name = '') {
    const desk = makeDesk({
      listRecipes: jest.fn(() => Promise.resolve(golf)),
      grant: jest.fn(() => Promise.resolve(result)),
    });
    const tree = await render(desk);
    await act(async () =>
      input(tree, 'Correo de la cuenta de Airs').props.onChangeText('new@example.com')
    );
    await act(async () =>
      input(tree, 'Nombre (si aún no tiene cuenta en Airs)').props.onChangeText(name)
    );
    await act(async () => press(tree, 'Otorgar galardón').props.onPress());
    return { tree, desk };
  }

  it('shows the Airs of each medal and says what happened with them', async () => {
    const released = await send({
      kind: 'airs_report',
      reportId: 'r',
      reportStatus: 'released',
      airsAmount: 5,
    });
    expect(texts(released.tree)).toContain('+5 Airs');
    expect(texts(released.tree)).toContain(
      'Galardón enviado con +5 Airs. La persona recibió un correo y lo verá por reclamar en su perfil.'
    );
    const pending = await send({
      kind: 'airs_report',
      reportId: 'r',
      reportStatus: 'pending_approval',
      airsAmount: 5,
    });
    expect(texts(pending.tree)).toContain(
      'Quedó en revisión: el galardón y los +5 Airs se entregan cuando un aprobador lo confirme.'
    );
    const newcomer = await send(
      { kind: 'airs_report', reportId: 'r', reportStatus: 'awaiting_claim', airsAmount: 5 },
      'Ana Pérez'
    );
    expect(newcomer.desk.grant).toHaveBeenCalledWith(
      expect.objectContaining({ recipientName: 'Ana Pérez' })
    );
    expect(texts(newcomer.tree)).toContain(
      'La persona aún no tiene cuenta: le enviamos un correo para crearla y recibir el galardón y los +5 Airs.'
    );
  });

  it('asks for the name of someone without an account', async () => {
    const desk = makeDesk({
      listRecipes: jest.fn(() => Promise.resolve(golf)),
      grant: jest.fn(() =>
        Promise.reject(new HonorAwardRequestError(422, 'AIRS_REPORT_RECIPIENT_NAME_REQUIRED'))
      ),
    });
    const tree = await render(desk);
    await act(async () =>
      input(tree, 'Correo de la cuenta de Airs').props.onChangeText('new@example.com')
    );
    await act(async () => press(tree, 'Otorgar galardón').props.onPress());
    expect(texts(tree)).toContain(
      'Esa persona aún no tiene cuenta en Airs: escribe su nombre para enviarle el galardón.'
    );
  });
});

describe('claim codes', () => {
  const golf = [
    {
      id: 't',
      tier: 'generic',
      kind: 'medal',
      title: 'Manglar Verde',
      eventName: 'Tour Callaway Colombia',
      airsAmount: 5,
      badgeImageUrl: null,
      artPreset: 'golf_mangrove',
    },
    {
      id: 'c',
      tier: 'generic',
      kind: 'medal',
      title: 'Manglar Verde',
      eventName: 'Comunidad Swing Golf',
      airsAmount: 14,
      badgeImageUrl: null,
      artPreset: 'golf_mangrove_community',
    },
  ];
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const listed = [
    {
      id: 'k1',
      recipeId: 't',
      recipeTitle: 'Manglar Verde',
      recipeEventName: 'Tour Callaway Colombia',
      hint: '4HVT',
      label: 'Torneo',
      maxRedemptions: 120,
      redemptionCount: 3,
      startsAt: past,
      expiresAt: future,
      createdAt: past,
      revokedAt: null,
    },
    {
      id: 'k2',
      recipeId: 'c',
      recipeTitle: 'Manglar Verde',
      recipeEventName: 'Comunidad Swing Golf',
      hint: 'Q9XZ',
      label: null,
      maxRedemptions: 1,
      redemptionCount: 0,
      startsAt: past,
      expiresAt: past,
      createdAt: past,
      revokedAt: null,
    },
  ];

  it('creates a code for the chosen medal and shows it once to copy', async () => {
    const Clipboard = require('expo-clipboard');
    const desk = makeDesk({
      listRecipes: jest.fn(() => Promise.resolve(golf)),
      listCodes: jest.fn(() => Promise.resolve(listed)),
    });
    const tree = await render(desk);
    expect(texts(tree)).toEqual(
      expect.arrayContaining(['Torneo · ••••-••••-4HVT', 'Activo', 'Vencido'])
    );
    expect(texts(tree).some((line) => /^3 de 120 usos · vence /.test(line))).toBe(true);
    await act(async () =>
      press(tree, 'Código para Manglar Verde · Comunidad Swing Golf').props.onPress()
    );
    await act(async () =>
      input(tree, 'Nombre del código (opcional)').props.onChangeText('Clientes')
    );
    await act(async () => input(tree, 'Personas que pueden usarlo').props.onChangeText('500'));
    await act(async () => input(tree, 'Días de vigencia').props.onChangeText('30'));
    await act(async () => press(tree, 'Crear código').props.onPress());
    expect(desk.createCode).toHaveBeenCalledWith({
      recipeId: 'c',
      label: 'Clientes',
      maxRedemptions: 500,
      validDays: 30,
    });
    expect(texts(tree)).toEqual(
      expect.arrayContaining([
        'ABCD-EFGH-JKMN',
        'Guárdalo ahora: por seguridad no lo volveremos a mostrar.',
      ])
    );
    await act(async () => press(tree, 'Copiar').props.onPress());
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('ABCD-EFGH-JKMN');
    expect(texts(tree)).toContain('Copiado');
    expect(desk.listCodes).toHaveBeenCalledTimes(2);
  });

  it('refuses limits out of range and revokes only active codes', async () => {
    const desk = makeDesk({
      listRecipes: jest.fn(() => Promise.resolve(golf)),
      listCodes: jest.fn(() => Promise.resolve(listed)),
    });
    const tree = await render(desk);
    await act(async () => input(tree, 'Días de vigencia').props.onChangeText('400'));
    await act(async () => press(tree, 'Crear código').props.onPress());
    expect(desk.createCode).not.toHaveBeenCalled();
    expect(texts(tree)).toContain('Usos: de 1 a 10.000. Vigencia: de 1 a 365 días.');
    expect(press(tree, 'Revocar Q9XZ')).toBeUndefined();
    await act(async () => press(tree, 'Revocar 4HVT').props.onPress());
    expect(desk.revokeCode).toHaveBeenCalledWith('k1');
  });
});
