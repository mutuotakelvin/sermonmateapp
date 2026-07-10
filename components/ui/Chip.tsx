import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { theme } from '@/lib/theme';
import AppText from './AppText';

export default function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected ? styles.sel : styles.unsel]}>
      <AppText style={{ fontFamily: theme.font.sansMedium, fontSize: 14, color: selected ? theme.color.accentText : theme.color.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  chip: { height: 40, paddingHorizontal: theme.space.lg, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
  sel: { backgroundColor: theme.color.accent },
  unsel: { backgroundColor: theme.color.surfaceAlt },
});
