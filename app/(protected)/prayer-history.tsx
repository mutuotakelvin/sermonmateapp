import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AppText from '@/components/ui/AppText';
import Screen from '@/components/ui/Screen';
import { localDateKey } from '@/lib/localDate';
import { computeBestStreak } from '@/lib/prayerStreak';
import { usePrayerStore } from '@/lib/stores/prayer';
import { useTheme, type AppTheme } from '@/lib/theme';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function PrayerHistoryScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { log, slots, streak, load } = usePrayerStore();

  // Offset in months from the current one; 0 is this month, -1 last month.
  const [monthOffset, setMonthOffset] = useState(0);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = new Date();
  const todayKey = localDateKey(today);
  const viewed = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);

  const monthLabel = viewed.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(viewed.getFullYear(), viewed.getMonth() + 1, 0).getDate();
  const enabledCount = slots.filter((slot) => slot.enabled).length;

  const bestStreak = useMemo(
    () => computeBestStreak(log.map((entry) => entry.localDate)),
    [log],
  );

  const countFor = (key: string) => log.filter((entry) => entry.localDate === key).length;

  // Leading blanks so the 1st lands under its weekday.
  const cells: (string | null)[] = Array.from({ length: viewed.getDay() }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(localDateKey(new Date(viewed.getFullYear(), viewed.getMonth(), day)));
  }

  const monthKeys = cells.filter(Boolean) as string[];
  const daysPrayedThisMonth = monthKeys.filter((key) => countFor(key) > 0).length;

  const noted = log.filter((entry) => entry.note).slice(0, 10);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          android_ripple={{ color: theme.color.border, borderless: true }}
          accessibilityRole="button"
          accessibilityLabel="Back to prayer times"
        >
          <Ionicons name="chevron-back" size={20} color={theme.color.accent} />
          <AppText variant="label" style={styles.link}>Prayer times</AppText>
        </Pressable>

        <AppText variant="title" style={styles.h1}>Your prayer life</AppText>

        <View style={styles.monthNav}>
          <Pressable
            onPress={() => setMonthOffset((value) => value - 1)}
            style={styles.navBtn}
            android_ripple={{ color: theme.color.border, borderless: true }}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={18} color={theme.color.textMuted} />
          </Pressable>

          <AppText variant="body" style={styles.monthLabel}>{monthLabel}</AppText>

          <Pressable
            onPress={() => setMonthOffset((value) => Math.min(0, value + 1))}
            style={styles.navBtn}
            disabled={monthOffset >= 0}
            android_ripple={{ color: theme.color.border, borderless: true }}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              // Nothing to see in the future — dim rather than hide, so the
              // control doesn't jump around.
              color={monthOffset >= 0 ? theme.color.border : theme.color.textMuted}
            />
          </Pressable>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <AppText style={styles.statValue}>{streak.current}</AppText>
            <AppText variant="caption" style={styles.statKey}>Current streak</AppText>
          </View>
          <View style={styles.stat}>
            <AppText style={styles.statValue}>{bestStreak}</AppText>
            <AppText variant="caption" style={styles.statKey}>Best streak</AppText>
          </View>
          <View style={styles.stat}>
            <AppText style={styles.statValue}>{daysPrayedThisMonth}</AppText>
            <AppText variant="caption" style={styles.statKey}>Days this month</AppText>
          </View>
        </View>

        <View style={styles.weekHeader}>
          {WEEKDAY_INITIALS.map((label, index) => (
            <AppText key={`${label}-${index}`} variant="caption" style={styles.weekHeaderCell}>
              {label}
            </AppText>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((key, index) => {
            if (!key) return <View key={`blank-${index}`} style={styles.cell} />;
            const count = countFor(key);
            const full = enabledCount > 0 && count >= enabledCount;
            const some = count > 0 && !full;
            const grace = streak.graceDates.includes(key);
            const isToday = key === todayKey;
            return (
              <View key={key} style={[styles.cell, isToday && styles.cellToday]}>
                <AppText variant="caption" style={[styles.cellText, isToday && styles.cellTextToday]}>
                  {Number(key.slice(-2))}
                </AppText>
                {/* Dot under the number, the same language the Mood Calendar
                    speaks. Missed days get an invisible dot so every cell keeps
                    the same height. */}
                <View
                  style={[
                    styles.dot,
                    some && styles.dotSome,
                    full && styles.dotFull,
                    grace && styles.dotGrace,
                  ]}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.dotFull]} />
            <AppText variant="caption">every time</AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.dotSome]} />
            <AppText variant="caption">some</AppText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.dotGrace]} />
            <AppText variant="caption">grace</AppText>
          </View>
        </View>

        {log.length === 0 && (
          <View style={styles.empty}>
            <AppText variant="body" style={styles.emptyTitle}>Nothing logged yet</AppText>
            <AppText variant="caption">
              Once you start logging prayers they&apos;ll fill in here, month by month.
            </AppText>
          </View>
        )}

        {noted.length > 0 && (
          <>
            <AppText variant="label" style={styles.sectionLabel}>Recent notes</AppText>
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
  scrollContent: { paddingTop: theme.space.lg, paddingBottom: theme.space.xxl },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    minHeight: 44,
    marginBottom: theme.space.xs,
  },
  link: { color: theme.color.accent },
  h1: { fontSize: 26, lineHeight: 34 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.space.md,
    marginBottom: theme.space.lg,
  },
  navBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontFamily: theme.font.sansSemibold },
  stats: { flexDirection: 'row', gap: theme.space.sm, marginBottom: theme.space.lg },
  stat: {
    flex: 1,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.xs,
    alignItems: 'center',
  },
  statValue: { fontFamily: theme.font.serif, fontSize: 24, lineHeight: 30, color: theme.color.text },
  statKey: { textAlign: 'center' },
  weekHeader: { flexDirection: 'row' },
  weekHeaderCell: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: theme.space.xs },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
  },
  cellToday: { backgroundColor: theme.color.surfaceAlt },
  cellText: { color: theme.color.textMuted },
  cellTextToday: { color: theme.color.text, fontFamily: theme.font.sansSemibold },
  // Missed days keep a transparent dot: no red, no failure marks anywhere.
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 3, backgroundColor: 'transparent' },
  dotSome: { backgroundColor: theme.color.sand },
  dotFull: { backgroundColor: theme.color.sage },
  dotGrace: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.color.accent },
  legend: { flexDirection: 'row', gap: theme.space.lg, marginTop: theme.space.lg, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 8, height: 8, borderRadius: 4 },
  empty: { paddingVertical: theme.space.xl, gap: theme.space.xs },
  emptyTitle: { fontFamily: theme.font.sansSemibold },
  sectionLabel: { color: theme.color.textMuted, marginTop: theme.space.xl, marginBottom: theme.space.sm },
  noteCard: {
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    marginBottom: theme.space.sm,
  },
});
