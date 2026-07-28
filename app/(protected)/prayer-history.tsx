import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import AppText from '@/components/ui/AppText';
import Screen from '@/components/ui/Screen';
import { localDateKey } from '@/lib/localDate';
import { usePrayerStore } from '@/lib/stores/prayer';
import { useTheme, type AppTheme } from '@/lib/theme';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PrayerHistoryScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { log, slots, streak, load } = usePrayerStore();

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const now = new Date();
  const monthLabel = now.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const enabledCount = slots.filter((slot) => slot.enabled).length;

  // Leading blanks so the 1st lands under its weekday.
  const cells: (string | null)[] = Array.from({ length: firstOfMonth.getDay() }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(localDateKey(new Date(now.getFullYear(), now.getMonth(), day)));
  }

  const countFor = (key: string) => log.filter((entry) => entry.localDate === key).length;

  const noted = log.filter((entry) => entry.note).slice(0, 10);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppText variant="title" style={styles.h1}>Your prayer life</AppText>
        <AppText variant="caption" style={styles.sub}>{monthLabel}</AppText>

        <View style={styles.weekHeader}>
          {WEEKDAY_LABELS.map((label) => (
            <AppText key={label} variant="caption" style={styles.weekHeaderCell}>{label}</AppText>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((key, index) => {
            if (!key) return <View key={`blank-${index}`} style={styles.cell} />;
            const count = countFor(key);
            const full = enabledCount > 0 && count >= enabledCount;
            const some = count > 0 && !full;
            const grace = streak.graceDates.includes(key);
            return (
              <View
                key={key}
                style={[
                  styles.cell,
                  styles.cellFilled,
                  some && styles.cellSome,
                  full && styles.cellFull,
                  grace && styles.cellGrace,
                ]}
              >
                <AppText variant="caption" style={[styles.cellText, full && styles.cellTextOn]}>
                  {Number(key.slice(-2))}
                </AppText>
              </View>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.cellFull]} /><AppText variant="caption">all</AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.cellSome]} /><AppText variant="caption">some</AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.cellGrace]} /><AppText variant="caption">grace</AppText>
          </View>
        </View>

        {noted.length > 0 && (
          <>
            <AppText variant="title" style={styles.section}>Recent notes</AppText>
            {noted.map((entry) => (
              <View key={entry.id} style={styles.noteCard}>
                <AppText variant="caption">
                  {entry.loggedAt.toLocaleDateString([], { day: 'numeric', month: 'short' })}
                </AppText>
                <AppText variant="body">{entry.note}</AppText>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  h1: { fontSize: 26 },
  sub: { marginBottom: theme.space.lg },
  weekHeader: { flexDirection: 'row' },
  weekHeaderCell: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: theme.space.sm },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Missed days are simply plain. No red, no failure marks — absence is absence.
  cellFilled: { borderRadius: theme.radius.sm },
  cellSome: { backgroundColor: theme.color.sand },
  cellFull: { backgroundColor: theme.color.sage },
  cellGrace: { backgroundColor: theme.color.sand, borderWidth: 1, borderColor: theme.color.accent },
  cellText: { color: theme.color.textMuted },
  cellTextOn: { color: theme.color.accentText },
  legend: { flexDirection: 'row', gap: theme.space.lg, marginTop: theme.space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  section: { marginTop: theme.space.xl, marginBottom: theme.space.sm },
  noteCard: {
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    marginBottom: theme.space.sm,
  },
});
