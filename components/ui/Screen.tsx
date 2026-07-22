import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import React, { useContext, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme, type AppTheme } from '@/lib/theme';
import { resolveEdges } from './screenEdges';

export default function Screen({
  children,
  style,
  edges,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: readonly Edge[];
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  // undefined outside a tab navigator — see screenEdges.ts for why this matters.
  const insideTabs = useContext(BottomTabBarHeightContext) !== undefined;

  return (
    <SafeAreaView style={styles.safe} edges={resolveEdges(insideTabs, edges)}>
      <View style={[styles.inner, style]}>{children}</View>
    </SafeAreaView>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.paper },
  inner: { flex: 1, paddingHorizontal: theme.space.lg },
});
