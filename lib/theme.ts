import { useColorScheme } from 'react-native';
import type { TextStyle } from 'react-native';
import type { MoodType } from './types';
import { useAppearanceStore } from './stores/appearance';

export type ColorScheme = 'light' | 'dark';

type Palette = {
  paper: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  accent: string;
  accentText: string;
  text: string;
  textMuted: string;
  sage: string;
  dustyBlue: string;
  sand: string;
  rust: string;
  deepBlue: string;
  olive: string;
  blush: string;
  charcoal: string;
  danger: string;
  /** Foreground for the always-dark `charcoal` surfaces (the hero verse card). */
  onCharcoal: string;
  /** Scrim behind bottom sheets and modals. */
  overlay: string;
  /** Shadow color for elevated surfaces. */
  shadow: string;
};

const lightPalette: Palette = {
  paper: '#F2EDE4',
  surface: '#FBF8F2',
  surfaceAlt: '#EDE6DA',
  border: '#E2D9CB',
  accent: '#B0532F',
  accentText: '#FBF8F2',
  text: '#2A2420',
  textMuted: '#7A6E62',
  sage: '#7F9370',
  dustyBlue: '#7FA0C4',
  sand: '#D8CBB0',
  rust: '#A9503C',
  deepBlue: '#4E6B87',
  olive: '#8E9E72',
  blush: '#EFD8CC',
  charcoal: '#2E2A25',
  danger: '#B23B2E',
  onCharcoal: '#F2EDE4',
  overlay: 'rgba(0,0,0,0.4)',
  shadow: '#2E2A25',
};

// Warm near-black rather than pure black — the app's paper-and-ink character has
// to survive the switch. Tone colors (sage/sand/…) are the *card background* role,
// so they darken here and keep carrying `text` as their foreground in both schemes.
const darkPalette: Palette = {
  paper: '#141110',
  surface: '#1E1A17',
  surfaceAlt: '#2A2521',
  border: '#3A332C',
  accent: '#D9764B',
  accentText: '#1A1512',
  text: '#F1EAE0',
  textMuted: '#A2968A',
  sage: '#3F4F3B',
  dustyBlue: '#37485C',
  sand: '#4A4133',
  rust: '#573024',
  deepBlue: '#33455A',
  olive: '#454E37',
  blush: '#4A362E',
  charcoal: '#2C2621',
  danger: '#D9604F',
  onCharcoal: '#F1EAE0',
  overlay: 'rgba(0,0,0,0.65)',
  shadow: '#000000',
};

// Bold per-mood accent colors for the mood-confirm screen (deliberately more
// saturated than the muted card palette). `on` meets 4.5:1 contrast. These are
// scheme-independent: they read on both paper and near-black.
const moodColor = {
  Happy:       { bg: '#E0A22E', on: '#2A2420' },
  Grateful:    { bg: '#5E9B6B', on: '#FBF8F2' },
  Hopeful:     { bg: '#5B8DC9', on: '#FBF8F2' },
  Peaceful:    { bg: '#3FA39C', on: '#FBF8F2' },
  Anxious:     { bg: '#C4913F', on: '#2A2420' },
  Sad:         { bg: '#6E86A8', on: '#FBF8F2' },
  Overwhelmed: { bg: '#A96A93', on: '#FBF8F2' },
  Angry:       { bg: '#C0553A', on: '#FBF8F2' },
} as Record<MoodType, { bg: string; on: string }>;

const font = {
  serif: 'Newsreader_500Medium',
  serifItalic: 'Newsreader_500Medium_Italic',
  sans: 'WorkSans_400Regular',
  sansMedium: 'WorkSans_500Medium',
  sansSemibold: 'WorkSans_600SemiBold',
} as const;

const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
const radius = { sm: 10, md: 16, lg: 20, pill: 999 } as const;

export type TextVariant = 'display' | 'verse' | 'title' | 'body' | 'caption' | 'label';

function buildTextVariants(color: Palette): Record<TextVariant, TextStyle> {
  return {
    display: { fontFamily: font.serif, fontSize: 26, lineHeight: 32, color: color.text },
    verse: { fontFamily: font.serifItalic, fontSize: 20, lineHeight: 30, color: color.text },
    title: { fontFamily: font.sansSemibold, fontSize: 18, lineHeight: 24, color: color.text },
    body: { fontFamily: font.sans, fontSize: 15, lineHeight: 22, color: color.text },
    caption: { fontFamily: font.sans, fontSize: 12, lineHeight: 16, color: color.textMuted },
    label: {
      fontFamily: font.sansSemibold, fontSize: 11, lineHeight: 14,
      color: color.textMuted, letterSpacing: 1.5, textTransform: 'uppercase',
    },
  };
}

function buildTheme(scheme: ColorScheme) {
  const color = scheme === 'dark' ? darkPalette : lightPalette;
  return {
    scheme,
    isDark: scheme === 'dark',
    color,
    moodColor,
    font,
    space,
    radius,
    text: buildTextVariants(color),
  };
}

export type AppTheme = ReturnType<typeof buildTheme>;

// Built once each so `theme` has a stable identity — style factories can memo on it.
export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');

/**
 * The active theme for the current appearance preference.
 *
 * Returns one of two frozen singletons, so `useMemo(() => makeStyles(theme), [theme])`
 * only recomputes when the scheme actually flips.
 */
export function useTheme(): AppTheme {
  const mode = useAppearanceStore((s) => s.mode);
  const systemScheme = useColorScheme();
  const scheme: ColorScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  return scheme === 'dark' ? darkTheme : lightTheme;
}

/**
 * Light theme as a plain value, for the few places that run outside React
 * (module-scope constants, native config). Prefer `useTheme()` in components.
 */
export const theme = lightTheme;

export const textVariants = lightTheme.text;
