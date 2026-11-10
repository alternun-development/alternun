/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-floating-promises */
import React from 'react';
import { act, create } from 'react-test-renderer';
import { useToasts } from '../useToasts';

describe('useToasts', () => {
  it('shows toasts, dismisses them by hand or after a while, and clears timers on unmount', () => {
    jest.useFakeTimers();
    let api: ReturnType<typeof useToasts> | undefined;
    function Probe(): null {
      api = useToasts(1000);
      return null;
    }
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(<Probe />);
    });
    act(() => api!.show({ type: 'success', title: 'Listo' }));
    act(() => api!.show({ type: 'error', title: 'Falló', message: 'detalle' }));
    expect(api!.toasts.map((toast) => toast.title)).toEqual(['Listo', 'Falló']);
    act(() => api!.dismiss(api!.toasts[0].id));
    expect(api!.toasts.map((toast) => toast.title)).toEqual(['Falló']);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(api!.toasts).toEqual([]);
    act(() => api!.show({ type: 'info', title: 'Pendiente' }));
    act(() => renderer!.unmount());
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});
