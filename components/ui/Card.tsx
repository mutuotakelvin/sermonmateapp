import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '@/lib/theme';

type Tone = keyof typeof theme.color;
export default function Card({ children, tone, style }: { children: React.ReactNode; tone?: Tone; style?: ViewStyle }) {
  const toned = tone ? { backgroundColor: theme.color[tone] } : styles.surface;
  return <View style={[styles.base, toned, style]}>{children}</View>;
}
const styles = StyleSheet.create({
  base: { borderRadius: theme.radius.md, padding: theme.space.lg },
  surface: { backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border },
});
