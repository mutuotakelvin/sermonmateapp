import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
    Clipboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Collapsible from 'react-native-collapsible';

import { useToast } from '@/components/ToastProvider';
import AppText from '@/components/ui/AppText';
import Card from '@/components/ui/Card';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { saveSermon as saveSermonApi, updateSermon } from '@/lib/sermonApi';
import { theme } from '@/lib/theme';
import type { SavedSermon, Sermon } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';

interface SermonModalProps {
  visible: boolean;
  sermon: Sermon | null;
  savedSermon?: SavedSermon | null;
  topic: string;
  onClose: () => void;
  onSave: () => void;
}

// 6 muted palette swatches mapped to warm editorial tokens
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
}: SermonModalProps) {
  const { showSuccess, showError, showInfo } = useToast();
  const [versesExpanded, setVersesExpanded] = useState(true);
  const [sermonExpanded, setSermonExpanded] = useState(false);
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [title, setTitle] = useState(topic);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].id);
  const [saving, setSaving] = useState(false);
  const [collapsibleKey, setCollapsibleKey] = useState(0);

  // Determine which sermon data to use (savedSermon for editing, sermon for new)
  const displaySermon = savedSermon ? {
    verses: savedSermon.verses,
    interpretation: savedSermon.interpretation,
    story: savedSermon.story,
  } : sermon;

  // Increment key when modal opens to force Collapsible remount
  useEffect(() => {
    if (visible) {
      setCollapsibleKey(prev => prev + 1);
      // Start collapsed, then expand after mount to trigger Collapsible animation
      setVersesExpanded(false);
      // Use requestAnimationFrame to ensure it happens after render
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVersesExpanded(true);
        });
      });
    }
  }, [visible]);

  // Use useLayoutEffect to set state synchronously before render
  useLayoutEffect(() => {
    if (visible) {
      if (savedSermon) {
        // Editing existing sermon
        setTitle(savedSermon.title);
        setSelectedColor(savedSermon.color);
        setSermonExpanded(false);
        setStoryExpanded(false);
      } else if (sermon) {
        // New sermon - ensure verses are expanded when sermon is available
        setTitle(topic);
        setSelectedColor(COLOR_OPTIONS[0].id);
        setSermonExpanded(false);
        setStoryExpanded(false);
      } else if (topic) {
        // Modal opened but sermon not yet generated
        setTitle(topic);
        setSelectedColor(COLOR_OPTIONS[0].id);
        setSermonExpanded(false);
        setStoryExpanded(false);
      }
    } else {
      // Reset state when modal closes
      setVersesExpanded(true);
      setSermonExpanded(false);
      setStoryExpanded(false);
    }
  }, [visible, topic, savedSermon, sermon]);

  const handleCopy = async (text: string, section: string) => {
    try {
      Clipboard.setString(text);
      showInfo('Copied!', `${section} copied to clipboard`);
    } catch {
      showError('Error', 'Failed to copy to clipboard');
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
        // Update existing sermon
        const updatedSermon: SavedSermon = {
          ...savedSermon,
          title: title.trim(),
          verses: displaySermon.verses,
          interpretation: displaySermon.interpretation,
          story: displaySermon.story,
          color: selectedColor,
        };
        await updateSermon(updatedSermon);
        showSuccess('Sermon updated', 'Your sermon has been updated successfully');
      } else {
        // Create new sermon
        await saveSermonApi({
          title: title.trim(),
          verses: displaySermon.verses || [],
          interpretation: displaySermon.interpretation || '',
          story: displaySermon.story || '',
          color: selectedColor,
          topic: topic,
        });
        showSuccess('Sermon saved', 'Your sermon has been saved successfully');
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

  const getVersesText = () => {
    if (!displaySermon) return '';
    return displaySermon.verses.join('\n\n');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <AppText variant="display" style={styles.modalTitle}>Generated Sermon</AppText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.color.textMuted} />
            </Pressable>
          </View>

          {displaySermon && (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
            {/* Title Input */}
            <View style={styles.titleSection}>
              <AppText variant="label" style={styles.fieldLabel}>Title</AppText>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter sermon title"
                placeholderTextColor={theme.color.textMuted}
                editable={!savedSermon}
              />
            </View>

            {/* Verses Accordion */}
            <Card style={styles.accordionCard}>
              <Pressable
                style={styles.accordionHeader}
                onPress={() => setVersesExpanded(!versesExpanded)}
              >
                <AppText variant="title">Verses</AppText>
                <View style={styles.accordionHeaderRight}>
                  <Pressable
                    style={styles.copyButton}
                    onPress={() => handleCopy(getVersesText(), 'Verses')}
                  >
                    <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
                    <AppText variant="body" style={styles.copyButtonText}>Copy</AppText>
                  </Pressable>
                  <Ionicons
                    name={versesExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.color.textMuted}
                  />
                </View>
              </Pressable>
              <Collapsible
                collapsed={!versesExpanded}
                key={`verses-${collapsibleKey}-${savedSermon?.id || (sermon ? 'new' : 'none')}`}
              >
                <View style={styles.accordionContent}>
                  {displaySermon.verses.map((verse, index) => (
                    <AppText key={index} variant="verse" style={styles.verseText}>
                      {verse}
                    </AppText>
                  ))}
                </View>
              </Collapsible>
            </Card>

            {/* Sermon Accordion */}
            <Card style={styles.accordionCard}>
              <Pressable
                style={styles.accordionHeader}
                onPress={() => setSermonExpanded(!sermonExpanded)}
              >
                <AppText variant="title">Sermon</AppText>
                <View style={styles.accordionHeaderRight}>
                  <Pressable
                    style={styles.copyButton}
                    onPress={() => handleCopy(displaySermon.interpretation || '', 'Sermon')}
                  >
                    <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
                    <AppText variant="body" style={styles.copyButtonText}>Copy</AppText>
                  </Pressable>
                  <Ionicons
                    name={sermonExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.color.textMuted}
                  />
                </View>
              </Pressable>
              <Collapsible collapsed={!sermonExpanded}>
                <View style={styles.accordionContent}>
                  <AppText variant="body">{displaySermon.interpretation}</AppText>
                </View>
              </Collapsible>
            </Card>

            {/* Story Accordion */}
            <Card style={styles.accordionCard}>
              <Pressable
                style={styles.accordionHeader}
                onPress={() => setStoryExpanded(!storyExpanded)}
              >
                <AppText variant="title">Story</AppText>
                <View style={styles.accordionHeaderRight}>
                  <Pressable
                    style={styles.copyButton}
                    onPress={() => handleCopy(displaySermon.story || '', 'Story')}
                  >
                    <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
                    <AppText variant="body" style={styles.copyButtonText}>Copy</AppText>
                  </Pressable>
                  <Ionicons
                    name={storyExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.color.textMuted}
                  />
                </View>
              </Pressable>
              <Collapsible collapsed={!storyExpanded}>
                <View style={styles.accordionContent}>
                  <AppText variant="body">{displaySermon.story}</AppText>
                </View>
              </Collapsible>
            </Card>

            {/* Color Picker */}
            <View style={styles.colorSection}>
              <AppText variant="label" style={styles.fieldLabel}>Choose Card Color</AppText>
              <View style={styles.colorPicker}>
                {COLOR_OPTIONS.map((option) => (
                  <Pressable
                    key={option.id}
                    onPress={() => setSelectedColor(option.id)}
                    style={styles.colorOption}
                  >
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: option.color },
                        selectedColor === option.id && styles.colorCircleSelected,
                      ]}
                    >
                      {selectedColor === option.id && (
                        <Ionicons name="checkmark" size={18} color={theme.color.accentText} />
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Save / Update Button */}
            <PrimaryButton
              label={savedSermon ? 'Update Sermon' : 'Save Sermon'}
              onPress={handleSave}
              loading={saving}
              style={styles.saveButton}
            />

            {/* AI Disclaimer */}
            {!savedSermon && (
              <AppText variant="caption" style={styles.aiDisclaimer}>
                Powered by AI
              </AppText>
            )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42, 36, 32, 0.45)',
  },
  modalContent: {
    backgroundColor: theme.color.paper,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    maxHeight: '90%',
    flex: 1,
    shadowColor: theme.color.charcoal,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.18,
    shadowRadius: theme.space.sm,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  modalTitle: {
    fontSize: 22,
  },
  closeButton: {
    padding: theme.space.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.space.xl,
    paddingBottom: theme.space.xxl,
  },
  titleSection: {
    marginBottom: theme.space.xl,
  },
  fieldLabel: {
    marginBottom: theme.space.sm,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    fontSize: 16,
    fontFamily: theme.font.sans,
    color: theme.color.text,
    backgroundColor: theme.color.surface,
  },
  accordionCard: {
    marginBottom: theme.space.md,
    padding: 0,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
  },
  accordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.xs,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xs,
  },
  copyButtonText: {
    fontSize: 14,
    color: theme.color.accent,
    fontFamily: theme.font.sansMedium,
  },
  accordionContent: {
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.lg,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    paddingTop: theme.space.md,
  },
  verseText: {
    marginBottom: theme.space.md,
  },
  colorSection: {
    marginTop: theme.space.sm,
    marginBottom: theme.space.xl,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: theme.space.md,
    flexWrap: 'wrap',
  },
  colorOption: {
    marginRight: theme.space.xs,
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: theme.color.text,
    borderWidth: 2,
  },
  saveButton: {
    marginTop: theme.space.sm,
  },
  aiDisclaimer: {
    textAlign: 'center',
    marginTop: theme.space.md,
    fontStyle: 'italic',
  },
});
