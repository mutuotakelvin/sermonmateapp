import React, { useMemo, useState } from 'react';
import { Pressable, PressableProps, StyleSheet, Text } from 'react-native';
import { useTheme, type AppTheme } from '@/lib/theme';

export default function Button({ children, ...props }: PressableProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [isPressed, setIsPressed] = useState(false);
  return (
    <Pressable
      style={[styles.button, isPressed && styles.buttonPressed]}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      {...props}
    >
      {typeof children === 'string' ? <Text style={styles.text}>{children}</Text> : children}
    </Pressable>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  button: {
    backgroundColor: theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.pill,
  },
  buttonPressed: {
    backgroundColor: theme.color.rust,
    opacity: 0.8,
  },
  text: {
    color: theme.color.accentText,
    fontFamily: theme.font.sansSemibold,
  },
});
