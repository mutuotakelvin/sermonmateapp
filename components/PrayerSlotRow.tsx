import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '@/components/ui/AppText';
import { useTheme, type AppTheme } from '@/lib/theme';
import { timeOfDay } from '@/lib/time';
import type { PrayerSlot } from '@/lib/types';

export default function PrayerSlotRow({
  slot,
  logged,
  loggedAtLabel,
  note,
  isNext,
  onLog,
  onEdit,
}: {
  slot: PrayerSlot;
  logged: boolean;
  loggedAtLabel?: string;
  note?: string;
  isNext: boolean;
  onLog: () => void;
  onEdit: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const timeLabel = timeOfDay(slot.hour, slot.minute)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const detail = [timeLabel, loggedAtLabel && `prayed at ${loggedAtLabel}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onEdit}
      style={[styles.card, isNext && !logged && styles.next, !slot.enabled && styles.off]}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${slot.label} prayer time`}
    >
      <Pressable
        onPress={onLog}
        hitSlop={10}
        disabled={logged}
        accessibilityRole="button"
        accessibilityLabel={logged ? `${slot.label} already logged` : `Log ${slot.label} prayer`}
        style={[styles.tick, logged && styles.tickDone, isNext && !logged && styles.tickNext]}
      >
        {logged ? <Ionicons name="checkmark" size={17} color={theme.color.accentText} /> : null}
      </Pressable>

      <View style={styles.main}>
        <AppText variant="body" style={styles.name}>{slot.label}</AppText>
        <AppText variant="caption">{detail}</AppText>
        {note ? <AppText variant="caption" style={styles.note}>{note}</AppText> : null}
      </View>

      {!slot.enabled ? (
        <AppText variant="caption" style={styles.pill}>Off</AppText>
      ) : null}
    </Pressable>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    padding: theme.space.lg,
    marginBottom: theme.space.sm,
  },
  next: { borderColor: theme.color.accent },
  off: { opacity: 0.6 },
  tick: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: theme.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickDone: { backgroundColor: theme.color.sage, borderColor: theme.color.sage },
  tickNext: { borderColor: theme.color.accent, borderStyle: 'dashed' },
  main: { flex: 1 },
  name: { fontFamily: theme.font.sansSemibold },
  note: { fontStyle: 'italic' },
  pill: { color: theme.color.textMuted },
});
