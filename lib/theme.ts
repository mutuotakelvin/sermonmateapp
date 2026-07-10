import type { TextStyle } from 'react-native';
import type { MoodType } from './types';

export const theme = {
  color: {
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
  },
  // Bold per-mood accent colors for the mood-confirm screen (deliberately
  // more saturated than the muted card palette). `on` meets 4.5:1 contrast.
  moodColor: {
    Happy:       { bg: '#E0A22E', on: '#2A2420' },
    Grateful:    { bg: '#5E9B6B', on: '#FBF8F2' },
    Hopeful:     { bg: '#5B8DC9', on: '#FBF8F2' },
    Peaceful:    { bg: '#3FA39C', on: '#FBF8F2' },
    Anxious:     { bg: '#C4913F', on: '#2A2420' },
    Sad:         { bg: '#6E86A8', on: '#FBF8F2' },
    Overwhelmed: { bg: '#A96A93', on: '#FBF8F2' },
    Angry:       { bg: '#C0553A', on: '#FBF8F2' },
  } as Record<MoodType, { bg: string; on: string }>,
  font: {
    serif: 'Newsreader_500Medium',
    serifItalic: 'Newsreader_500Medium_Italic',
    sans: 'WorkSans_400Regular',
    sansMedium: 'WorkSans_500Medium',
    sansSemibold: 'WorkSans_600SemiBold',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 10, md: 16, lg: 20, pill: 999 },
} as const;

export const textVariants: Record<
  'display' | 'verse' | 'title' | 'body' | 'caption' | 'label',
  TextStyle
> = {
  display: { fontFamily: theme.font.serif, fontSize: 26, lineHeight: 32, color: theme.color.text },
  verse: { fontFamily: theme.font.serifItalic, fontSize: 20, lineHeight: 30, color: theme.color.text },
  title: { fontFamily: theme.font.sansSemibold, fontSize: 18, lineHeight: 24, color: theme.color.text },
  body: { fontFamily: theme.font.sans, fontSize: 15, lineHeight: 22, color: theme.color.text },
  caption: { fontFamily: theme.font.sans, fontSize: 12, lineHeight: 16, color: theme.color.textMuted },
  label: {
    fontFamily: theme.font.sansSemibold, fontSize: 11, lineHeight: 14,
    color: theme.color.textMuted, letterSpacing: 1.5, textTransform: 'uppercase',
  },
};
