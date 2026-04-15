import React, { useMemo, useRef, useState, } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import { ChevronLeft, ChevronRight, type LucideProps, } from 'lucide-react-native';

const ChevronLeftIcon = ChevronLeft as React.FC<LucideProps>;
const ChevronRightIcon = ChevronRight as React.FC<LucideProps>;

function resolveChildKey(child: React.ReactNode,): string {
  if (React.isValidElement(child,)) {
    if (child.key != null) {
      return String(child.key,);
    }

    const props = child.props as Record<string, unknown>;
    const typeRef =
      typeof child.type === 'string'
        ? { displayName: child.type, name: child.type, }
        : (child.type as { displayName?: string; name?: string });
    const typeName = typeRef.displayName ?? typeRef.name ?? 'node';
    const stableValue =
      props.id ?? props.label ?? props.title ?? props.name ?? props.value ?? props.children;

    if (typeof stableValue === 'string' || typeof stableValue === 'number') {
      return `${typeName}-${stableValue}`;
    }

    return typeName;
  }

  return typeof child === 'string' || typeof child === 'number' ? String(child,) : 'card-node';
}

interface HorizontalCardScrollerProps {
  children: React.ReactNode;
  isDark: boolean;
  style?: ViewStyle;
  hintLabel?: string;
  itemWidth?: number;
}

export default function HorizontalCardScroller({
  children,
  isDark,
  style,
  hintLabel = 'Desliza para ver más',
  itemWidth,
}: HorizontalCardScrollerProps,) {
  const scrollRef = useRef<ScrollView>(null,);
  const { width, } = useWindowDimensions();
  const items = useMemo(() => React.Children.toArray(children,), [children,],);
  const [containerWidth, setContainerWidth,] = useState(0,);
  const [contentWidth, setContentWidth,] = useState(0,);
  const [scrollX, setScrollX,] = useState(0,);
  const [trackHeight, setTrackHeight,] = useState(0,);

  const resolvedItemWidth =
    itemWidth ??
    (width >= 1320 ? 360 : width >= 1100 ? 330 : width >= 900 ? 300 : Math.min(width - 72, 292,));
  const gap = 12;
  const isScrollable = contentWidth > containerWidth + 6;
  const canScrollLeft = scrollX > 6;
  const canScrollRight = scrollX + containerWidth < contentWidth - 6;
  const snapInterval = resolvedItemWidth + gap;

  const palette = isDark
    ? {
      hint: 'rgba(232,255,246,0.64)',
      buttonBg: 'rgba(8,22,30,0.84)',
      buttonBorder: 'rgba(255,255,255,0.10)',
      buttonActive: '#1EE6B5',
      buttonMuted: 'rgba(232,255,246,0.3)',
      edgeFade: 'rgba(6, 15, 12, 0.12)',
    }
    : {
      hint: 'rgba(11,45,49,0.58)',
      buttonBg: 'rgba(248,252,251,0.96)',
      buttonBorder: 'rgba(11,90,95,0.12)',
      buttonActive: '#0d9488',
      buttonMuted: 'rgba(11,45,49,0.28)',
      edgeFade: 'rgba(11, 90, 95, 0.08)',
    };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>,) => {
    setScrollX(event.nativeEvent.contentOffset.x,);
  };

  const scrollBy = (direction: 'left' | 'right',) => {
    if (!scrollRef.current) {
      return;
    }

    const step = Math.max(resolvedItemWidth + gap, containerWidth * 0.84,);
    const nextOffset =
      direction === 'right'
        ? Math.min(scrollX + step, Math.max(contentWidth - containerWidth, 0,),)
        : Math.max(scrollX - step, 0,);

    scrollRef.current.scrollTo({ x: nextOffset, animated: true, },);
  };

  return (
    <View style={[styles.root, style,]}>
      <View style={styles.headerRow}>
        <Text style={[styles.hintLabel, { color: palette.hint, },]}>
          {isScrollable ? hintLabel : 'Resumen'}
        </Text>
      </View>

      <View
        style={styles.trackShell}
        onLayout={(event,) => {
          setContainerWidth(event.nativeEvent.layout.width,);
          setTrackHeight(event.nativeEvent.layout.height,);
        }}
      >
        {isScrollable ? (
          <>
            <View
              pointerEvents='none'
              style={[styles.edgeFade, styles.edgeFadeLeft, { backgroundColor: palette.edgeFade, },]}
            />
            <View
              pointerEvents='none'
              style={[styles.edgeFade, styles.edgeFadeRight, { backgroundColor: palette.edgeFade, },]}
            />
            <View pointerEvents='box-none' style={styles.overlayControls}>
              {canScrollLeft && (
                <Pressable
                  accessibilityLabel='Scroll stat cards left'
                  onPress={() => scrollBy('left',)}
                  style={[
                    styles.arrowButton,
                    styles.leftArrowButton,
                    {
                      top: Math.max((trackHeight - 38) / 2, 8,),
                      backgroundColor: palette.buttonBg,
                      borderColor: palette.buttonBorder,
                    },
                  ]}
                >
                  <ChevronLeftIcon size={16} color={palette.buttonActive} />
                </Pressable>
              )}
              {canScrollRight && (
                <Pressable
                  accessibilityLabel='Scroll stat cards right'
                  onPress={() => scrollBy('right',)}
                  style={[
                    styles.arrowButton,
                    styles.rightArrowButton,
                    {
                      top: Math.max((trackHeight - 38) / 2, 8,),
                      backgroundColor: palette.buttonBg,
                      borderColor: palette.buttonBorder,
                    },
                  ]}
                >
                  <ChevronRightIcon size={16} color={palette.buttonActive} />
                </Pressable>
              )}
            </View>
          </>
        ) : null}
        <ScrollView
          ref={scrollRef}
          horizontal
          decelerationRate='fast'
          disableIntervalMomentum
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={(w,) => {
            setContentWidth(w,);
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          snapToAlignment='start'
          snapToInterval={snapInterval}
          contentContainerStyle={styles.scrollContent}
        >
          {items.map((child, index,) => (
            <View
              key={resolveChildKey(child,)}
              style={[
                styles.itemSlot,
                {
                  width: resolvedItemWidth,
                  marginRight: index === items.length - 1 ? 0 : gap,
                },
              ]}
            >
              {child}
            </View>
          ),)}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 6,
  },
  hintLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  trackShell: {
    position: 'relative',
    overflow: 'visible',
  },
  arrowButton: {
    position: 'absolute',
    zIndex: 5,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftArrowButton: {
    left: -2,
  },
  rightArrowButton: {
    right: -2,
  },
  scrollContent: {
    paddingHorizontal: 2,
    paddingBottom: 1,
  },
  itemSlot: {
    minWidth: 0,
    justifyContent: 'center',
  },
  overlayControls: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
  },
  edgeFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 18,
    zIndex: 4,
    opacity: 0.18,
  },
  edgeFadeLeft: {
    left: 0,
  },
  edgeFadeRight: {
    right: 0,
  },
},);
