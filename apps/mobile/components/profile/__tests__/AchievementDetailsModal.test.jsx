import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, Modal, Pressable, Text } from 'react-native';
import AchievementDetailsModal from '../AchievementDetailsModal';
import { ACHIEVEMENT_CATALOG } from '../AchievementBadge';
import { MILESTONE_DETAIL_ARTWORK, LOCKED_ACHIEVEMENT_ARTWORK } from '../badgeAssets';
import { publishMilestoneImage } from '../milestoneSharing';
import ShareActions from '../../share/ShareActions';

jest.mock('../../auth/AppAuthProvider', () => {
  const client = {};
  return { useAuth: () => ({ client }) };
});
jest.mock('../../auth/sessionToken', () => ({
  resolveSessionTokenWithRetry: jest.fn().mockResolvedValue('token'),
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));
jest.mock('../milestoneSharing', () => ({ publishMilestoneImage: jest.fn() }));
// The shared share system runs for real; only the platform operations are fakes.
jest.mock('../../share/shareTargets', () => ({
  ...jest.requireActual('../../share/shareTargets'),
  defaultShareServices: {
    prepareImage: jest.fn(),
    shareNative: jest.fn(() => Promise.resolve()),
    copyText: jest.fn(() => Promise.resolve()),
    downloadImage: jest.fn(() => Promise.resolve()),
    openComposer: jest.fn(),
  },
}));
const { defaultShareServices: mockServices } = require('../../share/shareTargets');
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    t: (_key, params, fallback) =>
      fallback.replace(/{{(\w+)}}/g, (_, key) => String(params?.[key])),
  }),
}));
const c = { text: '#123', muted: '#567', border: '#ccc', cardBg: '#fff', accent: '#075' };
const def = { ...ACHIEVEMENT_CATALOG.first_10_airs, key: 'first_10_airs', unlocked: true };
let tree;
beforeEach(() => {
  jest.clearAllMocks();
  publishMilestoneImage.mockResolvedValue({ uri: 'file://badge.png' });
  mockServices.shareNative.mockImplementation(() => Promise.resolve());
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  tree = null;
});

it('shows the metallic artwork and shares that prepared image with the reached milestone caption', async () => {
  const onClose = jest.fn();
  await act(async () => {
    tree = renderer.create(
      <AchievementDetailsModal def={def} score={30} c={c} onClose={onClose} />
    );
  });
  expect(publishMilestoneImage).not.toHaveBeenCalled();
  // The same "Compartir" style as the rest of the share system.
  const ShareButton = require('../../share/ShareButton').default;
  expect(tree.root.findByType(ShareButton).props.label).toBe('Create share image');
  await act(async () =>
    tree.root
      .findAll((node) => node.props.accessibilityLabel === 'Create share image')[0]
      .props.onPress()
  );
  expect(tree.root.findByType(Image).props.source).toEqual(MILESTONE_DETAIL_ARTWORK.first_10_airs);
  expect(publishMilestoneImage).toHaveBeenCalledWith('first_10_airs', 'token');
  await act(async () => {
    tree.root.findAll((node) => node.props.accessibilityLabel === 'Compartir')[0].props.onPress();
  });
  expect(mockServices.shareNative).toHaveBeenCalledWith(
    expect.objectContaining({ message: expect.stringContaining('I just reached 10 AIRS') }),
    { uri: 'file://badge.png', file: undefined }
  );
  // The image prepared when publishing is reused, not downloaded again.
  expect(mockServices.prepareImage).not.toHaveBeenCalled();
  act(() => tree.root.findByType(Modal).props.onRequestClose());
  expect(onClose).toHaveBeenCalled();
});

it('never prepares or offers a celebration post for a locked milestone', async () => {
  await act(async () => {
    tree = renderer.create(
      <AchievementDetailsModal
        def={{ ...def, unlocked: false }}
        score={0}
        c={c}
        onClose={jest.fn()}
      />
    );
  });
  expect(publishMilestoneImage).not.toHaveBeenCalled();
  expect(
    tree.root.findAllByType(Pressable).some((node) => node.props.accessibilityLabel === 'X')
  ).toBe(false);
  expect(tree.root.findAllByType(ShareActions)).toHaveLength(0);
});

it('allows retry after image preparation fails', async () => {
  publishMilestoneImage.mockRejectedValueOnce(new Error('offline'));
  await act(async () => {
    tree = renderer.create(
      <AchievementDetailsModal def={def} score={30} c={c} onClose={jest.fn()} />
    );
  });
  await act(async () =>
    tree.root
      .findAll((node) => node.props.accessibilityLabel === 'Create share image')[0]
      .props.onPress()
  );
  await act(async () => {
    tree.root.findAll((node) => node.props.accessibilityLabel === 'Retry image')[0].props.onPress();
  });
  expect(publishMilestoneImage).toHaveBeenCalledTimes(2);
});

const modalText = () =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat()
    .join(' ');

it.each(Object.keys(ACHIEVEMENT_CATALOG).filter((key) => !key.includes('airs')))(
  'explains how to unlock %s without offering sharing',
  async (key) => {
    const { ACHIEVEMENT_UNLOCK_STEPS } = require('../achievementUnlockSteps');
    await act(async () => {
      tree = renderer.create(
        <AchievementDetailsModal
          def={{ ...ACHIEVEMENT_CATALOG[key], key, unlocked: false }}
          score={30}
          c={c}
          onClose={jest.fn()}
        />
      );
    });
    expect(modalText()).toContain('How to unlock');
    expect(modalText()).toContain(ACHIEVEMENT_UNLOCK_STEPS[key]);
    expect(publishMilestoneImage).not.toHaveBeenCalled();
  }
);

