/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/require-await */
import { createActor, waitFor } from 'xstate';
import { createShareMachine } from '../shareMachine';
import type { ShareContent, ShareServices } from '../share.types';

jest.mock('expo-asset', () => ({ Asset: {} }));
jest.mock('expo-clipboard', () => ({}));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: {} }));
jest.mock('expo-sharing', () => ({}));

const prepared = { uri: 'file:///medal.png' };

function services(overrides: Partial<ShareServices> = {}): ShareServices {
  return {
    prepareImage: jest.fn(async () => prepared),
    shareNative: jest.fn(async () => undefined),
    copyText: jest.fn(async () => undefined),
    downloadImage: jest.fn(async () => undefined),
    openComposer: jest.fn(),
    ...overrides,
  };
}

const withImage: ShareContent = {
  title: 'Comparte',
  message: 'Obtuve la medalla',
  url: 'https://airs.test/explore/batis',
  image: { fileName: 'medal.webp', source: 'https://cdn.test/medal.webp' },
};

async function start(content: ShareContent, fake: ShareServices) {
  const actor = createActor(createShareMachine(fake), { input: { content } }).start();
  await waitFor(actor, (state) => state.matches('idle'));
  return actor;
}

function abort(): Error {
  const error = new Error('cancelled');
  error.name = 'AbortError';
  return error;
}

describe('share machine', () => {
  it('prepares the image first, then shares it with the message', async () => {
    const fake = services();
    const actor = await start(withImage, fake);
    expect(fake.prepareImage).toHaveBeenCalledWith(withImage.image);
    expect(actor.getSnapshot().context.imageStatus).toBe('ready');

    actor.send({ type: 'SHARE' });
    await waitFor(actor, (state) => state.matches('idle'));
    expect(fake.shareNative).toHaveBeenCalledWith(withImage, prepared);
    expect(actor.getSnapshot().context.notice).toBeNull();
  });

  it('keeps the link usable when the image cannot be prepared', async () => {
    const fake = services({ prepareImage: jest.fn(async () => Promise.reject(new Error('x'))) });
    const actor = await start(withImage, fake);
    expect(actor.getSnapshot().context.imageStatus).toBe('failed');
    actor.send({ type: 'DOWNLOAD' });
    expect(fake.downloadImage).not.toHaveBeenCalled();
    actor.send({ type: 'SHARE' });
    await waitFor(actor, (state) => state.matches('idle'));
    expect(fake.shareNative).toHaveBeenCalledWith(withImage, null);
  });

  it('stays quiet when the person cancels, and tells them when sharing fails', async () => {
    const cancel = services({ shareNative: jest.fn(async () => Promise.reject(abort())) });
    const quiet = await start({ title: 't', message: 'm' }, cancel);
    expect(quiet.getSnapshot().context.imageStatus).toBe('none');
    quiet.send({ type: 'SHARE' });
    await waitFor(quiet, (state) => state.matches('idle'));
    expect(quiet.getSnapshot().context.notice).toBeNull();

    const broken = services({ shareNative: jest.fn(async () => Promise.reject(new Error('no'))) });
    const loud = await start({ title: 't', message: 'm' }, broken);
    loud.send({ type: 'SHARE' });
    await waitFor(loud, (state) => state.matches('idle'));
    expect(loud.getSnapshot().context.notice).toBe('shareError');
  });

  it('copies the link and shows "copied" for a moment', async () => {
    jest.useFakeTimers();
    const fake = services();
    const actor = await start({ ...withImage, image: null }, fake);
    actor.send({ type: 'COPY' });
    await waitFor(actor, (state) => state.matches({ idle: 'copied' }));
    expect(fake.copyText).toHaveBeenCalledWith('https://airs.test/explore/batis');
    expect(actor.getSnapshot().context.notice).toBe('copied');
    jest.advanceTimersByTime(1800);
    expect(actor.getSnapshot().matches({ idle: 'ready' })).toBe(true);
    expect(actor.getSnapshot().context.notice).toBeNull();
    jest.useRealTimers();
  });

  it('copies the whole message when there is no link, and reports copy errors', async () => {
    const fake = services({ copyText: jest.fn(async () => Promise.reject(new Error('x'))) });
    const actor = await start({ title: 't', message: 'Hola' }, fake);
    actor.send({ type: 'COPY' });
    await waitFor(actor, (state) => state.matches('idle'));
    expect(fake.copyText).toHaveBeenCalledWith('Hola');
    expect(actor.getSnapshot().context.notice).toBe('copyError');
  });

  it('opens the composer of X and LinkedIn with the message and the link', async () => {
    const fake = services();
    const actor = await start(withImage, fake);
    actor.send({ type: 'SOCIAL', platform: 'X' });
    expect(fake.openComposer).toHaveBeenCalledWith(
      'X',
      'Obtuve la medalla https://airs.test/explore/batis',
      'https://airs.test/explore/batis'
    );
    actor.send({ type: 'SOCIAL', platform: 'LinkedIn' });
    expect(fake.openComposer).toHaveBeenLastCalledWith(
      'LinkedIn',
      expect.any(String),
      'https://airs.test/explore/batis'
    );
  });

  it('shares the image to Instagram, or saves it and opens Instagram when it cannot', async () => {
    const fake = services();
    const actor = await start(withImage, fake);
    actor.send({ type: 'SOCIAL', platform: 'Instagram' });
    await waitFor(actor, (state) => state.matches('idle'));
    expect(fake.shareNative).toHaveBeenCalledWith(withImage, prepared);
    expect(fake.openComposer).not.toHaveBeenCalled();

    const desktop = services({
      shareNative: jest.fn(async () => Promise.reject(new Error('unavailable'))),
    });
    const fallback = await start(withImage, desktop);
    fallback.send({ type: 'SOCIAL', platform: 'Instagram' });
    await waitFor(fallback, (state) => state.matches('idle'));
    expect(desktop.downloadImage).toHaveBeenCalledWith(prepared, 'medal.webp');
    expect(desktop.openComposer).toHaveBeenCalledWith(
      'Instagram',
      expect.any(String),
      withImage.url
    );
    expect(fallback.getSnapshot().context.notice).toBe('instagramHint');
  });

  it('downloads the prepared image with its file name', async () => {
    const fake = services();
    const actor = await start(withImage, fake);
    actor.send({ type: 'DOWNLOAD' });
    await waitFor(actor, (state) => state.matches('idle'));
    expect(fake.downloadImage).toHaveBeenCalledWith(prepared, 'medal.webp');
    expect(actor.getSnapshot().context.notice).toBe('downloaded');

    const failing = services({
      downloadImage: jest.fn(async () => Promise.reject(new Error('disk'))),
    });
    const other = await start(withImage, failing);
    other.send({ type: 'DOWNLOAD' });
    await waitFor(other, (state) => state.matches('idle'));
    expect(other.getSnapshot().context.notice).toBe('downloadError');
    other.send({ type: 'DISMISS' });
    expect(other.getSnapshot().context.notice).toBeNull();
  });
});
