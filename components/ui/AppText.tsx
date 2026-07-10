import React from 'react';
import { Text, TextProps } from 'react-native';
import { textVariants } from '@/lib/theme';

type Variant = keyof typeof textVariants;
export default function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <Text {...rest} style={[textVariants[variant], style]} />;
}
