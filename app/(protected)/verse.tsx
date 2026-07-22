import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, Share, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useToast } from '@/components/ToastProvider';
import AppText from '@/components/ui/AppText';
import Card from '@/components/ui/Card';
import Screen from '@/components/ui/Screen';
import { openExactAlarmSettings, rescheduleDailyVerse } from '@/lib/notifications';
import type { ReminderStatus } from '@/lib/notifications';
import { useTheme, type AppTheme } from '@/lib/theme';
import { useVerseStore } from '@/lib/stores/verse';
import { bundledVerseSource, formatVerseForShare } from '@/lib/verses';
import type { Translation } from '@/lib/verseData';

const TRANSLATIONS: Translation[] = ['WEB', 'KJV'];

export default function VerseScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { showSuccess, showError } = useToast();
  const reducedMotion = useReducedMotion();
  const {
    translation, reminderEnabled, reminderHour, reminderMinute,
    setTranslation, setReminderEnabled, setReminderTime,
  } = useVerseStore();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<ReminderStatus>('disabled');

  const today = useMemo(() => new Date(), []);
  const verse = useMemo(() => bundledVerseSource.getVerseForDate(today), [today]);

  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Keep the notification schedule in sync with settings while on this screen.
  useEffect(() => {
    rescheduleDailyVerse({ reminderEnabled, reminderHour, reminderMinute, translation })
      .then(setReminderStatus);
  }, [reminderEnabled, reminderHour, reminderMinute, translation]);

  // Granting exact alarms happens in system Settings, which doesn't notify us. Re-check
  // on foreground so the warning clears when the user comes back having granted it.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const { reminderEnabled: on, reminderHour: h, reminderMinute: m, translation: t } =
        useVerseStore.getState();
      rescheduleDailyVerse({ reminderEnabled: on, reminderHour: h, reminderMinute: m, translation: t })
        .then(setReminderStatus);
    });
    return () => sub.remove();
  }, []);

  const handleCreateCard = () => {
    router.push({
      pathname: '/(protected)/card',
      params: { text: verse.text[translation], reference: verse.reference },
    } as never);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: formatVerseForShare(verse, translation) });
    } catch {
      showError('Share failed', 'Could not open the share sheet');
    }
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(formatVerseForShare(verse, translation));
      showSuccess('Copied', 'Verse copied to clipboard');
    } catch {
      showError('Copy failed', 'Could not copy verse to clipboard');
    }
  };

  const timeLabel = new Date(0, 0, 0, reminderHour, reminderMinute)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.color.text} />
        </Pressable>
        <View>
          <AppText variant="display">Verse of the Day</AppText>
          <AppText variant="caption">{dateLabel}</AppText>
        </View>
      </View>

      {/* Hero verse card — solid charcoal */}
      <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(400)}>
        <Card tone="charcoal" style={styles.heroCard}>
          <AppText variant="verse" style={styles.verseText}>
            {verse.text[translation]}
          </AppText>
          <AppText variant="label" style={styles.verseReference}>
            {verse.reference}
          </AppText>

          <View style={styles.actionsRow}>
            <Pressable onPress={handleShare} style={styles.actionButton} hitSlop={4}>
              <Ionicons name="share-outline" size={22} color={theme.color.onCharcoal} />
            </Pressable>
            <Pressable onPress={handleCopy} style={styles.actionButton} hitSlop={4}>
              <Ionicons name="copy-outline" size={22} color={theme.color.onCharcoal} />
            </Pressable>
            <Pressable onPress={handleCreateCard} style={styles.actionButton} hitSlop={4}>
              <Ionicons name="image-outline" size={22} color={theme.color.text} />
            </Pressable>
          </View>
        </Card>
      </Animated.View>

      {/* Translation toggle */}
      <View style={styles.segment}>
        {TRANSLATIONS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTranslation(t)}
            style={[styles.segmentItem, translation === t && styles.segmentItemActive]}
          >
            <AppText
              variant="label"
              style={[styles.segmentText, translation === t && styles.segmentTextActive]}
            >
              {t}
            </AppText>
          </Pressable>
        ))}
      </View>

      {/* Reminder settings */}
      <Card style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabelWrap}>
            <AppText variant="body" style={styles.settingLabel}>Daily reminder</AppText>
            <AppText variant="caption">Get a memory verse every day</AppText>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ true: theme.color.accent }}
          />
        </View>

        {reminderEnabled && (
          <Pressable style={styles.settingRow} onPress={() => setShowTimePicker(true)}>
            <AppText variant="body" style={styles.settingLabel}>Reminder time</AppText>
            <AppText variant="body" style={styles.timeValue}>{timeLabel}</AppText>
          </Pressable>
        )}

        {reminderStatus === 'unavailable' && (
          <AppText variant="caption" style={styles.permissionNote}>
            Turn on notifications for SermonMate in your device Settings to get your daily verse.
          </AppText>
        )}

        {reminderStatus === 'inexact' && (
          <View style={styles.warningBlock}>
            <AppText variant="caption" style={styles.permissionNote}>
              {`Reminders may arrive hours late. Allow exact alarms to get your verse at ${timeLabel}.`}
            </AppText>
            <Pressable
              onPress={openExactAlarmSettings}
              style={styles.warningButton}
              accessibilityRole="button"
              accessibilityLabel="Turn on exact alarms"
            >
              <AppText variant="label" style={styles.warningButtonText}>
                Turn on exact alarms
              </AppText>
              <Ionicons name="arrow-forward" size={14} color={theme.color.accentText} />
            </Pressable>
          </View>
        )}
      </Card>

      {showTimePicker && (
        <DateTimePicker
          value={new Date(0, 0, 0, reminderHour, reminderMinute)}
          mode="time"
          onChange={(event, selected) => {
            setShowTimePicker(false);
            if (event.type === 'set' && selected) {
              setReminderTime(selected.getHours(), selected.getMinutes());
            }
          }}
        />
      )}
    </Screen>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, paddingVertical: theme.space.md },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heroCard: {
    marginTop: theme.space.sm,
    shadowColor: theme.color.shadow, shadowOpacity: 0.18, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  verseText: {
    color: theme.color.onCharcoal,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 34,
  },
  verseReference: {
    marginTop: theme.space.lg,
    textAlign: 'center',
    color: `${theme.color.onCharcoal}e6`,
  },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: theme.space.md, marginTop: theme.space.xl },
  actionButton: {
    width: 44, height: 44, borderRadius: theme.radius.pill,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(242,237,228,0.18)',
  },
  segment: {
    flexDirection: 'row', marginTop: theme.space.xl,
    borderRadius: theme.radius.sm, padding: theme.space.xs,
    backgroundColor: theme.color.surfaceAlt,
  },
  segmentItem: {
    flex: 1, height: 44, borderRadius: theme.radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  segmentItemActive: { backgroundColor: theme.color.charcoal },
  segmentText: { color: theme.color.textMuted },
  segmentTextActive: { color: theme.color.onCharcoal },
  settingsCard: { marginTop: theme.space.xl, gap: theme.space.xs },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 44,
  },
  settingLabelWrap: { flex: 1, paddingRight: theme.space.md },
  settingLabel: { fontFamily: theme.font.sansSemibold, color: theme.color.text },
  timeValue: { color: theme.color.accent, fontFamily: theme.font.sansSemibold },
  // `danger`, not `rust` — rust is a card-background tone and darkens in dark
  // mode, which would leave this warning near-invisible on dark paper.
  permissionNote: { marginTop: theme.space.sm, color: theme.color.danger },
  warningBlock: { alignItems: 'flex-start' },
  warningButton: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.xs,
    marginTop: theme.space.sm, minHeight: 44,
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.accent,
  },
  warningButtonText: { color: theme.color.accentText },
});
