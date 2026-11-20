import React, { useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import type { ColumnLanesProps } from './ColumnLanes.types';

const HANDLE_WIDTH = 18;
const STEP_PX = 24;

const WEB_HANDLE_STYLE = (
  Platform.OS === 'web' ? { cursor: 'col-resize', userSelect: 'none', touchAction: 'none' } : {}
) as ViewStyle;

/**
 * Moves the delimiter after column `index` by `dx` px: that column grows and the next one
 * shrinks by the same weight, never below their minimums. The total weight stays the same.
 */
export function resizeColumns(
  weights: number[],
  index: number,
  dx: number,
  width: number,
  minWeights: number[]
): number[] {
  if (width <= 0 || index < 0 || index >= weights.length - 1) return weights;
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const pair = weights[index] + weights[index + 1];
  const left = Math.min(
    Math.max(weights[index] + (dx / width) * total, minWeights[index] ?? 0),
    pair - (minWeights[index + 1] ?? 0)
  );
  const next = [...weights];
  next[index] = left;
  next[index + 1] = pair - left;
  return next;
}

/**
 * Lane lines between table columns, laid over the table. Each line can be dragged sideways
 * to widen a column and read its full content; the header and rows follow the same weights.
 */
export default function ColumnLanes({
  weights,
  minWeights,
  onChange,
  inset,
  color,
  activeColor,
  labels,
}: ColumnLanesProps): React.JSX.Element {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const latest = useRef({ weights, minWeights, onChange, width });
  latest.current = { weights, minWeights, onChange, width };
  const innerWidth = Math.max(0, width - inset * 2);

  const responders = useRef(new Map<number, ReturnType<typeof PanResponder.create>>()).current;
  const responderFor = (index: number): ReturnType<typeof PanResponder.create> => {
    const existing = responders.get(index);
    if (existing) return existing;
    let start: number[] = [];
    const created = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start = latest.current.weights;
        setActive(index);
      },
      onPanResponderMove: (_event, gesture) => {
        const current = latest.current;
        current.onChange(
          resizeColumns(
            start,
            index,
            gesture.dx,
            Math.max(0, current.width - inset * 2),
            current.minWeights
          )
        );
      },
      onPanResponderRelease: () => setActive(null),
      onPanResponderTerminate: () => setActive(null),
    });
    responders.set(index, created);
    return created;
  };

  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let offset = 0;
  const handles = weights.slice(0, -1).map((weight, index) => {
    offset += weight;
    const left = inset + (offset / total) * innerWidth - HANDLE_WIDTH / 2;
    const isActive = active === index;
    return (
      <View
        key={index}
        testID={`column-lane-${index}`}
        accessible
        accessibilityRole='adjustable'
        accessibilityLabel={labels?.[index]}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          const dx = event.nativeEvent.actionName === 'increment' ? STEP_PX : -STEP_PX;
          onChange(resizeColumns(weights, index, dx, innerWidth, minWeights));
        }}
        {...responderFor(index).panHandlers}
        style={[styles.handle, WEB_HANDLE_STYLE, { left }]}
      >
        <View
          style={[
            styles.line,
            { backgroundColor: isActive ? activeColor : color },
            isActive && styles.lineActive,
          ]}
        />
      </View>
    );
  });

  return (
    <View
      pointerEvents='box-none'
      style={StyleSheet.absoluteFill}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 ? handles : null}
    </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HANDLE_WIDTH,
    alignItems: 'center',
    zIndex: 2,
  },
  line: { width: StyleSheet.hairlineWidth, flex: 1 },
  lineActive: { width: 2 },
});
