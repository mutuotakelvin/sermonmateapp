import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type AppTheme } from '@/lib/theme';

export default function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.inner, style]}>{children}</View>
    </SafeAreaView>
  );
}
const makeStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.paper },
  inner: { flex: 1, paddingHorizontal: theme.space.lg },
});
