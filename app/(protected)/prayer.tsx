import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import AppText from '@/components/ui/AppText';
import PrayerLogSheet from '@/components/PrayerLogSheet';
import PrayerSlotRow from '@/components/PrayerSlotRow';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Screen from '@/components/ui/Screen';
import { useToast } from '@/components/ToastProvider';
import { localDateKey } from '@/lib/localDate';
import { generatePrayer } from '@/lib/prayerAi';
import { openExactAlarmSettings } from '@/lib/notifications';
import { rearmAllSerialized } from '@/lib/reminderScheduler';
import { usePrayerStore } from '@/lib/stores/prayer';
import { useVerseStore } from '@/lib/stores/verse';
import { useTheme, type AppTheme } from '@/lib/theme';
import { timeOfDay } from '@/lib/time';
import type { PrayerLogEntry, PrayerSlot } from '@/lib/types';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function minutesOfDay(slot: PrayerSlot): number {
  return slot.hour * 60 + slot.minute;
}

export default function PrayerScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { showError } = useToast();
  const params = useLocalSearchParams<{ slotId?: string }>();

  const { slots, log, streak, load, setSlots, logPrayer, setNote } = usePrayerStore();
  const verse = useVerseStore();

  const [editing, setEditing] = useState<PrayerSlot | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [sheetFor, setSheetFor] = useState<{ entry: PrayerLogEntry; title: string } | null>(null);
  const [praying, setPraying] = useState(false);
  const [generatedPrayer, setGeneratedPrayer] = useState<string | null>(null);
  const [alarmWarning, setAlarmWarning] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = localDateKey(new Date());
  const todayEntries = log.filter((entry) => entry.localDate === today);
  const ordered = [...slots].sort((a, b) => minutesOfDay(a) - minutesOfDay(b));
  const enabledCount = ordered.filter((slot) => slot.enabled).length;

  // The enabled slot nearest to now that hasn't been logged — a quiet "you're up",
  // never a nag.
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const nextSlot = ordered.find(
    (slot) => slot.enabled
      && !todayEntries.some((entry) => entry.slotId === slot.id)
      && minutesOfDay(slot) >= nowMinutes,
  );

  const rearm = useCallback(async (next: PrayerSlot[]) => {
    const status = await rearmAllSerialized(
      {
        reminderEnabled: verse.reminderEnabled,
        reminderHour: verse.reminderHour,
        reminderMinute: verse.reminderMinute,
        translation: verse.translation,
      },
      next,
    );
    setAlarmWarning(status === 'inexact');
    if (status === 'unavailable' && next.some((slot) => slot.enabled)) {
      showError('Reminders are off', 'Turn on notifications for SermonMate in Settings.');
    }
  }, [verse, showError]);

  const handleLog = async (slot: PrayerSlot | null) => {
    const entry = await logPrayer(slot?.id ?? null);
    if (!entry) {
      showError('Could not log that', 'Please try again.');
      return;
    }
    setSheetFor({ entry, title: slot ? `${slot.label} prayer logged` : 'Prayer logged' });
  };

  const handlePrayWithMe = async () => {
    setPraying(true);
    try {
      const text = await generatePrayer('A moment of prayer during my daily prayer time.');
      setSheetFor(null);
      setGeneratedPrayer(text);
    } catch (error: any) {
      showError('Could not create a prayer', error?.message || 'Please try again.');
    } finally {
      setPraying(false);
    }
  };

  const saveSlot = async (updated: PrayerSlot) => {
    const next = slots.some((slot) => slot.id === updated.id)
      ? slots.map((slot) => (slot.id === updated.id ? updated : slot))
      : [...slots, updated];
    setEditing(null);
    await setSlots(next);
    await rearm(next);
  };

  const deleteSlot = async (id: string) => {
    const next = slots.filter((slot) => slot.id !== id);
    setEditing(null);
    await setSlots(next);
    await rearm(next);
  };

  const addSlot = () => setEditing({
    id: `slot-${Date.now()}`, label: 'Prayer', hour: 12, minute: 0, enabled: true,
  });

  // The CALENDAR week, Sunday to Saturday — the same week the Mood card shows.
  // A rolling seven days ending today starts on a different weekday every day,
  // which is why the old strip read "T F S S M T W" and meant nothing.
  const weekDays = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay() + index);
    const key = localDateKey(date);
    const count = log.filter((entry) => entry.localDate === key).length;
    return {
      key,
      letter: WEEKDAYS[index],
      dayOfMonth: date.getDate(),
      prayed: count > 0,
      full: enabledCount > 0 && count >= enabledCount,
      grace: streak.graceDates.includes(key),
      isToday: key === today,
    };
  });

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <AppText variant="title" style={styles.h1}>Prayer times</AppText>
          <Pressable onPress={() => router.push('/prayer-history')} style={styles.historyLink}>
            <AppText variant="label" style={styles.link}>History</AppText>
            <Ionicons name="chevron-forward" size={16} color={theme.color.accent} />
          </Pressable>
        </View>

        <View style={styles.streak}>
          <AppText style={styles.streakNumber}>{streak.current}</AppText>
          <AppText variant="caption" style={styles.streakLabel}>
            {streak.current === 1 ? 'day of prayer' : 'days of prayer'}
          </AppText>
          <View style={styles.dots}>
            {weekDays.map((day) => (
              <View key={day.key} style={styles.dayCol}>
                <AppText variant="caption" style={styles.dayLetter}>{day.letter}</AppText>
                <View
                  style={[
                    styles.dot,
                    day.prayed && styles.dotSome,
                    day.full && styles.dotFull,
                    day.grace && styles.dotGrace,
                    day.isToday && styles.dotToday,
                  ]}
                >
                  <AppText variant="caption" style={styles.dotText}>{day.dayOfMonth}</AppText>
                </View>
              </View>
            ))}
          </View>
        </View>

        {alarmWarning && (
          <Pressable onPress={openExactAlarmSettings} style={styles.warning}>
            <AppText variant="caption">
              Reminders may arrive late. Allow exact alarms to be nudged on time.
            </AppText>
            <AppText variant="label" style={styles.link}>Turn on exact alarms</AppText>
          </Pressable>
        )}

        {ordered.length === 0 && (
          <View style={styles.empty}>
            <AppText variant="body" style={styles.emptyTitle}>No prayer times yet</AppText>
            <AppText variant="caption">
              Set the times you want to pray and we&apos;ll remind you — morning, midday,
              evening, or whatever fits your day.
            </AppText>
          </View>
        )}

        {ordered.length > 0 && (
          <AppText variant="label" style={styles.sectionLabel}>
            {enabledCount > 0
              ? `Today · ${todayEntries.filter((e) => e.slotId).length} of ${enabledCount}`
              : 'Today'}
          </AppText>
        )}

        {ordered.map((slot) => {
          const entry = todayEntries.find((item) => item.slotId === slot.id);
          return (
            <PrayerSlotRow
              key={slot.id}
              slot={slot}
              logged={!!entry}
              loggedAtLabel={entry
                ? entry.loggedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                : undefined}
              note={entry?.note}
              isNext={nextSlot?.id === slot.id || params.slotId === slot.id}
              onLog={() => handleLog(slot)}
              onEdit={() => setEditing(slot)}
            />
          );
        })}

        {/* With no slots set up, adding one is the real next step — logging an
            ad-hoc prayer is the secondary path, so the emphasis flips. */}
        {ordered.length === 0 ? (
          <>
            <PrimaryButton label="Add a prayer time" onPress={addSlot} style={styles.primaryAction} />
            <Pressable
              onPress={() => handleLog(null)}
              style={styles.secondaryAction}
              android_ripple={{ color: theme.color.border }}
              accessibilityRole="button"
            >
              <AppText variant="label" style={styles.link}>I prayed just now</AppText>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => handleLog(null)}
              style={styles.secondaryAction}
              android_ripple={{ color: theme.color.border }}
              accessibilityRole="button"
            >
              <Ionicons name="checkmark-circle-outline" size={17} color={theme.color.accent} />
              <AppText variant="label" style={styles.link}>I prayed just now</AppText>
            </Pressable>
            <Pressable
              onPress={addSlot}
              style={styles.addRow}
              android_ripple={{ color: theme.color.border }}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={16} color={theme.color.textMuted} />
              <AppText variant="label" style={styles.addText}>Add a prayer time</AppText>
            </Pressable>
          </>
        )}
      </ScrollView>

      <PrayerLogSheet
        visible={!!sheetFor}
        title={sheetFor?.title ?? ''}
        praying={praying}
        onSaveNote={(note) => sheetFor && setNote(sheetFor.entry.id, note)}
        onPrayWithMe={handlePrayWithMe}
        onClose={() => setSheetFor(null)}
      />

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(null)} />
        {editing && (
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <AppText variant="title">Prayer time</AppText>

            <TextInput
              value={editing.label}
              onChangeText={(label) => setEditing({ ...editing, label })}
              placeholder="Name"
              placeholderTextColor={theme.color.textMuted}
              style={styles.input}
              maxLength={30}
            />

            <Pressable onPress={() => setShowPicker(true)} style={styles.timeBox}>
              <AppText variant="title">
                {timeOfDay(editing.hour, editing.minute)
                  .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </AppText>
            </Pressable>

            <View style={styles.switchRow}>
              <AppText variant="body">Remind me</AppText>
              <Switch
                value={editing.enabled}
                onValueChange={(enabled) => setEditing({ ...editing, enabled })}
                trackColor={{ true: theme.color.accent, false: theme.color.border }}
              />
            </View>

            <PrimaryButton label="Save" onPress={() => saveSlot(editing)} />

            <Pressable onPress={() => deleteSlot(editing.id)} style={styles.ghost}>
              <AppText variant="label" style={styles.danger}>Delete this time</AppText>
            </Pressable>
          </View>
        )}
      </Modal>

      <Modal
        visible={!!generatedPrayer}
        transparent
        animationType="fade"
        onRequestClose={() => setGeneratedPrayer(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setGeneratedPrayer(null)} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <AppText variant="title">A prayer for now</AppText>
          <AppText variant="verse" style={styles.prayerText}>{generatedPrayer}</AppText>
          <PrimaryButton label="Amen" onPress={() => setGeneratedPrayer(null)} />
        </View>
      </Modal>

      {showPicker && editing && (
        <DateTimePicker
          value={timeOfDay(editing.hour, editing.minute)}
          mode="time"
          onChange={(event, selected) => {
            setShowPicker(false);
            if (event.type === 'set' && selected) {
              setEditing({ ...editing, hour: selected.getHours(), minute: selected.getMinutes() });
            }
          }}
        />
      )}
    </Screen>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  // Vertical rhythm: space.lg between blocks, space.sm inside them. Matches home.
  scrollContent: { paddingTop: theme.space.lg, paddingBottom: theme.space.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space.lg,
  },
  h1: { fontSize: 26, lineHeight: 34 },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    // 44px touch target without visually enlarging the link.
    paddingVertical: theme.space.sm,
    paddingLeft: theme.space.sm,
  },
  link: { color: theme.color.accent },
  streak: {
    backgroundColor: theme.color.charcoal,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    marginBottom: theme.space.lg,
  },
  // lineHeight is not optional here: at 40px the serif numeral was being clipped
  // to a sliver by the default line box, so "0" rendered as "U".
  streakNumber: {
    fontFamily: theme.font.serif,
    fontSize: 40,
    lineHeight: 48,
    color: theme.color.onCharcoal,
  },
  streakLabel: { color: theme.color.onCharcoal, opacity: 0.8 },
  dots: { flexDirection: 'row', gap: theme.space.xs, marginTop: theme.space.lg },
  dayCol: { flex: 1, alignItems: 'stretch' },
  dayLetter: {
    color: theme.color.onCharcoal,
    opacity: 0.6,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    marginBottom: 5,
  },
  dot: {
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSome: { backgroundColor: theme.color.sand },
  dotFull: { backgroundColor: theme.color.sage },
  dotGrace: { backgroundColor: theme.color.sand, borderWidth: 1, borderColor: theme.color.accent },
  dotToday: { borderWidth: 1.5, borderColor: theme.color.accent },
  dotText: { color: theme.color.onCharcoal, fontSize: 11, lineHeight: 14 },
  sectionLabel: { color: theme.color.textMuted, marginBottom: theme.space.sm },
  warning: {
    backgroundColor: theme.color.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: theme.space.lg,
    marginBottom: theme.space.lg,
    gap: theme.space.xs,
  },
  empty: {
    paddingVertical: theme.space.xl,
    gap: theme.space.xs,
  },
  emptyTitle: { fontFamily: theme.font.sansSemibold },
  primaryAction: { marginTop: theme.space.sm },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xs,
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    marginTop: theme.space.sm,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xs,
    minHeight: 48,
    marginTop: theme.space.xs,
  },
  addText: { color: theme.color.textMuted },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.space.lg,
    paddingBottom: theme.space.xl,
    gap: theme.space.sm,
  },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: theme.color.border, alignSelf: 'center', marginBottom: theme.space.sm },
  input: {
    backgroundColor: theme.color.paper, borderWidth: 1, borderColor: theme.color.border,
    borderRadius: theme.radius.md, padding: theme.space.md, color: theme.color.text,
  },
  timeBox: {
    backgroundColor: theme.color.paper, borderWidth: 1, borderColor: theme.color.border,
    borderRadius: theme.radius.md, padding: theme.space.md, alignItems: 'center',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.space.sm },
  ghost: { alignItems: 'center', paddingVertical: theme.space.md },
  danger: { color: theme.color.danger },
  prayerText: { marginVertical: theme.space.md },
});
