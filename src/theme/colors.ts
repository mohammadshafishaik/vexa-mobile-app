// VEXA Color Palette
// Premium black-and-white minimalist theme inspired by Stripe / Linear / Apple

export const colors = {
  // Core
  black: '#000000',
  white: '#FFFFFF',

  // Grays
  gray900: '#0A0A0A',
  gray800: '#1A1A1A',
  gray700: '#404040',
  gray600: '#525252',
  gray500: '#737373',
  gray400: '#A3A3A3',
  gray300: '#D4D4D4',
  gray200: '#E5E5E5',
  gray100: '#F5F5F5',
  gray50: '#FAFAFA',

  // Semantic
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Glass
  glassWhite: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  glassBackground: 'rgba(10, 10, 10, 0.85)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Transparent
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
