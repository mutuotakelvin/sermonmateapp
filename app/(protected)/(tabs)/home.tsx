import SermonModal from "@/components/SermonModal";
import MoodModal from "@/components/MoodModal";
import VerseOfDayCard from "@/components/VerseOfDayCard";
import ReflectionCard from "@/components/ReflectionCard";
import { useToast } from "@/components/ToastProvider";
import Screen from "@/components/ui/Screen";
import Card from "@/components/ui/Card";
import AppText from "@/components/ui/AppText";
import Chip from "@/components/ui/Chip";
import { generateSermon, AiLimitError } from "@/lib/sermonAi";
import { presentPaywall, syncEntitlement } from "@/lib/purchases";
import { usePurchasesStore } from "@/lib/stores/purchases";
import { getSermons } from "@/lib/sermonApi";
import { useAuthStore } from "@/lib/stores/auth";
import { useMoodStore } from "@/lib/stores/mood";
import { useTheme, type AppTheme } from "@/lib/theme";
import type { SavedSermon, Sermon } from "@/lib/types";
import { localDateKey } from "@/lib/localDate";
import PrayerTimesCard from "@/components/PrayerTimesCard";
import { usePrayerStore } from "@/lib/stores/prayer";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

// Most-recent reflections shown on home before the "View all" link appears.
const HOME_REFLECTION_CAP = 6;

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { user } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const { weeklySummary, loadMoodEntries, getWeeklySummary } = useMoodStore();
  const loadPrayer = usePrayerStore((state) => state.load);
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [editingSermon, setEditingSermon] = useState<SavedSermon | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savedSermons, setSavedSermons] = useState<SavedSermon[]>([]);
  const [moodModalVisible, setMoodModalVisible] = useState(false);

  const chips = ["Hope", "Faith", "Healing", "Gratitude"];
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  useEffect(() => {
    loadMoodEntries();
    getWeeklySummary();
    loadPrayer();
  }, []);

  // Reload reflections whenever home regains focus, so a delete performed on the
  // full "View all" page is reflected when the user navigates back here.
  useFocusEffect(
    useCallback(() => {
      loadSavedSermons();
    }, [])
  );

  const loadSavedSermons = async () => {
    try {
      const sermons = await getSermons();
      setSavedSermons(sermons);
    } catch (error) {
      console.error('Error loading sermons:', error);
      setSavedSermons([]);
    }
  };

  const handleGenerate = () => runGenerate(false);

  const runGenerate = async (isRetry: boolean) => {
    if (!topic.trim()) return;
    setSermon(null);
    setEditingSermon(null);
    setGenerating(true);
    setLoading(true);
    setModalVisible(true); // open the reading view immediately in its loading state
    try {
      const result = await generateSermon(topic.trim());
      setSermon(result);
      showSuccess('Reflection ready', 'Your reflection is ready to read');
    } catch (error) {
      setModalVisible(false);
      if (error instanceof AiLimitError) {
        if (error.kind === 'free' && !isRetry) {
          const bought = await presentPaywall();
          if (bought) {
            try { await syncEntitlement(); } catch { /* webhook will backstop */ }
            await usePurchasesStore.getState().refresh();
            await runGenerate(true);
            return;
          }
        } else if (error.kind === 'pro') {
          showError('Daily limit reached', "You've hit today's high usage limit. Try again tomorrow.");
        }
        return;
      }
      console.error('Error generating sermon:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        showError('Network Error', 'Could not reach the reflection service. Please check your internet connection.');
      } else {
        showError('Generation failed', errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage);
      }
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleSermonCardPress = (savedSermon: SavedSermon) => {
    setEditingSermon(savedSermon);
    setSermon(null);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSermon(null);
    setEditingSermon(null);
    setGenerating(false);
    setLoading(false);
  };

  const handleSave = () => {
    loadSavedSermons();
  };

  return (
    <Screen style={styles.screenInner}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting */}
        <View style={styles.headerSection}>
          <AppText variant="display">
            {getTimeGreeting()}, {firstName}
          </AppText>
          <AppText variant="caption" style={styles.subtitle}>
            A quiet moment with God, one day at a time
          </AppText>
        </View>

        {/* Verse of the Day */}
        <VerseOfDayCard />

        {/* Daily mood check-in prompt */}
        <Pressable onPress={() => setMoodModalVisible(true)}>
          <Card style={styles.moodPromptCard}>
            <View style={styles.moodPromptContent}>
              <View style={styles.moodPromptIconWrap}>
                <Ionicons name="heart-outline" size={22} color={theme.color.accent} />
              </View>
              <View style={styles.moodPromptText}>
                <AppText variant="title" style={styles.moodPromptTitle}>How are you feeling today?</AppText>
                <AppText variant="caption" style={styles.moodPromptSubtitle}>A quick check-in — takes a few seconds.</AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.color.textMuted} />
            </View>
          </Card>
        </Pressable>

        {/* Daily Reflection Card */}
        <Card style={styles.generateCard}>
          <View style={styles.cardTitleGroup}>
            <AppText variant="title" style={styles.cardTitle}>Daily Reflection</AppText>
            <AppText variant="caption" style={styles.cardSubtitle}>Reflect on Scripture around whatever's on your heart.</AppText>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              placeholder="e.g. Hope in difficult times"
              placeholderTextColor={theme.color.textMuted}
              value={topic}
              onChangeText={setTopic}
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={handleGenerate}
              editable={!loading}
            />
            <Pressable
              style={styles.sendButton}
              onPress={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.color.accentText} />
              ) : (
                <Ionicons name="arrow-up" size={20} color={theme.color.accentText} />
              )}
            </Pressable>
          </View>
          <View style={styles.chipsRow}>
            {chips.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={topic === c}
                onPress={() => setTopic(c)}
              />
            ))}
          </View>
        </Card>

        <PrayerTimesCard onPress={() => router.push('/prayer')} />

        {/* This Week's Mood Card */}
        {weeklySummary && weeklySummary.entries.length > 0 && (
          <Card style={styles.moodCard}>
            <View style={styles.moodCardHeader}>
              <AppText variant="title">This Week's Mood</AppText>
              <Pressable
                onPress={() => router.push('/(protected)/(tabs)/mood' as never)}
                style={styles.moreButton}
              >
                <AppText style={styles.moreButtonText}>More</AppText>
                <Ionicons name="chevron-forward" size={16} color={theme.color.accent} />
              </Pressable>
            </View>
            <View style={styles.weekDaysContainer}>
              {Array.from({ length: 7 }).map((_, index) => {
                const date = new Date(weeklySummary.weekStart);
                date.setDate(date.getDate() + index);
                // Local keys on BOTH sides. toISOString() converts to UTC first,
                // which east of Greenwich shifts local midnight back a day and
                // filed every check-in under the following weekday.
                const dateStr = localDateKey(date);
                const dayEntry = weeklySummary.entries.find(
                  (e) => localDateKey(new Date(e.date)) === dateStr
                );
                const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index];
                // The saturated mood tokens read on both paper and near-black.
                const dotColor = dayEntry
                  ? (theme.moodColor[dayEntry.mood]?.bg ?? theme.color.accent)
                  : theme.color.border;

                return (
                  <View key={index} style={styles.dayContainer}>
                    <AppText variant="caption" style={styles.dayName}>{dayName}</AppText>
                    <View style={[styles.moodDot, { backgroundColor: dotColor }]} />
                  </View>
                );
              })}
            </View>
            {weeklySummary.mostCommonMood && (
              <AppText variant="caption" style={styles.moodSummaryText}>
                Most common: {weeklySummary.mostCommonMood}
              </AppText>
            )}
          </Card>
        )}

        {/* My Reflections */}
        <View style={styles.sermonsSection}>
          <View style={styles.sermonsHeader}>
            <AppText variant="title" style={styles.sectionTitle}>My Reflections</AppText>
            {savedSermons.length > HOME_REFLECTION_CAP && (
              <Pressable
                onPress={() => router.push('/(protected)/reflections' as never)}
                style={styles.viewAllButton}
              >
                <AppText style={styles.viewAllText}>View all</AppText>
                <Ionicons name="chevron-forward" size={16} color={theme.color.accent} />
              </Pressable>
            )}
          </View>
          {savedSermons.length === 0 ? (
            <View style={styles.emptyState}>
              <AppText variant="body" style={styles.emptyStateText}>No reflections yet</AppText>
              <AppText variant="caption" style={styles.emptyStateSubtext}>
                Save your first reflection to see it here
              </AppText>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sermonsStrip}
            >
              {savedSermons.slice(0, HOME_REFLECTION_CAP).map((savedSermon) => (
                <ReflectionCard
                  key={savedSermon.id}
                  sermon={savedSermon}
                  variant="strip"
                  onPress={handleSermonCardPress}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Create a card */}
        <Pressable
          onPress={() => router.push('/(protected)/card' as never)}
          style={styles.wallpaperRow}
        >
          <Card style={styles.wallpaperCard}>
            <View style={styles.wallpaperContent}>
              <View style={styles.wallpaperIconWrap}>
                <Ionicons name="image-outline" size={22} color={theme.color.accent} />
              </View>
              <View style={styles.wallpaperText}>
                <AppText variant="body" style={styles.wallpaperLabel}>Create a card</AppText>
                <AppText variant="caption" style={styles.wallpaperSub}>Share a verse or save it as a wallpaper</AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.color.textMuted} />
            </View>
          </Card>
        </Pressable>

        {/* Wallpapers */}
        <Pressable
          onPress={() => router.push('/(protected)/wallpapers' as never)}
          style={styles.wallpaperRow}
        >
          <Card style={styles.wallpaperCard}>
            <View style={styles.wallpaperContent}>
              <View style={styles.wallpaperIconWrap}>
                <Ionicons name="color-palette-outline" size={22} color={theme.color.accent} />
              </View>
              <View style={styles.wallpaperText}>
                <AppText variant="body" style={styles.wallpaperLabel}>Wallpapers</AppText>
                <AppText variant="caption" style={styles.wallpaperSub}>Make a wallpaper from a verse or reflection</AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.color.textMuted} />
            </View>
          </Card>
        </Pressable>
      </ScrollView>

      <SermonModal
        visible={modalVisible}
        sermon={sermon}
        savedSermon={editingSermon}
        topic={topic}
        onClose={handleModalClose}
        onSave={handleSave}
        loading={generating}
      />
      <MoodModal
        visible={moodModalVisible}
        onClose={() => {
          setMoodModalVisible(false);
          getWeeklySummary();
        }}
        onComplete={() => {
          getWeeklySummary();
        }}
      />
    </Screen>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  screenInner: {
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.xxl,
  },
  headerSection: {
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.md,
    gap: theme.space.xs,
  },
  subtitle: {
    marginTop: theme.space.xs,
  },
  generateCard: {
    marginTop: theme.space.lg,
    gap: theme.space.md,
  },
  cardTitleGroup: {
    gap: 2,
  },
  cardTitle: {
    // inherits AppText variant="title"
  },
  cardSubtitle: {
    color: theme.color.textMuted,
  },
  moodPromptCard: {
    marginTop: theme.space.lg,
  },
  moodPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  moodPromptIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodPromptText: {
    flex: 1,
    gap: 2,
  },
  moodPromptTitle: {
    // inherits AppText variant="title"
  },
  moodPromptSubtitle: {
    color: theme.color.textMuted,
  },
  searchRow: {
    flexDirection: 'row',
    gap: theme.space.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md,
    backgroundColor: theme.color.paper,
    color: theme.color.text,
    fontFamily: theme.font.sans,
    fontSize: 15,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.accent,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: theme.space.sm,
    flexWrap: 'wrap',
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xs,
    paddingHorizontal: theme.space.lg,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
  },
  moodChipText: {
    color: theme.color.accentText,
    fontFamily: theme.font.sansMedium,
    fontSize: 14,
  },
  moodCard: {
    marginTop: theme.space.lg,
    gap: theme.space.md,
  },
  moodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
  },
  moreButtonText: {
    fontSize: 14,
    fontFamily: theme.font.sansMedium,
    color: theme.color.accent,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: theme.space.sm,
  },
  dayContainer: {
    alignItems: 'center',
    gap: theme.space.sm,
  },
  dayName: {
    // caption variant via AppText
  },
  moodDot: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
  },
  moodSummaryText: {
    textAlign: 'center',
  },
  sermonsSection: {
    marginTop: theme.space.lg,
  },
  sermonsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.space.md,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: theme.font.sansMedium,
    color: theme.color.accent,
  },
  sermonsStrip: {
    flexDirection: 'row',
    gap: theme.space.md,
    paddingRight: theme.space.lg,
  },
  sectionTitle: {
    // spacing handled by sermonsHeader row
  },
  emptyState: {
    paddingVertical: theme.space.xxl,
    alignItems: 'center',
  },
  emptyStateText: {
    color: theme.color.textMuted,
    marginBottom: theme.space.xs,
  },
  emptyStateSubtext: {
    textAlign: 'center',
    color: theme.color.textMuted,
  },
  wallpaperRow: {
    marginTop: theme.space.lg,
  },
  wallpaperCard: {
    // no tone — uses surface default
  },
  wallpaperContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  wallpaperIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallpaperLabel: {
    color: theme.color.text,
  },
  wallpaperText: {
    flex: 1,
    gap: 2,
  },
  wallpaperSub: {
    color: theme.color.textMuted,
  },
});
