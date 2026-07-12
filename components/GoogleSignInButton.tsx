import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import { useToast } from '@/components/ToastProvider';
import { useAuthStore } from '@/lib/stores/auth';
import { theme } from '@/lib/theme';

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const { showError } = useToast();
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const onPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        router.replace('/(protected)');
      } else if (!result.cancelled && result.message) {
        showError('Google sign-in failed', result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <AppText variant="caption" style={styles.orText}>or</AppText>
        <View style={styles.line} />
      </View>
      <TouchableOpacity style={styles.button} onPress={onPress} disabled={loading} activeOpacity={0.8}>
        {loading ? (
          <ActivityIndicator color={theme.color.text} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color={theme.color.text} />
            <AppText variant="body" style={styles.label}>Continue with Google</AppText>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: theme.space.lg, gap: theme.space.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  line: { flex: 1, height: 1, backgroundColor: theme.color.border },
  orText: { color: theme.color.textMuted },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    height: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surface,
  },
  label: { fontFamily: theme.font.sansSemibold, color: theme.color.text },
});
