import SermonModal from "@/components/SermonModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import MoodModal from "@/components/MoodModal";
import VerseOfDayCard from "@/components/VerseOfDayCard";
import { useToast } from "@/components/ToastProvider";
import Screen from "@/components/ui/Screen";
import Card from "@/components/ui/Card";
import AppText from "@/components/ui/AppText";
import Chip from "@/components/ui/Chip";
import { generateSermon, AiLimitError } from "@/lib/sermonAi";
import { presentPaywall, syncEntitlement } from "@/lib/purchases";
import { usePurchasesStore } from "@/lib/stores/purchases";
import { getSermons, deleteSermon } from "@/lib/sermonApi";
import { useAuthStore } from "@/lib/stores/auth";
import { useMoodStore } from "@/lib/stores/mood";
import { theme } from "@/lib/theme";
import type { SavedSermon, Sermon } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

// Muted tone map: color id → Card tone (matches theme.color keys)
const COLOR_TONE_MAP: Record<string, keyof typeof theme.color> = {
  '1': 'sage',
  '2': 'sand',
  '3': 'dustyBlue',
  '4': 'olive',
  '5': 'blush',
  '6': 'rust',
};

// Muted mood dot colors from theme palette
const MOOD_DOT_COLORS: Record<string, string> = {
  Happy: theme.color.sand,
  Grateful: theme.color.sage,
  Hopeful: theme.color.dustyBlue,
  Peaceful: theme.color.blush,
  Anxious: theme.color.olive,
  Sad: theme.color.deepBlue,
  Overwhelmed: theme.color.rust,
  Angry: theme.color.rust,
};

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { user } = useAuthStore();
  const { showSuccess, showError } = useToast();
  const { weeklySummary, loadMoodEntries, getWeeklySummary } = useMoodStore();
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [editingSermon, setEditingSermon] = useState<SavedSermon | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savedSermons, setSavedSermons] = useState<SavedSermon[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [sermonToDelete, setSermonToDelete] = useState<SavedSermon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);

  const chips = ["Hope", "Faith", "Healing", "Gratitude"];
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  useEffect(() => {
    loadSavedSermons();
    loadMoodEntries();
    getWeeklySummary();
  }, []);

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

  const handleDeletePress = (savedSermon: SavedSermon) => {
    setSermonToDelete(savedSermon);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!sermonToDelete) return;

    setDeleting(true);
    try {
      await deleteSermon(sermonToDelete.id);
      showSuccess('Reflection removed', 'The reflection has been deleted');
      setDeleteModalVisible(false);
      setSermonToDelete(null);
      loadSavedSermons();
    } catch (error) {
      console.error('Error deleting sermon:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete reflection';
      showError('Delete failed', errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setSermonToDelete(null);
  };

  const getSermonTone = (colorId: string): keyof typeof theme.color => {
    return COLOR_TONE_MAP[colorId] ?? 'sage';
  };

  return (
    <Screen style={styles.screenInner}>
      <StatusBar barStyle="dark-content" />
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
                const dateStr = date.toISOString().split('T')[0];
                const dayEntry = weeklySummary.entries.find(
                  (e) => e.date.split('T')[0] === dateStr
                );
                const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index];
                const dotColor = dayEntry
                  ? (MOOD_DOT_COLORS[dayEntry.mood] ?? theme.color.sand)
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

        {/* My Sermons */}
        <View style={styles.sermonsSection}>
          <AppText variant="title" style={styles.sectionTitle}>My Reflections</AppText>
          {savedSermons.length === 0 ? (
            <View style={styles.emptyState}>
              <AppText variant="body" style={styles.emptyStateText}>No reflections yet</AppText>
              <AppText variant="caption" style={styles.emptyStateSubtext}>
                Save your first reflection to see it here
              </AppText>
            </View>
          ) : (
            <View style={styles.sermonsGrid}>
              {savedSermons.map((savedSermon) => (
                <Pressable
                  key={savedSermon.id}
                  style={styles.sermonCardWrapper}
                  onPress={() => handleSermonCardPress(savedSermon)}
                >
                  <Card tone={getSermonTone(savedSermon.color)} style={styles.sermonCard}>
                    <View style={styles.deleteButtonContainer} pointerEvents="box-none">
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => handleDeletePress(savedSermon)}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.color.text} style={{ opacity: 0.7 }} />
                      </Pressable>
                    </View>
                    <AppText
                      style={styles.sermonCardTitle}
                      numberOfLines={2}
                    >
                      {savedSermon.title}
                    </AppText>
                    <AppText variant="body" style={styles.sermonCardDescription} numberOfLines={2}>
                      {savedSermon.interpretation.slice(0, 100)}...
                    </AppText>
                    <View style={styles.sermonCardFooter}>
                      <AppText variant="caption">{savedSermon.date}</AppText>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
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
      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete reflection?"
        message="This reflection will be deleted permanently. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        destructive={true}
        loading={deleting}
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

const styles = StyleSheet.create({
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
  sectionTitle: {
    marginBottom: theme.space.md,
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
  sermonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.md,
  },
  sermonCardWrapper: {
    width: '48%',
  },
  sermonCard: {
    minHeight: 160,
    justifyContent: 'space-between',
  },
  deleteButtonContainer: {
    position: 'absolute',
    top: theme.space.md,
    right: theme.space.md,
    zIndex: 10,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sermonCardTitle: {
    fontFamily: theme.font.serif,
    fontSize: 16,
    lineHeight: 22,
    color: theme.color.text,
    marginBottom: theme.space.sm,
    marginTop: theme.space.xs,
  },
  sermonCardDescription: {
    color: theme.color.text,
    opacity: 0.8,
    flex: 1,
  },
  sermonCardFooter: {
    marginTop: theme.space.md,
    alignItems: 'flex-end',
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
