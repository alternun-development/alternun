/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-misused-promises */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PlayCircle, RotateCcw, Volume2, VolumeX } from 'lucide-react-native';

import { useAppTranslation } from '../i18n/useAppTranslation';

type NativeWebViewMessage = {
  nativeEvent?: {
    data?: string;
  };
};

type NativeWebViewHandle = {
  injectJavaScript?: (script: string) => void;
};

type NativeWebViewProps = {
  originWhitelist?: string[];
  source: { html: string };
  allowsInlineMediaPlayback?: boolean;
  mediaPlaybackRequiresUserAction?: boolean;
  onMessage?: (event: NativeWebViewMessage) => void;
  style?: React.ComponentProps<typeof View>['style'];
};

type NativeWebViewComponent = React.ForwardRefExoticComponent<
  NativeWebViewProps & React.RefAttributes<NativeWebViewHandle>
>;

export const AIRS_VIDEO_POSTER =
  'https://images.pexels.com/videos/5752729/space-earth-universe-cosmos-5752729.jpeg';

const DEFAULT_PREVIEW_SECONDS = 6;

interface AirsIntroVideoCardProps {
  videoUri: string;
  isMuted: boolean;
  isScreenFocused: boolean;
  shouldPlayMainTrack: boolean;
  showControls: boolean;
  controlsIconOnly: boolean;
  onToggleMute: () => void;
  onPlaybackChange?: (isPlaying: boolean) => void;
  previewSeconds?: number;
  posterUrl?: string;
  style?: React.ComponentProps<typeof Animated.View>['style'];
  children?: React.ReactNode;
}

