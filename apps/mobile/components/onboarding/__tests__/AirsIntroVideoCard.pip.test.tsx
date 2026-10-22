/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import AirsIntroVideoCard from '../AirsIntroVideoCard';

jest.mock('react-native', () => require('react-native-web'));
jest.mock('../../i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({ t: (key: string) => key }),
}));

const doc = document as unknown as Record<string, unknown>;
let container: HTMLDivElement;
let root: Root;
let requestPip: jest.Mock;
let exitPip: jest.Mock;

function render(showControls = true): void {
  act(() => {
    root.render(
      <AirsIntroVideoCard
        videoUri='https://cdn.example/promo.mp4'
        isMuted
        isScreenFocused
        shouldPlayMainTrack={false}
        showControls={showControls}
        controlsIconOnly={false}
        onToggleMute={() => undefined}
      />
    );
  });
}

function pipButton(): HTMLElement | null {
  return container.querySelector('[aria-label="landing.video.pip"]');
}

describe('AirsIntroVideoCard picture-in-picture', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    requestPip = jest.fn(() => Promise.resolve({}));
    exitPip = jest.fn(() => Promise.resolve());
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: () => Promise.resolve(),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: () => undefined,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'requestPictureInPicture', {
      configurable: true,
      value: requestPip,
    });
    doc.pictureInPictureEnabled = true;
    doc.pictureInPictureElement = null;
    doc.exitPictureInPicture = exitPip;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete doc.pictureInPictureEnabled;
    delete doc.pictureInPictureElement;
    delete doc.exitPictureInPicture;
  });

  it('hides the control when the browser does not support picture-in-picture', () => {
    doc.pictureInPictureEnabled = false;
    render();
    expect(pipButton()).toBeNull();
  });

  it('hides the control when controls are disabled', () => {
    render(false);
    expect(pipButton()).toBeNull();
  });

  it('requests picture-in-picture for the video and tracks enter/leave events', () => {
    render();
    const button = pipButton();
    expect(button).not.toBeNull();

    act(() => {
      button!.click();
    });
    expect(requestPip).toHaveBeenCalledTimes(1);

    const video = container.querySelector('video')!;
    act(() => {
      video.dispatchEvent(new Event('enterpictureinpicture'));
    });
    act(() => {
      video.dispatchEvent(new Event('leavepictureinpicture'));
    });
    expect(pipButton()).not.toBeNull();
  });

  it('exits picture-in-picture when it is already active', () => {
    doc.pictureInPictureElement = {};
    render();
    act(() => {
      pipButton()!.click();
    });
    expect(exitPip).toHaveBeenCalledTimes(1);
    expect(requestPip).not.toHaveBeenCalled();
  });

  it('keeps inline playback when the browser refuses the request', async () => {
    requestPip.mockImplementation(() => Promise.reject(new Error('no user gesture')));
    render();
    await act(async () => {
      pipButton()!.click();
      await Promise.resolve();
    });
    expect(container.querySelector('video')).not.toBeNull();
  });
});
