import React from 'react';
import { StyleSheet, View } from 'react-native';
import Loader from '@/components/ui/Loader';
import { useTheme } from '@/lib/theme';

/**
 * The full-screen hold shown while the app works out where to send you.
 * Uses the app's own loader so the first thing a user sees is SermonMate.
 */
export default function BootSplash({ message = 'A quiet moment…' }: { message?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.color.paper }]}>
      <Loader messages={[message]} icon="book-outline" size={120} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
