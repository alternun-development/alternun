import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useIsFocused } from '@react-navigation/native';
import { Check, ChevronDown, ChevronRight, Languages, LogIn, Moon, PlayCircle, RotateCcw, Settings as SettingsIcon, Sun, Volume2, VolumeX } from 'lucide-react-native';
import { useAppPreferences } from '../settings/AppPreferencesProvider';

const AIRS_VIDEO_POSTER =
  'https://images.pexels.com/videos/5752729/space-earth-universe-cosmos-5752729.jpeg';
const AIRS_BG_LIGHT_SRC =
  'https://me7aitdbxq.ufs.sh/f/2wsMIGDMQRdYMNjMlBUYHaeYpxduXPVNwf8mnFA61L7rkcoS';
const HERO_EXPANSION_RANGE = 420;
const HERO_SOLID_SWAP_SCROLL = 180;
const AUTO_UNMUTE_SCROLL_Y = 88;
const TOP_PAUSE_SCROLL_Y = 6;
const INTRO_PREVIEW_SECONDS = 6;

const AIRS_VIDEO_EN = require('../../assets/videos/AIRS-intro-videoplayback-EN.mp4');
const AIRS_VIDEO_ES = require('../../assets/videos/AIRS-intro-videoplayback-ES.mp4');
const AIRS_BRAND_LOGO_LIGHT = require('../../assets/AIRS-logo-light.svg');
const AIRS_BRAND_LOGO_DARK = require('../../assets/AIRS-logo-dark.svg');
const ALTERNUN_POWERED_BY_LOGO = require('../../assets/logo.png');
const ALTERNUN_PILL_LOGO_LIGHT = require('../../assets/alternun-black.svg');
const ALTERNUN_PILL_LOGO_DARK = require('../../assets/alternun-white.svg');
//const AIRS_BG_DARK = require('../../assets/images/water_falls-alternun-digital-forge.png'); //TODO CRAFT a same resolutions BG imagen
const AIRS_BG_DARK =
  'https://me7aitdbxq.ufs.sh/f/2wsMIGDMQRdYMNjMlBUYHaeYpxduXPVNwf8mnFA61L7rkcoS';

function resolveLocalAssetUri(assetModule: unknown): string {
  if (typeof assetModule === 'string') {
    return assetModule;
  }

  if (assetModule && typeof assetModule === 'object') {
    const source = assetModule as {
      uri?: unknown;
      src?: unknown;
      default?: unknown;
    };

    if (typeof source.uri === 'string') {
      return source.uri;
    }

    if (typeof source.src === 'string') {
      return source.src;
    }

    if (typeof source.default === 'string') {
      return source.default;
    }

    if (source.default && typeof source.default === 'object') {
      const defaultSource = source.default as { uri?: unknown; src?: unknown };
      if (typeof defaultSource.uri === 'string') {
        return defaultSource.uri;
      }
      if (typeof defaultSource.src === 'string') {
        return defaultSource.src;
      }
    }
  }

  try {
    const resolver = require('react-native/Libraries/Image/resolveAssetSource').default as (
      source: unknown,
    ) => { uri?: string } | null;
    return resolver(assetModule)?.uri ?? '';
  } catch {
    return '';
  }
}

interface AirsIntroExperienceProps {
  onContinueToDashboard: (dontShowAgain: boolean) => void;
  onSignIn: () => void;
}

