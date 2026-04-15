import React, { useMemo, } from 'react';
import { TouchableOpacity, View, useWindowDimensions, type ViewStyle, } from 'react-native';
import Animated from 'react-native-reanimated';
import { ChevronsUp, type LucideProps, } from 'lucide-react-native';
import { createTypographyStyles, } from '../theme/typography';

const BackIcon = ChevronsUp as React.FC<LucideProps>;
const AnimatedView = Animated.View as unknown as React.FC<
  React.ComponentProps<typeof View> & { style?: ViewStyle }
>;

const DESKTOP_BOTTOM_OFFSET = 104;

export interface BackToTopButtonProps {
  visible: boolean;
  onPress: () => void;
  isDark: boolean;
  isMobile: boolean;
  footerBottomOffset?: number;
  bounceStyle?: ViewStyle;
}

export function BackToTopButton({
  visible,
  onPress,
  isDark,
  isMobile,
  footerBottomOffset,
  bounceStyle,
}: BackToTopButtonProps,) {
  const { width, } = useWindowDimensions();

  // Calculate responsive positioning
  const bottomPosition = useMemo(() => {
    if (width < 480) {
      // Extra small: 90px from bottom (accounts for footer ~80px)
      return 90;
    } else if (width < 720) {
      // Mid-screen: 120px from bottom (accounts for larger footer)
      return 120;
    } else if (width < 1024) {
      // Tablet/Large mobile: 100px from bottom
      return 100;
    } else {
      // Desktop: keep the button above the footer row.
      return DESKTOP_BOTTOM_OFFSET;
    }
  }, [width,],);

  const resolvedBottomPosition = footerBottomOffset
    ? Math.max(bottomPosition, footerBottomOffset,)
    : bottomPosition;

  if (!visible) return null;

  return (
    <TouchableOpacity
      style={[
        styles.backToTopPill,
        isMobile ? styles.backToTopMobile : styles.backToTopDesktop,
        { bottom: resolvedBottomPosition, },
        {
          backgroundColor: isDark ? '#0a1520' : '#0d2235',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(28,203,161,0.25)' : 'rgba(28,203,161,0.35)',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.backToTopIconWrap,
          { backgroundColor: isDark ? 'rgba(28,203,161,0.18)' : 'rgba(28,203,161,0.22)', },
        ]}
      >
        <AnimatedView style={bounceStyle}>
          <BackIcon size={16} color='#1ccba1' strokeWidth={2.5} />
        </AnimatedView>
      </View>
    </TouchableOpacity>
  );
}

const styles = createTypographyStyles({
  backToTopPill: {
    position: 'absolute',
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6, },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  backToTopMobile: {
    right: 14,
    bottom: 90,
    width: 42,
    height: 42,
    padding: 3,
    justifyContent: 'center',
  },
  backToTopDesktop: {
    right: 24,
    bottom: 14,
    height: 48,
    padding: 5,
    paddingRight: 22,
    gap: 12,
  },
  backToTopIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
},);
