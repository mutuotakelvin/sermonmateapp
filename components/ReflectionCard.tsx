import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '@/components/ui/Card';
import AppText from '@/components/ui/AppText';
import { useTheme, type AppTheme } from '@/lib/theme';
import type { SavedSermon } from '@/lib/types';

export type ReflectionCardVariant = 'strip' | 'grid';

interface ReflectionCardProps {
  sermon: SavedSermon;
  variant: ReflectionCardVariant;
  onPress: (sermon: SavedSermon) => void;
  onDelete?: (sermon: SavedSermon) => void;
}

// Reflection color id → Card tone (theme.color key). Owned here because this is
// now the only place that maps a saved reflection's color to a visual tone.
const COLOR_TONE_MAP: Record<string, keyof AppTheme['color']> = {
  '1': 'sage',
  '2': 'sand',
  '3': 'dustyBlue',
  '4': 'olive',
  '5': 'blush',
  '6': 'rust',
};

function toneFor(colorId: string): keyof AppTheme['color'] {
  return COLOR_TONE_MAP[colorId] ?? 'sage';
}

export default function ReflectionCard({ sermon, variant, onPress, onDelete }: ReflectionCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const showDelete = variant === 'grid' && !!onDelete;

  return (
    <Pressable
      style={variant === 'strip' ? styles.stripWrapper : styles.gridWrapper}
      onPress={() => onPress(sermon)}
    >
      <Card tone={toneFor(sermon.color)} style={styles.card}>
        {showDelete && (
          <View style={styles.deleteButtonContainer} pointerEvents="box-none">
            <Pressable style={styles.deleteButton} onPress={() => onDelete!(sermon)}>
              <Ionicons name="trash-outline" size={18} color={theme.color.text} style={{ opacity: 0.7 }} />
            </Pressable>
          </View>
        )}
        <AppText style={styles.title} numberOfLines={2}>
          {sermon.title}
        </AppText>
        <AppText variant="body" style={styles.description} numberOfLines={2}>
          {sermon.interpretation.slice(0, 100)}...
        </AppText>
        <View style={styles.footer}>
          <AppText variant="caption">{sermon.date}</AppText>
        </View>
      </Card>
    </Pressable>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  stripWrapper: { width: 160 },
  gridWrapper: { width: '48%' },
  card: { minHeight: 160, justifyContent: 'space-between' },
  deleteButtonContainer: {
    position: 'absolute',
    top: theme.space.md,
    right: theme.space.md,
    zIndex: 10,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.font.serif,
    fontSize: 16,
    lineHeight: 22,
    color: theme.color.text,
    marginBottom: theme.space.sm,
    marginTop: theme.space.xs,
  },
  description: {
    color: theme.color.text,
    opacity: 0.8,
    flex: 1,
  },
  footer: {
    marginTop: theme.space.md,
    alignItems: 'flex-end',
  },
});
