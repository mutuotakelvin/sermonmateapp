import React, { useMemo } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/lib/theme';
import AppText from '@/components/ui/AppText';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  loading?: boolean;
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  destructive = true,
  loading = false,
}: ConfirmationModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText variant="title" style={styles.modalTitle}>{title}</AppText>
            <Pressable onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.color.text} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <AppText variant="body" style={styles.message}>{message}</AppText>

            <View style={styles.buttonContainer}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                disabled={loading}
              >
                <AppText variant="body" style={styles.cancelButtonText}>
                  {cancelText}
                </AppText>
              </Pressable>

              <Pressable
                style={[
                  styles.button,
                  destructive ? styles.deleteButton : styles.confirmButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={theme.color.accentText} />
                ) : (
                  <AppText style={styles.actionButtonText}>{confirmText}</AppText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.overlay,
  },
  modalContent: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.color.border,
    shadowColor: theme.color.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
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
  modalTitle: {
    fontSize: 20,
    flex: 1,
  },
  closeButton: {
    padding: theme.space.xs,
    marginLeft: theme.space.md,
  },
  content: {
    padding: theme.space.xl,
  },
  message: {
    marginBottom: theme.space.xl,
    color: theme.color.textMuted,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.space.md,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: theme.color.surfaceAlt,
  },
  confirmButton: {
    backgroundColor: theme.color.accent,
  },
  deleteButton: {
    backgroundColor: theme.color.danger,
  },
  cancelButtonText: {
    color: theme.color.text,
    fontFamily: theme.font.sansSemibold,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: theme.font.sansSemibold,
    color: theme.color.accentText,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
