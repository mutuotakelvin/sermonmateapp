import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { useThemeStore } from '@/lib/stores/theme';
import { useMoodStore } from '@/lib/stores/mood';
import type { MoodEntry, MoodType } from '@/lib/types';
import SermonModal from '@/components/SermonModal';

const MOOD_COLORS: Record<MoodType, string> = {
  Happy: '#FCD34D',
  Grateful: '#86EFAC',
  Hopeful: '#60A5FA',
  Peaceful: '#6EE7F9',
  Anxious: '#FCD34D',
  Sad: '#93C5FD',
  Overwhelmed: '#F9A8D4',
  Angry: '#F87171',
};


export default function MoodHistory() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { moodEntries, loadMoodEntries } = useMoodStore();
  const [selectedEntry, setSelectedEntry] = useState<MoodEntry | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [sermonModalVisible, setSermonModalVisible] = useState(false);
  
  // Month navigation
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const isDark = theme === 'dark';
  const dynamicStyles = getStyles(isDark);

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
            dotColor: MOOD_COLORS[entry.mood],
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

  // Calendar theme configuration
  const calendarTheme = useMemo(() => ({
    backgroundColor: isDark ? '#1f2937' : '#f9fafb',
    calendarBackground: isDark ? '#1f2937' : '#f9fafb',
    textSectionTitleColor: isDark ? '#9ca3af' : '#6b7280',
    selectedDayBackgroundColor: '#007AFF',
    selectedDayTextColor: '#fff',
    todayTextColor: '#007AFF',
    dayTextColor: isDark ? '#fff' : '#111827',
    textDisabledColor: isDark ? '#6b7280' : '#9ca3af',
    dotColor: '#007AFF',
    selectedDotColor: '#fff',
    arrowColor: isDark ? '#fff' : '#111827',
    monthTextColor: isDark ? '#fff' : '#111827',
    textDayFontWeight: '500' as const,
    textMonthFontWeight: '600' as const,
    textDayHeaderFontWeight: '600' as const,
    textDayFontSize: 15,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14,
    'stylesheet.calendar.header': {
      week: {
        marginTop: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
      },
    },
    'stylesheet.day.basic': {
      today: {
        backgroundColor: isDark ? '#1e3a5f' : '#eff6ff',
        borderWidth: 2.5,
        borderColor: '#007AFF',
      },
      todayText: {
        color: '#007AFF',
        fontWeight: '700',
      },
    },
  }), [isDark]);

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={dynamicStyles.header}>
        <Pressable onPress={() => router.back()} style={dynamicStyles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? "#fff" : "#111827"} />
        </Pressable>
        <Text style={dynamicStyles.headerTitle}>Mood Calendar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={dynamicStyles.scrollView}
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Navigation */}
        <View style={dynamicStyles.monthNavigation}>
          <Pressable
            onPress={handlePreviousMonth}
            style={dynamicStyles.monthNavButton}
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? "#fff" : "#111827"} />
          </Pressable>
          <Pressable style={dynamicStyles.monthSelector}>
            <Ionicons name="calendar-outline" size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
            <Text style={dynamicStyles.monthSelectorText}>
              {monthName} {currentYear}
            </Text>
            <Ionicons name="chevron-down" size={16} color={isDark ? "#9ca3af" : "#6b7280"} />
          </Pressable>
          <Pressable
            onPress={handleNextMonth}
            style={[dynamicStyles.monthNavButton, !canGoNext && dynamicStyles.monthNavButtonDisabled]}
            disabled={!canGoNext}
          >
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={!canGoNext ? (isDark ? "#4b5563" : "#9ca3af") : (isDark ? "#fff" : "#111827")} 
            />
          </Pressable>
        </View>

        {/* Calendar */}
        <View style={dynamicStyles.calendarSection}>
          <View style={dynamicStyles.calendarContainer}>
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
                    ? (isDark ? '#4b5563' : '#9ca3af')
                    : (isDark ? '#fff' : '#111827')}
                />
              )}
            />
          </View>
        </View>

        {/* Statistics Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Statistics</Text>
          <View style={dynamicStyles.statsContainer}>
            <View style={dynamicStyles.statCard}>
              <Text style={dynamicStyles.statValue}>{totalEntries}</Text>
              <Text style={dynamicStyles.statLabel}>Total Entries</Text>
            </View>
            <View style={dynamicStyles.statCard}>
              <Text style={dynamicStyles.statValue}>{mostCommonMood}</Text>
              <Text style={dynamicStyles.statLabel}>Most Common</Text>
            </View>
          </View>
        </View>

        {/* Mood Distribution */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Mood Distribution</Text>
          <View style={dynamicStyles.distributionContainer}>
            {Object.entries(moodCounts).map(([mood, count]) => {
              if (count === 0) return null;
              const percentage = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
              return (
                <View key={mood} style={dynamicStyles.distributionItem}>
                  <View style={dynamicStyles.distributionHeader}>
                    <View
                      style={[
                        dynamicStyles.distributionDot,
                        { backgroundColor: MOOD_COLORS[mood as MoodType] },
                      ]}
                    />
                    <Text style={dynamicStyles.distributionLabel}>{mood}</Text>
                    <Text style={dynamicStyles.distributionCount}>{count}</Text>
                  </View>
                  <View style={dynamicStyles.distributionBar}>
                    <View
                      style={[
                        dynamicStyles.distributionBarFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: MOOD_COLORS[mood as MoodType],
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setDetailModalVisible(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1f2937' : '#fff' }]}>
            {selectedEntry && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#111827' }]}>
                    {new Date(selectedEntry.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  <Pressable onPress={() => setDetailModalVisible(false)}>
                    <Ionicons name="close" size={24} color={isDark ? '#fff' : '#111827'} />
                  </Pressable>
                </View>
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <View style={styles.moodBadge}>
                    <View
                      style={[
                        styles.moodBadgeDot,
                        { backgroundColor: MOOD_COLORS[selectedEntry.mood] },
                      ]}
                    />
                    <Text style={[styles.moodBadgeText, { color: isDark ? '#fff' : '#111827' }]}>
                      {selectedEntry.mood}
                    </Text>
                  </View>
                  
                  {selectedEntry.reason.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                        Reasons
                      </Text>
                      <View style={styles.reasonChips}>
                        {selectedEntry.reason.map((reason, idx) => (
                          <View
                            key={idx}
                            style={[styles.reasonChip, { backgroundColor: isDark ? '#374151' : '#f3f4f6' }]}
                          >
                            <Text style={[styles.reasonChipText, { color: isDark ? '#fff' : '#374151' }]}>
                              {reason}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  
                  {selectedEntry.customReason && (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                        Additional Notes
                      </Text>
                      <Text style={[styles.detailText, { color: isDark ? '#fff' : '#111827' }]}>
                        {selectedEntry.customReason}
                      </Text>
                    </View>
                  )}
                  
                  {selectedEntry.sermon && (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                        AI Encouragement
                      </Text>
                      <Text
                        style={[styles.detailText, { color: isDark ? '#fff' : '#111827' }]}
                        numberOfLines={3}
                      >
                        {selectedEntry.sermon.interpretation}
                      </Text>
                      <Pressable
                        style={[styles.viewSermonButton, { backgroundColor: '#007AFF' }]}
                        onPress={handleViewSermon}
                      >
                        <Text style={styles.viewSermonButtonText}>View Full Sermon</Text>
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
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#111827' : '#fff',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#fff' : '#111827',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    monthNavigation: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
      paddingHorizontal: 4,
    },
    monthNavButton: {
      padding: 8,
      borderRadius: 8,
    },
    monthNavButtonDisabled: {
      opacity: 0.3,
    },
    monthSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    monthSelectorText: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#fff' : '#111827',
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#fff' : '#111827',
      marginBottom: 16,
    },
    calendarSection: {
      width: '100%',
      marginBottom: 32,
    },
    calendarContainer: {
      backgroundColor: isDark ? '#1f2937' : '#f9fafb',
      borderRadius: 12,
      padding: 8,
      width: '100%',
      overflow: 'hidden',
    },
    statsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      backgroundColor: isDark ? '#1f2937' : '#f9fafb',
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#fff' : '#111827',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    distributionContainer: {
      gap: 12,
    },
    distributionItem: {
      gap: 8,
    },
    distributionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    distributionDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    distributionLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#fff' : '#111827',
    },
    distributionCount: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    distributionBar: {
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? '#374151' : '#e5e7eb',
      overflow: 'hidden',
    },
    distributionBarFill: {
      height: '100%',
      borderRadius: 4,
    },
  });

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  modalScroll: {
    padding: 20,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  moodBadgeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  moodBadgeText: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 15,
    lineHeight: 22,
  },
  reasonChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reasonChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewSermonButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewSermonButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
