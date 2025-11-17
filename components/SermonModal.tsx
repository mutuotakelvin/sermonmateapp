import React, { useState } from 'react';
import {
    ActivityIndicator,
    Clipboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Collapsible from 'react-native-collapsible';

import { useToast } from '@/components/ToastProvider';
import { saveSermon as saveSermonApi, updateSermon } from '@/lib/sermonApi';
import type { SavedSermon, Sermon } from '@/lib/types';
import { colors } from '@/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface SermonModalProps {
  visible: boolean;
  sermon: Sermon | null;
  savedSermon?: SavedSermon | null;
  topic: string;
  onClose: () => void;
  onSave: () => void;
}

// 6 gradient color combinations for sermon cards
const COLOR_OPTIONS = [
  { id: '1', colors: ['#6EE7F9', '#A78BFA'] as const }, // Blue to Purple
  { id: '2', colors: ['#FCD34D', '#F59E0B'] as const }, // Yellow to Orange
  { id: '3', colors: ['#60A5FA', '#3B82F6'] as const }, // Light Blue to Blue
  { id: '4', colors: ['#86EFAC', '#22C55E'] as const }, // Light Green to Green
  { id: '5', colors: ['#F9A8D4', '#EC4899'] as const }, // Pink to Rose
  { id: '6', colors: ['#A78BFA', '#7C3AED'] as const }, // Purple to Dark Purple
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

  // Determine which sermon data to use (savedSermon for editing, sermon for new)
  const displaySermon = savedSermon ? {
    verses: savedSermon.verses,
    interpretation: savedSermon.interpretation,
    story: savedSermon.story,
  } : sermon;

  React.useEffect(() => {
    if (visible) {
      if (savedSermon) {
        // Editing existing sermon
        setTitle(savedSermon.title);
        setSelectedColor(savedSermon.color);
        setVersesExpanded(true);
        setSermonExpanded(false);
        setStoryExpanded(false);
      } else if (topic) {
        // New sermon
        setTitle(topic);
        setSelectedColor(COLOR_OPTIONS[0].id);
        setVersesExpanded(true);
        setSermonExpanded(false);
        setStoryExpanded(false);
      }
    }
  }, [visible, topic, savedSermon]);

  const handleCopy = async (text: string, section: string) => {
    try {
      Clipboard.setString(text);
      showInfo('Copied!', `${section} copied to clipboard`);
    } catch (error) {
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

  const selectedColorOption = COLOR_OPTIONS.find(c => c.id === selectedColor);

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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Generated Sermon</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#374151" />
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
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter sermon title"
                placeholderTextColor="#9CA3AF"
                editable={!savedSermon}
              />
            </View>

            {/* Verses Accordion */}
            <View style={styles.accordionSection}>
              <Pressable
                style={styles.accordionHeader}
                onPress={() => setVersesExpanded(!versesExpanded)}
              >
                <Text style={styles.accordionTitle}>Verses</Text>
                <View style={styles.accordionHeaderRight}>
                  <Pressable
                    style={styles.copyButton}
                    onPress={() => handleCopy(getVersesText(), 'Verses')}
                  >
                    <Ionicons name="copy-outline" size={18} color={colors.primary} />
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </Pressable>
                  <Ionicons
                    name={versesExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#6B7280"
                  />
                </View>
              </Pressable>
              <Collapsible collapsed={!versesExpanded}>
                <View style={styles.accordionContent}>
                  {displaySermon.verses.map((verse, index) => (
                    <Text key={index} style={styles.verseText}>
                      {verse}
                    </Text>
                  ))}
                </View>
              </Collapsible>
            </View>

            {/* Sermon Accordion */}
            <View style={styles.accordionSection}>
              <Pressable
                style={styles.accordionHeader}
                onPress={() => setSermonExpanded(!sermonExpanded)}
              >
                <Text style={styles.accordionTitle}>Sermon</Text>
                <View style={styles.accordionHeaderRight}>
                  <Pressable
                    style={styles.copyButton}
                    onPress={() => handleCopy(displaySermon.interpretation || '', 'Sermon')}
                  >
                    <Ionicons name="copy-outline" size={18} color={colors.primary} />
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </Pressable>
                  <Ionicons
                    name={sermonExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#6B7280"
                  />
                </View>
              </Pressable>
              <Collapsible collapsed={!sermonExpanded}>
                <View style={styles.accordionContent}>
                  <Text style={styles.textContent}>{displaySermon.interpretation}</Text>
                </View>
              </Collapsible>
            </View>

            {/* Story Accordion */}
            <View style={styles.accordionSection}>
              <Pressable
                style={styles.accordionHeader}
                onPress={() => setStoryExpanded(!storyExpanded)}
              >
                <Text style={styles.accordionTitle}>Story</Text>
                <View style={styles.accordionHeaderRight}>
                  <Pressable
                    style={styles.copyButton}
                    onPress={() => handleCopy(displaySermon.story || '', 'Story')}
                  >
                    <Ionicons name="copy-outline" size={18} color={colors.primary} />
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </Pressable>
                  <Ionicons
                    name={storyExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#6B7280"
                  />
                </View>
              </Pressable>
              <Collapsible collapsed={!storyExpanded}>
                <View style={styles.accordionContent}>
                  <Text style={styles.textContent}>{displaySermon.story}</Text>
                </View>
              </Collapsible>
            </View>

            {/* Color Picker */}
            <View style={styles.colorSection}>
              <Text style={styles.label}>Choose Card Color</Text>
              <View style={styles.colorPicker}>
                {COLOR_OPTIONS.map((option) => (
                  <Pressable
                    key={option.id}
                    onPress={() => setSelectedColor(option.id)}
                    style={styles.colorOption}
                  >
                    <LinearGradient
                      colors={option.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.colorCircle,
                        selectedColor === option.id && styles.colorCircleSelected,
                      ]}
                    >
                      {selectedColor === option.id && (
                        <Ionicons name="checkmark" size={20} color="#fff" />
                      )}
                    </LinearGradient>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>{savedSermon ? 'Update Sermon' : 'Save Sermon'}</Text>
              )}
            </Pressable>

            {/* AI Disclaimer */}
            {!savedSermon && (
              <Text style={styles.aiDisclaimer}>
                Powered by AI
              </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  accordionSection: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  accordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  accordionContent: {
    padding: 16,
    backgroundColor: '#fff',
  },
  verseText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  textContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  colorSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorOption: {
    marginRight: 8,
  },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: '#111827',
    borderWidth: 3,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  aiDisclaimer: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});

