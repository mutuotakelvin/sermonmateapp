import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/ToastProvider';
import AppText from '@/components/ui/AppText';
import Card from '@/components/ui/Card';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { saveSermon as saveSermonApi, updateSermon } from '@/lib/sermonApi';
import { theme } from '@/lib/theme';
import type { SavedSermon, Sermon } from '@/lib/types';

interface SermonModalProps {
  visible: boolean;
  sermon: Sermon | null;
  savedSermon?: SavedSermon | null;
  topic: string;
  onClose: () => void;
  onSave: () => void;
  loading?: boolean;
}

// ids match Home card color ids: 1→sage, 2→sand, 3→dustyBlue, 4→olive, 5→blush, 6→rust
const COLOR_OPTIONS = [
  { id: '1', color: theme.color.sage },
  { id: '2', color: theme.color.sand },
  { id: '3', color: theme.color.dustyBlue },
  { id: '4', color: theme.color.olive },
  { id: '5', color: theme.color.blush },
  { id: '6', color: theme.color.rust },
];

export default function SermonModal({
  visible,
  sermon,
  savedSermon,
  topic,
  onClose,
  onSave,
  loading = false,
}: SermonModalProps) {
  const { showSuccess, showError, showInfo } = useToast();
  const [title, setTitle] = useState(topic);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].id);
  const [saving, setSaving] = useState(false);

  const displaySermon = savedSermon
    ? { verses: savedSermon.verses, interpretation: savedSermon.interpretation, story: savedSermon.story }
    : sermon;

  // A mood entry's saved title is prefixed "Mood: " — used for the header label.
  const isEncouragement = !!savedSermon?.title?.startsWith('Mood:');
  const headerLabel = isEncouragement ? 'Encouragement' : 'Sermon';

  useLayoutEffect(() => {
    if (!visible) return;
    if (savedSermon) {
      setTitle(savedSermon.title);
      setSelectedColor(savedSermon.color);
    } else {
      setTitle(topic);
      setSelectedColor(COLOR_OPTIONS[0].id);
    }
  }, [visible, topic, savedSermon]);

  const handleCopy = async (text: string, section: string) => {
    try {
      await Clipboard.setStringAsync(text);
      showInfo('Copied', `${section} copied to clipboard`);
    } catch {
      showError('Error', 'Failed to copy to clipboard');
    }
  };

  const handleShare = async () => {
    if (!displaySermon) return;
    const body = [
      title,
      '',
      displaySermon.interpretation,
      '',
      displaySermon.verses.join('\n'),
      '',
      displaySermon.story,
    ].join('\n');
    try {
      await Share.share({ message: body });
    } catch {
      showError('Share failed', 'Could not open the share sheet');
    }
  };

  const handleSave = async () => {
    if (!displaySermon || !title.trim()) {
      showError('Error', 'Please enter a title for your sermon');
      return;
    }
    setSaving(true);
    try {
      if (savedSermon?.id) {
        await updateSermon({
          ...savedSermon,
          title: title.trim(),
          verses: displaySermon.verses,
          interpretation: displaySermon.interpretation,
          story: displaySermon.story,
          color: selectedColor,
        });
        showSuccess('Sermon updated', 'Your sermon has been updated');
      } else {
        await saveSermonApi({
          title: title.trim(),
          verses: displaySermon.verses || [],
          interpretation: displaySermon.interpretation || '',
          story: displaySermon.story || '',
          color: selectedColor,
          topic,
        });
        showSuccess('Sermon saved', 'Your sermon has been saved');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving sermon:', error);
      showError('Error', error.message || 'Failed to save sermon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.iconButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={theme.color.text} />
          </Pressable>
          <AppText variant="title">{headerLabel}</AppText>
          {displaySermon && !loading ? (
            <Pressable onPress={handleShare} style={styles.iconButton} hitSlop={8}>
              <Ionicons name="share-outline" size={22} color={theme.color.text} />
            </Pressable>
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>

        {loading || !displaySermon ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={theme.color.accent} />
            <AppText variant="body" style={styles.loadingText}>Preparing your sermon…</AppText>
          </View>
        ) : (
          <>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {/* Topic / title (editable for a new sermon, serif) */}
              <TextInput
                style={styles.title}
                value={title}
                onChangeText={setTitle}
                placeholder="Sermon title"
                placeholderTextColor={theme.color.textMuted}
                editable={!savedSermon}
                multiline
              />

              {/* THE MESSAGE — leads */}
              <View style={styles.sectionHeadRow}>
                <AppText variant="label">The Message</AppText>
                <Pressable onPress={() => handleCopy(displaySermon.interpretation || '', 'Message')} hitSlop={8}>
                  <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
                </Pressable>
              </View>
              <AppText variant="body" style={styles.messageBody}>{displaySermon.interpretation}</AppText>

              {/* SCRIPTURE — verses as inline cards */}
              <View style={styles.sectionHeadRow}>
                <AppText variant="label">Scripture</AppText>
                <Pressable onPress={() => handleCopy(displaySermon.verses.join('\n\n'), 'Scripture')} hitSlop={8}>
                  <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
                </Pressable>
              </View>
              {displaySermon.verses.map((verse, i) => (
                <Card key={i} tone="blush" style={styles.verseCard}>
                  <AppText variant="verse">{verse}</AppText>
                </Card>
              ))}

              {/* A STORY */}
              <View style={styles.sectionHeadRow}>
                <AppText variant="label">A Story</AppText>
                <Pressable onPress={() => handleCopy(displaySermon.story || '', 'Story')} hitSlop={8}>
                  <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
                </Pressable>
              </View>
              <AppText variant="body" style={styles.messageBody}>{displaySermon.story}</AppText>

              {/* Card color row (small) */}
              <AppText variant="label" style={styles.colorLabel}>Card color</AppText>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((option) => (
                  <Pressable key={option.id} onPress={() => setSelectedColor(option.id)}>
                    <View
                      style={[
                        styles.swatch,
                        { backgroundColor: option.color },
                        selectedColor === option.id && styles.swatchSelected,
                      ]}
                    >
                      {selectedColor === option.id && (
                        <Ionicons name="checkmark" size={16} color={theme.color.accentText} />
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Sticky Save bar */}
            <View style={styles.saveBar}>
              <PrimaryButton
                label={savedSermon ? 'Update' : 'Save sermon'}
                onPress={handleSave}
                loading={saving}
                style={styles.saveButton}
              />
              <Pressable onPress={handleShare} style={styles.shareBtn}>
                <Ionicons name="share-outline" size={22} color={theme.color.text} />
              </Pressable>
            </View>
          </>
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.lg },
  loadingText: { color: theme.color.textMuted },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.space.xl, paddingBottom: theme.space.xxl },
  title: {
    fontFamily: theme.font.serif, fontSize: 26, lineHeight: 32, color: theme.color.text,
    marginBottom: theme.space.lg, padding: 0,
  },
  sectionHeadRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: theme.space.xl, marginBottom: theme.space.sm,
  },
  messageBody: { lineHeight: 24 },
  verseCard: { marginBottom: theme.space.md },
  colorLabel: { marginTop: theme.space.xl, marginBottom: theme.space.sm },
  colorRow: { flexDirection: 'row', gap: theme.space.md },
  swatch: {
    width: 36, height: 36, borderRadius: theme.radius.pill,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  swatchSelected: { borderColor: theme.color.text },
  saveBar: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.md,
    paddingHorizontal: theme.space.lg, paddingTop: theme.space.md, paddingBottom: theme.space.md,
    borderTopWidth: 1, borderTopColor: theme.color.border, backgroundColor: theme.color.surface,
  },
  saveButton: { flex: 1 },
  shareBtn: {
    width: 52, height: 52, borderRadius: theme.radius.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.color.border, backgroundColor: theme.color.surface,
  },
});
