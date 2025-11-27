import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/lib/stores/theme';
import { colors } from '@/utils/colors';

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
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const dynamicStyles = getStyles(isDark);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={[styles.modalContent, dynamicStyles.modalContent]}>
          <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>{title}</Text>
            <Pressable onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={isDark ? "#fff" : "#374151"} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <Text style={[styles.message, dynamicStyles.message]}>{message}</Text>

            <View style={styles.buttonContainer}>
              <Pressable
                style={[styles.button, styles.cancelButton, dynamicStyles.cancelButton]}
                onPress={onCancel}
                disabled={loading}
              >
                <Text style={[styles.buttonText, dynamicStyles.cancelButtonText]}>
                  {cancelText}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.button,
                  destructive ? styles.deleteButton : styles.confirmButton,
                  dynamicStyles.deleteButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>{confirmText}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
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
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  content: {
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    modalContent: {
      backgroundColor: isDark ? '#1f2937' : '#fff',
    },
    modalHeader: {
      borderBottomColor: isDark ? '#374151' : '#E5E7EB',
    },
    modalTitle: {
      color: isDark ? '#fff' : '#111827',
    },
    message: {
      color: isDark ? '#d1d5db' : '#374151',
    },
    cancelButton: {
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
    },
    cancelButtonText: {
      color: isDark ? '#fff' : '#374151',
    },
    deleteButton: {
      backgroundColor: colors.error,
    },
  });

