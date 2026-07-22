import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme, type AppTheme } from '@/lib/theme';

type Tone = keyof AppTheme['color'];
export default function Card({ children, tone, style }: { children: React.ReactNode; tone?: Tone; style?: ViewStyle }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const toned = tone ? { backgroundColor: theme.color[tone] } : styles.surface;
  return <View style={[styles.base, toned, style]}>{children}</View>;
}
const makeStyles = (theme: AppTheme) => StyleSheet.create({
  base: { borderRadius: theme.radius.md, padding: theme.space.lg },
  surface: { backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.border },
});
