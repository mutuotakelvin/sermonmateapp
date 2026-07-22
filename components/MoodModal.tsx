import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useToast } from '@/components/ToastProvider';
import { generateMoodSermon, AiLimitError } from '@/lib/sermonAi';
import { presentPaywall, syncEntitlement } from '@/lib/purchases';
import { usePurchasesStore } from '@/lib/stores/purchases';
import { useMoodStore } from '@/lib/stores/mood';
import type { MoodType, MoodEntry, Sermon } from '@/lib/types';
import { getReasonsForMood } from '@/lib/moodReasons';
import SermonModal from './SermonModal';
import AppText from '@/components/ui/AppText';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Loader from '@/components/ui/Loader';
import { useTheme, type AppTheme } from '@/lib/theme';

interface MoodModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const MOODS: { type: MoodType; label: string; icon: string }[] = [
  { type: 'Happy', label: 'Happy', icon: 'happy-outline' },
  { type: 'Grateful', label: 'Grateful', icon: 'heart-outline' },
  { type: 'Hopeful', label: 'Hopeful', icon: 'sunny-outline' },
  { type: 'Peaceful', label: 'Peaceful', icon: 'leaf-outline' },
  { type: 'Anxious', label: 'Anxious', icon: 'alert-circle-outline' },
  { type: 'Sad', label: 'Sad', icon: 'sad-outline' },
  { type: 'Overwhelmed', label: 'Overwhelmed', icon: 'warning-outline' },
  { type: 'Angry', label: 'Angry', icon: 'flame-outline' },
];

// Animated Mood Chip Component
interface AnimatedMoodChipProps {
  mood: { type: MoodType; label: string; icon: string };
  index: number;
  isSelected: boolean;
  onPress: () => void;
  visible: boolean;
}

