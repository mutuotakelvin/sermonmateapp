import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '@/components/ui/AppText';
import { localDateKey } from '@/lib/localDate';
import { usePrayerStore } from '@/lib/stores/prayer';
import { useTheme, type AppTheme } from '@/lib/theme';

/**
 * Home-screen row. Answers "where am I today?" without a tap, and says nothing
 * about what was missed.
 */
export default function PrayerTimesCard({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { slots, log, streak } = usePrayerStore();

  const enabled = slots.filter((slot) => slot.enabled);

  // Default slots ship disabled, so without this the feature would be invisible
  // to everyone who hasn't already set one up.
  if (enabled.length === 0) {
    return (
      <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
        <View style={styles.main}>
          <AppText variant="body" style={styles.title}>Prayer times</AppText>
          <AppText variant="caption">Set times to pray and keep track</AppText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.color.accent} />
      </Pressable>
    );
  }

  const today = localDateKey(new Date());
  const todayEntries = log.filter((entry) => entry.localDate === today);
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const ordered = [...enabled].sort(
    (a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute),
  );
  const nextSlot = ordered.find(
    (slot) => !todayEntries.some((entry) => entry.slotId === slot.id)
      && slot.hour * 60 + slot.minute >= nowMinutes,
  );

  const subtitle = streak.current > 0
    ? `${todayEntries.length} of ${enabled.length} today · ${streak.current} day streak`
    : `${todayEntries.length} of ${enabled.length} today`;

  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
      <View style={styles.main}>
        <AppText variant="body" style={styles.title}>Prayer times</AppText>
        <AppText variant="caption">{subtitle}</AppText>
      </View>
      <View style={styles.dots}>
        {ordered.map((slot) => {
          const done = todayEntries.some((entry) => entry.slotId === slot.id);
          return (
            <View
              key={slot.id}
              style={[
                styles.dot,
                done && styles.dotDone,
                !done && nextSlot?.id === slot.id && styles.dotNext,
              ]}
            />
          );
        })}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.color.accent} />
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
    marginBottom: theme.space.lg,
  },
  main: { flex: 1 },
  title: { fontFamily: theme.font.sansSemibold },
  dots: { flexDirection: 'row', gap: 5 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: theme.color.border,
  },
  dotDone: { backgroundColor: theme.color.sage, borderColor: theme.color.sage },
  dotNext: { borderColor: theme.color.accent, borderStyle: 'dashed' },
});
