import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Screen from '@/components/ui/Screen';
import AppText from '@/components/ui/AppText';
import { theme } from '@/lib/theme';
import { WALLPAPERS, WALLPAPER_CATEGORIES, type WallpaperCategory } from '@/lib/wallpapers';

export default function WallpapersScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<'All' | WallpaperCategory>('All');

  const shown = category === 'All' ? WALLPAPERS : WALLPAPERS.filter((w) => w.category === category);

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.color.text} />
        </Pressable>
        <AppText variant="title">Wallpapers</AppText>
        <View style={styles.backButton} />
      </View>

      <View style={styles.chips}>
        {WALLPAPER_CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.chip, category === c && styles.chipActive]}
          >
            <AppText style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</AppText>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {shown.map((w) => (
          <Pressable
            key={w.key}
            style={styles.tileWrap}
            onPress={() =>
              router.push({ pathname: '/(protected)/wallpaper-editor', params: { wallpaper: w.key } } as never)
            }
          >
            <LinearGradient colors={w.gradient} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={styles.tile} />
            <AppText variant="caption" style={styles.tileLabel}>{w.label}</AppText>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: theme.space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.space.sm },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm, marginBottom: theme.space.md },
  chip: { paddingHorizontal: theme.space.md, height: 36, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.surfaceAlt },
  chipActive: { backgroundColor: theme.color.accent },
  chipText: { color: theme.color.textMuted, fontFamily: theme.font.sansMedium, fontSize: 13 },
  chipTextActive: { color: theme.color.accentText },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.space.md, paddingBottom: theme.space.xxl },
  tileWrap: { width: '47%' },
  tile: { width: '100%', aspectRatio: 9 / 16, borderRadius: theme.radius.md },
  tileLabel: { marginTop: theme.space.xs },
});
