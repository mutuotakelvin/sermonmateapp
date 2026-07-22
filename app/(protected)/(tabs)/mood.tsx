import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Calendar } from 'react-native-calendars';
import { useMoodStore } from '@/lib/stores/mood';
import type { MoodEntry, MoodType } from '@/lib/types';
import SermonModal from '@/components/SermonModal';
import MoodModal from '@/components/MoodModal';
import Screen from '@/components/ui/Screen';
import AppText from '@/components/ui/AppText';
import Card from '@/components/ui/Card';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { useTheme, type AppTheme } from '@/lib/theme';

export default function MoodTab() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const modalStyles = useMemo(() => makeModalStyles(theme), [theme]);
  // Saturated per-mood tokens: they carry their own contrast, so dots and bars
  // stay legible on both paper and near-black.
  const MOOD_COLORS = theme.moodColor;
  const { moodEntries, loadMoodEntries } = useMoodStore();
  const [selectedEntry, setSelectedEntry] = useState<MoodEntry | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [sermonModalVisible, setSermonModalVisible] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);

  // Month navigation
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  useEffect(() => {
    loadMoodEntries();
  }, []);

  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

  // Get current date string in YYYY-MM-DD format
  const currentDateString = useMemo(() => {
    const date = new Date(currentYear, currentMonth, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }, [currentYear, currentMonth]);

  // Create markedDates object for react-native-calendars
  const markedDates = useMemo(() => {
    const marked: Record<string, any> = {};

    moodEntries.forEach((entry) => {
      const dateStr = entry.date.split('T')[0];
      const entryDate = new Date(entry.date);

      // Only mark dates in the current month
      if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
        if (!marked[dateStr]) {
          marked[dateStr] = {
            marked: true,
            dotColor: MOOD_COLORS[entry.mood].bg,
            entries: [],
          };
        }
        marked[dateStr].entries.push(entry);
      }
    });

    return marked;
  }, [moodEntries, currentMonth, currentYear]);

  // Calculate statistics
  const moodCounts: Record<MoodType, number> = {
    Happy: 0,
    Grateful: 0,
    Hopeful: 0,
    Peaceful: 0,
    Anxious: 0,
    Sad: 0,
    Overwhelmed: 0,
    Angry: 0,
  };

  moodEntries.forEach((entry) => {
    const entryDate = new Date(entry.date);
    if (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
      moodCounts[entry.mood]++;
    }
  });

  const totalEntries = Object.values(moodCounts).reduce((a, b) => a + b, 0);
  const mostCommonMood = Object.entries(moodCounts).reduce((a, b) =>
    moodCounts[a[0] as MoodType] > moodCounts[b[0] as MoodType] ? a : b
  )[0] as MoodType;

  const handleDayPress = (day: { dateString: string; day: number; month: number; year: number; timestamp: number }) => {
    const dateStr = day.dateString;
    const dayEntries = moodEntries.filter(
      (e) => e.date.split('T')[0] === dateStr
    );

    if (dayEntries.length > 0) {
      // If multiple entries, show the most recent one
      const sortedEntries = dayEntries.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setSelectedEntry(sortedEntries[0]);
      setDetailModalVisible(true);
    }
  };

  const handleMonthChange = (month: { month: number; year: number }) => {
    setCurrentMonth(month.month - 1); // Calendar uses 1-based months
    setCurrentYear(month.year);
  };

  const handleViewSermon = () => {
    setDetailModalVisible(false);
    setSermonModalVisible(true);
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const canGoNext = currentYear < today.getFullYear() ||
    (currentYear === today.getFullYear() && currentMonth < today.getMonth());

  // Calendar theme configuration using warm editorial tokens
  const calendarTheme = useMemo(() => ({
    backgroundColor: theme.color.surface,
    calendarBackground: theme.color.surface,
    textSectionTitleColor: theme.color.textMuted,
    selectedDayBackgroundColor: theme.color.accent,
    selectedDayTextColor: theme.color.accentText,
    todayTextColor: theme.color.accent,
    dayTextColor: theme.color.text,
    textDisabledColor: theme.color.border,
    dotColor: theme.color.accent,
    selectedDotColor: theme.color.accentText,
    arrowColor: theme.color.text,
    monthTextColor: theme.color.text,
    textDayFontFamily: theme.font.sans,
    textMonthFontFamily: theme.font.sansSemibold,
    textDayHeaderFontFamily: theme.font.sansMedium,
    textDayFontWeight: '500' as const,
    textMonthFontWeight: '600' as const,
    textDayHeaderFontWeight: '600' as const,
    textDayFontSize: 15,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 13,
    'stylesheet.calendar.header': {
      week: {
        marginTop: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
      },
    },
  }), [theme]);

  return (
    <Screen style={styles.screenInner}>
      {/* Header */}
      <View style={styles.header}>
        <AppText variant="display">Mood Calendar</AppText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* "How do you feel today?" entry point */}
        <PrimaryButton
          label="How do you feel today?"
          onPress={() => setMoodModalVisible(true)}
          style={styles.checkinButton}
        />

        {/* Month Navigation */}
        <View style={styles.monthNavigation}>
          <Pressable
            onPress={handlePreviousMonth}
            style={styles.monthNavButton}
          >
            <Ionicons name="chevron-back" size={20} color={theme.color.text} />
          </Pressable>
          <Pressable style={styles.monthSelector}>
            <Ionicons name="calendar-outline" size={18} color={theme.color.textMuted} />
            <AppText variant="title" style={styles.monthSelectorText}>
              {monthName} {currentYear}
            </AppText>
            <Ionicons name="chevron-down" size={16} color={theme.color.textMuted} />
          </Pressable>
          <Pressable
            onPress={handleNextMonth}
            style={[styles.monthNavButton, !canGoNext && styles.monthNavButtonDisabled]}
            disabled={!canGoNext}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={!canGoNext ? theme.color.border : theme.color.text}
            />
          </Pressable>
        </View>

        {/* Calendar */}
        <View style={styles.calendarSection}>
          <Card style={styles.calendarCard}>
            <Calendar
              current={currentDateString}
              onDayPress={handleDayPress}
              onMonthChange={handleMonthChange}
              markedDates={markedDates}
              theme={calendarTheme}
              hideExtraDays={true}
              disableArrowRight={!canGoNext}
              enableSwipeMonths={true}
              firstDay={0}
              monthFormat="MMMM yyyy"
              hideArrows={false}
              renderArrow={(direction) => (
                <Ionicons
                  name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
                  size={20}
                  color={direction === 'right' && !canGoNext
                    ? theme.color.border
                    : theme.color.text}
                />
              )}
            />
          </Card>
        </View>

        {/* Statistics Section */}
        <View style={styles.section}>
          <AppText variant="title" style={styles.sectionTitle}>Statistics</AppText>
          <View style={styles.statsContainer}>
            <Card style={styles.statCard}>
              <AppText variant="display" style={styles.statValue}>{totalEntries}</AppText>
              <AppText variant="caption" style={styles.statLabel}>Total Entries</AppText>
            </Card>
            <Card style={styles.statCard}>
              <AppText variant="display" style={styles.statValueMood}>{mostCommonMood}</AppText>
              <AppText variant="caption" style={styles.statLabel}>Most Common</AppText>
            </Card>
          </View>
        </View>

        {/* Mood Distribution */}
        <View style={styles.section}>
          <AppText variant="title" style={styles.sectionTitle}>Mood Distribution</AppText>
          <Card>
            {Object.entries(moodCounts).map(([mood, count]) => {
              if (count === 0) return null;
              const percentage = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
              return (
                <View key={mood} style={styles.distributionItem}>
                  <View style={styles.distributionHeader}>
                    <View
                      style={[
                        styles.distributionDot,
                        { backgroundColor: MOOD_COLORS[mood as MoodType].bg },
                      ]}
                    />
                    <AppText variant="body" style={styles.distributionLabel}>{mood}</AppText>
                    <AppText variant="caption" style={styles.distributionCount}>{count}</AppText>
                  </View>
                  <View style={styles.distributionBar}>
                    <View
                      style={[
                        styles.distributionBarFill,
                        {
                          width: `${percentage}%` as any,
                          backgroundColor: MOOD_COLORS[mood as MoodType].bg,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={modalStyles.modalOverlay}>
          <Pressable
            style={modalStyles.modalBackdrop}
            onPress={() => setDetailModalVisible(false)}
          />
          <View style={modalStyles.modalContent}>
            {selectedEntry && (
              <>
                <View style={modalStyles.modalHeader}>
                  <AppText variant="title" style={modalStyles.modalTitle}>
                    {new Date(selectedEntry.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </AppText>
                  <Pressable onPress={() => setDetailModalVisible(false)}>
                    <Ionicons name="close" size={24} color={theme.color.text} />
                  </Pressable>
                </View>
                <ScrollView style={modalStyles.modalScroll} showsVerticalScrollIndicator={false}>
                  <View style={modalStyles.moodBadge}>
                    <View
                      style={[
                        modalStyles.moodBadgeDot,
                        { backgroundColor: MOOD_COLORS[selectedEntry.mood].bg },
                      ]}
                    />
                    <AppText variant="title" style={modalStyles.moodBadgeText}>
                      {selectedEntry.mood}
                    </AppText>
                  </View>

                  {selectedEntry.reason.length > 0 && (
                    <View style={modalStyles.detailSection}>
                      <AppText variant="label" style={modalStyles.detailLabel}>
                        Reasons
                      </AppText>
                      <View style={modalStyles.reasonChips}>
                        {selectedEntry.reason.map((reason, idx) => (
                          <View
                            key={idx}
                            style={modalStyles.reasonChip}
                          >
                            <AppText variant="caption" style={modalStyles.reasonChipText}>
                              {reason}
                            </AppText>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedEntry.customReason && (
                    <View style={modalStyles.detailSection}>
                      <AppText variant="label" style={modalStyles.detailLabel}>
                        Additional Notes
                      </AppText>
                      <AppText variant="body">
                        {selectedEntry.customReason}
                      </AppText>
                    </View>
                  )}

                  {selectedEntry.sermon && (
                    <View style={modalStyles.detailSection}>
                      <AppText variant="label" style={modalStyles.detailLabel}>
                        AI Encouragement
                      </AppText>
                      <AppText
                        variant="body"
                        numberOfLines={3}
                      >
                        {selectedEntry.sermon.interpretation}
                      </AppText>
                      <Pressable
                        style={modalStyles.viewSermonButton}
                        onPress={handleViewSermon}
                      >
                        <AppText style={modalStyles.viewSermonButtonText}>View Encouragement</AppText>
                      </Pressable>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Sermon Modal */}
      {selectedEntry && selectedEntry.sermon && (
        <SermonModal
          visible={sermonModalVisible}
          sermon={selectedEntry.sermon}
          topic={`Mood: ${selectedEntry.mood}`}
          onClose={() => {
            setSermonModalVisible(false);
            setDetailModalVisible(false);
          }}
          onSave={() => {
            setSermonModalVisible(false);
            setDetailModalVisible(false);
          }}
        />
      )}

      {/* Mood Check-in Modal */}
      <MoodModal
        visible={moodModalVisible}
        onClose={() => setMoodModalVisible(false)}
        onComplete={() => {
          setMoodModalVisible(false);
          loadMoodEntries();
        }}
      />
    </Screen>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  screenInner: {
    paddingHorizontal: 0,
  },
  header: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.space.lg,
    paddingBottom: theme.space.xxl,
    gap: theme.space.xl,
  },
  checkinButton: {
    marginBottom: theme.space.xs,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xs,
  },
  monthNavButton: {
    padding: theme.space.sm,
    borderRadius: theme.radius.sm,
  },
  monthNavButtonDisabled: {
    opacity: 0.3,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
  },
  monthSelectorText: {
    color: theme.color.text,
  },
  section: {
    gap: theme.space.md,
  },
  sectionTitle: {
    color: theme.color.text,
  },
  calendarSection: {
    width: '100%',
  },
  calendarCard: {
    padding: theme.space.sm,
    overflow: 'hidden',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.space.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: theme.space.xs,
  },
  statValue: {
    color: theme.color.text,
    fontSize: 28,
  },
  statValueMood: {
    color: theme.color.text,
    fontSize: 20,
  },
  statLabel: {
    color: theme.color.textMuted,
  },
  distributionItem: {
    gap: theme.space.sm,
    marginBottom: theme.space.md,
  },
  distributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  distributionDot: {
    width: 12,
    height: 12,
    borderRadius: theme.radius.pill,
  },
  distributionLabel: {
    flex: 1,
    color: theme.color.text,
  },
  distributionCount: {
    color: theme.color.textMuted,
  },
  distributionBar: {
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.border,
    overflow: 'hidden',
  },
  distributionBarFill: {
    height: '100%',
    borderRadius: theme.radius.pill,
  },
});

const makeModalStyles = (theme: AppTheme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.overlay,
  },
  modalContent: {
    backgroundColor: theme.color.paper,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    maxHeight: '80%',
    paddingTop: theme.space.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.space.xl,
    paddingBottom: theme.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  modalTitle: {
    flex: 1,
    color: theme.color.text,
  },
  modalScroll: {
    padding: theme.space.xl,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    marginBottom: theme.space.xl,
  },
  moodBadgeDot: {
    width: 16,
    height: 16,
    borderRadius: theme.radius.pill,
  },
  moodBadgeText: {
    color: theme.color.text,
    fontSize: 20,
  },
  detailSection: {
    marginBottom: theme.space.xl,
    gap: theme.space.sm,
  },
  detailLabel: {
    color: theme.color.textMuted,
    marginBottom: theme.space.xs,
  },
  reasonChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  reasonChip: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  reasonChipText: {
    color: theme.color.text,
  },
  viewSermonButton: {
    marginTop: theme.space.md,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.accent,
    alignItems: 'center',
  },
  viewSermonButtonText: {
    color: theme.color.accentText,
    fontFamily: theme.font.sansSemibold,
    fontSize: 16,
  },
});
