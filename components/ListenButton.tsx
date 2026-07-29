import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppText from '@/components/ui/AppText';
import { isSpeechAvailable, speak, stopSpeaking } from '@/lib/speech';
import { useTheme, type AppTheme } from '@/lib/theme';

/**
 * Reads `text` aloud with the phone's own voice. Renders nothing when the
 * speech module is missing (an un-rebuilt client), rather than offering a
 * control that would do nothing.
 */
export default function ListenButton({
  text,
  label = 'Listen',
  variant = 'pill',
  tint,
  style,
}: {
  text: string;
  label?: string;
  /** 'icon' matches the 44x44 circular actions on the verse hero card. */
  variant?: 'pill' | 'icon';
  tint?: string;
  style?: object;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [speaking, setSpeaking] = useState(false);
  const available = useMemo(() => isSpeechAvailable(), []);

  // Never keep talking after the screen goes away.
  useEffect(() => () => stopSpeaking(), []);

  // A new reflection while mid-sentence should not leave the button stuck on.
  useEffect(() => {
    stopSpeaking();
    setSpeaking(false);
  }, [text]);

  if (!available || !text.trim()) return null;

  const toggle = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(text, {
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const color = tint ?? theme.color.accent;
  const icon = speaking ? 'stop-circle-outline' : 'volume-medium-outline';

  return (
    <Pressable
      onPress={toggle}
      style={[variant === 'icon' ? styles.iconBtn : styles.btn, style]}
      android_ripple={{ color: theme.color.border, borderless: variant === 'icon' }}
      accessibilityRole="button"
      accessibilityLabel={speaking ? 'Stop reading aloud' : 'Read aloud'}
    >
      <Ionicons name={icon} size={variant === 'icon' ? 22 : 17} color={color} />
      {variant === 'pill' && (
        <AppText variant="label" style={[styles.label, { color }]}>
          {speaking ? 'Stop' : label}
        </AppText>
      )}
    </Pressable>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xs,
    minHeight: 44,
    paddingHorizontal: theme.space.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(242,237,228,0.18)',
  },
  label: { color: theme.color.accent },
});
