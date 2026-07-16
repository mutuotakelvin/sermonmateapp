import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ReflectionCard from '@/components/ReflectionCard';
import SermonModal from '@/components/SermonModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useToast } from '@/components/ToastProvider';
import Screen from '@/components/ui/Screen';
import AppText from '@/components/ui/AppText';
import { getSermons, deleteSermon } from '@/lib/sermonApi';
import { theme } from '@/lib/theme';
import type { SavedSermon } from '@/lib/types';

export default function ReflectionsScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const [sermons, setSermons] = useState<SavedSermon[]>([]);
  const [selected, setSelected] = useState<SavedSermon | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toDelete, setToDelete] = useState<SavedSermon | null>(null);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setSermons(await getSermons());
    } catch (error) {
      console.error('Error loading reflections:', error);
      setSermons([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePress = (sermon: SavedSermon) => {
    setSelected(sermon);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelected(null);
  };

  const handleDeletePress = (sermon: SavedSermon) => {
    setToDelete(sermon);
    setDeleteVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteSermon(toDelete.id);
      showSuccess('Reflection removed', 'The reflection has been deleted');
      setDeleteVisible(false);
      setToDelete(null);
      await load();
    } catch (error) {
      console.error('Error deleting reflection:', error);
      showError('Delete failed', error instanceof Error ? error.message : 'Failed to delete reflection');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteVisible(false);
    setToDelete(null);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.color.text} />
        </Pressable>
        <AppText variant="display">My Reflections</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {sermons.length === 0 ? (
          <View style={styles.emptyState}>
            <AppText variant="body" style={styles.emptyStateText}>No reflections yet</AppText>
            <AppText variant="caption" style={styles.emptyStateSubtext}>
              Save your first reflection to see it here
            </AppText>
          </View>
        ) : (
          <View style={styles.grid}>
            {sermons.map((sermon) => (
              <ReflectionCard
                key={sermon.id}
                sermon={sermon}
                variant="grid"
                onPress={handlePress}
                onDelete={handleDeletePress}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <SermonModal
        visible={modalVisible}
        sermon={null}
        savedSermon={selected}
        topic=""
        onClose={handleModalClose}
        onSave={load}
        loading={false}
      />
      <ConfirmationModal
        visible={deleteVisible}
        title="Delete reflection?"
        message="This reflection will be deleted permanently. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        destructive={true}
        loading={deleting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    paddingVertical: theme.space.md,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: theme.space.xxl },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.md,
  },
  emptyState: { paddingVertical: theme.space.xxl, alignItems: 'center' },
  emptyStateText: { color: theme.color.textMuted, marginBottom: theme.space.xs },
  emptyStateSubtext: { textAlign: 'center', color: theme.color.textMuted },
});
