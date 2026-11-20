import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ColumnLanes, { resizeColumns } from '../ColumnLanes';

describe('resizeColumns', () => {
  const min = [1, 0.5, 0.5];

  it('moves weight between the two columns around the line and keeps the total', () => {
    // 300 px wide, total weight 3: 100 px is one weight unit.
    const next = resizeColumns([1, 1, 1], 0, 50, 300, min);
    expect(next).toEqual([1.5, 0.5, 1]);
    expect(next.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('stops at each column minimum', () => {
    expect(resizeColumns([1, 1, 1], 0, 500, 300, min)).toEqual([1.5, 0.5, 1]);
    expect(resizeColumns([1, 1, 1], 0, -500, 300, min)).toEqual([1, 1, 1]);
    expect(resizeColumns([1, 1, 1], 1, -500, 300, min)).toEqual([1, 0.5, 1.5]);
  });

  it('ignores the last column and an unmeasured table', () => {
    const weights = [1, 1, 1];
    expect(resizeColumns(weights, 2, 50, 300, min)).toBe(weights);
    expect(resizeColumns(weights, 0, 50, 0, min)).toBe(weights);
  });
});

it('draws one draggable line between each pair of columns once measured', () => {
  const onChange = jest.fn();
  let tree;
  act(() => {
    tree = renderer.create(
      <ColumnLanes
        weights={[2, 1, 1]}
        minWeights={[1, 0.5, 0.5]}
        onChange={onChange}
        inset={10}
        color='#ccc'
        activeColor='#0f0'
        labels={['a|b', 'b|c']}
      />
    );
  });
  const overlay = tree.root.findAll((node) => typeof node.props.onLayout === 'function')[0];
  act(() => overlay.props.onLayout({ nativeEvent: { layout: { width: 420, height: 200 } } }));
  const lanes = tree.root.findAll(
    (node) => typeof node.type === 'string' && /^column-lane-\d$/.test(node.props.testID ?? '')
  );
  expect(lanes).toHaveLength(2);
  // 400 px inside the inset, total weight 4: the first line sits after 200 px.
  expect(lanes[0].props.style.flat().find((style) => style && 'left' in style).left).toBe(201);
  expect(lanes[0].props.accessibilityLabel).toBe('a|b');

  act(() => lanes[1].props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } }));
  expect(onChange).toHaveBeenLastCalledWith([2, 0.76, 1.24]);

  act(() => lanes[0].props.onResponderGrant?.({ nativeEvent: { touches: [] }, touchHistory: { touchBank: [] } }));
  act(() => tree.unmount());
});
