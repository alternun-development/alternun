import React, { useEffect, useRef, useState, } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle, } from 'react-native';

interface AnimatedCollapsibleContentProps {
  expanded: boolean;
  children: React.ReactNode;
  duration?: number;
  collapseOffset?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Animated wrapper for small dropdown-style sections.
 * Measures the rendered content once and then animates height, opacity, and offset.
 */
export default function AnimatedCollapsibleContent({
  expanded,
  children,
  duration = 200,
  collapseOffset = 8,
  style,
}: AnimatedCollapsibleContentProps,): React.JSX.Element {
  const progress = useRef(new Animated.Value(expanded ? 1 : 0,),).current;
  const [contentHeight, setContentHeight,] = useState(0,);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration,
      easing: Easing.out(Easing.cubic,),
      useNativeDriver: false,
    },).start();
  }, [duration, expanded, progress,],);

  const animatedHeight = progress.interpolate({
    inputRange: [0, 1,],
    outputRange: [0, contentHeight,],
  },);
  const animatedOpacity = progress.interpolate({
    inputRange: [0, 1,],
    outputRange: [0, 1,],
  },);
  const animatedTranslateY = progress.interpolate({
    inputRange: [0, 1,],
    outputRange: [-collapseOffset, 0,],
  },);

  return (
    <View style={styles.root}>
      <View
        accessibilityElementsHidden
        importantForAccessibility='no-hide-descendants'
        onLayout={(event,) => {
          const nextHeight = event.nativeEvent.layout.height;
          setContentHeight(nextHeight,);
        }}
        pointerEvents='none'
        style={[styles.measurement, style,]}
      >
        {children}
      </View>

      <Animated.View
        pointerEvents={expanded ? 'auto' : 'none'}
        style={[
          style,
          styles.animatedContent,
          {
            height: animatedHeight,
            opacity: animatedOpacity,
            transform: [{ translateY: animatedTranslateY, },],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
  measurement: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
  },
  animatedContent: {
    overflow: 'hidden',
  },
},);
