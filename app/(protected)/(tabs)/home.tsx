import { colors } from "@/utils/colors";
import { useAuthStore } from "@/lib/stores/auth";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function Home() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [topic, setTopic] = useState("");

  const HEADER_HEIGHT = 220;

  const chips = ["Hope", "Faith", "Healing", "Gratitude"]; 

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <LinearGradient
          colors={["#6EE7F9", "#A78BFA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: HEADER_HEIGHT, justifyContent: "center" }}
        >
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text style={styles.heroGreeting}>Hi {user?.name?.split(' ')[0] ?? "there"} 👋</Text>
            <Text style={styles.heroSubtitle}>Let’s prepare something meaningful today</Text>
          </View>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Generate a sermon</Text>
          <View style={styles.searchRow}>
            <TextInput
              placeholder="e.g. Hope in difficult times"
              value={topic}
              onChangeText={setTopic}
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (!topic.trim()) return;
                router.push({ pathname: "/(protected)/(tabs)/sermon", params: { topic } } as any);
              }}
            />
            <Pressable
              style={styles.cta}
              onPress={() => {
                if (!topic.trim()) return;
                router.push({ pathname: "/(protected)/(tabs)/sermon", params: { topic } } as any);
              }}
            >
              <Text style={styles.ctaText}>Generate</Text>
            </Pressable>
          </View>
          <View style={styles.chipsRow}>
            {chips.map((c) => (
              <Pressable key={c} style={styles.chip} onPress={() => setTopic(c)}>
                <Text style={styles.chipText}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick actions</Text>

        {/* <View style={styles.quickActions}>
          <Pressable style={[styles.quickAction, { backgroundColor: colors.primary }]} onPress={() => router.push("/(protected)/(tabs)/coach") }>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Start Coach</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => router.push("/(protected)/summary") }>
            <Text style={{ fontWeight: "700" }}>My Summaries</Text>
          </Pressable>
        </View> */}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroGreeting: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  heroSubtitle: {
    color: "#fff",
    opacity: 0.8,
    textAlign: "center",
  },
  card: {
    marginTop: -24,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
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
    borderColor: "#e6e8eb",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  cta: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
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
    backgroundColor: "#f3f4f6",
  },
  chipText: {
    color: "#374151",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e6e8eb",
  },
});


