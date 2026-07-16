import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '@/components/ui/AppText';
import Card from '@/components/ui/Card';
import { getSermons } from '@/lib/sermonApi';
import { theme } from '@/lib/theme';
import type { SavedSermon } from '@/lib/types';

interface ReflectionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (verse: string) => void;
}

export default function ReflectionPickerModal({ visible, onClose, onSelect }: ReflectionPickerModalProps) {
  const [sermons, setSermons] = useState<SavedSermon[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<SavedSermon | null>(null);

  useEffect(() => {
    if (!visible) {
      setExpanded(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getSermons()
      .then((data) => { if (!cancelled) setSermons(data); })
      .catch((error) => { console.error('Error loading reflections:', error); if (!cancelled) setSermons([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible]);

  const handleReflectionPress = (sermon: SavedSermon) => {
    const verses = sermon.verses ?? [];
    if (verses.length <= 1) {
      if (verses[0]) onSelect(verses[0]);
      return;
    }
    setExpanded(sermon);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.iconButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={theme.color.text} />
          </Pressable>
          <AppText variant="title">{expanded ? 'Pick a verse' : 'Pick a reflection'}</AppText>
          <View style={styles.iconButton} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.color.accent} />
          </View>
        ) : expanded ? (
          <ScrollView contentContainerStyle={styles.list}>
            {(expanded.verses ?? []).map((v, i) => (
              <Pressable key={i} onPress={() => onSelect(v)}>
                <Card style={styles.row}>
                  <AppText variant="body" numberOfLines={3}>{v}</AppText>
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        ) : sermons.length === 0 ? (
          <View style={styles.center}>
            <AppText variant="body" style={styles.emptyText}>No reflections yet</AppText>
            <AppText variant="caption" style={styles.emptySub}>Create a reflection first to use it here</AppText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {sermons.map((s) => (
              <Pressable key={s.id} onPress={() => handleReflectionPress(s)}>
                <Card style={styles.row}>
                  <View style={styles.rowText}>
                    <AppText variant="body" numberOfLines={1}>{s.title}</AppText>
                    <AppText variant="caption">{s.date}</AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.color.textMuted} />
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.paper },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md,
    borderBottomWidth: 1, borderBottomColor: theme.color.border,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.xs, padding: theme.space.xl },
  emptyText: { color: theme.color.textMuted },
  emptySub: { textAlign: 'center', color: theme.color.textMuted },
  list: { padding: theme.space.lg, gap: theme.space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  rowText: { flex: 1, gap: 2 },
});
