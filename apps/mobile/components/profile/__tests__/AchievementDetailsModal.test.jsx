import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, Modal, Pressable, Text } from 'react-native';
import AchievementDetailsModal from '../AchievementDetailsModal';
import { ACHIEVEMENT_CATALOG } from '../AchievementBadge';
import { MILESTONE_DETAIL_ARTWORK, LOCKED_ACHIEVEMENT_ARTWORK } from '../badgeAssets';
import { publishMilestoneImage, shareMilestoneImage } from '../milestoneSharing';

jest.mock('../../auth/AppAuthProvider', () => {
  const client = {};
  return { useAuth: () => ({ client }) };
});
jest.mock('../../auth/sessionToken', () => ({
  resolveSessionTokenWithRetry: jest.fn().mockResolvedValue('token'),
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn().mockResolvedValue(true) }));
jest.mock('../milestoneSharing', () => ({
  publishMilestoneImage: jest.fn(),
  shareMilestoneImage: jest.fn(),
  canShareMilestoneFile: () => true,
  downloadMilestoneImage: jest.fn(),
  socialComposerUrl: jest.fn(),
}));
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
  shareMilestoneImage.mockResolvedValue();
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
  await act(async () =>
    tree.root
      .findAll((node) => node.props.accessibilityLabel === 'Create share image')[0]
      .props.onPress()
  );
  expect(tree.root.findByType(Image).props.source).toEqual(MILESTONE_DETAIL_ARTWORK.first_10_airs);
  expect(publishMilestoneImage).toHaveBeenCalledWith('first_10_airs', 'token');
  await act(async () => {
    tree.root.findAll((node) => node.props.accessibilityLabel === 'X')[0].props.onPress();
  });
  expect(shareMilestoneImage).toHaveBeenCalledWith(
    { uri: 'file://badge.png' },
    expect.stringContaining('I just reached 10 AIRS')
  );
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

it('copies the caption, reports copy failures, and closes using the modal control', async () => {
  const Clipboard = require('expo-clipboard');
  const onClose = jest.fn();
  await act(async () => { tree = renderer.create(<AchievementDetailsModal def={def} score={30} c={c} onClose={onClose} />); });
  const press = async label => act(async () => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0].props.onPress());
  await press('Copy caption');
  expect(modalText()).toContain('Caption copied.');
  Clipboard.setStringAsync.mockResolvedValueOnce(false);
  await press('Copy caption');
  expect(modalText()).toContain('Select the caption above');
  Clipboard.setStringAsync.mockRejectedValueOnce(new Error('denied'));
  await press('Copy caption');
  expect(modalText()).toContain('Select the caption above');
  await press('Close achievement details');
  expect(onClose).toHaveBeenCalled();
});

it('reports sharing errors and allows sharing the prepared image again', async () => {
  await act(async () => { tree = renderer.create(<AchievementDetailsModal def={def} score={30} c={c} onClose={jest.fn()} />); });
  const press = async label => act(async () => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0].props.onPress());
  await press('Create share image');
  shareMilestoneImage.mockRejectedValueOnce(new Error('sharing unavailable'));
  await press('Share image…');
  expect(modalText()).toContain('Unable to open sharing');
  await press('Share image…');
  expect(shareMilestoneImage).toHaveBeenCalledTimes(2);
});
