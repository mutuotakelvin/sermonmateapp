import ProfileDrawer from "@/components/ProfileDrawer";
import SermonModal from "@/components/SermonModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import MoodModal from "@/components/MoodModal";
import { useToast } from "@/components/ToastProvider";
import { generateSermon } from "@/lib/gemini";
import { getSermons, deleteSermon } from "@/lib/sermonApi";
import { useAuthStore } from "@/lib/stores/auth";
import { useThemeStore } from "@/lib/stores/theme";
import { useMoodStore } from "@/lib/stores/mood";
import type { SavedSermon, Sermon } from "@/lib/types";
import { colors } from "@/utils/colors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";

export default function Home() {
  const { user } = useAuthStore();
  const { theme, initializeTheme } = useThemeStore();
  const { showSuccess, showError } = useToast();
  const { weeklySummary, loadMoodEntries, getWeeklySummary } = useMoodStore();
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [editingSermon, setEditingSermon] = useState<SavedSermon | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedSermons, setSavedSermons] = useState<SavedSermon[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [sermonToDelete, setSermonToDelete] = useState<SavedSermon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);

  const isDark = theme === 'dark';
  const dynamicStyles = getStyles(isDark);

  const chips = ["Hope", "Faith", "Healing", "Gratitude"];

  // Color options matching the modal
  const COLOR_OPTIONS = [
    { id: '1', colors: ['#6EE7F9', '#A78BFA'] as const },
    { id: '2', colors: ['#FCD34D', '#F59E0B'] as const },
    { id: '3', colors: ['#60A5FA', '#3B82F6'] as const },
    { id: '4', colors: ['#86EFAC', '#22C55E'] as const },
    { id: '5', colors: ['#F9A8D4', '#EC4899'] as const },
    { id: '6', colors: ['#A78BFA', '#7C3AED'] as const },
  ] as const;

  useEffect(() => {
    initializeTheme();
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
      // On error, set empty array to avoid breaking the UI
      setSavedSermons([]);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    try {
      const result = await generateSermon(topic.trim());
      setSermon(result);
      setEditingSermon(null);
      setModalVisible(true);
      showSuccess('Sermon generated', 'Your sermon is ready');
    } catch (error) {
      console.error('Error generating sermon:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', {
        message: errorMessage,
        error: error,
      });
      
      // Show more specific error messages
      if (errorMessage.includes('Missing EXPO_PUBLIC_GEMINI_API_KEY')) {
        showError('Configuration Error', 'Gemini API key is missing. Please check your environment variables.');
      } else if (errorMessage.includes('Gemini API error')) {
        showError('API Error', errorMessage);
      } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        showError('Network Error', 'Could not connect to Gemini API. Please check your internet connection.');
      } else {
        showError('Generation failed', errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage);
      }
    } finally {
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
      showSuccess('Sermon deleted', 'The sermon has been deleted permanently');
      setDeleteModalVisible(false);
      setSermonToDelete(null);
      loadSavedSermons();
    } catch (error) {
      console.error('Error deleting sermon:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete sermon';
      showError('Delete failed', errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setSermonToDelete(null);
  };

  const getColorGradient = (colorId: string) => {
    const option = COLOR_OPTIONS.find(c => c.id === colorId);
    return option ? option.colors : COLOR_OPTIONS[0].colors;
  }; 

  return (
    <SafeAreaProvider>
      <SafeAreaView style={dynamicStyles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        
        {/* Fixed Header Section */}
        <View style={dynamicStyles.headerSection}>
          <View style={dynamicStyles.headerRow}>
            <View style={dynamicStyles.headerTextContainer}>
              <Text style={dynamicStyles.heroGreeting}>Hi {user?.name?.split(' ')[0] ?? "there"} 👋</Text>
              <Text style={dynamicStyles.heroSubtitle}>Let's prepare something meaningful today</Text>
            </View>
            <Pressable
              onPress={() => setDrawerVisible(true)}
              style={dynamicStyles.menuButton}
            >
              <Ionicons name="menu" size={24} color={isDark ? "#fff" : "#111827"} />
            </Pressable>
          </View>
        </View>

        {/* Fixed Generate Card */}
        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.cardTitle}>Generate a sermon</Text>
          <View style={dynamicStyles.searchRow}>
            <TextInput
              placeholder="e.g. Hope in difficult times"
              placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
              value={topic}
              onChangeText={setTopic}
              style={dynamicStyles.input}
              returnKeyType="search"
              onSubmitEditing={handleGenerate}
              editable={!loading}
            />
            <Pressable
              style={dynamicStyles.cta}
              onPress={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#fff" />
              )}
            </Pressable>
          </View>
          <View style={dynamicStyles.chipsRow}>
            {/* Mood Chip - Special styling */}
            <Pressable 
              style={dynamicStyles.moodChip}
              onPress={() => setMoodModalVisible(true)}
            >
              <LinearGradient
                colors={['#A78BFA', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={dynamicStyles.moodChipGradient}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={dynamicStyles.moodChipText}>Mood</Text>
              </LinearGradient>
            </Pressable>
            {chips.map((c) => (
              <Pressable 
                key={c} 
                style={[dynamicStyles.chip, topic === c && dynamicStyles.chipSelected]} 
                onPress={() => setTopic(c)}
              >
                <Text style={[dynamicStyles.chipText, topic === c && dynamicStyles.chipTextSelected]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Weekly Mood Summary Section */}
        {weeklySummary && weeklySummary.entries.length > 0 && (
          <View style={dynamicStyles.moodSummaryContainer}>
            <View style={dynamicStyles.moodSummaryHeader}>
              <Text style={dynamicStyles.moodSummaryTitle}>This Week's Mood</Text>
              <Pressable
                onPress={() => router.push('/mood-history')}
                style={dynamicStyles.moreButton}
              >
                <Text style={dynamicStyles.moreButtonText}>More</Text>
                <Ionicons name="chevron-forward" size={16} color={isDark ? "#9ca3af" : "#6b7280"} />
              </Pressable>
            </View>
            <View style={dynamicStyles.weekDaysContainer}>
              {Array.from({ length: 7 }).map((_, index) => {
                const date = new Date(weeklySummary.weekStart);
                date.setDate(date.getDate() + index);
                const dateStr = date.toISOString().split('T')[0];
                const dayEntry = weeklySummary.entries.find(
                  (e) => e.date.split('T')[0] === dateStr
                );
                const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index];
                
                const moodDotStyle = dayEntry 
                  ? (dynamicStyles as any)[`moodDot${dayEntry.mood}`] 
                  : null;
                
                return (
                  <View key={index} style={dynamicStyles.dayContainer}>
                    <Text style={dynamicStyles.dayName}>{dayName}</Text>
                    <View
                      style={[
                        dynamicStyles.moodDot,
                        moodDotStyle,
                      ]}
                    />
                  </View>
                );
              })}
            </View>
            {weeklySummary.mostCommonMood && (
              <Text style={dynamicStyles.moodSummaryText}>
                Most common: {weeklySummary.mostCommonMood}
              </Text>
            )}
          </View>
        )}

        {/* Scrollable Sermons Section */}
        <View style={dynamicStyles.sermonsContainer}>
          <Text style={dynamicStyles.sectionTitle}>My Sermons</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={dynamicStyles.scrollContent}
          >
            {savedSermons.length === 0 ? (
              <View style={dynamicStyles.emptyState}>
                <Text style={dynamicStyles.emptyStateText}>No saved sermons yet</Text>
                <Text style={dynamicStyles.emptyStateSubtext}>Generate and save your first sermon to see it here</Text>
              </View>
            ) : (
              <View style={dynamicStyles.sermonsGrid}>
                {savedSermons.map((savedSermon) => (
                  <Pressable
                    key={savedSermon.id}
                    style={dynamicStyles.sermonCard}
                    onPress={() => handleSermonCardPress(savedSermon)}
                  >
                    <LinearGradient
                      colors={getColorGradient(savedSermon.color)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={dynamicStyles.sermonCardGradient}
                    >
                      <View style={dynamicStyles.deleteButtonContainer} pointerEvents="box-none">
                        <Pressable
                          style={dynamicStyles.deleteButton}
                          onPress={() => handleDeletePress(savedSermon)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#fff" style={{ opacity: 0.9 }} />
                        </Pressable>
                      </View>
                      <Text style={dynamicStyles.sermonCardTitle} numberOfLines={2}>
                        {savedSermon.title}
                      </Text>
                      <Text style={dynamicStyles.sermonCardDescription} numberOfLines={2}>
                        {savedSermon.interpretation.slice(0, 100)}...
                      </Text>
                      <View style={dynamicStyles.sermonCardFooter}>
                        <Text style={dynamicStyles.sermonCardDate}>{savedSermon.date}</Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>

        <SermonModal
          visible={modalVisible}
          sermon={sermon}
          savedSermon={editingSermon}
          topic={topic}
          onClose={handleModalClose}
          onSave={handleSave}
        />
        <ConfirmationModal
          visible={deleteModalVisible}
          title="Delete Sermon?"
          message="This sermon will be deleted permanently. This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          destructive={true}
          loading={deleting}
        />
        <ProfileDrawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
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
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#111827" : "#fff",
    },
    headerSection: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    headerTextContainer: {
      flex: 1,
    },
    menuButton: {
      padding: 8,
      marginTop: -8,
    },
    heroGreeting: {
      color: isDark ? "#fff" : "#111827",
      fontSize: 26,
      fontWeight: "800",
      textAlign: "left",
    },
    heroSubtitle: {
      color: isDark ? "#9ca3af" : "#6B7280",
      fontSize: 14,
      textAlign: "left",
      marginTop: 4,
    },
    card: {
      marginTop: 16,
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 16,
      backgroundColor: isDark ? "#1f2937" : "#F9FAFB",
      gap: 12,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: isDark ? "#fff" : "#111827",
    },
    searchRow: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    input: {
      flex: 1,
      height: 48,
      borderWidth: 1,
      borderColor: isDark ? "#374151" : "#e6e8eb",
      borderRadius: 12,
      paddingHorizontal: 12,
      backgroundColor: isDark ? "#111827" : "#fff",
      color: isDark ? "#fff" : "#111827",
    },
    cta: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    ctaText: {
      color: "#fff",
      fontWeight: "600",
    },
    chipsRow: {
      flexDirection: "row",
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#374151" : "#f3f4f6",
    },
    chipText: {
      color: isDark ? "#d1d5db" : "#374151",
      fontWeight: "500",
    },
    chipSelected: {
      backgroundColor: isDark ? "#4b5563" : "#E5E7EB",
    },
    chipTextSelected: {
      color: isDark ? "#fff" : "#111827",
      fontWeight: "600",
    },
    moodChip: {
      borderRadius: 999,
      overflow: 'hidden',
    },
    moodChipGradient: {
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 999,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    moodChipText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 14,
    },
    sermonsContainer: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: isDark ? "#fff" : "#111827",
    },
    scrollContent: {
      paddingBottom: 24,
    },
    quickActions: {
      paddingHorizontal: 16,
      paddingTop: 16,
      flexDirection: "row",
      gap: 12,
    },
    quickAction: {
      flex: 1,
      height: 56,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1f2937" : "#fff",
      borderWidth: 1,
      borderColor: isDark ? "#374151" : "#e6e8eb",
    },
    emptyState: {
      paddingHorizontal: 16,
      paddingVertical: 32,
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#9ca3af" : "#6B7280",
      marginBottom: 4,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: isDark ? "#6b7280" : "#9CA3AF",
      textAlign: "center",
    },
    sermonsGrid: {
      paddingHorizontal: 16,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    sermonCard: {
      width: "48%",
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    sermonCardGradient: {
      padding: 16,
      minHeight: 160,
      justifyContent: "space-between",
    },
    deleteButtonContainer: {
      position: "absolute",
      top: 12,
      right: 12,
      zIndex: 10,
    },
    deleteButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    sermonCardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: "#fff",
      marginBottom: 8,
      marginTop: 4,
    },
    sermonCardDescription: {
      fontSize: 13,
      color: "#fff",
      opacity: 0.9,
      lineHeight: 18,
      flex: 1,
    },
    sermonCardFooter: {
      marginTop: 12,
      alignItems: "flex-end",
    },
    sermonCardDate: {
      fontSize: 12,
      color: "#fff",
      opacity: 0.8,
    },
    moodSummaryContainer: {
      marginTop: 16,
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 16,
      backgroundColor: isDark ? "#1f2937" : "#F9FAFB",
      gap: 12,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    moodSummaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    moodSummaryTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: isDark ? "#fff" : "#111827",
    },
    moreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    moreButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: isDark ? "#9ca3af" : "#6b7280",
    },
    weekDaysContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 8,
    },
    dayContainer: {
      alignItems: 'center',
      gap: 8,
    },
    dayName: {
      fontSize: 12,
      fontWeight: "500",
      color: isDark ? "#9ca3af" : "#6b7280",
    },
    moodDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? "#374151" : "#e5e7eb",
    },
    moodDotHappy: {
      backgroundColor: '#FCD34D',
    },
    moodDotGrateful: {
      backgroundColor: '#86EFAC',
    },
    moodDotHopeful: {
      backgroundColor: '#60A5FA',
    },
    moodDotPeaceful: {
      backgroundColor: '#6EE7F9',
    },
    moodDotAnxious: {
      backgroundColor: '#FCD34D',
    },
    moodDotSad: {
      backgroundColor: '#93C5FD',
    },
    moodDotOverwhelmed: {
      backgroundColor: '#F9A8D4',
    },
    moodDotAngry: {
      backgroundColor: '#F87171',
    },
    moodSummaryText: {
      fontSize: 14,
      color: isDark ? "#9ca3af" : "#6b7280",
      textAlign: 'center',
      marginTop: 4,
    },
  });


