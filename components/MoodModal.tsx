import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
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
  withSpring,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { useToast } from '@/components/ToastProvider';
import { generateMoodSermon } from '@/lib/sermonAi';
import { useMoodStore } from '@/lib/stores/mood';
import type { MoodType, MoodEntry, Sermon } from '@/lib/types';
import { getReasonsForMood } from '@/lib/moodReasons';
import SermonModal from './SermonModal';
import AppText from '@/components/ui/AppText';
import Chip from '@/components/ui/Chip';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { theme } from '@/lib/theme';

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
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      scale.value = withDelay(
        index * 50,
        withSpring(1, { damping: 12, stiffness: 150 })
      );
      opacity.value = withDelay(
        index * 50,
        withTiming(1, { duration: 300 })
      );
    } else {
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, index]);

  useEffect(() => {
    if (isSelected) {
      pulseScale.value = withSequence(
        withSpring(1.05, { damping: 8 }),
        withSpring(1, { damping: 8 })
      );
    } else {
      pulseScale.value = withSpring(1, { damping: 8 });
    }
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * pressScale.value * pulseScale.value },
    ],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    pressScale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Pressable
      style={styles.moodOption}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
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

  const handleGenerateSermon = async () => {
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
                  {step === 2 && "What's on your mind?"}
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

              {/* Step 2: Reason Input */}
              {step === 2 && selectedMood && (
                <View style={styles.reasonContainer}>
                  <AppText variant="title" style={{ marginBottom: theme.space.sm }}>
                    Why do you feel {selectedMood.toLowerCase()}?
                  </AppText>

                  {/* Multiple Choice Reasons */}
                  <View style={styles.reasonChips}>
                    {reasons.map((reason) => (
                      <Chip
                        key={reason}
                        label={reason}
                        selected={selectedReasons.includes(reason)}
                        onPress={() => handleReasonToggle(reason)}
                      />
                    ))}
                  </View>

                  {/* Custom Reason Input */}
                  <View style={styles.customReasonContainer}>
                    <AppText variant="label" style={{ marginBottom: theme.space.sm }}>
                      Or tell us more (optional)
                    </AppText>
                    <TextInput
                      style={styles.customReasonInput}
                      placeholder="Share what's on your heart..."
                      placeholderTextColor={theme.color.textMuted}
                      value={customReason}
                      onChangeText={setCustomReason}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              )}

              {/* Step 3: Loading */}
              {step === 3 && loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.color.accent} />
                  <AppText
                    variant="body"
                    style={{ marginTop: theme.space.lg, textAlign: 'center', color: theme.color.textMuted }}
                  >
                    Creating personalized encouragement for you...
                  </AppText>
                </View>
              )}
            </ScrollView>

            {/* Footer Buttons */}
            {step < 3 && (
              <View style={styles.footer}>
                <PrimaryButton
                  label={step === 1 ? 'Next' : 'Generate Encouragement'}
                  onPress={handleNext}
                  disabled={step === 1 && !selectedMood}
                />
              </View>
            )}
          </View>
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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: theme.color.paper,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    maxHeight: '90%',
    flex: 1,
    shadowColor: theme.color.charcoal,
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
  reasonContainer: {
    gap: theme.space.xl,
  },
  reasonChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.sm,
  },
  customReasonContainer: {
    marginTop: theme.space.sm,
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    padding: theme.space.md,
    fontSize: 15,
    fontFamily: theme.font.sans,
    color: theme.color.text,
    backgroundColor: theme.color.surface,
    minHeight: 100,
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
