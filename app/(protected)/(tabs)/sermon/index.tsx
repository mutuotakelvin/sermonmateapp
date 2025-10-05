import { generateSermon } from "@/lib/gemini";
import type { Sermon } from "@/lib/types";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function SermonScreen() {
  const { topic: initialTopic } = useLocalSearchParams<{ topic?: string }>();
  const [topic, setTopic] = useState(initialTopic ? String(initialTopic) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sermon, setSermon] = useState<Sermon | null>(null);

  async function runGenerate(subject: string) {
    const trimmed = subject.trim();
    if (!trimmed) {
      setError("Please enter a topic.");
      return;
    }
    setError(null);
    setLoading(true);
    setSermon(null);
    try {
      const result = await generateSermon(trimmed);
      setSermon(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialTopic) {
      void runGenerate(String(initialTopic));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTopic]);

  return (
    <ScrollView contentContainerStyle={styles.container} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.card}>
        <Text style={styles.title}>AI Bible Sermon Generator</Text>
        <Text style={styles.subtitle}>Find biblical wisdom for any topic or feeling.</Text>

        <View style={styles.formRow}>
          <TextInput
            placeholder="Enter a topic (e.g. anxiety, forgiveness, gratitude)"
            value={topic}
            onChangeText={setTopic}
            style={styles.input}
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => { if (!loading) { void runGenerate(topic); } }}
          />
          <Pressable
            onPress={() => void runGenerate(topic)}
            disabled={loading}
            style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonDisabled]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generate</Text>}
          </Pressable>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {sermon && (
        <View style={styles.resultCard}>
          <Text style={styles.sectionTitle}>Verses</Text>
          <View style={{ gap: 8 }}>
            {sermon.verses.map((v, i) => (
              <Text key={`${i}-${v.slice(0,12)}`} style={styles.verse}>
                {v}
              </Text>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Sermon</Text>
          <Text style={styles.text}>{sermon.interpretation}</Text>

          <Text style={styles.sectionTitle}>Story</Text>
          <Text style={styles.text}>{sermon.story}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#00000020",
    backgroundColor: "#ffffffA0",
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    textAlign: "center",
    color: "#6b7280",
  },
  formRow: {
    marginTop: 12,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#00000020",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  button: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    paddingVertical: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 14,
  },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#00000020",
    backgroundColor: "#ffffffA0",
    padding: 16,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  verse: {
    fontSize: 15,
    color: "#111827",
  },
  text: {
    fontSize: 15,
    color: "#111827",
  },
});