function buildVideoHtml(
  videoUrl: string,
  posterUrl: string,
  muted: boolean,
  previewMode: boolean,
  previewSeconds: number,
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

export default function AirsIntroExperience({
  onContinueToDashboard,
  onSignIn,
}: AirsIntroExperienceProps) {
  const { themeMode, language, toggleThemeMode, cycleLanguage } = useAppPreferences();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [hasManualAudioChoice, setHasManualAudioChoice] = useState(false);
  const [hasAutoUnmuted, setHasAutoUnmuted] = useState(false);
  const [hasScrollActivatedPlayback, setHasScrollActivatedPlayback] = useState(false);
  const [isInTopZone, setIsInTopZone] = useState(true);
  const isScreenFocused = useIsFocused();
  const isDark = themeMode === 'dark';
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const webVideoRef = useRef<any>(null);
  const webViewRef = useRef<any>(null);
  const isMutedRef = useRef(isMuted);
  const hasManualAudioChoiceRef = useRef(hasManualAudioChoice);
  const hasAutoUnmutedRef = useRef(hasAutoUnmuted);
  const hasScrollActivatedPlaybackRef = useRef(hasScrollActivatedPlayback);
  const isInTopZoneRef = useRef(true);
  const isScreenFocusedRef = useRef(isScreenFocused);
  const selectedVideoModule = language === 'es' ? AIRS_VIDEO_ES : AIRS_VIDEO_EN;
  const videoUri = useMemo(
    () => resolveLocalAssetUri(selectedVideoModule),
    [selectedVideoModule],
  );

  const WebView = useMemo(() => {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      return require('react-native-webview').WebView as any;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    setIsMuted(true);
    setIsVideoPlaying(false);
    setHasManualAudioChoice(false);
    setHasAutoUnmuted(false);
    setHasScrollActivatedPlayback(false);
    setIsInTopZone(true);
    isInTopZoneRef.current = true;
    hasScrollActivatedPlaybackRef.current = false;
  }, [selectedVideoModule]);

  useEffect(() => {
    isMutedRef.current = isMuted;
    hasManualAudioChoiceRef.current = hasManualAudioChoice;
    hasAutoUnmutedRef.current = hasAutoUnmuted;
    hasScrollActivatedPlaybackRef.current = hasScrollActivatedPlayback;
  }, [hasAutoUnmuted, hasManualAudioChoice, hasScrollActivatedPlayback, isMuted]);

  useEffect(() => {
    isScreenFocusedRef.current = isScreenFocused;
  }, [isScreenFocused]);

  const syncTopZoneState = useCallback((scrollOffset: number) => {
    const atTop = scrollOffset <= TOP_PAUSE_SCROLL_Y;
    if (isInTopZoneRef.current === atTop) {
      if (!hasScrollActivatedPlaybackRef.current && scrollOffset > TOP_PAUSE_SCROLL_Y) {
        hasScrollActivatedPlaybackRef.current = true;
        setHasScrollActivatedPlayback(true);
      }
      return;
    }
    isInTopZoneRef.current = atTop;
    setIsInTopZone(atTop);
    if (!hasScrollActivatedPlaybackRef.current && scrollOffset > TOP_PAUSE_SCROLL_Y) {
      hasScrollActivatedPlaybackRef.current = true;
      setHasScrollActivatedPlayback(true);
    }
  }, []);

  const maybeAutoUnmuteFromScroll = useCallback((scrollOffset: number) => {
    if (scrollOffset <= AUTO_UNMUTE_SCROLL_Y) {
      return;
    }

    if (hasManualAudioChoiceRef.current || hasAutoUnmutedRef.current || !isMutedRef.current) {
      return;
    }

    hasAutoUnmutedRef.current = true;
    setHasAutoUnmuted(true);
    setIsMuted(false);
  }, []);

  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      maybeAutoUnmuteFromScroll(value);
      syncTopZoneState(value);
    });

    return () => {
      scrollY.removeListener(listenerId);
    };
  }, [maybeAutoUnmuteFromScroll, scrollY, syncTopZoneState]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    const video = webVideoRef.current;
    if (!video) {
      return;
    }

    const shouldPlayMainTrack = hasScrollActivatedPlayback && isScreenFocused;
    const effectiveMuted = isMuted || !shouldPlayMainTrack;
    video.defaultMuted = effectiveMuted;
    video.muted = effectiveMuted;
    video.volume = effectiveMuted ? 0 : 1;

    if (!isScreenFocused) {
      video.pause?.();
      setIsVideoPlaying(false);
      return;
    }

    const playResult = video.play?.();
    if (!shouldPlayMainTrack) {
      setIsVideoPlaying(false);
      return;
    }
    if (playResult && typeof playResult.then === 'function') {
      playResult
        .then(() => {
          setIsVideoPlaying(true);
        })
        .catch(() => {
          setIsVideoPlaying(false);
        });
      return;
    }

    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {
        setIsVideoPlaying(false);
      });
    }

    setIsVideoPlaying(Boolean(!video.paused && !video.ended));
  }, [hasScrollActivatedPlayback, isMuted, isScreenFocused, videoUri]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    const video = webVideoRef.current;
    if (!video) {
      return;
    }

    const enforcePreviewLoop = () => {
      if (hasScrollActivatedPlaybackRef.current) {
        return;
      }
      if (video.currentTime >= INTRO_PREVIEW_SECONDS) {
        video.currentTime = 0;
        const playResult = video.play?.();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => {});
        }
      }
    };

    video.addEventListener?.('timeupdate', enforcePreviewLoop);
    return () => {
      video.removeEventListener?.('timeupdate', enforcePreviewLoop);
    };
  }, [videoUri]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const video = webVideoRef.current;
    if (!video) {
      return;
    }

    const syncPlaybackState = () => {
      if (!isScreenFocusedRef.current || !hasScrollActivatedPlaybackRef.current) {
        setIsVideoPlaying(false);
        return;
      }
      const playing = Boolean(!video.paused && !video.ended && video.readyState > 2);
      setIsVideoPlaying(playing);
    };

    syncPlaybackState();
    const intervalId = setInterval(syncPlaybackState, 300);
    video.addEventListener?.('play', syncPlaybackState);
    video.addEventListener?.('pause', syncPlaybackState);
    video.addEventListener?.('ended', syncPlaybackState);
    video.addEventListener?.('waiting', syncPlaybackState);
    video.addEventListener?.('playing', syncPlaybackState);

    return () => {
      clearInterval(intervalId);
      video.removeEventListener?.('play', syncPlaybackState);
      video.removeEventListener?.('pause', syncPlaybackState);
      video.removeEventListener?.('ended', syncPlaybackState);
      video.removeEventListener?.('waiting', syncPlaybackState);
      video.removeEventListener?.('playing', syncPlaybackState);
    };
  }, [videoUri]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    if (!webViewRef.current) {
      return;
    }
    const shouldPlayMainTrack = hasScrollActivatedPlayback && isScreenFocused;
    const effectiveMuted = isMuted || !shouldPlayMainTrack;
    const shouldPreview = isScreenFocused && !hasScrollActivatedPlayback;
    const shouldPlayAny = isScreenFocused;
    webViewRef.current.injectJavaScript(`
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
      setIsVideoPlaying(false);
    }
  }, [hasScrollActivatedPlayback, isMuted, isScreenFocused, videoUri]);

  const effectiveMuted = isMuted || !hasScrollActivatedPlayback || !isScreenFocused;
  const showVideoControls = Boolean(videoUri && hasScrollActivatedPlayback && isScreenFocused);
  const webVideoHtml = useMemo(
    () =>
      buildVideoHtml(
        videoUri,
        AIRS_VIDEO_POSTER,
        true,
        true,
        INTRO_PREVIEW_SECONDS,
      ),
    [videoUri],
  );
  const handleScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
          useNativeDriver: false,
          listener: (event: any) => {
            const scrollOffset = event?.nativeEvent?.contentOffset?.y;
            if (typeof scrollOffset === 'number') {
              maybeAutoUnmuteFromScroll(scrollOffset);
              syncTopZoneState(scrollOffset);
            }
          },
        },
      ),
    [maybeAutoUnmuteFromScroll, scrollY, syncTopZoneState],
  );

  const VideoTag = 'video' as any;
  const SourceTag = 'source' as any;

  const heroHeight = Math.max(screenHeight * 1.05, 740);
  const cardStartWidth = Math.min(screenWidth * 0.56, 700);
  const cardEndWidth = Math.min(screenWidth - 24, 1220);
  const cardStartHeight = Math.max(cardStartWidth * 0.58, 220);
  const cardEndHeight = Math.min(Math.max(screenHeight * 0.72, 360), 760);
  const mediaTagTitleSize = Math.min(Math.max(screenWidth * 0.031, 14), 26);
  const mediaTagTitleLineHeight = mediaTagTitleSize * 1.02;
  const mediaTagSubtitleSize = Math.min(Math.max(screenWidth * 0.056, 20), 52);
  const mediaTagSubtitleLineHeight = mediaTagSubtitleSize * 1.12;
  const mediaTagPillWidth = Math.min(Math.max(screenWidth * 0.34, 150), 300);
  const mediaTagPillHeight = Math.min(Math.max(screenWidth * 0.058, 34), 48);
  const mediaTagPillLogoWidth = mediaTagPillWidth * 0.74;
  const mediaTagPillLogoHeight = mediaTagPillHeight * 0.58;
  const heroBrandPrimaryColor = isDark ? '#004646' : '#1ee6b5';
  const heroBrandSecondaryColor = isDark ? '#1ee6b5' : '#004646';
  const heroTitleSize = Math.min(Math.max(screenWidth * 0.062, 34), 64);
  const heroTitleLineHeight = heroTitleSize * 0.94;
  const heroBylineSize = Math.min(Math.max(screenWidth * 0.016, 10), 15);
  const heroBylineLineHeight = heroBylineSize * 1.03;
  const heroBylineIndent = Math.max(3, Math.round(heroTitleSize * 0.16));
  const heroBylineMaxWidth = heroTitleSize * 2.5;
  const heroBylineLogoSize = Math.min(Math.max(screenWidth * 0.02, 11), 16);
  const heroLogoSize = Math.min(Math.max(screenWidth * 0.08, 46), 78);

  const cardWidth = scrollY.interpolate({
    inputRange: [0, HERO_EXPANSION_RANGE],
    outputRange: [cardStartWidth, cardEndWidth],
    extrapolate: 'clamp',
  });
  const cardHeight = scrollY.interpolate({
    inputRange: [0, HERO_EXPANSION_RANGE],
    outputRange: [cardStartHeight, cardEndHeight],
    extrapolate: 'clamp',
  });
  const cardTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_EXPANSION_RANGE],
    outputRange: [88, -22],
    extrapolate: 'clamp',
  });
  const heroBgImageOpacity = scrollY.interpolate({
    inputRange: [0, HERO_SOLID_SWAP_SCROLL],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const heroSolidFadeOpacity = scrollY.interpolate({
    inputRange: [0, HERO_SOLID_SWAP_SCROLL],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const bgScale = scrollY.interpolate({
    inputRange: [0, HERO_EXPANSION_RANGE],
    outputRange: [1, 1.08],
    extrapolate: 'clamp',
  });
  const shadeStartOpacity = isDark ? 0.42 : 0.24;
  const shadeEndOpacity = isDark ? 0.02 : 0;
  const shadeOpacity = scrollY.interpolate({
    inputRange: [0, HERO_SOLID_SWAP_SCROLL],
    outputRange: [shadeStartOpacity, shadeEndOpacity],
    extrapolate: 'clamp',
  });
  const footerOpacity = scrollY.interpolate({
    inputRange: [0, HERO_EXPANSION_RANGE * 0.65],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const footerTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_EXPANSION_RANGE * 0.7],
    outputRange: [0, 24],
    extrapolate: 'clamp',
  });
  const contentOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0.94, 1],
    extrapolate: 'clamp',
  });
  const contentTranslateY = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [10, 0],
    extrapolate: 'clamp',
  });
  const mediaTagOpacity = scrollY.interpolate({
    inputRange: [0, 28, 72],
    outputRange: [1, 0.72, 0],
    extrapolate: 'clamp',
  });
  const mediaTagTranslateY = scrollY.interpolate({
    inputRange: [0, 72],
    outputRange: [0, 18],
    extrapolate: 'clamp',
  });
  const mediaTagTitleAnchorY = Animated.add(
    Animated.multiply(Animated.divide(cardHeight, 2), -1),
    new Animated.Value(-96),
  );
  const mediaTagSubtitleAnchorY = Animated.add(
    Animated.divide(cardHeight, 2),
    new Animated.Value(26),
  );
  const mediaTagTitleFinalTranslateY = Animated.add(mediaTagTitleAnchorY, mediaTagTranslateY);
  const mediaTagPillFinalTranslateY = Animated.add(mediaTagTitleFinalTranslateY, new Animated.Value(-76));
  const mediaTagSubtitleFinalTranslateY = Animated.add(mediaTagSubtitleAnchorY, mediaTagTranslateY);

  const palette = isDark
    ? {
        pageBg: '#050510',
        contentCard: '#0d0d1f',
        contentBorder: 'rgba(255,255,255,0.1)',
        textPrimary: '#e8e8ff',
        textMuted: 'rgba(232,232,255,0.74)',
        accent: '#1ccba1',
        mutedButtonBg: 'rgba(255,255,255,0.03)',
        mutedButtonBorder: 'rgba(255,255,255,0.16)',
      }
    : {
        pageBg: '#f6f8fc',
        contentCard: '#ffffff',
        contentBorder: 'rgba(15,23,42,0.12)',
        textPrimary: '#0f172a',
        textMuted: '#334155',
        accent: '#0f766e',
        mutedButtonBg: 'rgba(15,23,42,0.03)',
        mutedButtonBorder: 'rgba(15,23,42,0.16)',
      };

  const ThemeIcon = isDark ? Sun : Moon;
  const MuteIcon = effectiveMuted ? VolumeX : Volume2;
  const heroBrandLogoSource = isDark ? AIRS_BRAND_LOGO_DARK : AIRS_BRAND_LOGO_LIGHT;
  const mediaTagPillLogoSource = isDark ? ALTERNUN_PILL_LOGO_DARK : ALTERNUN_PILL_LOGO_LIGHT;
  const mediaTagPillBackgroundColor = isDark ? 'rgba(0, 70, 70, 0.96)' : 'rgba(229, 245, 242, 0.96)';
  const mediaTagPillBorderColor = isDark ? 'rgba(34, 248, 199, 0.34)' : 'rgba(0, 70, 70, 0.42)';
  const mediaTagPillShadowColor = isDark ? 'rgba(0,0,0,0.48)' : 'rgba(0, 43, 61, 0.28)';
  const heroBackgroundSource = (isDark ? AIRS_BG_DARK : { uri: AIRS_BG_LIGHT_SRC }) as any;
  const heroFooterTextColor = isDark ? 'rgba(248,251,255,0.96)' : '#020617';
  const heroFooterShadowColor = isDark ? 'rgba(0,0,0,0.28)' : 'transparent';
  const languageLabel =
    language === 'es'
      ? 'Español'
      : language === 'th'
        ? 'ไทย'
        : 'English';

  const closeProfileMenu = () => {
    setProfileMenuVisible(false);
    setSettingsExpanded(false);
  };

  const toggleMute = () => {
    setHasManualAudioChoice(true);
    setHasAutoUnmuted(true);
    setIsMuted((prev) => !prev);
  };

  const restartVideo = () => {
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
      setIsVideoPlaying(hasScrollActivatedPlayback && isScreenFocused);
      return;
    }

    if (!webViewRef.current) {
      return;
    }
    webViewRef.current.injectJavaScript(`
      if (window.__restartVideo) {
        window.__restartVideo();
      }
      if (window.__setPlayback) {
        window.__setPlayback(true);
      }
      true;
    `);
    setIsVideoPlaying(hasScrollActivatedPlayback && isScreenFocused);
  };

  const handleWebVideoPlay = () => {
    if (!isScreenFocusedRef.current || !hasScrollActivatedPlaybackRef.current) {
      setIsVideoPlaying(false);
      return;
    }
    setIsVideoPlaying(true);
  };

  const handleWebVideoPause = () => {
    setIsVideoPlaying(false);
  };

  const handleWebViewMessage = (event: any) => {
    const payload = event?.nativeEvent?.data;
    if (typeof payload !== 'string' || payload.length === 0) {
      return;
    }

    try {
      const data = JSON.parse(payload) as { type?: string; isPlaying?: boolean };
      if (data.type === 'playback' && typeof data.isPlaying === 'boolean') {
        if (!isScreenFocusedRef.current || !hasScrollActivatedPlaybackRef.current) {
          setIsVideoPlaying(false);
          return;
        }
        setIsVideoPlaying(data.isPlaying);
      }
    } catch {
      // Ignore messages not related to playback state.
    }
  };

  return (
    <View style={[styles.page, { backgroundColor: palette.pageBg }]}>
      <View pointerEvents='none' style={styles.floatingLeftTop}>
        <View style={styles.heroBrandRow}>
          <View style={styles.heroBrandTextBlock}>
            <Text
              style={[
                styles.heroTitle,
                {
                  color: heroBrandPrimaryColor,
                  fontSize: heroTitleSize,
                  lineHeight: heroTitleLineHeight,
                },
              ]}
            >
              AIRS
            </Text>
            <View
              style={[
                styles.heroBrandBylineRow,
                {
                  marginLeft: heroBylineIndent,
                  maxWidth: heroBylineMaxWidth,
                },
              ]}
            >
              <Text
                style={[
                  styles.heroBrandByline,
                  {
                    color: heroBrandSecondaryColor,
                    fontSize: heroBylineSize,
                    lineHeight: heroBylineLineHeight,
                  },
                ]}
              >
                Powered By
              </Text>
              <ExpoImage
                source={ALTERNUN_POWERED_BY_LOGO}
                style={[
                  styles.heroBrandBylineLogo,
                  { width: heroBylineLogoSize, height: heroBylineLogoSize },
                ]}
                contentFit='contain'
              />
            </View>
          </View>
          <ExpoImage
            source={heroBrandLogoSource}
            style={[styles.heroBrandLogo, { width: heroLogoSize, height: heroLogoSize }]}
            contentFit='contain'
          />
        </View>
      </View>

      <View style={styles.floatingRightTop}>
        <TouchableOpacity
          style={[styles.floatingProfileTrigger, { backgroundColor: palette.contentCard, borderColor: palette.contentBorder }]}
          activeOpacity={0.86}
          onPress={() => setProfileMenuVisible((prev) => !prev)}
        >
          <View style={[styles.floatingAvatar, { backgroundColor: `${palette.accent}22` }]}>
            <Text style={[styles.floatingAvatarText, { color: palette.accent }]}>U</Text>
          </View>
          <ChevronDown size={14} color={palette.textPrimary} />
        </TouchableOpacity>

        {profileMenuVisible ? (
          <View style={[styles.floatingMenu, { backgroundColor: palette.contentCard, borderColor: palette.contentBorder }]}>
            <TouchableOpacity
              style={[styles.floatingMenuItem, { backgroundColor: palette.mutedButtonBg }]}
              onPress={() => {
                closeProfileMenu();
                onSignIn();
              }}
              activeOpacity={0.82}
            >
              <LogIn size={14} color={palette.textPrimary} />
              <Text style={[styles.floatingMenuText, { color: palette.textPrimary }]}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.floatingMenuItem, { backgroundColor: palette.mutedButtonBg }]}
              onPress={() => setSettingsExpanded((prev) => !prev)}
              activeOpacity={0.82}
            >
              <SettingsIcon size={14} color={palette.textPrimary} />
              <Text style={[styles.floatingMenuText, { color: palette.textPrimary }]}>Settings</Text>
              <View style={styles.floatingMenuItemRight}>
                {settingsExpanded ? (
                  <ChevronDown size={13} color={palette.textMuted} />
                ) : (
                  <ChevronRight size={13} color={palette.textMuted} />
                )}
              </View>
            </TouchableOpacity>

            {settingsExpanded ? (
              <>
                <TouchableOpacity
                  style={[styles.floatingSubMenuItem, { backgroundColor: palette.mutedButtonBg }]}
                  onPress={toggleThemeMode}
                  activeOpacity={0.82}
                >
                  <ThemeIcon size={14} color={palette.textPrimary} />
                  <Text style={[styles.floatingMenuText, { color: palette.textPrimary }]}>Theme</Text>
                  <View style={styles.floatingMenuItemRight}>
                    <Text style={[styles.floatingMenuValue, { color: palette.accent }]}>
                      {isDark ? 'Dark' : 'Light'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.floatingSubMenuItem, { backgroundColor: palette.mutedButtonBg }]}
                  onPress={cycleLanguage}
                  activeOpacity={0.82}
                >
                  <Languages size={14} color={palette.textPrimary} />
                  <Text style={[styles.floatingMenuText, { color: palette.textPrimary }]}>Language</Text>
                  <View style={styles.floatingMenuItemRight}>
                    <Text style={[styles.floatingMenuValue, { color: palette.accent }]}>
                      {languageLabel}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity
              style={[styles.floatingCaptionItem, { backgroundColor: palette.mutedButtonBg }]}
              onPress={() => {
                setDontShowAgain(true);
                closeProfileMenu();
                onContinueToDashboard(true);
              }}
              activeOpacity={0.82}
            >
              <View
                style={[
                  styles.floatingCheckbox,
                  {
                    borderColor: palette.accent,
                    backgroundColor: `${palette.accent}22`,
                  },
                ]}
              >
                <Check size={11} color={palette.accent} />
              </View>
              <Text style={[styles.floatingCaptionText, { color: palette.textMuted }]}>
                Don&apos;t show intro again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {profileMenuVisible ? (
        <Pressable style={styles.floatingBackdrop} onPress={closeProfileMenu} />
      ) : null}

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.heroSection, { height: heroHeight, backgroundColor: palette.pageBg }]}>
          <Animated.Image
            source={heroBackgroundSource}
            style={[
              styles.heroBackground,
              { opacity: heroBgImageOpacity, transform: [{ scale: bgScale }] },
            ]}
            resizeMode='cover'
          />
          <Animated.View
            style={[
              styles.heroSolidFadeLayer,
              { backgroundColor: palette.pageBg, opacity: heroSolidFadeOpacity },
            ]}
          />
          <Animated.View style={[styles.heroShade, { opacity: shadeOpacity }]} />

          <Animated.View style={[styles.heroMediaStage, { transform: [{ translateY: cardTranslateY }] }]}>
            <Animated.View
              style={[
                styles.heroMediaCard,
                {
                  width: cardWidth,
                  height: cardHeight,
                },
              ]}
            >
              {Platform.OS === 'web' && videoUri ? (
                <VideoTag
                  ref={webVideoRef}
                  autoPlay
                  muted={effectiveMuted}
                  loop
                  onPlay={handleWebVideoPlay}
                  onPause={handleWebVideoPause}
                  onEnded={handleWebVideoPause}
                  playsInline
                  preload='auto'
                  poster={AIRS_VIDEO_POSTER}
                  style={styles.webVideo}
                >
                  <SourceTag src={videoUri} type='video/mp4' />
                </VideoTag>
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
                    {videoUri ? 'Open AIRS Intro Video' : 'Loading AIRS Intro Video'}
                  </Text>
                </TouchableOpacity>
              )}

              {showVideoControls ? (
                <TouchableOpacity
                  style={styles.restartControl}
                  onPress={restartVideo}
                  activeOpacity={0.85}
                >
                  <RotateCcw size={14} color='#f8fbff' />
                  <Text style={styles.videoControlText}>Restart</Text>
                </TouchableOpacity>
              ) : null}

              {showVideoControls ? (
                <TouchableOpacity
                  style={styles.muteControl}
                  onPress={toggleMute}
                  activeOpacity={0.85}
                >
                  <MuteIcon size={14} color='#f8fbff' />
                  <Text style={styles.videoControlText}>{effectiveMuted ? 'Muted' : 'Sound On'}</Text>
                </TouchableOpacity>
              ) : null}

            </Animated.View>

            {videoUri && (!hasScrollActivatedPlayback || isInTopZone || !isVideoPlaying) ? (
              <>
                <Animated.View
                  pointerEvents='none'
                  style={[
                    styles.mediaTagPillOverlay,
                    {
                      width: cardWidth,
                      opacity: mediaTagOpacity,
                      transform: [{ translateY: mediaTagPillFinalTranslateY }],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.mediaTagPill,
                      {
                        width: mediaTagPillWidth,
                        minHeight: mediaTagPillHeight,
                        backgroundColor: mediaTagPillBackgroundColor,
                        borderColor: mediaTagPillBorderColor,
                        shadowColor: mediaTagPillShadowColor,
                      },
                    ]}
                  >
                    <ExpoImage
                      source={mediaTagPillLogoSource}
                      style={{
                        width: mediaTagPillLogoWidth,
                        height: mediaTagPillLogoHeight,
                      }}
                      contentFit='contain'
                    />
                  </View>
                </Animated.View>

                <Animated.View
                  pointerEvents='none'
                  style={[
                    styles.mediaTagTitleOverlay,
                    {
                      width: cardWidth,
                      opacity: mediaTagOpacity,
                      transform: [{ translateY: mediaTagTitleFinalTranslateY }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.mediaTagTitle,
                      {
                        fontSize: mediaTagTitleSize,
                        lineHeight: mediaTagTitleLineHeight,
                      },
                    ]}
                  >
                    Alternun Impact & Reputation Score
                  </Text>
                </Animated.View>

                <Animated.View
                  pointerEvents='none'
                  style={[
                    styles.mediaTagSubtitleOverlay,
                    {
                      width: cardWidth,
                      opacity: mediaTagOpacity,
                      transform: [{ translateY: mediaTagSubtitleFinalTranslateY }],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.mediaTagSubtitle,
                      {
                        fontSize: mediaTagSubtitleSize,
                        lineHeight: mediaTagSubtitleLineHeight,
                      },
                    ]}
                  >
                    The definitive loyalty program for people protecting the planet.
                  </Text>
                </Animated.View>
              </>
            ) : null}
          </Animated.View>

          <Animated.View
            style={[
              styles.heroFooter,
              { opacity: footerOpacity, transform: [{ translateY: footerTranslateY }] },
            ]}
          >
            <View style={styles.heroMetaLeftBlock}>
              <Text
                numberOfLines={1}
                ellipsizeMode='tail'
                style={[
                  styles.heroMetaLeft,
                  { color: heroFooterTextColor, textShadowColor: heroFooterShadowColor },
                ]}
              >
                Alternun Presents
              </Text>
            </View>
            <Text
              style={[
                styles.heroMetaRight,
                { color: heroFooterTextColor, textShadowColor: heroFooterShadowColor },
              ]}
            >
              Scroll to interact
            </Text>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.contentCard,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          <Text style={[styles.contentTitle, { color: palette.textPrimary }]}>AIRS</Text>
          <Text style={[styles.contentText, { color: palette.textMuted }]}>
            Alternun Impact & Reputation Score.
          </Text>
          <Text style={[styles.contentText, { color: palette.textMuted }]}>
            One surface for verified impact, compensation lifecycle, and wallet-linked modules.
          </Text>
          <View style={styles.minimalActions}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => onContinueToDashboard(dontShowAgain)}
            >
              <Text style={[styles.linkAction, { color: palette.accent }]}>Go to dashboard</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  floatingLeftTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 81,
    maxWidth: '70%',
  },
  floatingRightTop: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 80,
    alignItems: 'flex-end',
  },
  floatingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
  },
  floatingProfileTrigger: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  floatingAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingAvatarText: {
    fontSize: 11,
    fontWeight: '800',
  },
  floatingMenu: {
    marginTop: 8,
    width: 220,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 10,
  },
  floatingMenuItem: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingCaptionItem: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingSubMenuItem: {
    marginLeft: 12,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingMenuText: {
    fontSize: 12,
    fontWeight: '700',
  },
  floatingCaptionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  floatingMenuItemRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingMenuValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  floatingCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 34,
  },
  heroSection: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  heroSolidFadeLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 6, 24, 0.3)',
  },
  heroTopCopy: {
    position: 'absolute',
    left: 24,
    top: 20,
    right: 24,
    gap: 4,
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  heroBrandLogo: {
    width: 56,
    height: 56,
    marginBottom: 2,
  },
  heroBrandTextBlock: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: 0,
  },
  heroTitle: {
    fontWeight: '900',
    letterSpacing: 0.35,
  },
  heroBrandByline: {
    marginTop: 0,
    fontWeight: '700',
    letterSpacing: 0.12,
  },
  heroBrandBylineRow: {
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroBrandBylineLogo: {
    opacity: 0.96,
    marginLeft: 0,
    marginTop: 2,
  },
  heroMediaStage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heroMediaCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: '#04040f',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 10,
  },
  heroFooter: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 3,
  },
  heroMetaLeftBlock: {
    gap: 2,
    flexShrink: 1,
    paddingRight: 10,
  },
  heroMetaLeft: {
    color: 'rgba(248,251,255,0.96)',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMetaRight: {
    color: 'rgba(248,251,255,0.98)',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
  videoControlText: {
    color: '#f8fbff',
    fontSize: 11,
    fontWeight: '700',
  },
  mediaTagTitleOverlay: {
    position: 'absolute',
    top: '50%',
    zIndex: 6,
    alignSelf: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTagPillOverlay: {
    position: 'absolute',
    top: '50%',
    zIndex: 7,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTagPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 10,
  },
  mediaTagSubtitleOverlay: {
    position: 'absolute',
    top: '50%',
    zIndex: 6,
    alignSelf: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTagTitle: {
    color: 'rgba(245, 227, 162, 0.96)',
    fontWeight: '500',
    letterSpacing: 0.35,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    width: '100%',
  },
  mediaTagSubtitle: {
    color: 'rgba(245,250,255,0.95)',
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    letterSpacing: 0.1,
    marginTop: 0,
    width: '100%',
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
  contentCard: {
    marginHorizontal: 20,
    marginTop: 18,
    paddingHorizontal: 2,
    paddingVertical: 0,
    gap: 6,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  contentText: {
    fontSize: 12,
    lineHeight: 18,
  },
  minimalActions: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  linkAction: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
