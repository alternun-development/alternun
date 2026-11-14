import React from 'react';
import { X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { manageStyles } from './styles';
import type { ProofViewerProps } from './types';

/**
 * Shows a supporting file inside the manage view. The file was downloaded with the session and
 * lives only in this browser as a local URL, released when the viewer closes.
 */
export function ProofViewer({ viewer, palette, t, onClose }: ProofViewerProps): React.JSX.Element {
  const isPdf = viewer?.type === 'application/pdf';
  return (
    <Modal transparent visible={viewer !== null} animationType='fade' onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={t('manage.clients.proof.close')}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View
          testID='manage-client-proof-viewer'
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[manageStyles.sectionTitle, { color: palette.text }]}>
                {t('manage.clients.proof.title')}
              </Text>
              <Text style={[manageStyles.muted, { color: palette.muted }]}>
                {t('manage.clients.proof.private')}
              </Text>
            </View>
            <Pressable
              testID='manage-client-proof-close'
              accessibilityRole='button'
              accessibilityLabel={t('manage.clients.proof.close')}
              hitSlop={8}
              onPress={onClose}
              style={[styles.close, { borderColor: palette.border }]}
            >
              <X size={16} color={palette.muted} />
            </Pressable>
          </View>

          <View style={[styles.body, { borderColor: palette.border }]}>
            {viewer?.status === 'loading' ? (
              <View style={styles.center}>
                <ActivityIndicator color={palette.primary} />
                <Text style={[manageStyles.muted, { color: palette.muted }]}>
                  {t('manage.clients.proof.loading')}
                </Text>
              </View>
            ) : null}
            {viewer?.status === 'error' ? (
              <Text style={[manageStyles.error, styles.message]}>
                {t('manage.clients.proof.error')}
              </Text>
            ) : null}
            {viewer?.status === 'ready' && viewer.uri && !isPdf ? (
              <Image
                testID='manage-client-proof-image'
                source={{ uri: viewer.uri }}
                resizeMode='contain'
                style={styles.media}
                accessibilityLabel={t('manage.clients.proof.title')}
              />
            ) : null}
            {viewer?.status === 'ready' && viewer.uri && isPdf ? (
              Platform.OS === 'web' ? (
                React.createElement('iframe', {
                  'data-testid': 'manage-client-proof-pdf',
                  src: viewer.uri,
                  title: t('manage.clients.proof.title'),
                  style: { border: 0, width: '100%', height: '100%', borderRadius: 12 },
                })
              ) : (
                <Text style={[manageStyles.muted, styles.message, { color: palette.muted }]}>
                  {t('manage.clients.proof.webOnly')}
                </Text>
              )
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 10, 8, 0.7)' },
  sheet: {
    width: '100%',
    maxWidth: 860,
    height: '90%',
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1, gap: 2 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  media: { width: '100%', height: '100%' },
  message: { padding: 16 },
});
