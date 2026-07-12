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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  const { register } = useAuthStore();
  const { showError } = useToast();

  const handleRegister = async () => {
    if (!name || !email || !password || !passwordConfirmation) {
      showError('Error', 'Please fill in all fields');
      return;
    }

    if (password !== passwordConfirmation) {
      showError('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      showError('Error', 'Password must be at least 8 characters long');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      const result = await register(name, email, password, passwordConfirmation);

      if (result.success) {
        router.replace('/(protected)');
      } else {
        showError('Registration Failed', result.message || 'Registration failed');
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

            <AppText variant="title" style={styles.title}>Create Account</AppText>
            <AppText variant="body" style={styles.subtitle}>Join SermonMate and start your journey</AppText>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color={theme.color.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Full name"
                    placeholderTextColor={theme.color.textMuted}
                    autoCapitalize="words"
                  />
                </View>
              </View>

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

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.color.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={passwordConfirmation}
                    onChangeText={setPasswordConfirmation}
                    placeholder="Confirm password"
                    placeholderTextColor={theme.color.textMuted}
                    secureTextEntry={!showPasswordConfirmation}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPasswordConfirmation ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={theme.color.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <PrimaryButton
                label={isLoading ? 'Creating account...' : 'Create account'}
                onPress={handleRegister}
                loading={isLoading}
                disabled={isLoading}
                style={styles.submitButton}
              />

              <GoogleSignInButton />
            </View>

            <View style={styles.footer}>
              <AppText variant="body" style={styles.footerText}>Already have an account? </AppText>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <AppText variant="body" style={styles.linkText}>Sign in</AppText>
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
