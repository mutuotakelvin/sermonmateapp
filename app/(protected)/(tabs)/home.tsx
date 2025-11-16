import ProfileDrawer from "@/components/ProfileDrawer";
import SermonModal from "@/components/SermonModal";
import { generateSermon } from "@/lib/gemini";
import { getSermons } from "@/lib/sermonApi";
import { useAuthStore } from "@/lib/stores/auth";
import { useThemeStore } from "@/lib/stores/theme";
import type { SavedSermon, Sermon } from "@/lib/types";
import { colors } from "@/utils/colors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function Home() {
  const { user } = useAuthStore();
  const { theme, initializeTheme } = useThemeStore();
  const [topic, setTopic] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [editingSermon, setEditingSermon] = useState<SavedSermon | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedSermons, setSavedSermons] = useState<SavedSermon[]>([]);

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
    } catch (error) {
      console.error('Error generating sermon:', error);
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
        <ProfileDrawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
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
    sermonCardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: "#fff",
      marginBottom: 8,
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
  });


