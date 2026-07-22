import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme, type TextVariant } from '@/lib/theme';

export default function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: TextVariant }) {
  const theme = useTheme();
  return <Text {...rest} style={[theme.text[variant], style]} />;
}
