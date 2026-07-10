import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

interface MoodModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const MOODS: { type: MoodType; label: string; icon: string; colors: [string, string] }[] = [
  { type: 'Happy', label: 'Happy', icon: 'happy-outline', colors: ['#FCD34D', '#F59E0B'] },
  { type: 'Grateful', label: 'Grateful', icon: 'heart-outline', colors: ['#86EFAC', '#22C55E'] },
  { type: 'Hopeful', label: 'Hopeful', icon: 'sunny-outline', colors: ['#60A5FA', '#3B82F6'] },
  { type: 'Peaceful', label: 'Peaceful', icon: 'leaf-outline', colors: ['#6EE7F9', '#A78BFA'] },
  { type: 'Anxious', label: 'Anxious', icon: 'alert-circle-outline', colors: ['#FCD34D', '#F59E0B'] },
  { type: 'Sad', label: 'Sad', icon: 'sad-outline', colors: ['#93C5FD', '#60A5FA'] },
  { type: 'Overwhelmed', label: 'Overwhelmed', icon: 'warning-outline', colors: ['#F9A8D4', '#EC4899'] },
  { type: 'Angry', label: 'Angry', icon: 'flame-outline', colors: ['#F87171', '#EF4444'] },
];

// Animated Mood Chip Component
interface AnimatedMoodChipProps {
  mood: { type: MoodType; label: string; icon: string; colors: [string, string] };
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
      // Staggered entrance animation
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
      // Pulse animation when selected
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
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={mood.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.moodGradient,
            isSelected && styles.moodGradientSelected,
          ]}
        >
          <Ionicons
            name={mood.icon as any}
            size={32}
            color="#fff"
          />
          <Text style={styles.moodLabel}>{mood.label}</Text>
          {isSelected && (
            <View style={styles.checkmark}>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </View>
          )}
        </LinearGradient>
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
      // Reset state when modal opens
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

      // Create mood entry
      const entry: MoodEntry = {
        id: `mood-${Date.now()}-${Math.random()}`,
        mood: selectedMood,
        reason: selectedReasons,
        customReason: customReason.trim() || undefined,
        date: new Date().toISOString(),
        sermon,
        aiAdvice: sermon.interpretation, // Use interpretation as AI advice
      };

      // Save to store
      await addMoodEntry(entry);
      setMoodEntry(entry);

      // Show sermon modal
      setSermonModalVisible(true);
      showSuccess('Mood recorded', 'Your encouragement is ready');
    } catch (error) {
      console.error('Error generating mood sermon:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate encouragement';
      showError('Generation failed', errorMessage);
      setStep(2); // Go back to reason step
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
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                  </Pressable>
                )}
                <Text style={styles.modalTitle}>
                  {step === 1 && 'How do you feel today?'}
                  {step === 2 && 'What\'s on your mind?'}
                  {step === 3 && 'Generating your encouragement...'}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#374151" />
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
                  <Text style={styles.reasonTitle}>Why do you feel {selectedMood.toLowerCase()}?</Text>
                  
                  {/* Multiple Choice Reasons */}
                  <View style={styles.reasonChips}>
                    {reasons.map((reason) => (
                      <Pressable
                        key={reason}
                        style={[
                          styles.reasonChip,
                          selectedReasons.includes(reason) && styles.reasonChipSelected,
                        ]}
                        onPress={() => handleReasonToggle(reason)}
                      >
                        <Text
                          style={[
                            styles.reasonChipText,
                            selectedReasons.includes(reason) && styles.reasonChipTextSelected,
                          ]}
                        >
                          {reason}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Custom Reason Input */}
                  <View style={styles.customReasonContainer}>
                    <Text style={styles.customReasonLabel}>Or tell us more (optional)</Text>
                    <TextInput
                      style={styles.customReasonInput}
                      placeholder="Share what's on your heart..."
                      placeholderTextColor="#9CA3AF"
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
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>
                    Creating personalized encouragement for you...
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Footer Buttons */}
            {step < 3 && (
              <View style={styles.footer}>
                <Pressable
                  style={[styles.nextButton, !selectedMood && step === 1 && styles.nextButtonDisabled]}
                  onPress={handleNext}
                  disabled={step === 1 && !selectedMood}
                >
                  <Text style={styles.nextButtonText}>
                    {step === 1 ? 'Next' : 'Generate Encouragement'}
                  </Text>
                </Pressable>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  moodOption: {
    width: '47%',
    marginBottom: 12,
  },
  moodGradient: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    position: 'relative',
  },
  moodGradientSelected: {
    borderWidth: 3,
    borderColor: '#111827',
  },
  moodLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonContainer: {
    gap: 20,
  },
  reasonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  reasonChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reasonChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  reasonChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  reasonChipTextSelected: {
    color: '#fff',
  },
  customReasonContainer: {
    marginTop: 8,
  },
  customReasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

