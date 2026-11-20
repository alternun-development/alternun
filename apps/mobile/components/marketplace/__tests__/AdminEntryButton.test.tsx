/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-floating-promises, @typescript-eslint/no-unsafe-return */
import React from 'react';
import { Linking } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AdminEntryButton } from '../AdminEntryButton';

function render(element: React.JSX.Element): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(element);
  });
  return renderer!;
}
const pressable = (r: ReactTestRenderer) =>
  r.root.findAll((n) => n.props.testID === 'admin' && typeof n.props.onPress === 'function')[0];

describe('AdminEntryButton', () => {
  it('opens its URL with the system browser by default', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const r = render(
      <AdminEntryButton
        testID='admin'
        label='Manage'
        url='https://a.test'
        color='#0f0'
        borderColor='#222'
      />
    );
    act(() => pressable(r).props.onPress());
    expect(open).toHaveBeenCalledWith('https://a.test');
    open.mockRestore();
  });

  it('floats in the top-right corner with its own background', () => {
    const r = render(
      <AdminEntryButton
        testID='admin'
        label='Manage'
        url='/x'
        color='#0f0'
        borderColor='#222'
        floating
        backgroundColor='#111'
        openUrl={jest.fn()}
      />
    );
    const style = JSON.stringify(pressable(r).props.style);
    expect(style).toContain('"position":"absolute"');
    expect(style).toContain('"backgroundColor":"#111"');
  });
});
