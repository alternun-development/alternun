/**
 * ProgressiveImage — drop-in replacement for React Native's Image that shows
 * a blurred low-quality placeholder while the full image loads, then fades it
 * in smoothly. Uses expo-image's native blur-hash and transition engine so the
 * heavy lifting happens off the JS thread.
 *
 * Usage:
 *   <ProgressiveImage
 *     source={{ uri: 'https://...' }}
 *     placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}  // optional
 *     style={{ width: 200, height: 150 }}
 *   />
 *
 * If no `placeholder` prop is provided a solid translucent grey slab is shown
 * instead — still better than the blank-white flash React Native Image gives.
 */
import { Image, type ImageProps, type ImageSource } from 'expo-image';
import React from 'react';
import { StyleSheet } from 'react-native';

const DEFAULT_PLACEHOLDER: ImageSource = {
  // 1×1 neutral grey blurhash — used when the caller doesn't supply one.
  // Generated from rgb(40,40,60) → gives a dark-mode-friendly shimmer.
  blurhash: 'L00000fQfQfQfQfQfQfQfQfQfQfQ',
};

interface ProgressiveImageProps extends Omit<ImageProps, 'transition'> {
  /**
   * Override the default transition duration (ms). Set to 0 to disable the fade.
   * Default: 300.
   */
  transitionDuration?: number;
}

/**
 * Globally cached memory + disk configuration for expo-image. Keeps the most
 * recently used images in memory for instant re-display, with a larger disk
 * cache for assets that haven't been accessed in a while.
 */
export default function ProgressiveImage({
  placeholder,
  transitionDuration = 300,
  style,
  contentFit = 'cover',
  ...rest
}: ProgressiveImageProps): React.JSX.Element {
  return (
    <Image
      {...rest}
      placeholder={placeholder ?? DEFAULT_PLACEHOLDER}
      placeholderContentFit='cover'
      transition={{ duration: transitionDuration, effect: 'cross-dissolve', timing: 'ease-in-out' }}
      contentFit={contentFit}
      // expo-image handles recycling and memory internally; cachePolicy controls disk.
      cachePolicy='memory-disk'
      style={[styles.image, style]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    // Prevent the grey placeholder from bleeding outside rounded corners.
    overflow: 'hidden',
  },
});