it.each([30, null])('explains the target even when the balance is %s', async (score) => {
  await act(async () => {
    tree = renderer.create(
      <AchievementDetailsModal
        def={{ ...ACHIEVEMENT_CATALOG.first_100_airs, key: 'first_100_airs', unlocked: false }}
        score={score}
        c={c}
        onClose={jest.fn()}
      />
    );
  });
  expect(modalText()).toContain('Reach 100 AIRS');
  expect(modalText()).toContain(score == null ? 'currently unavailable' : '70 more AIRS');
  expect(tree.root.findByType(Image).props.source).toEqual(
    LOCKED_ACHIEVEMENT_ARTWORK.first_100_airs
  );
});

it('describes an earned account badge without presenting it as an AIRS milestone', async () => {
  await act(async () => {
    tree = renderer.create(
      <AchievementDetailsModal
        def={{ ...ACHIEVEMENT_CATALOG.account_confirmed, key: 'account_confirmed', unlocked: true }}
        score={30}
        c={c}
        onClose={jest.fn()}
      />
    );
  });
  expect(modalText()).toContain('verified participation');
  expect(modalText()).not.toContain('more AIRS');
  expect(publishMilestoneImage).not.toHaveBeenCalled();
});

it('copies the public link and closes using the modal control', async () => {
  publishMilestoneImage.mockResolvedValueOnce({
    uri: 'file://badge.png',
    shareUrl: 'https://api.example/share/earned',
  });
  const onClose = jest.fn();
  await act(async () => {
    tree = renderer.create(
      <AchievementDetailsModal def={def} score={30} c={c} onClose={onClose} />
    );
  });
  await pressAction('Create share image');
  await pressAction('Copiar enlace');
  expect(mockServices.copyText).toHaveBeenCalledWith('https://api.example/share/earned');
  expect(modalText()).toContain('Copiado');
  await pressAction('Close achievement details');
  expect(onClose).toHaveBeenCalled();
});

it('reports sharing errors and allows sharing the prepared image again', async () => {
  await mountEarned();
  await pressAction('Create share image');
  mockServices.shareNative.mockImplementationOnce(() =>
    Promise.reject(new Error('sharing unavailable'))
  );
  await pressAction('Compartir');
  expect(modalText()).toContain('No pudimos abrir el menú para compartir');
  await pressAction('Compartir');
  expect(mockServices.shareNative).toHaveBeenCalledTimes(2);
});

const pressAction = async (label) =>
  act(async () =>
    tree.root
      .findAll(
        (node) =>
          node.props.accessibilityLabel === label && typeof node.props.onPress === 'function'
      )[0]
      .props.onPress()
  );
const mountEarned = async () =>
  act(async () => {
    tree = renderer.create(
      <AchievementDetailsModal def={def} score={30} c={c} onClose={jest.fn()} />
    );
  });

it('asks for retry when the session expires without publishing an anonymous card', async () => {
  const { resolveSessionTokenWithRetry } = require('../../auth/sessionToken');
  resolveSessionTokenWithRetry.mockResolvedValueOnce(null);
  await mountEarned();
  await pressAction('Create share image');
  expect(publishMilestoneImage).not.toHaveBeenCalled();
  expect(modalText()).toContain('The image could not be prepared');
});

it('offers the personalized preview, its public link, social networks and the download', async () => {
  const image = {
    uri: 'file://badge.png',
    previewUri: 'https://cdn.example/edward.png',
    displayName: 'Edward',
    shareUrl: 'https://api.example/share/earned',
  };
  publishMilestoneImage.mockResolvedValueOnce(image);
  await mountEarned();
  expect(tree.root.findAllByType(ShareActions)).toHaveLength(0);
  await pressAction('Create share image');
  expect(tree.root.findByType(Image).props.source).toEqual({ uri: image.previewUri });

  const { content } = tree.root.findByType(ShareActions).props;
  expect(content).toMatchObject({
    title: 'Share your milestone',
    url: image.shareUrl,
    image: { fileName: 'airs-first_10_airs.png', source: image.previewUri },
  });
  expect(content.message).toContain(image.shareUrl);
  expect(modalText()).toContain(content.message);

  for (const network of ['X', 'LinkedIn']) {
    await pressAction(`Compartir en ${network}`);
    expect(mockServices.openComposer).toHaveBeenLastCalledWith(
      network,
      content.message,
      image.shareUrl
    );
  }
  await pressAction('Descargar imagen');
  expect(mockServices.downloadImage).toHaveBeenCalledWith(
    { uri: image.uri, file: undefined },
    'airs-first_10_airs.png'
  );
});

it('treats a cancelled share as cancellation and allows another attempt', async () => {
  await mountEarned();
  await pressAction('Create share image');
  mockServices.shareNative.mockImplementationOnce(() =>
    Promise.reject(Object.assign(new Error('cancelled'), { name: 'AbortError' }))
  );
  await pressAction('Compartir');
  expect(modalText()).not.toContain('No pudimos abrir el menú');
  await pressAction('Compartir');
  expect(mockServices.shareNative).toHaveBeenCalledTimes(2);
});
