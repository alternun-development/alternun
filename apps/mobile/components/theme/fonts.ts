import { Text, TextInput, type StyleProp, type TextStyle } from 'react-native';
import type { FontSource } from 'expo-font';

const APP_FONT_FAMILY = 'AnekLatin';
const APP_MONO_FAMILY = 'SpaceMono';

export const appFonts = {
  // Metro asset loading still requires require() for bundled local font modules.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  [APP_FONT_FAMILY]:
    require('../../assets/fonts/Anek_latin/AnekLatin-VariableFont_wdth,wght.ttf') as FontSource,
  // Metro asset loading still requires require() for bundled local font modules.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  [APP_MONO_FAMILY]: require('../../assets/fonts/SpaceMono-Regular.ttf') as FontSource,
} as const;

let appFontDefaultsInstalled = false;
type FontDefaultComponent = {
  defaultProps?: {
    style?: StyleProp<TextStyle>;
  };
};

function prependDefaultFontFamily(style?: StyleProp<TextStyle>): StyleProp<TextStyle> {
  return [{ fontFamily: APP_FONT_FAMILY }, style];
}

export function installAppFontDefaults(): void {
  if (appFontDefaultsInstalled) {
    return;
  }

  appFontDefaultsInstalled = true;

  const textComponent = Text as typeof Text & FontDefaultComponent;
  const textInputComponent = TextInput as typeof TextInput & FontDefaultComponent;

  textComponent.defaultProps = {
    ...textComponent.defaultProps,
    style: prependDefaultFontFamily(textComponent.defaultProps?.style),
  };

  textInputComponent.defaultProps = {
    ...textInputComponent.defaultProps,
    style: prependDefaultFontFamily(textInputComponent.defaultProps?.style),
  };
}
