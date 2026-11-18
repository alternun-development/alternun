import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useAppTranslation } from '../i18n/useAppTranslation';
import ShareActions from './ShareActions';
import type { ShareSheetProps } from './share.types';

/** A modal to share something: its preview (image, medal, QR...) over the share actions. */
export default function ShareSheet({
  visible,
  content,
  onClose,
  preview,
  services,
}: ShareSheetProps): React.JSX.Element | null {
  const { t } = useAppTranslation('mobile');
  if (!visible || !content) return null;
  const source = content.image?.source;
  const imagePreview =
    source !== undefined ? (
      <Image
        accessibilityIgnoresInvertColors
        source={typeof source === 'string' ? { uri: source } : source}
        style={styles.image}
        resizeMode='contain'
      />
    ) : null;

  return (
    <Modal transparent visible animationType='fade' onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={t('share.close', undefined, 'Cerrar')}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text accessibilityRole='header' numberOfLines={2} style={styles.title}>
              {content.title}
            </Text>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel={t('share.close', undefined, 'Cerrar')}
              onPress={onClose}
              style={styles.close}
            >
              <X size={18} color='#ffffff' />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            {preview ?? imagePreview}
            <Text style={styles.message}>{content.message}</Text>
            <ShareActions content={content} services={services} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,8,7,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    backgroundColor: '#0b0a1f',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(157,140,255,0.35)',
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingBottom: 4 },
  title: { flex: 1, color: '#ffffff', fontSize: 17, fontWeight: '800' },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  body: { padding: 18, paddingTop: 8, gap: 14, alignItems: 'center' },
  image: { width: 200, height: 200 },
  message: { color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
