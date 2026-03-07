import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createTypographyStyles, } from '../theme/typography';
import { ToastMessage } from './types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastSystem({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <TouchableOpacity
          key={toast.id}
          style={[
            styles.toast,
            toast.type === 'error' ? styles.toastError : toast.type === 'info' ? styles.toastInfo : styles.toastSuccess,
          ]}
          onPress={() => onDismiss(toast.id)}
          activeOpacity={0.9}
        >
          <View style={[styles.accentBorder, toast.type === 'error' ? styles.borderError : styles.borderAccent]} />
          <View style={styles.toastContent}>
            <Text style={styles.toastTitle}>{toast.title}</Text>
            <Text style={styles.toastMessage}>{toast.message}</Text>
          </View>
          <Text style={styles.closeIcon}>×</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = createTypographyStyles({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    left: 16,
    zIndex: 1000,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#00001e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  toastSuccess: {
    backgroundColor: 'rgba(10,10,24,0.95)',
  },
  toastError: {
    backgroundColor: 'rgba(10,10,24,0.95)',
  },
  toastInfo: {
    backgroundColor: 'rgba(10,10,24,0.95)',
  },
  accentBorder: {
    width: 4,
    alignSelf: 'stretch',
  },
  borderAccent: {
    backgroundColor: '#1ccba1',
  },
  borderError: {
    backgroundColor: '#ef4444',
  },
  toastContent: {
    flex: 1,
    padding: 12,
  },
  toastTitle: {
    color: '#e8e8ff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  toastMessage: {
    color: 'rgba(232,232,255,0.6)',
    fontSize: 12,
  },
  closeIcon: {
    color: 'rgba(232,232,255,0.4)',
    fontSize: 20,
    paddingRight: 12,
    paddingLeft: 4,
  },
});
