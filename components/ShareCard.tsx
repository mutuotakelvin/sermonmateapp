import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import { CARD_THEMES, type CardContent, type CardPosition, type CardThemeKey } from '@/lib/cards';
import { theme as appTheme } from '@/lib/theme';

type Props = {
  content: CardContent;
  themeKey: CardThemeKey;
  position: CardPosition;
  width?: number;
  gradient?: [string, string];
  textColor?: string;
  font?: 'serif' | 'sans';
  fullBleed?: boolean;
};

const ShareCard = React.forwardRef<View, Props>(({ content, themeKey, position, width, gradient, textColor, font, fullBleed }, ref) => {
  const theme = CARD_THEMES.find((t) => t.key === themeKey) ?? CARD_THEMES[0];
  const gradientColors = gradient ?? theme.gradient;
  const verseColor = textColor ?? theme.textColor;
  const refColor = textColor ? `${textColor}CC` : theme.refColor;
  const wordmarkColor = textColor ? `${textColor}99` : theme.wordmarkColor;
  const w = width ?? Math.min(Dimensions.get('window').width - 48, 340);
  const h = (w * 16) / 9; // portrait 9:16

  const justifyContent = position === 'bottom' ? 'flex-end' : 'center';
  const alignItems = position === 'bottom' ? 'flex-start' : 'center';
  const textAlign = position === 'bottom' ? 'left' : 'center';

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width: w, height: h }, fullBleed && styles.fullBleed]}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.body, { justifyContent, alignItems, paddingBottom: position === 'bottom' ? h * 0.14 : 0 }]}>
        <AppText variant="verse" style={[styles.verse, { color: verseColor, textAlign }, font === 'sans' && styles.verseSans]}>
          {content.text}
        </AppText>
        {!!content.reference && (
          <AppText variant="label" style={[styles.reference, { color: refColor, textAlign }]}>
            {content.reference}
          </AppText>
        )}
      </View>
      <AppText variant="label" style={[styles.wordmark, { color: wordmarkColor }]}>SermonMate</AppText>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;

const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', position: 'relative' },
  fullBleed: { borderRadius: 0 },
  body: { flex: 1, paddingHorizontal: 28, paddingVertical: 40 },
  verse: { fontSize: 22, lineHeight: 32 },
  verseSans: { fontFamily: appTheme.font.sans },
  reference: { marginTop: 14, letterSpacing: 1 },
  wordmark: { position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontSize: 10, opacity: 0.85 },
});
