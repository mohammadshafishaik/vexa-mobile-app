import { TextStyle, Platform } from 'react-native';

// Typography scale — System fonts (safe fallback)
// Uses system defaults until Inter is properly linked
// On iOS: San Francisco; On Android: Roboto

export const fontFamilies = {
  regular: Platform.select({ ios: 'System', android: 'Roboto' }) as string,
  medium: Platform.select({ ios: 'System', android: 'Roboto' }) as string,
  semibold: Platform.select({ ios: 'System', android: 'Roboto' }) as string,
  bold: Platform.select({ ios: 'System', android: 'Roboto' }) as string,
  light: Platform.select({ ios: 'System', android: 'Roboto' }) as string,
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 36,
  '4xl': 48,
} as const;

export const lineHeights = {
  xs: 16,
  sm: 18,
  base: 22,
  md: 24,
  lg: 28,
  xl: 32,
  '2xl': 38,
  '3xl': 44,
  '4xl': 56,
} as const;

export const letterSpacings = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
} as const;

// Pre-composed text styles for consistent usage
export const typography: Record<string, TextStyle> = {
  h1: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    letterSpacing: letterSpacings.tight,
  },
  h2: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    letterSpacing: letterSpacings.tight,
  },
  h3: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
  },
  h4: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
  },
  bodyMedium: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
  },
  bodySm: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
  },
  button: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    letterSpacing: letterSpacings.wide,
  },
  buttonSm: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    letterSpacing: letterSpacings.wide,
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    letterSpacing: letterSpacings.wide,
  },
};
