import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Animated, AppState, StyleSheet } from 'react-native';
import ParticipationFactorBar, {
  buildBackWavePath,
  buildSurfaceCarvePath,
} from '../ParticipationFactorBar';
import { DARK_PALETTE, LIGHT_PALETTE } from '../../theme/palette';

const MARKS = [0, 15, 50, 100];
const NEUTRAL = { track: '#71809E', tick: '#F3F6FC' };

let tree;
let previousState;
beforeEach(() => {
  previousState = AppState.currentState;
  AppState.currentState = 'active';
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  tree = null;
  AppState.currentState = previousState;
  jest.restoreAllMocks();
});

function element(props) {
  return (
    <ParticipationFactorBar
      percent={50}
      isDark
      marks={MARKS}
      label='Factor de participación (FP)'
      valueText='FP 50 %'
      neutralTrackColor={NEUTRAL.track}
      neutralTickColor={NEUTRAL.tick}
      markerColor='#DCE5FF'
      markerBorderColor='#0B121B'
      {...props}
    />
  );
}

async function render(props, { reduced = true } = {}) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduced);
  await act(async () => {
    tree = renderer.create(element(props));
  });
  return tree;
}

function byTestId(testID) {
  return tree.root.find((node) => typeof node.type === 'string' && node.props.testID === testID);
}

function queryByTestId(testID) {
  return tree.root.findAll((node) => typeof node.type === 'string' && node.props.testID === testID);
}

function style(node) {
  return StyleSheet.flatten(node.props.style);
}

function layoutTrack(width) {
  act(() => {
    byTestId('dashboard-rbi-factor-track').props.onLayout({
      nativeEvent: { layout: { x: 0, y: 0, width, height: 14 } },
    });
  });
}

function ticks() {
  return tree.root.findAll(
    (node) =>
      typeof node.type === 'string' &&
      typeof style(node)?.left === 'string' &&
      node.props.testID === undefined
  );
}

