import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '@/components/ui/AppText';
import Card from '@/components/ui/Card';
import Loader from '@/components/ui/Loader';
import { splitVerseString, type CardContent } from '@/lib/cards';
import { getSermons } from '@/lib/sermonApi';
import { useTheme, type AppTheme } from '@/lib/theme';
import type { SavedSermon } from '@/lib/types';

interface ReflectionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (content: CardContent) => void;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** One selectable piece of a reflection: a verse, the message, the story or the prayer. */
interface PickerSection {
  key: string;
  label: string;
  icon: IoniconName;
  preview: string;
  content: CardContent;
}

/**
 * Everything in a reflection that can become a card or wallpaper — the verses,
 * plus the message (the preaching), and the story and prayer when they exist.
 */
function sectionsFor(sermon: SavedSermon): PickerSection[] {
  const sections: PickerSection[] = [];

  (sermon.verses ?? []).forEach((verse, i) => {
    if (!verse?.trim()) return;
    sections.push({
      key: `verse-${i}`,
      label: 'Scripture',
      icon: 'book-outline',
      preview: verse,
      content: splitVerseString(verse),
    });
  });

  if (sermon.interpretation?.trim()) {
    sections.push({
      key: 'message',
      label: 'The Message',
      icon: 'chatbubble-ellipses-outline',
      preview: sermon.interpretation,
      content: { text: sermon.interpretation.trim(), reference: sermon.title },
    });
  }

  if (sermon.story?.trim()) {
    sections.push({
      key: 'story',
      label: 'A Story',
      icon: 'sparkles-outline',
      preview: sermon.story,
      content: { text: sermon.story.trim(), reference: sermon.title },
    });
  }

  if (sermon.prayer?.trim()) {
    sections.push({
      key: 'prayer',
      label: 'A Prayer',
      icon: 'heart-outline',
      preview: sermon.prayer,
      content: { text: sermon.prayer.trim(), reference: sermon.title },
    });
  }

  return sections;
}

export default function ReflectionPickerModal({ visible, onClose, onSelect }: ReflectionPickerModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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

  const expandedSections = expanded ? sectionsFor(expanded) : [];

  const handleReflectionPress = (sermon: SavedSermon) => {
    const sections = sectionsFor(sermon);
    if (sections.length === 0) return;
    if (sections.length === 1) {
      onSelect(sections[0].content);
      return;
    }
    setExpanded(sermon);
  };

  const handleBack = () => {
    if (expanded) setExpanded(null);
    else onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleBack} presentationStyle="fullScreen">
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.iconButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={theme.color.text} />
          </Pressable>
          <AppText variant="title" numberOfLines={1} style={styles.headerTitle}>
            {expanded ? 'Pick what to use' : 'Pick a reflection'}
          </AppText>
          <View style={styles.iconButton} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <Loader messages={['Gathering your reflections…']} icon="albums-outline" size={110} />
          </View>
        ) : expanded ? (
          <ScrollView contentContainerStyle={styles.list}>
            <AppText variant="caption" style={styles.expandedTitle}>{expanded.title}</AppText>
            {expandedSections.map((section) => (
              <Pressable key={section.key} onPress={() => onSelect(section.content)}>
                <Card style={styles.sectionRow}>
                  <View style={styles.sectionIcon}>
                    <Ionicons name={section.icon} size={18} color={theme.color.accent} />
                  </View>
                  <View style={styles.rowText}>
                    <AppText variant="label">{section.label}</AppText>
                    <AppText variant="body" numberOfLines={3}>{section.preview}</AppText>
                  </View>
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
            {sermons.map((s) => {
              const count = sectionsFor(s).length;
              return (
                <Pressable key={s.id} onPress={() => handleReflectionPress(s)}>
                  <Card style={styles.row}>
                    <View style={styles.rowText}>
                      <AppText variant="body" numberOfLines={1}>{s.title}</AppText>
                      <AppText variant="caption">
                        {s.date} · {count} {count === 1 ? 'option' : 'options'}
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.color.textMuted} />
                  </Card>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.paper },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md,
    borderBottomWidth: 1, borderBottomColor: theme.color.border,
  },
  headerTitle: { flex: 1, textAlign: 'center' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.xs, padding: theme.space.xl },
  emptyText: { color: theme.color.textMuted },
  emptySub: { textAlign: 'center', color: theme.color.textMuted },
  list: { padding: theme.space.lg, gap: theme.space.md },
  expandedTitle: { marginBottom: theme.space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.md },
  sectionIcon: {
    width: 34, height: 34, borderRadius: theme.radius.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.color.surfaceAlt,
  },
  rowText: { flex: 1, gap: 2 },
});
