const fs = require('fs');
const path = 'apps/mobile/components/onboarding/AirsIntroExperience.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldButton = `function HeroGlassButton({
  label,
  onPress,
  width,
  fontSize,
  isDark,
}: HeroGlassButtonProps): React.ReactElement {
  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.heroGlassButton,
        {
          width,
          borderColor: hovered ? 'rgba(30,230,181,0.95)' : 'rgba(30,230,181,0.72)',
          backgroundColor: isDark
            ? hovered
              ? 'rgba(5, 16, 18, 0.20)'
              : 'rgba(5, 16, 18, 0.12)'
            : hovered
            ? 'rgba(255,255,255,0.20)'
            : 'rgba(255,255,255,0.14)',
          opacity: pressed ? 0.96 : 1,
          shadowColor: '#000',
          shadowOpacity: hovered ? 0.22 : 0.16,
          shadowOffset: { width: 0, height: hovered ? 10 : 8 },
          shadowRadius: hovered ? 14 : 12,
          elevation: hovered ? 8 : 6,
        },
      ]}
    >
      {({ hovered }) => (
        <>
          <BlurView
            intensity={hovered ? 52 : 40}
            tint={isDark ? 'dark' : 'light'}
            style={styles.heroGlassBlur}
          />
          <Text
            style={[
              styles.heroCopyButtonText,
              {
                color: '#1ee6b5',
                fontSize,
              },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}`;

const newButton = `function HeroGlassButton({
  label,
  onPress,
  width,
  fontSize,
  isDark,
}: HeroGlassButtonProps): React.ReactElement {
  const pillBgColor = isDark ? 'rgba(11,90,95,0.88)' : 'rgba(201,239,234,0.9)';
  const pillBorderColor = isDark ? 'rgba(28,203,161,0.26)' : 'rgba(10,92,97,0.16)';
  const pillGlassTint = isDark ? 'dark' : 'light';
  const textColor = isDark ? 'rgba(255,255,255,0.92)' : '#073f45';

  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.heroGlassButton,
        {
          width,
          backgroundColor: pillBgColor,
          borderColor: pillBorderColor,
          opacity: pressed ? 0.9 : hovered ? 0.96 : 1,
          shadowColor: '#000',
          shadowOpacity: hovered ? 0.22 : 0.18,
          shadowOffset: { width: 0, height: hovered ? 12 : 10 },
          shadowRadius: hovered ? 20 : 18,
          elevation: hovered ? 8 : 6,
        },
      ]}
    >
      {({ hovered }) => (
        <>
          <BlurView
            intensity={isDark ? 32 : 26}
            tint={pillGlassTint}
            style={styles.heroGlassBlur}
          />
          <View
            style={[
              styles.heroGlassTint,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.03)'
                  : 'rgba(255,255,255,0.12)',
              },
            ]}
          />
          <View
            style={[
              styles.heroGlassHighlight,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(255,255,255,0.42)',
              },
            ]}
          />
          <Text
            style={[
              styles.heroCopyButtonText,
              {
                color: textColor,
                fontSize,
              },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}`;

content = content.replace(oldButton, newButton);

const oldStyles = `  heroGlassButton: {
    minHeight: 78,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 28,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroGlassBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },`;

const newStyles = `  heroGlassButton: {
    minHeight: 78,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 28,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroGlassBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  heroGlassTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  heroGlassHighlight: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: 1,
    height: 1,
    borderRadius: 999,
    opacity: 0.85,
  },`;

content = content.replace(oldStyles, newStyles);

fs.writeFileSync(path, content);
console.log('Updated AirsIntroExperience.tsx');
