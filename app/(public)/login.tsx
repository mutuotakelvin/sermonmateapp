import { useToast } from '@/components/ToastProvider';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { useAuthStore } from '@/lib/stores/auth';
import { theme } from '@/lib/theme';
import AppText from '@/components/ui/AppText';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Screen from '@/components/ui/Screen';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuthStore();
  const { showError } = useToast();

  const handleLogin = async () => {
    if (!email || !password) {
      showError('Error', 'Please fill in all fields');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        router.replace('/(protected)');
      } else {
        showError('Login Failed', result.message || 'Invalid credentials');
      }
    } catch {
      showError('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen style={styles.screenInner}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Wordmark */}
            <View style={styles.wordmarkContainer}>
              <AppText variant="display" style={styles.wordmark}>SermonMate</AppText>
              <View style={styles.divider} />
            </View>

            <AppText variant="title" style={styles.title}>Welcome Back</AppText>
            <AppText variant="body" style={styles.subtitle}>Sign in to continue your journey</AppText>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={theme.color.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email address"
                    placeholderTextColor={theme.color.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.color.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor={theme.color.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={theme.color.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <PrimaryButton
                label={isLoading ? 'Signing in...' : 'Sign in'}
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                style={styles.submitButton}
              />

              <GoogleSignInButton />
            </View>

            <View style={styles.footer}>
              <AppText variant="body" style={styles.footerText}>Don't have an account? </AppText>
              <Link href="/sign-up" asChild>
                <TouchableOpacity>
                  <AppText variant="body" style={styles.linkText}>Sign up</AppText>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    paddingHorizontal: 0,
  },
  kav: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: theme.space.xxl,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.space.xl,
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  wordmarkContainer: {
    alignItems: 'center',
    marginBottom: theme.space.xxl,
  },
  wordmark: {
    fontSize: 32,
    textAlign: 'center',
    color: theme.color.accent,
  },
  divider: {
    marginTop: theme.space.md,
    width: 40,
    height: 2,
    backgroundColor: theme.color.sand,
    borderRadius: theme.radius.pill,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.space.sm,
    color: theme.color.text,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: theme.space.xxl,
    color: theme.color.textMuted,
  },
  form: {
    marginBottom: theme.space.xxl,
  },
  inputContainer: {
    marginBottom: theme.space.xl,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space.lg,
    ...Platform.select({
      ios: {
        shadowColor: theme.color.charcoal,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputIcon: {
    marginRight: theme.space.md,
  },
  input: {
    flex: 1,
    paddingVertical: theme.space.lg,
    fontSize: 15,
    fontFamily: theme.font.sans,
    color: theme.color.text,
  },
  eyeIcon: {
    padding: theme.space.xs,
  },
  submitButton: {
    marginTop: theme.space.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.space.sm,
  },
  footerText: {
    color: theme.color.textMuted,
  },
  linkText: {
    color: theme.color.accent,
    fontFamily: theme.font.sansSemibold,
  },
});
