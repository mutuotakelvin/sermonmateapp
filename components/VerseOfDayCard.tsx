import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeStore } from '@/lib/stores/theme';
import { useVerseStore } from '@/lib/stores/verse';
import { bundledVerseSource } from '@/lib/verses';

const GRADIENT_LIGHT = ['#22D3EE', '#0891B2'] as const;
const GRADIENT_DARK = ['#0E7490', '#155E75'] as const;

export default function VerseOfDayCard() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const { translation } = useVerseStore();
  const isDark = theme === 'dark';

  const verse = useMemo(() => bundledVerseSource.getVerseForDate(new Date()), []);

  return (
    <Pressable onPress={() => router.push('/(protected)/verse' as never)} style={styles.pressable}>
      <LinearGradient
        colors={isDark ? GRADIENT_DARK : GRADIENT_LIGHT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.snippet} numberOfLines={2}>
          {verse.text[translation]}
        </Text>
        <View style={styles.footerRow}>
          <Text style={styles.reference}>{verse.reference}</Text>
          <View style={styles.ctaRow}>
            <Text style={styles.cta}>{"Read today's verse"}</Text>
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { marginHorizontal: 16, marginTop: 12 },
  card: {
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  snippet: { fontFamily: 'Lora_500Medium', fontSize: 15, lineHeight: 23, color: '#fff' },
  footerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12,
  },
  reference: {
    color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cta: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
