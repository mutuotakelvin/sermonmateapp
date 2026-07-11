import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import { CARD_THEMES, type CardContent, type CardPosition, type CardThemeKey } from '@/lib/cards';

type Props = {
  content: CardContent;
  themeKey: CardThemeKey;
  position: CardPosition;
  width?: number;
};

const ShareCard = React.forwardRef<View, Props>(({ content, themeKey, position, width }, ref) => {
  const theme = CARD_THEMES.find((t) => t.key === themeKey) ?? CARD_THEMES[0];
  const w = width ?? Math.min(Dimensions.get('window').width - 48, 340);
  const h = (w * 16) / 9; // portrait 9:16

  const justifyContent = position === 'bottom' ? 'flex-end' : 'center';
  const alignItems = position === 'bottom' ? 'flex-start' : 'center';
  const textAlign = position === 'bottom' ? 'left' : 'center';

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width: w, height: h }]}>
      <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.body, { justifyContent, alignItems, paddingBottom: position === 'bottom' ? h * 0.14 : 0 }]}>
        <AppText variant="verse" style={[styles.verse, { color: theme.textColor, textAlign }]}>
          {content.text}
        </AppText>
        {!!content.reference && (
          <AppText variant="label" style={[styles.reference, { color: theme.refColor, textAlign }]}>
            {content.reference}
          </AppText>
        )}
      </View>
      <AppText variant="label" style={[styles.wordmark, { color: theme.wordmarkColor }]}>SermonMate</AppText>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;

const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', position: 'relative' },
  body: { flex: 1, paddingHorizontal: 28, paddingVertical: 40 },
  verse: { fontSize: 22, lineHeight: 32 },
  reference: { marginTop: 14, letterSpacing: 1 },
  wordmark: { position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontSize: 10, opacity: 0.85 },
});
