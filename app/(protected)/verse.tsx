import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/ToastProvider';
import { rescheduleDailyVerse } from '@/lib/notifications';
import { useThemeStore } from '@/lib/stores/theme';
import { useVerseStore } from '@/lib/stores/verse';
import { bundledVerseSource, formatVerseForShare } from '@/lib/verses';
import type { Translation } from '@/lib/verseData';

const GRADIENT_LIGHT = ['#22D3EE', '#0891B2'] as const;
const GRADIENT_DARK = ['#0E7490', '#155E75'] as const;
const TRANSLATIONS: Translation[] = ['WEB', 'KJV'];

export default function VerseScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { showSuccess, showError } = useToast();
  const reducedMotion = useReducedMotion();
  const {
    translation, reminderEnabled, reminderHour, reminderMinute,
    setTranslation, setReminderEnabled, setReminderTime,
  } = useVerseStore();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  const today = useMemo(() => new Date(), []);
  const verse = useMemo(() => bundledVerseSource.getVerseForDate(today), [today]);

  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Keep the notification schedule in sync with settings while on this screen.
  useEffect(() => {
    rescheduleDailyVerse({ reminderEnabled, reminderHour, reminderMinute, translation })
      .then((active) => setPermissionDenied(reminderEnabled && !active));
  }, [reminderEnabled, reminderHour, reminderMinute, translation]);

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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#111827'} />
        </Pressable>
        <View>
          <Text style={styles.title}>Verse of the Day</Text>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>
      </View>

      {/* Hero verse card */}
      <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(400)}>
        <LinearGradient
          colors={isDark ? GRADIENT_DARK : GRADIENT_LIGHT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.verseText}>{verse.text[translation]}</Text>
          <Text style={styles.verseReference}>{verse.reference}</Text>

          <View style={styles.actionsRow}>
            <Pressable onPress={handleShare} style={styles.actionButton} hitSlop={4}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={handleCopy} style={styles.actionButton} hitSlop={4}>
              <Ionicons name="copy-outline" size={22} color="#fff" />
            </Pressable>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Translation toggle */}
      <View style={styles.segment}>
        {TRANSLATIONS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTranslation(t)}
            style={[styles.segmentItem, translation === t && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, translation === t && styles.segmentTextActive]}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Reminder settings */}
      <View style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabelWrap}>
            <Text style={styles.settingLabel}>Daily reminder</Text>
            <Text style={styles.settingHint}>Get a memory verse every day</Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ true: '#0891B2' }}
          />
        </View>

        {reminderEnabled && (
          <Pressable style={styles.settingRow} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.settingLabel}>Reminder time</Text>
            <Text style={styles.timeValue}>{timeLabel}</Text>
          </Pressable>
        )}

        {permissionDenied && (
          <Text style={styles.permissionNote}>
            Turn on notifications for SermonMate in your device Settings to get your daily verse.
          </Text>
        )}
      </View>

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
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#111827' : '#fff', paddingHorizontal: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '800', color: isDark ? '#fff' : '#111827' },
    date: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 2 },
    heroCard: {
      borderRadius: 16, padding: 28, marginTop: 8,
      shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 }, elevation: 4,
    },
    verseText: {
      fontFamily: 'Lora_500Medium', fontSize: 22, lineHeight: 34,
      color: '#fff', textAlign: 'center',
    },
    verseReference: {
      marginTop: 18, textAlign: 'center', color: 'rgba(255,255,255,0.9)',
      fontSize: 13, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase',
    },
    actionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 20 },
    actionButton: {
      width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    segment: {
      flexDirection: 'row', marginTop: 20, borderRadius: 12, padding: 4,
      backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
    },
    segmentItem: {
      flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
    },
    segmentItemActive: { backgroundColor: isDark ? '#374151' : '#fff' },
    segmentText: { fontSize: 14, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280' },
    segmentTextActive: { color: isDark ? '#fff' : '#111827' },
    settingsCard: {
      marginTop: 20, borderRadius: 16, padding: 16, gap: 4,
      backgroundColor: isDark ? '#1f2937' : '#F9FAFB',
    },
    settingRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      minHeight: 44,
    },
    settingLabelWrap: { flex: 1, paddingRight: 12 },
    settingLabel: { fontSize: 16, fontWeight: '600', color: isDark ? '#fff' : '#111827' },
    settingHint: { fontSize: 13, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 2 },
    timeValue: { fontSize: 16, fontWeight: '600', color: '#0891B2' },
    permissionNote: { marginTop: 8, fontSize: 13, lineHeight: 18, color: '#F59E0B' },
  });
