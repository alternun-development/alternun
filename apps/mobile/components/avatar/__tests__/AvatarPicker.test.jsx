import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import AvatarPicker from '../AvatarPicker';
import UserAvatarSync from '../UserAvatarSync';
import {
  getUserAvatarState,
  resetUserAvatarState,
  setUserAvatarState,
} from '../../../utils/userAvatar';
import { useAuth } from '../../auth/AppAuthProvider';
import { resolveSessionTokenWithRetry } from '../../auth/sessionToken';

jest.mock('../../honorAwards/HonorAwardEmblem', () => ({ __esModule: true, default: () => null }));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ locale: 'es', t: (_key, _params, fallback) => fallback }),
}));
jest.mock('../../auth/AppAuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../../auth/sessionToken', () => ({
  resolveSessionTokenWithRetry: jest.fn(() => Promise.resolve('tok')),
}));

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const labels = (tree) =>
  tree.root
    .findAll((node) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel)
    .map((node) => node.props.accessibilityLabel);

const option = (tree, label) =>
  tree.root.find(
    (node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function'
  );

const texts = (tree) =>
  tree.root.findAllByType(Text).map((node) => [].concat(node.props.children).join(''));

function claimedAward(id, title) {
  return {
    id,
    status: 'claimed',
    recipe: { tier: 'gold', kind: 'medal', title, badgeImageUrl: null, artPreset: null },
  };
}

function renderPicker(props = {}) {
  const client = { get: jest.fn(), set: jest.fn() };
  const onClose = jest.fn();
  let tree;
  act(() => {
    tree = renderer.create(
      <AvatarPicker
        visible
        onClose={onClose}
        score={1200}
        initials='AB'
        client={client}
        {...props}
      />
    );
  });
  return { tree, client, onClose };
}

afterEach(() => {
  act(() => resetUserAvatarState());
  jest.clearAllMocks();
});

describe('AvatarPicker', () => {
  it('renders nothing while hidden', () => {
    const { tree } = renderPicker({ visible: false });
    expect(tree.toJSON()).toBeNull();
  });

  it('offers the illustrations and only the badges the person holds', async () => {
    const honorAwards = {
      list: jest.fn(() =>
        Promise.resolve([
          claimedAward('g1', 'Manglar Verde'),
          { ...claimedAward('g2', 'Pendiente'), status: 'awarded' },
        ])
      ),
    };
    const { tree } = renderPicker({ honorAwards });
    await flush();
    const shown = labels(tree);

    expect(shown).toEqual(
      expect.arrayContaining([
        'Tus iniciales',
        'mangrove',
        'turtle',
        'bronze',
        'silver',
        '1000 Airs',
        'Manglar Verde',
      ])
    );
    expect(shown).not.toContain('gold');
    expect(shown).not.toContain('5000 Airs');
    expect(shown).not.toContain('Pendiente');
  });

  it('labels the default as the photo or as the fallback badge', () => {
    act(() => setUserAvatarState({ socialUrl: 'https://cdn.test/me.png' }));
    const withPhoto = renderPicker();
    expect(labels(withPhoto.tree)).toContain('Tu foto');

    act(() => setUserAvatarState({ socialUrl: null }));
    const withFallback = renderPicker({ fallback: 1 });
    expect(labels(withFallback.tree)).toContain('Predeterminado');
  });

  it('saves the choice, shares it and closes', async () => {
    const { tree, client, onClose } = renderPicker();
    client.set.mockResolvedValue({ kind: 'preset', ref: 'coral', art: null });

    await act(async () => {
      option(tree, 'coral').props.onPress();
    });

    expect(client.set).toHaveBeenCalledWith('preset', 'coral');
    expect(getUserAvatarState().choice).toEqual({ kind: 'preset', ref: 'coral', art: null });
    expect(onClose).toHaveBeenCalled();
  });

  it('goes back to the default with a null kind', async () => {
    act(() => setUserAvatarState({ choice: { kind: 'preset', ref: 'sun', art: null } }));
    const { tree, client } = renderPicker();
    client.set.mockResolvedValue({ kind: null, ref: null, art: null });

    expect(option(tree, 'sun').props.accessibilityState.selected).toBe(true);
    await act(async () => {
      option(tree, 'Tus iniciales').props.onPress();
    });
    expect(client.set).toHaveBeenCalledWith(null, null);
  });

  it('keeps the picker open with a message when saving fails', async () => {
    const { tree, client, onClose } = renderPicker();
    client.set.mockRejectedValue(new Error('403'));

    await act(async () => {
      option(tree, 'wave').props.onPress();
    });

    expect(texts(tree)).toContain('No pudimos guardar tu avatar. Inténtalo de nuevo.');
    expect(onClose).not.toHaveBeenCalled();
    expect(getUserAvatarState().choice.kind).toBeNull();
  });

  it('shows no honor awards when they cannot be loaded', async () => {
    const honorAwards = { list: jest.fn(() => Promise.reject(new Error('offline'))) };
    const { tree } = renderPicker({ honorAwards, score: 0 });
    await flush();
    expect(labels(tree)).toEqual(expect.arrayContaining(['bronze']));
    expect(labels(tree)).not.toContain('silver');
  });

  it('closes from the header button', () => {
    const { tree, onClose } = renderPicker();
    act(() => option(tree, 'Cerrar').props.onPress());
    expect(onClose).toHaveBeenCalled();
  });
});

describe('UserAvatarSync', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('shares the social photo and the saved choice of the session user', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ kind: 'tier', ref: 'bronze', art: null }),
      })
    );
    useAuth.mockReturnValue({
      user: { id: 'u1', metadata: { picture: 'https://google.test/p.jpg' } },
      client: {},
    });

    let tree;
    act(() => {
      tree = renderer.create(<UserAvatarSync />);
    });
    await flush();

    expect(resolveSessionTokenWithRetry).toHaveBeenCalled();
    expect(getUserAvatarState()).toEqual({
      socialUrl: 'https://google.test/p.jpg',
      choice: { kind: 'tier', ref: 'bronze', art: null },
    });

    useAuth.mockReturnValue({ user: null, client: {} });
    act(() => tree.update(<UserAvatarSync />));
    expect(getUserAvatarState()).toEqual({
      socialUrl: null,
      choice: { kind: null, ref: null, art: null },
    });
    act(() => tree.unmount());
  });

  it('keeps the default when the saved choice cannot be read', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
    useAuth.mockReturnValue({ user: { id: 'u1', metadata: {} }, client: {} });

    let tree;
    act(() => {
      tree = renderer.create(<UserAvatarSync />);
    });
    await flush();

    expect(getUserAvatarState().choice.kind).toBeNull();
    act(() => tree.unmount());
  });
});
