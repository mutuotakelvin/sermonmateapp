import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '@/components/ui/AppText';
import ListenButton from '@/components/ListenButton';
import { useToast } from '@/components/ToastProvider';
import { useTheme, type AppTheme } from '@/lib/theme';

/**
 * Copy / Listen / Share / Card for a generated prayer.
 *
 * Defined once and used in both the post-generation modal and the history row.
 * The "8 of 4 today" bug (f4969bc, f7bd4a4) came from the same idea being
 * re-derived in three places and drifting apart; four actions in two places is
 * the same trap.
 *
 * Kept local rather than beside formatVerseForShare in lib/verses.ts — a prayer
 * is not a verse, and that module has no other reason to know prayers exist.
 */
function formatPrayerForShare(text: string): string {
  return `${text}\n\n— SermonMate`;
}

export default function PrayerActions({ text }: { text: string }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(formatPrayerForShare(text));
      showSuccess('Copied');
    } catch {
      showError('Copy failed', 'Could not copy the prayer.');
    }
  };

  const share = async () => {
    try {
      await Share.share({ message: formatPrayerForShare(text) });
    } catch {
      showError('Share failed', 'Could not open the share sheet.');
    }
  };

  // The card route already accepts arbitrary text — see the ShareCard comment
  // about cards carrying a whole message, story or prayer.
  const makeCard = () => router.push({ pathname: '/(protected)/card', params: { text } });

  return (
    <View style={styles.row}>
      <Pressable
        onPress={copy}
        style={styles.action}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Copy prayer"
      >
        <Ionicons name="copy-outline" size={18} color={theme.color.accent} />
        <AppText variant="label" style={styles.label}>Copy</AppText>
      </Pressable>

      <ListenButton text={text} />

      <Pressable
        onPress={share}
        style={styles.action}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Share prayer"
      >
        <Ionicons name="share-outline" size={18} color={theme.color.accent} />
        <AppText variant="label" style={styles.label}>Share</AppText>
      </Pressable>

      <Pressable
        onPress={makeCard}
        style={styles.action}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="Make a card from this prayer"
      >
        <Ionicons name="image-outline" size={18} color={theme.color.accent} />
        <AppText variant="label" style={styles.label}>Card</AppText>
      </Pressable>
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.space.md,
    marginTop: theme.space.sm,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  label: { color: theme.color.accent },
});
