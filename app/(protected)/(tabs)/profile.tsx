import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Linking,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/stores/auth';
import Constants from 'expo-constants';
import { useTheme, type AppTheme } from '@/lib/theme';
import { useAppearanceStore, type ThemeMode } from '@/lib/stores/appearance';
import Screen from '@/components/ui/Screen';
import AppText from '@/components/ui/AppText';
import Card from '@/components/ui/Card';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useToast } from '@/components/ToastProvider';
import { presentPaywall, presentCustomerCenter, syncEntitlement } from '@/lib/purchases';
import { usePurchasesStore } from '@/lib/stores/purchases';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const APPEARANCE_OPTIONS: { mode: ThemeMode; label: string; icon: IoniconName }[] = [
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function Profile() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { user, logout } = useAuthStore();
  const isPro = usePurchasesStore((s) => s.isPro);
  const refreshPro = usePurchasesStore((s) => s.refresh);
  const appearanceMode = useAppearanceStore((s) => s.mode);
  const setAppearanceMode = useAppearanceStore((s) => s.setMode);
  const { showInfo } = useToast();

  const [signOutVisible, setSignOutVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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

  const handleConfirmSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      setSignOutVisible(false);
      router.replace('/login');
    } finally {
      setSigningOut(false);
    }
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

  const handleConfirmDelete = () => {
    setDeleteVisible(false);
    Linking.openURL('mailto:info@bobakdevs.com?subject=Account Deletion Request');
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

        {/* Appearance */}
        <View style={styles.section}>
          <AppText variant="label" style={styles.sectionLabel}>Appearance</AppText>
          <Card style={styles.appearanceCard}>
            <View style={styles.segment}>
              {APPEARANCE_OPTIONS.map((option) => {
                const active = appearanceMode === option.mode;
                return (
                  <Pressable
                    key={option.mode}
                    onPress={() => setAppearanceMode(option.mode)}
                    style={[styles.segmentItem, active && styles.segmentItemActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons
                      name={option.icon}
                      size={18}
                      color={active ? theme.color.accentText : theme.color.textMuted}
                    />
                    <AppText style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <AppText variant="caption" style={styles.appearanceHint}>
              {appearanceMode === 'system'
                ? 'Following your device setting.'
                : `Always ${appearanceMode}, whatever your device is set to.`}
            </AppText>
          </Card>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <AppText variant="label" style={styles.sectionLabel}>Account</AppText>
          <Card style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionRow} onPress={handleReportIssuePress} activeOpacity={0.7}>
              <Ionicons name="flag-outline" size={20} color={theme.color.text} />
              <AppText variant="body" style={styles.actionText}>Report Issue</AppText>
              <Ionicons name="chevron-forward" size={16} color={theme.color.textMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.actionRow} onPress={() => setDeleteVisible(true)} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={20} color={theme.color.danger} />
              <AppText variant="body" style={styles.deleteText}>Delete Account</AppText>
              <Ionicons name="chevron-forward" size={16} color={theme.color.danger} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={() => setSignOutVisible(true)} activeOpacity={0.8}>
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

      <ConfirmationModal
        visible={signOutVisible}
        title="Sign out?"
        message="You'll need to sign in again to reach your reflections and mood history."
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleConfirmSignOut}
        onCancel={() => setSignOutVisible(false)}
        destructive
        loading={signingOut}
      />
      <ConfirmationModal
        visible={deleteVisible}
        title="Delete account?"
        message="To request account deletion, email info@bobakdevs.com. We'll process your request and delete all associated data."
        confirmText="Open Email"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteVisible(false)}
        destructive
      />
    </Screen>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
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
  section: {
    gap: theme.space.sm,
  },
  sectionLabel: {
    paddingHorizontal: theme.space.xs,
  },
  actionsCard: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  appearanceCard: {
    gap: theme.space.md,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: theme.color.surfaceAlt,
    borderRadius: theme.radius.pill,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xs,
    minHeight: 40,
    borderRadius: theme.radius.pill,
  },
  segmentItemActive: {
    backgroundColor: theme.color.accent,
  },
  segmentText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 14,
    color: theme.color.textMuted,
  },
  segmentTextActive: {
    color: theme.color.accentText,
  },
  appearanceHint: {
    color: theme.color.textMuted,
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
