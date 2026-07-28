import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import AppText from '@/components/ui/AppText';
import PrimaryButton from '@/components/ui/PrimaryButton';
import { useTheme, type AppTheme } from '@/lib/theme';

/**
 * Shown AFTER the prayer is already logged. The note is an optional extra, never
 * a condition of the record — dismissing this sheet must never lose the entry.
 */
export default function PrayerLogSheet({
  visible,
  title,
  onSaveNote,
  onPrayWithMe,
  onClose,
  praying,
}: {
  visible: boolean;
  title: string;
  onSaveNote: (note: string) => void;
  onPrayWithMe: () => void;
  onClose: () => void;
  praying?: boolean;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) setNote('');
  }, [visible]);

  const done = () => {
    const trimmed = note.trim();
    if (trimmed) onSaveNote(trimmed);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={done}>
      <Pressable style={styles.backdrop} onPress={done} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <AppText variant="title" style={styles.title}>{title}</AppText>
          <AppText variant="caption" style={styles.sub}>Anything you want to remember?</AppText>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional — what you prayed about"
            placeholderTextColor={theme.color.textMuted}
            style={styles.input}
            multiline
            maxLength={280}
          />

          <PrimaryButton label="Done" onPress={done} />

          <Pressable onPress={onPrayWithMe} disabled={praying} style={styles.ghost}>
            <AppText variant="label" style={styles.ghostText}>
              {praying ? 'Writing a prayer…' : 'Pray with me'}
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: theme.color.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space.lg,
    paddingBottom: theme.space.xl,
    gap: theme.space.sm,
  },
  grabber: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: theme.color.border, alignSelf: 'center', marginBottom: theme.space.sm,
  },
  title: { marginBottom: 2 },
  sub: { marginBottom: theme.space.sm },
  input: {
    backgroundColor: theme.color.paper,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    color: theme.color.text,
    minHeight: 64,
    textAlignVertical: 'top',
    marginBottom: theme.space.sm,
  },
  ghost: { alignItems: 'center', paddingVertical: theme.space.md },
  ghostText: { color: theme.color.accent },
});
