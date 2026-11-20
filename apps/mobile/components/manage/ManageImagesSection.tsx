import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { ManageField } from './ManageField';
import { manageStyles } from './styles';
import type { ManageImagesSectionProps } from './types';
import {
  ManageRequestError,
  pickImageFile,
  type ManagedImageKind,
  type ManagedMedia,
} from '../../utils/projectManage';

const SLOTS: ReadonlyArray<{ kind: ManagedImageKind; labelKey: string }> = [
  { kind: 'logo', labelKey: 'manage.images.logo' },
  { kind: 'cover', labelKey: 'manage.images.cover' },
  { kind: 'gallery_image', labelKey: 'manage.images.gallery' },
];

export function uploadErrorKey(error: unknown): string {
  if (error instanceof ManageRequestError && error.code === 'UPLOAD_TYPE')
    return 'manage.images.type';
  if (error instanceof ManageRequestError && error.code === 'UPLOAD_SIZE')
    return 'manage.images.size';
  return 'manage.error';
}

export function ManageImagesSection({
  client,
  overview,
  palette,
  t,
  onChanged,
  canPickFiles,
  pickFile = pickImageFile,
}: ManageImagesSectionProps): React.JSX.Element {
  const [media, setMedia] = useState<ManagedMedia[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alt, setAlt] = useState('');
  const locale = overview.project.defaultLocale;

  const load = useCallback(() => {
    void client
      .listMedia()
      .then((items) => setMedia(items.filter((item) => item.isActive)))
      .catch(() => setError(t('manage.error')));
  }, [client, t]);

  useEffect(load, [load]);

  async function upload(kind: ManagedImageKind): Promise<void> {
    if (!alt.trim()) {
      setError(t('manage.images.altRequired'));
      return;
    }
    const file = await pickFile();
    if (!file) return;
    setBusy(kind);
    setError(null);
    try {
      // Logo and banner are single images: the new one replaces the current one.
      const current = (media ?? []).filter(
        (item) => item.kind === kind && kind !== 'gallery_image'
      );
      await client.uploadImage(kind, file, alt);
      for (const item of current) await client.retireMedia(item.id);
      setAlt('');
      load();
      onChanged(t('manage.saved'));
    } catch (uploadError) {
      setError(t(uploadErrorKey(uploadError)));
    } finally {
      setBusy(null);
    }
  }

  async function remove(item: ManagedMedia): Promise<void> {
    setBusy(item.id);
    setError(null);
    try {
      await client.retireMedia(item.id);
      load();
    } catch {
      setError(t('manage.error'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View testID='manage-images' style={{ gap: 14 }}>
      {canPickFiles ? (
        <View
          style={[
            manageStyles.card,
            { borderColor: palette.border, backgroundColor: palette.surface },
          ]}
        >
          <ManageField
            testID='manage-images-alt'
            label={t('manage.images.alt')}
            value={alt}
            onChange={setAlt}
            palette={palette}
          />
          <Text style={[manageStyles.muted, { color: palette.muted }]}>
            {t('manage.images.hint')}
          </Text>
        </View>
      ) : (
        <Text
          testID='manage-images-web-only'
          style={[manageStyles.muted, { color: palette.muted }]}
        >
          {t('manage.images.webOnly')}
        </Text>
      )}
      {error ? <Text style={manageStyles.error}>{error}</Text> : null}

      {SLOTS.map(({ kind, labelKey }) => {
        const items = (media ?? []).filter((item) => item.kind === kind);
        return (
          <View
            key={kind}
            testID={`manage-images-${kind}`}
            style={[
              manageStyles.card,
              { borderColor: palette.border, backgroundColor: palette.surface },
            ]}
          >
            <Text style={[manageStyles.sectionTitle, { color: palette.text }]}>{t(labelKey)}</Text>
            {items.length === 0 ? (
              <Text style={[manageStyles.muted, { color: palette.muted }]}>
                {t('manage.images.empty')}
              </Text>
            ) : (
              <View style={manageStyles.row}>
                {items.map((item) => (
                  <View key={item.id} style={{ gap: 6 }}>
                    <Image
                      source={{ uri: item.url }}
                      accessibilityLabel={
                        item.altText[locale] ?? Object.values(item.altText)[0] ?? ''
                      }
                      style={{ width: kind === 'cover' ? 220 : 96, height: 96, borderRadius: 12 }}
                      resizeMode={kind === 'logo' ? 'contain' : 'cover'}
                    />
                    <Pressable
                      testID={`manage-images-remove-${item.id}`}
                      accessibilityRole='button'
                      disabled={busy !== null}
                      onPress={() => void remove(item)}
                      style={[manageStyles.secondaryButton, { borderColor: palette.border }]}
                    >
                      <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                        {t('manage.images.remove')}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            {canPickFiles ? (
              <Pressable
                testID={`manage-images-upload-${kind}`}
                accessibilityRole='button'
                disabled={busy !== null}
                onPress={() => void upload(kind)}
                style={[
                  manageStyles.primaryButton,
                  { backgroundColor: palette.fill, opacity: busy ? 0.6 : 1 },
                ]}
              >
                <Text style={manageStyles.primaryButtonText}>
                  {busy === kind ? t('manage.images.uploading') : t('manage.images.upload')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
