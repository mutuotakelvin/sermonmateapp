import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import AppText from '@/components/ui/AppText';
import { useTheme, type AppTheme } from '@/lib/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface LoaderProps {
  /** Rotating reassurance copy. The first entry shows immediately. */
  messages?: string[];
  /** Icon at the centre of the glow. */
  icon?: IoniconName;
  /** Diameter of the outermost ripple. */
  size?: number;
}

const RIPPLE_DURATION = 2400;
const RIPPLE_COUNT = 3;
const MESSAGE_INTERVAL = 2800;

/**
 * A candle-glow loader: concentric rings breathing outward from a warm centre,
 * with copy that changes while the user waits. Replaces the stock spinner so
 * waiting still feels like SermonMate rather than like a system dialog.
 */
export default function Loader({
  messages = ['Preparing your reflection…'],
  icon = 'book-outline',
  size = 132,
}: LoaderProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return;
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, MESSAGE_INTERVAL);
    return () => clearInterval(id);
  }, [messages]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.glow, { width: size, height: size }]}>
        {Array.from({ length: RIPPLE_COUNT }).map((_, i) => (
          <Ripple
            key={i}
            delay={(RIPPLE_DURATION / RIPPLE_COUNT) * i}
            size={size}
            color={theme.color.accent}
            enabled={!reducedMotion}
          />
        ))}
        <Core color={theme.color.accent} background={theme.color.surfaceAlt} icon={icon} enabled={!reducedMotion} />
      </View>

      <AppText variant="verse" style={styles.message}>
        {messages[messageIndex]}
      </AppText>
    </View>
  );
}

function Ripple({
  delay, size, color, enabled,
}: { delay: number; size: number; color: string; enabled: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      progress.value = 0.35;
      return;
    }
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: RIPPLE_DURATION, easing: Easing.out(Easing.ease) }), -1, false)
    );
  }, [delay, enabled, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.42 + progress.value * 0.58 }],
    opacity: (1 - progress.value) * 0.5,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

function Core({
  color, background, icon, enabled,
}: { color: string; background: string; icon: IoniconName; enabled: boolean }) {
  const breath = useSharedValue(0);

  useEffect(() => {
    if (!enabled) return;
    breath.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [enabled, breath]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * 0.08 }],
  }));

  return (
    <Animated.View style={[coreStyles.core, { backgroundColor: background }, style]}>
      <Ionicons name={icon} size={26} color={color} />
    </Animated.View>
  );
}

const coreStyles = StyleSheet.create({
  core: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xl,
    padding: theme.space.xl,
  },
  glow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 26,
    color: theme.color.textMuted,
    maxWidth: 280,
  },
});
