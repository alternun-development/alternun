import React, { useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import { ChevronLeft, ChevronRight, type LucideProps } from 'lucide-react-native';
import type { GallerySliderProps } from './GallerySlider.types';

const ChevronLeftIcon = ChevronLeft as React.FC<LucideProps>;
const ChevronRightIcon = ChevronRight as React.FC<LucideProps>;

const GAP = 14;
const MIN_SLIDE = 240;
const MAX_SLIDE = 560;
/** Width-to-height ratio of a slide. */
const ASPECT = 1.6;

// The web has no snapToInterval: CSS scroll snapping centers each photo instead.
const WEB_SNAP_TRACK =
  Platform.OS === 'web' ? ({ scrollSnapType: 'x mandatory' } as ViewStyle) : null;
const WEB_SNAP_SLIDE = Platform.OS === 'web' ? ({ scrollSnapAlign: 'center' } as ViewStyle) : null;

/** The width of a photo for a given gallery width: most of it, so the neighbors peek in. */
export function gallerySlideWidth(containerWidth: number): number {
  return Math.round(Math.min(MAX_SLIDE, Math.max(MIN_SLIDE, containerWidth * 0.8)));
}

/** The photo in focus for a scroll offset, kept within the gallery. */
export function galleryIndexAt(offsetX: number, step: number, total: number): number {
  if (step <= 0 || total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, Math.round(offsetX / step)));
}

/**
 * A photo gallery that slides left and right: one photo in focus at the center with its neighbors
 * peeking in, snapping photo by photo on swipe or trackpad, arrows for a mouse, and dots that
 * follow the scroll and jump to a photo.
 */
export function GallerySlider({
  images,
  fallbackAlt,
  colors,
  animated = true,
  labels,
}: GallerySliderProps): React.JSX.Element | null {
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(0);
  const total = images.length;
  const slideWidth = gallerySlideWidth(width);
  const step = slideWidth + GAP;
  const inset = Math.max(0, (width - slideWidth) / 2);

  if (total === 0) return null;

  const goTo = (index: number): void => {
    const target = Math.min(total - 1, Math.max(0, index));
    scrollRef.current?.scrollTo({ x: target * step, animated });
    setActive(target);
  };
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: false,
    listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setActive(galleryIndexAt(event.nativeEvent.contentOffset.x, step, total));
    },
  });

  return (
    <View
      testID='gallery-slider'
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <View>
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate='fast'
            snapToInterval={step}
            snapToAlignment='start'
            scrollEventThrottle={16}
            onScroll={onScroll}
            style={WEB_SNAP_TRACK}
            contentContainerStyle={{ paddingHorizontal: inset, gap: GAP }}
          >
            {images.map((image, index) => {
              const range = [(index - 1) * step, index * step, (index + 1) * step];
              const focus = animated
                ? {
                    opacity: scrollX.interpolate({
                      inputRange: range,
                      outputRange: [0.6, 1, 0.6],
                      extrapolate: 'clamp',
                    }),
                    transform: [
                      {
                        scale: scrollX.interpolate({
                          inputRange: range,
                          outputRange: [0.9, 1, 0.9],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  }
                : null;
              return (
                <Animated.View
                  key={`${index}-${image.url}`}
                  testID='gallery-slide'
                  style={[
                    styles.slide,
                    { width: slideWidth, height: slideWidth / ASPECT },
                    WEB_SNAP_SLIDE,
                    focus,
                  ]}
                >
                  <Image
                    source={{ uri: image.url }}
                    accessibilityLabel={image.altText || fallbackAlt}
                    style={styles.image}
                    resizeMode='cover'
                  />
                </Animated.View>
              );
            })}
          </Animated.ScrollView>
          {total > 1 && active > 0 ? (
            <Pressable
              testID='gallery-previous'
              accessibilityRole='button'
              accessibilityLabel={labels.previous}
              onPress={() => goTo(active - 1)}
              style={[styles.arrow, { left: Math.max(8, inset - 22) }]}
            >
              <ChevronLeftIcon size={22} color='#ffffff' />
            </Pressable>
          ) : null}
          {total > 1 && active < total - 1 ? (
            <Pressable
              testID='gallery-next'
              accessibilityRole='button'
              accessibilityLabel={labels.next}
              onPress={() => goTo(active + 1)}
              style={[styles.arrow, { right: Math.max(8, inset - 22) }]}
            >
              <ChevronRightIcon size={22} color='#ffffff' />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {total > 1 ? (
        <View style={styles.dots}>
          {images.map((image, index) => (
            <Pressable
              key={`dot-${index}-${image.url}`}
              testID='gallery-dot'
              accessibilityRole='button'
              accessibilityLabel={labels.photo(index + 1, total)}
              accessibilityState={{ selected: index === active }}
              onPress={() => goTo(index)}
              hitSlop={8}
              style={[
                styles.dot,
                index === active
                  ? { width: 20, backgroundColor: colors.accent }
                  : { backgroundColor: colors.muted },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { borderRadius: 20, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,16,13,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
