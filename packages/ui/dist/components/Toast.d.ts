import React from 'react';
export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}
interface ToastProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}
export declare function Toast({ item, onDismiss }: ToastProps): React.JSX.Element;
interface ToastSystemProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}
export declare function ToastSystem({ toasts, onDismiss }: ToastSystemProps): React.JSX.Element;
export {};
