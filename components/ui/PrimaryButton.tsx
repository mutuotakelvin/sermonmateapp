import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/lib/theme';
import AppText from './AppText';

export default function PrimaryButton({
  label, onPress, loading, disabled, style,
}: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; style?: ViewStyle }) {
  const off = disabled || loading;
  return (
    <Pressable onPress={onPress} disabled={off} style={[styles.btn, off && styles.off, style]}>
      {loading
        ? <ActivityIndicator color={theme.color.accentText} />
        : <AppText style={styles.label}>{label}</AppText>}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  btn: { height: 52, borderRadius: theme.radius.md, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.5 },
  label: { fontFamily: theme.font.sansSemibold, fontSize: 16, color: theme.color.accentText },
});