describe('ParticipationFactorBar', () => {
  it.each([0, 15, 50, 100])('exposes a %s %% progressbar and fills to the value', async (value) => {
    await render({ percent: value, valueText: `FP ${value} %` });

    const bar = byTestId('dashboard-rbi-factor-progress');
    expect(bar.props.role).toBe('progressbar');
    expect(bar.props['aria-label']).toBe('Factor de participación (FP)');
    expect(bar.props['aria-valuemin']).toBe(0);
    expect(bar.props['aria-valuemax']).toBe(100);
    expect(bar.props['aria-valuenow']).toBe(value);
    expect(bar.props['aria-valuetext']).toBe(`FP ${value} %`);
    expect(bar.props['aria-disabled']).toBe(false);

    expect(style(byTestId('dashboard-rbi-factor-fill')).width).toBe(`${value}%`);
    const marker = style(byTestId('dashboard-rbi-factor-marker'));
    expect(marker.left).toBe(`${value}%`);
    expect(marker.transform).toEqual([{ translateX: value === 0 ? 0 : value === 100 ? -12 : -6 }]);
  });

  it('keeps the neutral unavailable look with no fill, waves or marker', async () => {
    await render({ percent: null, valueText: 'Aún no disponible' });

    const bar = byTestId('dashboard-rbi-factor-progress');
    expect(bar.props['aria-disabled']).toBe(true);
    expect(bar.props['aria-valuenow']).toBeUndefined();
    expect(bar.props['aria-valuetext']).toBe('Aún no disponible');
    expect(style(byTestId('dashboard-rbi-factor-track')).backgroundColor).toBe(NEUTRAL.track);
    expect(style(byTestId('dashboard-rbi-factor-track')).borderWidth).toBeUndefined();
    expect(queryByTestId('dashboard-rbi-factor-fill')).toHaveLength(0);
    expect(queryByTestId('dashboard-rbi-factor-marker')).toHaveLength(0);
    for (const tick of ticks()) {
      expect(style(tick)).toMatchObject({ backgroundColor: NEUTRAL.tick, opacity: 0.78 });
    }
  });

  it.each([
    ['dark', true, DARK_PALETTE],
    ['light', false, LIGHT_PALETTE],
  ])('paints the %s theme tokens', async (_mode, isDark, palette) => {
    await render({ isDark });
    layoutTrack(302);

    expect(style(byTestId('dashboard-rbi-factor-track'))).toMatchObject({
      backgroundColor: palette.liquidProgressTrack,
      borderColor: palette.liquidProgressTrackBorder,
    });
    const stops = tree.root
      .findAll((node) => node.props.stopColor !== undefined && typeof node.type !== 'string')
      .map((node) => node.props.stopColor)
      .filter((color) => typeof color === 'string');
    expect(stops).toEqual([palette.liquidProgressFillStart, palette.liquidProgressFillEnd]);
    const fills = tree.root
      .findAll((node) => node.props.d !== undefined && typeof node.type !== 'string')
      .map((node) => node.props.fill)
      .filter((color) => typeof color === 'string');
    expect(fills).toEqual([palette.liquidProgressTrack, palette.liquidProgressWave]);
    const tickStyles = ticks().map(style);
    expect(tickStyles).toHaveLength(MARKS.length);
    for (const tick of tickStyles) {
      expect(tick).toMatchObject({ backgroundColor: palette.liquidProgressTick, opacity: 1 });
    }
  });

  it('skips the fill animation and the wave loop when reduce motion is on', async () => {
    const loop = jest.spyOn(Animated, 'loop');
    const timing = jest.spyOn(Animated, 'timing');
    await render({ percent: 50 }, { reduced: true });
    layoutTrack(302);

    expect(loop).not.toHaveBeenCalled();
    expect(timing).not.toHaveBeenCalled();
    expect(style(byTestId('dashboard-rbi-factor-fill')).width).toBe('50%');
    // The wave shape stays, just still.
    expect(queryByTestId('dashboard-rbi-factor-wave-front')).toHaveLength(1);
  });

  it.each(['off', 'low'])(
    'skips every animation when the app motion level is %s',
    async (motionLevel) => {
      const loop = jest.spyOn(Animated, 'loop');
      const timing = jest.spyOn(Animated, 'timing');
      await render({ percent: 50, motionLevel }, { reduced: false });
      layoutTrack(302);

      expect(loop).not.toHaveBeenCalled();
      expect(timing).not.toHaveBeenCalled();
      expect(style(byTestId('dashboard-rbi-factor-fill')).width).toBe('50%');
    }
  );

  it('fills with a short animation and loops the waves once the track is measured', async () => {
    const loopHandle = { start: jest.fn(), stop: jest.fn() };
    const fillHandle = { start: jest.fn(), stop: jest.fn() };
    const loop = jest.spyOn(Animated, 'loop').mockReturnValue(loopHandle);
    const timing = jest.spyOn(Animated, 'timing').mockReturnValue(fillHandle);
    await render({ percent: 15 }, { reduced: false });

    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 15, duration: 700, useNativeDriver: false })
    );
    expect(fillHandle.start).toHaveBeenCalledTimes(1);
    expect(loop).not.toHaveBeenCalled();

    layoutTrack(302);
    expect(loop).toHaveBeenCalledTimes(1);
    expect(loopHandle.start).toHaveBeenCalledTimes(1);

    act(() => tree.update(element({ percent: 50 })));
    expect(timing).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 50 })
    );
    expect(fillHandle.stop).toHaveBeenCalledTimes(1);
    expect(loop).toHaveBeenCalledTimes(1);

    act(() => tree.unmount());
    tree = null;
    expect(loopHandle.stop).toHaveBeenCalledTimes(1);
  });

  it('stops the wave loop when the system starts asking for reduced motion', async () => {
    let notify;
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_event, handler) => {
      notify = handler;
      return { remove: jest.fn() };
    });
    const loopHandle = { start: jest.fn(), stop: jest.fn() };
    jest.spyOn(Animated, 'loop').mockReturnValue(loopHandle);
    await render({ percent: 50 }, { reduced: false });
    layoutTrack(302);
    expect(loopHandle.start).toHaveBeenCalledTimes(1);

    act(() => notify(true));
    expect(loopHandle.stop).toHaveBeenCalledTimes(1);
  });
});

describe('liquid wave paths', () => {
  it('closes both shapes and spans the track plus one wavelength', () => {
    for (const path of [buildSurfaceCarvePath(300), buildBackWavePath(300)]) {
      expect(path.startsWith('M0 ')).toBe(true);
      expect(path.endsWith('Z')).toBe(true);
      const xs = [...path.matchAll(/T(\d+(?:\.\d+)?) /g)].map((match) => Number(match[1]));
      expect(Math.max(...xs)).toBeGreaterThanOrEqual(300 + 22);
    }
  });
});
