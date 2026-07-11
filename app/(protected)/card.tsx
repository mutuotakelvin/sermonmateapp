import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Screen from '@/components/ui/Screen';
import { useToast } from '@/components/ToastProvider';
import ShareCard from '@/components/ShareCard';
import { CARD_THEMES, type CardContent, type CardPosition, type CardThemeKey } from '@/lib/cards';
import { captureCardToFile, saveCardImage, shareCardImage } from '@/lib/cardCapture';
import { theme } from '@/lib/theme';
import { bundledVerseSource } from '@/lib/verses';
import { useVerseStore } from '@/lib/stores/verse';

const POSITIONS: { key: CardPosition; label: string }[] = [
  { key: 'centered', label: 'Centered' },
  { key: 'bottom', label: 'Bottom' },
];

export default function CardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ text?: string; reference?: string }>();
  const { translation } = useVerseStore();
  const { showSuccess, showError, showInfo } = useToast();

  const content: CardContent = useMemo(() => {
    if (params.text) return { text: params.text, reference: params.reference || undefined };
    const v = bundledVerseSource.getVerseForDate(new Date());
    return { text: v.text[translation], reference: v.reference };
  }, [params.text, params.reference, translation]);

  const [themeKey, setThemeKey] = useState<CardThemeKey>('cream');
  const [position, setPosition] = useState<CardPosition>('centered');
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<View>(null);

  const onShare = async () => {
    setBusy(true);
    try {
      const uri = await captureCardToFile(cardRef);
      const ok = await shareCardImage(uri);
      if (!ok) showInfo('Sharing unavailable', 'This device cannot share files.');
    } catch {
      showError('Share failed', 'Could not create the card image.');
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    setBusy(true);
    try {
      const uri = await captureCardToFile(cardRef);
      const result = await saveCardImage(uri);
      if (result === 'saved') showSuccess('Saved', 'The card is in your Photos.');
      else showError('Permission needed', 'Allow photo access to save cards.');
    } catch {
      showError('Save failed', 'Could not save the card image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.color.text} />
        </Pressable>
        <AppText variant="title">Create a card</AppText>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          <ShareCard ref={cardRef} content={content} themeKey={themeKey} position={position} />
        </View>

        <AppText variant="label" style={styles.sectionLabel}>Theme</AppText>
        <View style={styles.themeRow}>
          {CARD_THEMES.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setThemeKey(t.key)}
              style={[
                styles.swatch,
                { backgroundColor: t.gradient[0], borderColor: themeKey === t.key ? theme.color.accent : theme.color.border },
              ]}
            >
              {themeKey === t.key && <Ionicons name="checkmark" size={18} color={t.textColor} />}
            </Pressable>
          ))}
        </View>

        <AppText variant="label" style={styles.sectionLabel}>Position</AppText>
        <View style={styles.segment}>
          {POSITIONS.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => setPosition(p.key)}
              style={[styles.segmentItem, position === p.key && styles.segmentItemActive]}
            >
              <AppText style={[styles.segmentText, position === p.key && styles.segmentTextActive]}>{p.label}</AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Share" onPress={onShare} loading={busy} style={styles.shareBtn} />
          <Pressable onPress={onSave} disabled={busy} style={styles.saveBtn}>
            {busy ? (
              <ActivityIndicator color={theme.color.accent} />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color={theme.color.accent} />
                <AppText style={styles.saveBtnText}>Save to Photos</AppText>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: theme.space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.space.sm },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: theme.space.xxl, gap: theme.space.lg },
  preview: { alignItems: 'center', marginTop: theme.space.md },
  sectionLabel: { marginBottom: -theme.space.sm },
  themeRow: { flexDirection: 'row', gap: theme.space.md },
  swatch: { width: 48, height: 48, borderRadius: theme.radius.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', backgroundColor: theme.color.surfaceAlt, borderRadius: theme.radius.pill, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: theme.radius.pill },
  segmentItemActive: { backgroundColor: theme.color.surface },
  segmentText: { color: theme.color.textMuted },
  segmentTextActive: { color: theme.color.text },
  actions: { gap: theme.space.md, marginTop: theme.space.sm },
  shareBtn: { width: '100%' },
  saveBtn: { flexDirection: 'row', gap: theme.space.sm, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.accent },
  saveBtnText: { color: theme.color.accent, fontFamily: theme.font.sansSemibold },
});
