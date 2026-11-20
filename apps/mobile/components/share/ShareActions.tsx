import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Check, Copy, Download, Instagram, Linkedin } from 'lucide-react-native';
import { useAppTranslation } from '../i18n/useAppTranslation';
import ShareButton from './ShareButton';
import { useShare } from './useShare';
import type { ShareActionsProps, ShareNotice, SharePalette, SocialPlatform } from './share.types';

const DARK: SharePalette = {
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.7)',
  border: 'rgba(255,255,255,0.18)',
  accent: '#1de9b6',
  surface: 'rgba(255,255,255,0.06)',
};

function XMark({ size, color }: { size: number; color: string }): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox='0 0 24 24'>
      <Path
        d='M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z'
        fill={color}
      />
    </Svg>
  );
}

const NOTICE_FALLBACKS: Record<Exclude<ShareNotice, null>, string> = {
  copied: 'Enlace copiado.',
  copyError: 'No pudimos copiar el enlace.',
  shareError: 'No pudimos abrir el menú para compartir. Copia el enlace o descarga la imagen.',
  downloaded: 'Imagen lista.',
  downloadError: 'No pudimos guardar la imagen.',
  instagramHint:
    'Instagram no publica desde un enlace: guardamos la imagen para que la subas a tu historia o publicación.',
};

/**
 * The share actions used everywhere (medals, milestones, QR codes): copy the link, the system
 * share sheet, X, LinkedIn, Instagram and saving the image. The flow runs in the share machine.
 */
export default function ShareActions({
  content,
  palette = DARK,
  showLink = true,
  disabled = false,
  services,
}: ShareActionsProps): React.JSX.Element {
  const { t } = useAppTranslation('mobile');
  const share = useShare(content, services);
  const off = disabled || share.busy;
  const hasImage = share.imageStatus === 'ready';
  const networks: Array<{ platform: SocialPlatform; label: string; icon: React.ReactNode }> = [
    { platform: 'X', label: 'X', icon: <XMark size={18} color={palette.text} /> },
    {
      platform: 'LinkedIn',
      label: 'LinkedIn',
      icon: <Linkedin size={18} color={palette.text} />,
    },
    {
      platform: 'Instagram',
      label: 'Instagram',
      icon: <Instagram size={18} color={palette.text} />,
    },
  ];

  return (
    <View style={styles.root}>
      {showLink && content.url ? (
        <View style={[styles.linkRow, { borderColor: palette.border }]}>
          <Text numberOfLines={1} selectable style={[styles.link, { color: palette.muted }]}>
            {content.url}
          </Text>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel={t('share.copyLink', undefined, 'Copiar enlace')}
            disabled={off}
            onPress={share.copy}
            style={[styles.copy, { backgroundColor: palette.surface }]}
          >
            {share.copied ? (
              <Check size={15} color={palette.accent} />
            ) : (
              <Copy size={15} color={palette.accent} />
            )}
            <Text style={[styles.copyText, { color: palette.accent }]}>
              {share.copied
                ? t('share.copied', undefined, 'Copiado')
                : t('share.copy', undefined, 'Copiar')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.primary}>
        <ShareButton
          size='large'
          label={t('share.button', undefined, 'Compartir')}
          disabled={off}
          onPress={share.share}
        />
      </View>

      <View style={styles.targets}>
        {networks.map((network) => (
          <Pressable
            key={network.platform}
            accessibilityRole='button'
            accessibilityLabel={t(
              'share.on',
              { network: network.label },
              `Compartir en ${network.label}`
            )}
            disabled={off}
            onPress={() => share.social(network.platform)}
            style={[styles.target, off ? styles.off : null]}
          >
            <View
              style={[
                styles.targetIcon,
                { borderColor: palette.border, backgroundColor: palette.surface },
              ]}
            >
              {network.icon}
            </View>
            <Text style={[styles.targetLabel, { color: palette.muted }]}>{network.label}</Text>
          </Pressable>
        ))}
        {content.image ? (
          <Pressable
            accessibilityRole='button'
            accessibilityLabel={t('share.download', undefined, 'Descargar imagen')}
            disabled={off || !hasImage}
            onPress={share.download}
            style={[styles.target, off || !hasImage ? styles.off : null]}
          >
            <View
              style={[
                styles.targetIcon,
                { borderColor: palette.border, backgroundColor: palette.surface },
              ]}
            >
              {share.preparing ? (
                <ActivityIndicator size='small' color={palette.accent} />
              ) : (
                <Download size={18} color={palette.accent} />
              )}
            </View>
            <Text style={[styles.targetLabel, { color: palette.muted }]}>
              {t('share.downloadShort', undefined, 'Descargar')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {share.notice && share.notice !== 'copied' ? (
        <Text accessibilityLiveRegion='polite' style={[styles.notice, { color: palette.muted }]}>
          {t(`share.notices.${share.notice}`, undefined, NOTICE_FALLBACKS[share.notice])}
        </Text>
      ) : null}
      {share.imageStatus === 'failed' ? (
        <Text style={[styles.notice, { color: palette.muted }]}>
          {t(
            'share.notices.imageUnavailable',
            undefined,
            'La imagen no está disponible; puedes compartir el enlace.'
          )}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch', gap: 14 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
  },
  link: { flex: 1, fontFamily: 'monospace', fontSize: 11 },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  copyText: { fontSize: 12, fontWeight: '800' },
  primary: { alignItems: 'center' },
  targets: { flexDirection: 'row', justifyContent: 'center', gap: 18 },
  target: { alignItems: 'center', gap: 5 },
  off: { opacity: 0.45 },
  targetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetLabel: { fontSize: 11, fontWeight: '600' },
  notice: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
