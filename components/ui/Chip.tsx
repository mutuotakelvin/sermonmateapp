import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme, type AppTheme } from '@/lib/theme';
import AppText from './AppText';

export default function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected ? styles.sel : styles.unsel]}>
      <AppText style={{ fontFamily: theme.font.sansMedium, fontSize: 14, color: selected ? theme.color.accentText : theme.color.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}
const makeStyles = (theme: AppTheme) => StyleSheet.create({
  chip: { height: 40, paddingHorizontal: theme.space.lg, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
  sel: { backgroundColor: theme.color.accent },
  unsel: { backgroundColor: theme.color.surfaceAlt },
});
