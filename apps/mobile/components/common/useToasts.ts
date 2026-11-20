import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastItem } from '@alternun/ui';

/** Toasts for a screen: `show` adds one that dismisses itself after `durationMs`. */
export function useToasts(durationMs = 4500): {
  toasts: ToastItem[];
  show: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
} {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      setToasts((current) => [...current, { ...toast, id }]);
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        dismiss(id);
      }, durationMs);
      timers.current.add(timer);
    },
    [dismiss, durationMs]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  return { toasts, show, dismiss };
}
