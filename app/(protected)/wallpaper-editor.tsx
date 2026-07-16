import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Screen from '@/components/ui/Screen';
import AppText from '@/components/ui/AppText';
import PrimaryButton from '@/components/ui/PrimaryButton';
import ShareCard from '@/components/ShareCard';
import ReflectionPickerModal from '@/components/ReflectionPickerModal';
import { useToast } from '@/components/ToastProvider';
import { WALLPAPERS, TEXT_COLORS, type WallpaperFont } from '@/lib/wallpapers';
import { splitVerseString, type CardContent } from '@/lib/cards';
import { captureCardToFile, saveCardImage, shareCardImage } from '@/lib/cardCapture';
import { bundledVerseSource } from '@/lib/verses';
import { useVerseStore } from '@/lib/stores/verse';
import { theme } from '@/lib/theme';

type Source = 'verse' | 'reflection';

export default function WallpaperEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ wallpaper?: string }>();
  const { translation } = useVerseStore();
  const { showSuccess, showError, showInfo } = useToast();

  const wallpaper = useMemo(
    () => WALLPAPERS.find((w) => w.key === params.wallpaper) ?? WALLPAPERS[0],
    [params.wallpaper]
  );

  const todayVerse = useMemo((): CardContent => {
    const v = bundledVerseSource.getVerseForDate(new Date());
    return { text: v.text[translation], reference: v.reference };
  }, [translation]);

  const [source, setSource] = useState<Source>('verse');
  const [content, setContent] = useState<CardContent>(todayVerse);
  const [font, setFont] = useState<WallpaperFont>('serif');
  const [textColor, setTextColor] = useState(TEXT_COLORS[0].color);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const cardRef = useRef<View>(null);

  const chooseVerseSource = () => {
    setSource('verse');
    setContent(todayVerse);
  };

  const handleReflectionSelected = (verse: string) => {
    setContent(splitVerseString(verse));
    setSource('reflection');
    setPickerVisible(false);
  };

  const onShare = async () => {
    setBusy('share');
    try {
      const uri = await captureCardToFile(cardRef);
      const ok = await shareCardImage(uri);
      if (!ok) showInfo('Sharing unavailable', 'This device cannot share files.');
    } catch {
      showError('Share failed', 'Could not create the wallpaper image.');
    } finally {
      setBusy(null);
    }
  };

  const onSave = async () => {
    setBusy('save');
    try {
      const uri = await captureCardToFile(cardRef);
      const result = await saveCardImage(uri);
      if (result === 'saved') showSuccess('Saved', 'The wallpaper is in your Photos.');
      else showError('Permission needed', 'Allow photo access to save wallpapers.');
    } catch {
      showError('Save failed', 'Could not save the wallpaper image.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.color.text} />
        </Pressable>
        <AppText variant="title">{wallpaper.label}</AppText>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          <ShareCard
            ref={cardRef}
            content={content}
            themeKey="cream"
            position="centered"
            gradient={wallpaper.gradient}
            textColor={textColor}
            font={font}
            fullBleed
          />
        </View>

        <AppText variant="label" style={styles.sectionLabel}>Text</AppText>
        <View style={styles.segment}>
          <Pressable onPress={chooseVerseSource} style={[styles.segmentItem, source === 'verse' && styles.segmentItemActive]}>
            <AppText style={[styles.segmentText, source === 'verse' && styles.segmentTextActive]}>Verse of the Day</AppText>
          </Pressable>
          <Pressable onPress={() => setPickerVisible(true)} style={[styles.segmentItem, source === 'reflection' && styles.segmentItemActive]}>
            <AppText style={[styles.segmentText, source === 'reflection' && styles.segmentTextActive]}>My Reflections</AppText>
          </Pressable>
        </View>

        <AppText variant="label" style={styles.sectionLabel}>Font</AppText>
        <View style={styles.segment}>
          {(['serif', 'sans'] as WallpaperFont[]).map((f) => (
            <Pressable key={f} onPress={() => setFont(f)} style={[styles.segmentItem, font === f && styles.segmentItemActive]}>
              <AppText style={[styles.segmentText, font === f && styles.segmentTextActive]}>{f === 'serif' ? 'Serif' : 'Sans'}</AppText>
            </Pressable>
          ))}
        </View>

        <AppText variant="label" style={styles.sectionLabel}>Text color</AppText>
        <View style={styles.colorRow}>
          {TEXT_COLORS.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => setTextColor(c.color)}
              style={[styles.swatch, { backgroundColor: c.color }, textColor === c.color && styles.swatchSelected]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Share" onPress={onShare} loading={busy === 'share'} disabled={busy !== null} style={styles.shareBtn} />
          <Pressable onPress={onSave} disabled={busy !== null} style={styles.saveBtn}>
            {busy === 'save' ? (
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

      <ReflectionPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleReflectionSelected}
      />
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
  segment: { flexDirection: 'row', backgroundColor: theme.color.surfaceAlt, borderRadius: theme.radius.pill, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: theme.radius.pill },
  segmentItemActive: { backgroundColor: theme.color.surface },
  segmentText: { color: theme.color.textMuted },
  segmentTextActive: { color: theme.color.text },
  colorRow: { flexDirection: 'row', gap: theme.space.md },
  swatch: { width: 44, height: 44, borderRadius: theme.radius.pill, borderWidth: 2, borderColor: theme.color.border },
  swatchSelected: { borderColor: theme.color.accent },
  actions: { gap: theme.space.md, marginTop: theme.space.sm },
  shareBtn: { width: '100%' },
  saveBtn: { flexDirection: 'row', gap: theme.space.sm, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.color.accent },
  saveBtnText: { color: theme.color.accent, fontFamily: theme.font.sansSemibold },
});
