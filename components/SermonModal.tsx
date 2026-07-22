import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useLayoutEffect, useMemo, useState } from 'react';
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
import Loader from '@/components/ui/Loader';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { splitVerseString } from '@/lib/cards';
import { saveSermon as saveSermonApi, updateSermon } from '@/lib/sermonApi';
import { generateStory } from '@/lib/sermonAi';
import { generatePrayer } from '@/lib/prayerAi';
import { useTheme, type AppTheme } from '@/lib/theme';
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
const COLOR_TONES = ['sage', 'sand', 'dustyBlue', 'olive', 'blush', 'rust'] as const;
const COLOR_OPTIONS = COLOR_TONES.map((tone, i) => ({ id: String(i + 1), tone }));

const REFLECTION_MESSAGES = [
  'Turning to Scripture…',
  'Sitting with your words a moment…',
  'Finding the passage that meets you here…',
];
const ENCOURAGEMENT_MESSAGES = [
  'Listening to how you feel…',
  'Looking for a word of comfort…',
  'Bringing your heart to Scripture…',
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
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { showSuccess, showError, showInfo } = useToast();
  const router = useRouter();
  const [title, setTitle] = useState(topic);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].id);
  const [saving, setSaving] = useState(false);
  const [story, setStory] = useState('');
  const [prayer, setPrayer] = useState('');
  const [storyLoading, setStoryLoading] = useState(false);
  const [prayerLoading, setPrayerLoading] = useState(false);

  const displaySermon = savedSermon
    ? {
        verses: savedSermon.verses,
        interpretation: savedSermon.interpretation,
        story: savedSermon.story,
        prayer: savedSermon.prayer,
      }
    : sermon;

  // A mood entry's saved title is prefixed "Mood: " — used for the header label.
  const isEncouragement = !!savedSermon?.title?.startsWith('Mood:') || topic.startsWith('Mood:');
  const headerLabel = isEncouragement ? 'Encouragement' : 'Reflection';

  useLayoutEffect(() => {
    if (!visible) return;
    if (savedSermon) {
      setTitle(savedSermon.title);
      setSelectedColor(savedSermon.color);
    } else {
      setTitle(topic);
      setSelectedColor(COLOR_OPTIONS[0].id);
    }
    // Fresh generations no longer bundle a story or prayer; only saved
    // reflections carry them back in.
    setStory(savedSermon?.story ?? '');
    setPrayer(savedSermon?.prayer ?? '');
    setStoryLoading(false);
    setPrayerLoading(false);
  }, [visible, topic, savedSermon]);

  const handleCopy = async (text: string, section: string) => {
    try {
      await Clipboard.setStringAsync(text);
      showInfo('Copied', `${section} copied to clipboard`);
    } catch {
      showError('Error', 'Failed to copy to clipboard');
    }
  };

  const handleCreateCard = () => {
    const first = displaySermon?.verses?.[0];
    if (!first) return;
    const c = splitVerseString(first);
    onClose(); // close the full-screen modal so the card route is visible beneath it
    router.push({
      pathname: '/(protected)/card',
      params: { text: c.text, reference: c.reference ?? '' },
    } as never);
  };

  const shareBody = () => {
    if (!displaySermon) return '';
    const parts = [title, '', displaySermon.interpretation, '', displaySermon.verses.join('\n')];
    if (story) parts.push('', 'A Story', story);
    if (prayer) parts.push('', 'A Prayer', prayer);
    return parts.join('\n');
  };

  const handleShare = async () => {
    if (!displaySermon) return;
    try {
      await Share.share({ message: shareBody() });
    } catch {
      showError('Share failed', 'Could not open the share sheet');
    }
  };

  /**
   * A story or prayer generated while reading an *already saved* reflection is
   * persisted straight away — otherwise it silently disappears when the reader
   * is closed without tapping Update.
   */
  const persistAddition = async (patch: { story?: string; prayer?: string }) => {
    if (!savedSermon?.id) return;
    try {
      await updateSermon({ ...savedSermon, color: selectedColor, story, prayer, ...patch });
      onSave();
    } catch (error) {
      console.error('Error persisting generated section:', error);
    }
  };

  const handleGenerateStory = async () => {
    if (!displaySermon) return;
    setStoryLoading(true);
    try {
      const result = await generateStory(displaySermon.interpretation);
      setStory(result);
      await persistAddition({ story: result });
    } catch (error: any) {
      showError('Could not add a story', error?.message || 'Please try again.');
    } finally {
      setStoryLoading(false);
    }
  };

  const handleGeneratePrayer = async () => {
    if (!displaySermon) return;
    setPrayerLoading(true);
    try {
      const result = await generatePrayer(displaySermon.interpretation);
      setPrayer(result);
      await persistAddition({ prayer: result });
    } catch (error: any) {
      showError('Could not create a prayer', error?.message || 'Please try again.');
    } finally {
      setPrayerLoading(false);
    }
  };

  const handleSave = async () => {
    if (!displaySermon || !title.trim()) {
      showError('Error', 'Please enter a title for your reflection');
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
          story,
          prayer,
          color: selectedColor,
        });
        showSuccess('Reflection updated', 'Your reflection has been updated');
      } else {
        await saveSermonApi({
          title: title.trim(),
          verses: displaySermon.verses || [],
          interpretation: displaySermon.interpretation || '',
          story,
          prayer,
          color: selectedColor,
          topic,
        });
        showSuccess('Reflection saved', 'Your reflection has been saved');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving sermon:', error);
      showError('Error', error.message || 'Failed to save reflection');
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
            <Loader
              icon={isEncouragement ? 'heart-outline' : 'book-outline'}
              messages={isEncouragement ? ENCOURAGEMENT_MESSAGES : REFLECTION_MESSAGES}
            />
          </View>
        ) : (
          <>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {/* Topic / title (editable for a new sermon, serif) */}
              <TextInput
                style={styles.title}
                value={title}
                onChangeText={setTitle}
                placeholder="Reflection title"
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

              {/* SCRIPTURE — verses as inline cards, each individually copyable */}
              <View style={styles.sectionHeadRow}>
                <AppText variant="label">Scripture</AppText>
                <Pressable onPress={() => handleCopy(displaySermon.verses.join('\n\n'), 'All scripture')} hitSlop={8}>
                  <AppText variant="label" style={styles.copyAll}>Copy all</AppText>
                </Pressable>
              </View>
              {displaySermon.verses.map((verse, i) => (
                <Card key={i} tone="blush" style={styles.verseCard}>
                  <AppText variant="verse" style={styles.verseText}>{verse}</AppText>
                  <Pressable
                    onPress={() => handleCopy(verse, 'Verse')}
                    style={styles.verseCopyButton}
                    hitSlop={8}
                  >
                    <Ionicons name="copy-outline" size={16} color={theme.color.text} />
                  </Pressable>
                </Card>
              ))}

              {/* A STORY — on-demand, saved with the reflection */}
              {story ? (
                <>
                  <View style={styles.sectionHeadRow}>
                    <AppText variant="label">A Story</AppText>
                    <Pressable onPress={() => handleCopy(story, 'Story')} hitSlop={8}>
                      <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
                    </Pressable>
                  </View>
                  <AppText variant="body" style={styles.messageBody}>{story}</AppText>
                </>
              ) : (
                <Pressable
                  style={styles.generateBtn}
                  onPress={handleGenerateStory}
                  disabled={storyLoading}
                >
                  {storyLoading ? (
                    <ActivityIndicator color={theme.color.accent} />
                  ) : (
                    <>
                      <Ionicons name="book-outline" size={18} color={theme.color.accent} />
                      <AppText variant="label" style={styles.generateBtnText}>Add a story</AppText>
                    </>
                  )}
                </Pressable>
              )}

              {/* A PRAYER — on-demand, saved with the reflection */}
              {prayer ? (
                <>
                  <View style={styles.sectionHeadRow}>
                    <AppText variant="label">A Prayer</AppText>
                    <Pressable onPress={() => handleCopy(prayer, 'Prayer')} hitSlop={8}>
                      <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
                    </Pressable>
                  </View>
                  <AppText variant="body" style={styles.messageBody}>{prayer}</AppText>
                </>
              ) : (
                <Pressable
                  style={styles.generateBtn}
                  onPress={handleGeneratePrayer}
                  disabled={prayerLoading}
                >
                  {prayerLoading ? (
                    <ActivityIndicator color={theme.color.accent} />
                  ) : (
                    <>
                      <Ionicons name="heart-outline" size={18} color={theme.color.accent} />
                      <AppText variant="label" style={styles.generateBtnText}>Pray about this</AppText>
                    </>
                  )}
                </Pressable>
              )}

              {/* Card color row (small) */}
              <AppText variant="label" style={styles.colorLabel}>Card color</AppText>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((option) => (
                  <Pressable key={option.id} onPress={() => setSelectedColor(option.id)}>
                    <View
                      style={[
                        styles.swatch,
                        { backgroundColor: theme.color[option.tone] },
                        selectedColor === option.id && styles.swatchSelected,
                      ]}
                    >
                      {selectedColor === option.id && (
                        <Ionicons name="checkmark" size={16} color={theme.color.text} />
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Sticky Save bar */}
            <View style={styles.saveBar}>
              <PrimaryButton
                label={savedSermon ? 'Update' : 'Save reflection'}
                onPress={handleSave}
                loading={saving}
                style={styles.saveButton}
              />
              {!!displaySermon?.verses?.length && (
                <Pressable onPress={handleCreateCard} style={styles.shareBtn} hitSlop={8}>
                  <Ionicons name="image-outline" size={22} color={theme.color.text} />
                </Pressable>
              )}
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

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.paper },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md,
    borderBottomWidth: 1, borderBottomColor: theme.color.border,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  copyAll: { color: theme.color.accent },
  messageBody: { lineHeight: 24 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: theme.space.sm, marginTop: theme.space.xl,
    minHeight: 48, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.color.border, backgroundColor: theme.color.surface,
  },
  generateBtnText: { color: theme.color.accent },
  verseCard: { marginBottom: theme.space.md, paddingRight: theme.space.xxl + theme.space.sm },
  verseText: { flexShrink: 1 },
  verseCopyButton: {
    position: 'absolute',
    top: theme.space.sm,
    right: theme.space.sm,
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
  },
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
