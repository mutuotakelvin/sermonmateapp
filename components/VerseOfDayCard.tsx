import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import Card from '@/components/ui/Card';
import { theme } from '@/lib/theme';
import { useVerseStore } from '@/lib/stores/verse';
import { bundledVerseSource } from '@/lib/verses';

export default function VerseOfDayCard() {
  const router = useRouter();
  const { translation } = useVerseStore();

  const verse = useMemo(() => bundledVerseSource.getVerseForDate(new Date()), []);

  return (
    <Pressable onPress={() => router.push('/(protected)/verse' as never)} style={styles.pressable}>
      <Card tone="blush" style={styles.card}>
        <AppText variant="verse" style={styles.snippet} numberOfLines={2}>
          {verse.text[translation]}
        </AppText>
        <View style={styles.footerRow}>
          <AppText variant="label" style={styles.reference}>{verse.reference}</AppText>
          <View style={styles.ctaRow}>
            <AppText variant="label" style={styles.cta}>{"Read today's verse"}</AppText>
            <Ionicons name="chevron-forward" size={14} color={theme.color.accent} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { marginHorizontal: theme.space.lg, marginTop: theme.space.md },
  card: {
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  snippet: {
    fontSize: 15,
    lineHeight: 23,
    color: theme.color.text,
  },
  footerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: theme.space.md,
  },
  reference: { color: theme.color.textMuted },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cta: { color: theme.color.accent },
});
