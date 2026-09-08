/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('react-native', () => require('react-native-web'));

jest.mock('../../theme/useAppPalette', () => ({
  useAppPalette: () => ({ accentBold: '#27e9bf' }),
}));

const sharedValues: { value: number }[] = [];

jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const RNActual = require('react-native');

  return {
    __esModule: true,
    useSharedValue: jest.fn((initial: number) => {
      const ref = ReactActual.useRef<{ value: number } | null>(null);
      if (ref.current === null) {
        ref.current = { value: initial };
      }
      return ref.current;
    }),
    withRepeat: jest.fn((animation: unknown, iterations: number, reverse: boolean) => ({
      __type: 'withRepeat',
      animation,
      iterations,
      reverse,
    })),
    withTiming: jest.fn(
      (
        toValue: number,
        config: { duration: number; easing?: unknown },
        callback?: (finished?: boolean) => void
      ) => ({
        __type: 'withTiming',
        toValue,
        config,
        callback,
      })
    ),
    cancelAnimation: jest.fn(),
    Easing: { linear: 'linear' },
    useAnimatedStyle: jest.fn((factory: () => object) => factory()),
    default: {
      View: ({ children, style, ...rest }: any) =>
        ReactActual.createElement(RNActual.View, { style, ...rest }, children),
    },
  };
});

import DynamicMessageBar, { type DynamicMessageContent } from '../DynamicMessageBar';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const reanimatedMock = require('react-native-reanimated');

type RenderState = {
  container: HTMLDivElement;
  root: Root;
};

function render(message: DynamicMessageContent): RenderState {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<DynamicMessageBar message={message} duration={1000} />);
  });

  return { container, root };
}

function rerender(state: RenderState, message: DynamicMessageContent): void {
  act(() => {
    state.root.render(<DynamicMessageBar message={message} duration={1000} />);
  });
}

describe('DynamicMessageBar', () => {
  let renderState: RenderState | null = null;

  beforeEach(() => {
    renderState = null;
    sharedValues.length = 0;
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (renderState) {
      act(() => {
        renderState.root.unmount();
      });
    }
    renderState?.container.remove();
  });

  it('starts the loop as a non-reversing repeat so the completion callback cannot fight the animation', () => {
    const message: DynamicMessageContent = { text: 'Hello world' };
    renderState = render(message);

    expect(reanimatedMock.withRepeat).toHaveBeenCalledTimes(1);
    const [, iterations, reverse] = reanimatedMock.withRepeat.mock.calls[0];
    expect(iterations).toBe(-1);
    expect(reverse).toBe(false);
  });

  it('does not reset or restart the loop on a re-render that leaves the message unchanged', () => {
    const message: DynamicMessageContent = { text: 'Hello world' };
    renderState = render(message);

    expect(reanimatedMock.withRepeat).toHaveBeenCalledTimes(1);
    expect(reanimatedMock.cancelAnimation).toHaveBeenCalledTimes(0);

    // Same message reference, unrelated re-render (e.g. a width/duration-driven
    // re-render that isn't a real message change).
    rerender(renderState, message);

    expect(reanimatedMock.withRepeat).toHaveBeenCalledTimes(1);
    expect(reanimatedMock.cancelAnimation).toHaveBeenCalledTimes(0);
  });

  it('resets position and restarts the loop when the message changes', () => {
    const messageA: DynamicMessageContent = { text: 'First' };
    const messageB: DynamicMessageContent = { text: 'Second' };
    renderState = render(messageA);

    expect(reanimatedMock.withRepeat).toHaveBeenCalledTimes(1);

    rerender(renderState, messageB);

    expect(reanimatedMock.cancelAnimation).toHaveBeenCalledTimes(1);
    expect(reanimatedMock.withRepeat).toHaveBeenCalledTimes(2);
  });

  it('pauses on hover without resetting position, and resumes without resetting position', () => {
    const message: DynamicMessageContent = { text: 'Hello world' };
    renderState = render(message);

    const bar = renderState.container.querySelector('div');
    if (!bar) {
      throw new Error('DynamicMessageBar root was not rendered');
    }

    act(() => {
      // React derives onMouseEnter/onMouseLeave from delegated, bubbling
      // mouseover/mouseout listeners — plain non-bubbling mouseenter/mouseleave
      // events never reach them.
      bar.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    expect(reanimatedMock.cancelAnimation).toHaveBeenCalledTimes(1);
    expect(reanimatedMock.withRepeat).toHaveBeenCalledTimes(1);

    act(() => {
      bar.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });

    expect(reanimatedMock.withRepeat).toHaveBeenCalledTimes(2);
    // Resuming must not touch the message-change reset path.
    expect(reanimatedMock.cancelAnimation).toHaveBeenCalledTimes(1);
  });
});