const AnimatedMoodChip: React.FC<AnimatedMoodChipProps> = ({
  mood,
  index,
  isSelected,
  onPress,
  visible,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 150 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Pressable
      style={styles.moodOption}
      onPress={onPress}
    >
      <Animated.View
        style={[
          animatedStyle,
          styles.moodTile,
          isSelected && styles.moodTileSelected,
        ]}
      >
        <Ionicons
          name={mood.icon as any}
          size={32}
          color={isSelected ? theme.color.accent : theme.color.textMuted}
        />
        <AppText
          style={{
            fontFamily: theme.font.sansMedium,
            fontSize: 14,
            color: isSelected ? theme.color.accent : theme.color.text,
            marginTop: theme.space.xs,
          }}
        >
          {mood.label}
        </AppText>
        {isSelected && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark" size={14} color={theme.color.accentText} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

export default function MoodModal({ visible, onClose, onComplete }: MoodModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { showSuccess, showError } = useToast();
  const { addMoodEntry } = useMoodStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedSermon, setGeneratedSermon] = useState<Sermon | null>(null);
  const [sermonModalVisible, setSermonModalVisible] = useState(false);
  const [moodEntry, setMoodEntry] = useState<MoodEntry | null>(null);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setSelectedMood(null);
      setSelectedReasons([]);
      setCustomReason('');
      setGeneratedSermon(null);
      setMoodEntry(null);
    }
  }, [visible]);

  const handleMoodSelect = (mood: MoodType) => {
    setSelectedMood(mood);
    setSelectedReasons([]);
    setCustomReason('');
  };

  const handleReasonToggle = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedMood) {
        showError('Please select a mood', 'Choose how you feel today');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedReasons.length === 0 && !customReason.trim()) {
        showError('Please provide a reason', 'Select at least one reason or add a custom one');
        return;
      }
      handleGenerateSermon();
    }
  };

  const handleGenerateSermon = () => runGenerateMood(false);

  const runGenerateMood = async (isRetry: boolean) => {
    if (!selectedMood) return;

    setLoading(true);
    setStep(3);

    try {
      const sermon = await generateMoodSermon(
        selectedMood,
        selectedReasons,
        customReason.trim() || undefined
      );

      setGeneratedSermon(sermon);

      const entry: MoodEntry = {
        id: `mood-${Date.now()}-${Math.random()}`,
        mood: selectedMood,
        reason: selectedReasons,
        customReason: customReason.trim() || undefined,
        date: new Date().toISOString(),
        sermon,
        aiAdvice: sermon.interpretation,
      };

      await addMoodEntry(entry);
      setMoodEntry(entry);

      setSermonModalVisible(true);
      showSuccess('Mood recorded', 'Your encouragement is ready');
    } catch (error) {
      if (error instanceof AiLimitError) {
        setStep(2);
        setLoading(false);
        if (error.kind === 'free' && !isRetry) {
          const bought = await presentPaywall();
          if (bought) {
            try { await syncEntitlement(); } catch { /* webhook will backstop */ }
            await usePurchasesStore.getState().refresh();
            await runGenerateMood(true);
            return;
          }
        } else if (error.kind === 'pro') {
          showError('Daily limit reached', "You've hit today's high usage limit. Try again tomorrow.");
        }
        return;
      }
      console.error('Error generating mood sermon:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate encouragement';
      showError('Generation failed', errorMessage);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleSermonModalClose = () => {
    setSermonModalVisible(false);
    onClose();
    if (onComplete) {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3 && !loading) {
      setStep(2);
    }
  };

  const reasons = selectedMood ? getReasonsForMood(selectedMood) : [];

  // Mood color tokens for step 2
  const moodColors = selectedMood ? theme.moodColor[selectedMood] : null;
  const moodBg = moodColors?.bg ?? theme.color.paper;
  const moodOn = moodColors?.on ?? theme.color.text;
  const moodIcon = selectedMood ? MOODS.find((m) => m.type === selectedMood)?.icon ?? 'happy-outline' : 'happy-outline';
  const dateLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <>
      <Modal
        visible={visible && !sermonModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />

          {/* Step 2: Bold full-color confirm screen */}
          {step === 2 && selectedMood ? (
            <View style={[styles.modalContent, { backgroundColor: moodBg }]}>
              {/* Header row: back + close */}
              <View style={[styles.modalHeader, { borderBottomColor: `${moodOn}30` }]}>
                <View style={styles.headerLeft}>
                  <Pressable onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={moodOn} />
                  </Pressable>
                </View>
                <Pressable onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={moodOn} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Big mood face + name + date */}
                <View style={styles.confirmHero}>
                  <Ionicons name={moodIcon as any} size={64} color={moodOn} />
                  <AppText
                    variant="display"
                    style={{ color: moodOn, fontSize: 34, marginTop: theme.space.md, textTransform: 'capitalize' }}
                  >
                    {selectedMood}
                  </AppText>
                  <AppText
                    style={{
                      fontFamily: theme.font.sans,
                      fontSize: 14,
                      color: moodOn,
                      opacity: 0.7,
                      marginTop: theme.space.xs,
                    }}
                  >
                    {dateLabel}
                  </AppText>
                </View>

                {/* Reason chips */}
                <View style={styles.reasonChips}>
                  {reasons.map((reason) => {
                    const sel = selectedReasons.includes(reason);
                    return (
                      <Pressable
                        key={reason}
                        onPress={() => handleReasonToggle(reason)}
                        style={[
                          styles.onColorChip,
                          sel
                            ? { backgroundColor: moodOn, borderColor: moodOn }
                            : { backgroundColor: 'transparent', borderColor: `${moodOn}80` },
                        ]}
                      >
                        <AppText
                          style={{
                            fontFamily: theme.font.sansMedium,
                            fontSize: 14,
                            color: sel ? moodBg : moodOn,
                          }}
                        >
                          {reason}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Add-a-reason TextInput */}
                <View style={styles.customReasonContainer}>
                  <TextInput
                    style={[
                      styles.customReasonInput,
                      {
                        borderColor: `${moodOn}60`,
                        color: moodOn,
                      },
                    ]}
                    placeholder="Or share what's on your heart..."
                    placeholderTextColor={`${moodOn}60`}
                    value={customReason}
                    onChangeText={setCustomReason}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                {/* Send button: on-color pill — bg = on, label = bg */}
                <Pressable
                  onPress={handleGenerateSermon}
                  style={[styles.sendButton, { backgroundColor: moodOn }]}
                >
                  <AppText
                    style={{
                      fontFamily: theme.font.sansSemibold,
                      fontSize: 16,
                      color: moodBg,
                    }}
                  >
                    Generate Encouragement
                  </AppText>
                </Pressable>
              </ScrollView>
            </View>
          ) : (
            /* Steps 1 and 3: standard paper-background sheet */
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.headerLeft}>
                  {step > 1 && (
                    <Pressable onPress={handleBack} style={styles.backButton}>
                      <Ionicons name="arrow-back" size={24} color={theme.color.text} />
                    </Pressable>
                  )}
                  <AppText
                    variant="title"
                    style={{ fontSize: 20, flex: 1 }}
                  >
                    {step === 1 && 'How do you feel today?'}
                    {step === 3 && 'Generating your encouragement...'}
                  </AppText>
                </View>
                <Pressable onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.color.text} />
                </Pressable>
              </View>

              {/* Progress Indicator */}
              <View style={styles.progressContainer}>
                {[1, 2, 3].map((s) => (
                  <View
                    key={s}
                    style={[
                      styles.progressDot,
                      s <= step && styles.progressDotActive,
                    ]}
                  />
                ))}
              </View>

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Step 1: Mood Selection */}
                {step === 1 && (
                  <View style={styles.moodGrid}>
                    {MOODS.map((mood, index) => (
                      <AnimatedMoodChip
                        key={mood.type}
                        mood={mood}
                        index={index}
                        isSelected={selectedMood === mood.type}
                        onPress={() => handleMoodSelect(mood.type)}
                        visible={visible && step === 1}
                      />
                    ))}
                  </View>
                )}

                {/* Step 3: Loading */}
                {step === 3 && loading && (
                  <View style={styles.loadingContainer}>
                    <Loader
                      icon="heart-outline"
                      messages={[
                        'Listening to how you feel…',
                        'Looking for a word of comfort…',
                        'Bringing your heart to Scripture…',
                      ]}
                    />
                  </View>
                )}
              </ScrollView>

              {/* Footer Buttons (step 1 only) */}
              {step === 1 && (
                <View style={styles.footer}>
                  <PrimaryButton
                    label="Next"
                    onPress={handleNext}
                    disabled={!selectedMood}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>

      {/* Sermon Modal for displaying result */}
      {moodEntry && generatedSermon && (
        <SermonModal
          visible={sermonModalVisible}
          sermon={generatedSermon}
          topic={`Mood: ${selectedMood}`}
          onClose={handleSermonModalClose}
          onSave={handleSermonModalClose}
        />
      )}
    </>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.overlay,
  },
  modalContent: {
    backgroundColor: theme.color.paper,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    maxHeight: '90%',
    flex: 1,
    shadowColor: theme.color.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.space.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.space.md,
  },
  backButton: {
    padding: theme.space.xs,
  },
  closeButton: {
    padding: theme.space.xs,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingVertical: theme.space.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.border,
  },
  progressDotActive: {
    backgroundColor: theme.color.accent,
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.space.xl,
    paddingBottom: theme.space.xxl,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.md,
    justifyContent: 'space-between',
  },
  moodOption: {
    width: '47%',
    marginBottom: theme.space.md,
  },
  moodTile: {
    padding: theme.space.xl,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    position: 'relative',
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  moodTileSelected: {
    borderWidth: 2,
    borderColor: theme.color.accent,
  },
  checkmark: {
    position: 'absolute',
    top: theme.space.sm,
    right: theme.space.sm,
    width: 22,
    height: 22,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Step 2 confirm screen styles
  confirmHero: {
    alignItems: 'center',
    paddingTop: theme.space.xl,
    paddingBottom: theme.space.xl,
  },
  reasonChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    marginBottom: theme.space.xl,
  },
  onColorChip: {
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
  },
  customReasonContainer: {
    marginBottom: theme.space.xl,
  },
  customReasonInput: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    padding: theme.space.md,
    fontSize: 15,
    fontFamily: theme.font.sans,
    minHeight: 90,
    backgroundColor: 'transparent',
  },
  sendButton: {
    borderRadius: theme.radius.pill,
    paddingVertical: theme.space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  footer: {
    padding: theme.space.xl,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
  },
});