function buildVideoHtml(
  videoUrl: string,
  posterUrl: string,
  muted: boolean,
  previewMode: boolean,
  previewSeconds: number
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #04040f; overflow: hidden; }
          #airsVideo { width: 100%; height: 100%; object-fit: cover; background: #04040f; }
        </style>
      </head>
      <body>
        <video id="airsVideo" playsinline webkit-playsinline loop></video>
        <script>
          const videoSource = ${JSON.stringify(videoUrl)};
          const videoPoster = ${JSON.stringify(posterUrl)};
          const initialMuted = ${muted ? 'true' : 'false'};
          const initialPreviewMode = ${previewMode ? 'true' : 'false'};
          const previewLoopSeconds = ${previewSeconds};
          const video = document.getElementById('airsVideo');
          if (video) {
            let isPreviewMode = initialPreviewMode;
            video.poster = videoPoster;
            video.autoplay = true;
            video.loop = true;
            const source = document.createElement('source');
            source.src = videoSource;
            source.type = 'video/mp4';
            video.appendChild(source);
            const setMuted = (value) => {
              const muted = !!value;
              video.defaultMuted = muted;
              video.muted = muted;
              video.volume = muted ? 0 : 1;
            };
            const restartVideo = () => {
              video.currentTime = 0;
              const playResult = video.play();
              if (playResult && typeof playResult.catch === 'function') {
                playResult.catch(() => {});
              }
            };
            const setPlayback = (shouldPlay) => {
              if (shouldPlay) {
                const playResult = video.play();
                if (playResult && typeof playResult.catch === 'function') {
                  playResult.catch(() => {});
                }
                return;
              }
              video.pause();
            };
            const setPreviewMode = (enabled) => {
              isPreviewMode = !!enabled;
              if (isPreviewMode && video.currentTime >= previewLoopSeconds) {
                video.currentTime = 0;
              }
              const playResult = video.play();
              if (playResult && typeof playResult.catch === 'function') {
                playResult.catch(() => {});
              }
              postPlaybackState();
            };
            const handlePreviewLoop = () => {
              if (!isPreviewMode) {
                return;
              }
              if (video.currentTime >= previewLoopSeconds) {
                video.currentTime = 0;
                const playResult = video.play();
                if (playResult && typeof playResult.catch === 'function') {
                  playResult.catch(() => {});
                }
              }
            };
            const postPlaybackState = () => {
              const isPlaying = !isPreviewMode && !video.paused && !video.ended;
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'playback',
                  isPlaying
                }));
              }
            };
            window.__setMuted = setMuted;
            window.__restartVideo = restartVideo;
            window.__setPlayback = setPlayback;
            window.__setPreviewMode = setPreviewMode;
            const tryPlay = () => video.play().catch(() => {});
            setMuted(initialMuted);
            tryPlay();
            video.addEventListener('play', postPlaybackState);
            video.addEventListener('pause', postPlaybackState);
            video.addEventListener('ended', postPlaybackState);
            video.addEventListener('waiting', postPlaybackState);
            video.addEventListener('timeupdate', handlePreviewLoop);
            postPlaybackState();
            document.addEventListener('visibilitychange', () => {
              if (!document.hidden) tryPlay();
            });
          }
        </script>
      </body>
    </html>
  `;
}

export default function AirsIntroVideoCard({
  videoUri,
  isMuted,
  isScreenFocused,
  shouldPlayMainTrack,
  showControls,
  controlsIconOnly,
  onToggleMute,
  onPlaybackChange,
  previewSeconds = DEFAULT_PREVIEW_SECONDS,
  posterUrl = AIRS_VIDEO_POSTER,
  style,
  children,
}: AirsIntroVideoCardProps) {
  const { t } = useAppTranslation('mobile');
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const webViewRef = useRef<NativeWebViewHandle | null>(null);

  const WebView = useMemo<NativeWebViewComponent | null>(() => {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      const webViewModule = require('react-native-webview') as {
        WebView?: NativeWebViewComponent;
      };
      return webViewModule.WebView ?? null;
    } catch {
      return null;
    }
  }, []);

  const webVideoHtml = useMemo(
    () => buildVideoHtml(videoUri, posterUrl, true, true, previewSeconds),
    [posterUrl, previewSeconds, videoUri]
  );

  useEffect(() => {
    onPlaybackChange?.(false);
  }, [onPlaybackChange, videoUri]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const video = webVideoRef.current;
    if (!video) {
      return;
    }

    const effectiveMuted = isMuted || !shouldPlayMainTrack;
    video.defaultMuted = effectiveMuted;
    video.muted = effectiveMuted;
    video.volume = effectiveMuted ? 0 : 1;

    const reportPlaybackState = () => {
      const isActuallyPlaying = Boolean(!video.paused && !video.ended && video.readyState > 2);
      onPlaybackChange?.(isScreenFocused && shouldPlayMainTrack && isActuallyPlaying);
    };

    const handlePreviewLoop = () => {
      if (shouldPlayMainTrack) {
        return;
      }

      if (video.currentTime >= previewSeconds) {
        video.currentTime = 0;
        const playResult = video.play?.();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => {});
        }
      }
    };

    if (!isScreenFocused) {
      video.pause?.();
      onPlaybackChange?.(false);
      return;
    }

    const playResult = video.play?.();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {});
    }

    if (!shouldPlayMainTrack) {
      onPlaybackChange?.(false);
    }

    reportPlaybackState();

    const intervalId = setInterval(reportPlaybackState, 300);
    video.addEventListener('play', reportPlaybackState);
    video.addEventListener('pause', reportPlaybackState);
    video.addEventListener('ended', reportPlaybackState);
    video.addEventListener('waiting', reportPlaybackState);
    video.addEventListener('playing', reportPlaybackState);
    video.addEventListener('timeupdate', handlePreviewLoop);

    return () => {
      clearInterval(intervalId);
      video.removeEventListener('play', reportPlaybackState);
      video.removeEventListener('pause', reportPlaybackState);
      video.removeEventListener('ended', reportPlaybackState);
      video.removeEventListener('waiting', reportPlaybackState);
      video.removeEventListener('playing', reportPlaybackState);
      video.removeEventListener('timeupdate', handlePreviewLoop);
    };
  }, [isMuted, isScreenFocused, onPlaybackChange, previewSeconds, shouldPlayMainTrack, videoUri]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const webView = webViewRef.current;
    if (!webView) {
      return;
    }

    const shouldPreview = isScreenFocused && !shouldPlayMainTrack;
    const effectiveMuted = isMuted || !shouldPlayMainTrack;
    const shouldPlayAny = isScreenFocused;

    webView.injectJavaScript?.(`
      if (window.__setPreviewMode) {
        window.__setPreviewMode(${shouldPreview ? 'true' : 'false'});
      }
      if (window.__setMuted) {
        window.__setMuted(${effectiveMuted ? 'true' : 'false'});
      }
      if (window.__setPlayback) {
        window.__setPlayback(${shouldPlayAny ? 'true' : 'false'});
      }
      true;
    `);

    if (!shouldPlayMainTrack) {
      onPlaybackChange?.(false);
    }
  }, [isMuted, isScreenFocused, onPlaybackChange, shouldPlayMainTrack, videoUri]);

  const restartVideo = useCallback(() => {
    if (Platform.OS === 'web') {
      const video = webVideoRef.current;
      if (!video) {
        return;
      }

      video.currentTime = 0;
      const playResult = video.play?.();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {});
      }
      onPlaybackChange?.(isScreenFocused && shouldPlayMainTrack);
      return;
    }

    const webView = webViewRef.current;
    if (!webView) {
      return;
    }

    webView.injectJavaScript?.(`
      if (window.__restartVideo) {
        window.__restartVideo();
      }
      if (window.__setPlayback) {
        window.__setPlayback(true);
      }
      true;
    `);
    onPlaybackChange?.(isScreenFocused && shouldPlayMainTrack);
  }, [isScreenFocused, onPlaybackChange, shouldPlayMainTrack]);

  const handleWebViewMessage = useCallback(
    (event: NativeWebViewMessage) => {
      const payload = event?.nativeEvent?.data;
      if (typeof payload !== 'string' || payload.length === 0) {
        return;
      }

      try {
        const data = JSON.parse(payload) as { type?: string; isPlaying?: boolean };
        if (data.type === 'playback' && typeof data.isPlaying === 'boolean') {
          onPlaybackChange?.(isScreenFocused && shouldPlayMainTrack && data.isPlaying);
        }
      } catch {
        // Ignore messages not related to playback state.
      }
    },
    [isScreenFocused, onPlaybackChange, shouldPlayMainTrack]
  );

  return (
    <Animated.View style={[styles.card, style]}>
      {Platform.OS === 'web' && videoUri ? (
        <video
          key={videoUri}
          ref={webVideoRef}
          autoPlay
          muted={isMuted || !shouldPlayMainTrack}
          loop
          onPlay={() => onPlaybackChange?.(isScreenFocused && shouldPlayMainTrack)}
          onPause={() => onPlaybackChange?.(false)}
          onEnded={() => onPlaybackChange?.(false)}
          playsInline
          preload='auto'
          poster={posterUrl}
          style={styles.webVideo}
        >
          <source src={videoUri} type='video/mp4' />
        </video>
      ) : WebView && videoUri ? (
        <WebView
          key={videoUri}
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: webVideoHtml }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onMessage={handleWebViewMessage}
          style={styles.videoWebView}
        />
      ) : (
        <TouchableOpacity
          style={styles.videoFallback}
          onPress={() => {
            if (videoUri) {
              void Linking.openURL(videoUri);
            }
          }}
          activeOpacity={0.85}
        >
          <PlayCircle size={20} color='#ffffff' />
          <Text style={styles.videoFallbackText}>
            {videoUri ? t('landing.video.openIntro') : t('landing.video.loadingIntro')}
          </Text>
        </TouchableOpacity>
      )}

      {showControls ? (
        <TouchableOpacity
          style={[styles.restartControl, controlsIconOnly && styles.videoControlIconOnly]}
          onPress={restartVideo}
          activeOpacity={0.85}
        >
          <RotateCcw size={14} color='#f8fbff' />
          {!controlsIconOnly && (
            <Text style={styles.videoControlText}>{t('landing.video.restart')}</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {showControls ? (
        <TouchableOpacity
          style={[styles.muteControl, controlsIconOnly && styles.videoControlIconOnly]}
          onPress={onToggleMute}
          activeOpacity={0.85}
        >
          {isMuted || !shouldPlayMainTrack ? (
            <VolumeX size={14} color='#f8fbff' />
          ) : (
            <Volume2 size={14} color='#f8fbff' />
          )}
          {!controlsIconOnly && (
            <Text style={styles.videoControlText}>
              {isMuted || !shouldPlayMainTrack
                ? t('landing.video.muted')
                : t('landing.video.soundOn')}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}

      {children ? (
        <View pointerEvents='none' style={styles.overlayFill}>
          {children}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: '#04040f',
    boxShadow: '0px 16px 28px 0px rgba(0, 0, 0, 0.32)',
  },
  overlayFill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  webVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    backgroundColor: '#04040f',
  },
  restartControl: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(4,4,15,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  muteControl: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 8,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(4,4,15,0.56)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoControlIconOnly: {
    paddingHorizontal: 7,
    paddingVertical: 7,
  },
  videoControlText: {
    color: '#f8fbff',
    fontSize: 11,
    fontWeight: '700',
  },
  videoWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  videoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#04040f',
  },
  videoFallbackText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
