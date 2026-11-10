import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { manageStyles } from './styles';
import { uploadErrorKey } from './ManageImagesSection';
import type { EnterpriseImagesSectionProps } from './types';
import { pickImageFile } from '../../utils/projectManage';
import type { EnterpriseImageKind } from '../../utils/enterpriseManage';

const SLOTS: ReadonlyArray<{ kind: EnterpriseImageKind; field: 'logoUrl' | 'bannerUrl' }> = [
  { kind: 'logo', field: 'logoUrl' },
  { kind: 'banner', field: 'bannerUrl' },
];

export function EnterpriseImagesSection({
  client,
  overview,
  palette,
  t,
  onChanged,
  canPickFiles,
  pickFile = pickImageFile,
}: EnterpriseImagesSectionProps): React.JSX.Element {
  const [busy, setBusy] = useState<EnterpriseImageKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: EnterpriseImageKind, action: () => Promise<void>): Promise<void> {
    setBusy(kind);
    setError(null);
    try {
      await action();
      onChanged(t('manage.saved'));
    } catch (failure) {
      setError(t(uploadErrorKey(failure)));
    } finally {
      setBusy(null);
    }
  }

  async function upload(kind: EnterpriseImageKind): Promise<void> {
    const file = await pickFile();
    if (file) await run(kind, () => client.uploadImage(kind, file));
  }

  return (
    <View testID='enterprise-manage-images' style={{ gap: 14 }}>
      {canPickFiles ? (
        <Text style={[manageStyles.muted, { color: palette.muted }]}>
          {t('manage.images.hint')}
        </Text>
      ) : (
        <Text
          testID='enterprise-manage-images-web-only'
          style={[manageStyles.muted, { color: palette.muted }]}
        >
          {t('manage.images.webOnly')}
        </Text>
      )}
      {error ? <Text style={manageStyles.error}>{error}</Text> : null}
      {SLOTS.map(({ kind, field }) => {
        const url = overview.enterprise[field];
        return (
          <View
            key={kind}
            testID={`enterprise-manage-images-${kind}`}
            style={[
              manageStyles.card,
              { borderColor: palette.border, backgroundColor: palette.surface },
            ]}
          >
            <Text style={[manageStyles.sectionTitle, { color: palette.text }]}>
              {t(`manage.enterprise.images.${kind}`)}
            </Text>
            {url ? (
              <Image
                source={{ uri: url }}
                accessibilityLabel={overview.enterprise.displayName}
                style={{ width: kind === 'banner' ? 240 : 96, height: 96, borderRadius: 12 }}
                resizeMode={kind === 'logo' ? 'contain' : 'cover'}
              />
            ) : (
              <Text style={[manageStyles.muted, { color: palette.muted }]}>
                {t('manage.images.empty')}
              </Text>
            )}
            <View style={manageStyles.row}>
              {canPickFiles ? (
                <Pressable
                  testID={`enterprise-manage-images-upload-${kind}`}
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
              {url ? (
                <Pressable
                  testID={`enterprise-manage-images-remove-${kind}`}
                  accessibilityRole='button'
                  disabled={busy !== null}
                  onPress={() => void run(kind, () => client.removeImage(kind))}
                  style={[manageStyles.secondaryButton, { borderColor: palette.border }]}
                >
                  <Text style={[manageStyles.secondaryButtonText, { color: palette.text }]}>
                    {t('manage.images.remove')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
