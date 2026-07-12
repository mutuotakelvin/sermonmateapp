import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/stores/auth';
import Constants from 'expo-constants';
import { theme } from '@/lib/theme';
import Screen from '@/components/ui/Screen';
import AppText from '@/components/ui/AppText';
import Card from '@/components/ui/Card';
import { useToast } from '@/components/ToastProvider';
import { presentPaywall, presentCustomerCenter, syncEntitlement } from '@/lib/purchases';
import { usePurchasesStore } from '@/lib/stores/purchases';

export default function Profile() {
  const { user, logout } = useAuthStore();
  const isPro = usePurchasesStore((s) => s.isPro);
  const refreshPro = usePurchasesStore((s) => s.refresh);
  const { showInfo } = useToast();

  const handleUpgrade = async () => {
    const bought = await presentPaywall();
    if (bought) {
      try { await syncEntitlement(); } catch { /* webhook will backstop */ }
      await refreshPro();
    }
  };

  const handleManageSubscription = async () => {
    try {
      await presentCustomerCenter();
      await refreshPro();
    } catch {
      showInfo('Unavailable', 'Subscription management is not available right now.');
    }
  };

  const getInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return user.name.charAt(0).toUpperCase();
  };

  const getAvatarColor = () => {
    if (!user?.name) return theme.color.accent;
    const colorOptions = [
      theme.color.accent,
      theme.color.sage,
      theme.color.dustyBlue,
      theme.color.rust,
      theme.color.deepBlue,
      theme.color.olive,
      theme.color.danger,
    ];
    const index = user.name.charCodeAt(0) % colorOptions.length;
    return colorOptions[index];
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleTermsPress = () => {
    Linking.openURL('https://sermonmate.bobakdevs.com/terms');
  };

  const handlePrivacyPolicyPress = () => {
    Linking.openURL('https://sermonmate.bobakdevs.com/privacy');
  };

  const handleReportIssuePress = () => {
    Linking.openURL('mailto:info@bobakdevs.com?subject=Report Issue');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'To request account deletion, please email info@bobakdevs.com. We will process your request and delete all associated data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Email',
          style: 'destructive',
          onPress: () => {
            Linking.openURL('mailto:info@bobakdevs.com?subject=Account Deletion Request');
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={[styles.avatarContainer, { backgroundColor: getAvatarColor() }]}>
            <AppText style={styles.avatarText}>{getInitials()}</AppText>
          </View>
          <AppText variant="display" style={styles.name}>{user?.name || 'User'}</AppText>
          <AppText variant="caption" style={styles.email}>{user?.email || ''}</AppText>
        </Card>

        {/* SermonMate Pro */}
        <Card style={styles.actionsCard}>
          {isPro ? (
            <TouchableOpacity style={styles.actionRow} onPress={handleManageSubscription} activeOpacity={0.7}>
              <Ionicons name="sparkles" size={20} color={theme.color.accent} />
              <AppText variant="body" style={styles.actionText}>SermonMate Pro · Active</AppText>
              <AppText variant="caption" style={styles.manageLink}>Manage</AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionRow} onPress={handleUpgrade} activeOpacity={0.7}>
              <Ionicons name="sparkles-outline" size={20} color={theme.color.accent} />
              <AppText variant="body" style={styles.upgradeText}>Upgrade to SermonMate Pro</AppText>
              <Ionicons name="chevron-forward" size={16} color={theme.color.accent} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Account Actions */}
        <Card style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={handleReportIssuePress} activeOpacity={0.7}>
            <Ionicons name="flag-outline" size={20} color={theme.color.text} />
            <AppText variant="body" style={styles.actionText}>Report Issue</AppText>
            <Ionicons name="chevron-forward" size={16} color={theme.color.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color={theme.color.danger} />
            <AppText variant="body" style={styles.deleteText}>Delete Account</AppText>
            <Ionicons name="chevron-forward" size={16} color={theme.color.danger} />
          </TouchableOpacity>
        </Card>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={theme.color.accentText} />
          <AppText style={styles.signOutText}>Sign Out</AppText>
        </TouchableOpacity>

        {/* Legal Links */}
        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={handleTermsPress}>
            <AppText variant="caption" style={styles.linkText}>Terms and Conditions</AppText>
          </TouchableOpacity>
          <AppText variant="caption" style={styles.linkSeparator}>·</AppText>
          <TouchableOpacity onPress={handlePrivacyPolicyPress}>
            <AppText variant="caption" style={styles.linkText}>Privacy Policy</AppText>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <AppText variant="caption" style={styles.versionText}>
          Version {Constants.expoConfig?.version || '1.0.0'}
        </AppText>
        <AppText variant="caption" style={styles.versionText}>Powered by bobakdevs</AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: theme.space.xl,
    paddingBottom: 40,
    gap: theme.space.lg,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: theme.space.xl,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.lg,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: theme.font.serifItalic,
    color: theme.color.accentText,
  },
  name: {
    marginBottom: theme.space.xs,
    textAlign: 'center',
  },
  email: {
    textAlign: 'center',
  },
  actionsCard: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.space.lg,
    paddingHorizontal: theme.space.lg,
    gap: theme.space.md,
  },
  actionText: {
    flex: 1,
    color: theme.color.text,
  },
  upgradeText: {
    flex: 1,
    color: theme.color.accent,
    fontFamily: theme.font.sansSemibold,
  },
  manageLink: {
    color: theme.color.accent,
  },
  deleteText: {
    flex: 1,
    color: theme.color.danger,
  },
  divider: {
    height: 1,
    backgroundColor: theme.color.border,
    marginHorizontal: theme.space.lg,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.danger,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.lg,
    gap: theme.space.sm,
  },
  signOutText: {
    fontFamily: theme.font.sansSemibold,
    fontSize: 16,
    color: theme.color.accentText,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.space.sm,
    marginTop: theme.space.sm,
  },
  linkText: {
    color: theme.color.textMuted,
    textDecorationLine: 'underline',
  },
  linkSeparator: {
    color: theme.color.textMuted,
  },
  versionText: {
    textAlign: 'center',
  },
});
