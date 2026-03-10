import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle, } from 'react-native';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function createTypographyStyles<T extends NamedStyles<T>>(styles: T,): T {
  return StyleSheet.create(styles,);
}
