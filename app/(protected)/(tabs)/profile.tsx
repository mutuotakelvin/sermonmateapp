import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/stores/auth';
import Constants from 'expo-constants';

export default function Profile() {
  const { user, logout } = useAuthStore();

  const getInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return user.name.charAt(0).toUpperCase();
  };

  const getAvatarColor = () => {
    if (!user?.name) return '#3b82f6';
    const colorOptions = [
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
      '#f59e0b',
      '#10b981',
      '#ef4444',
      '#06b6d4',
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatarContainer, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'User'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.reportIssueButton} onPress={handleReportIssuePress}>
            <Ionicons name="flag-outline" size={18} color="#111827" />
            <Text style={styles.reportIssueText}>Report Issue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Links */}
        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={handleTermsPress}>
            <Text style={styles.linkText}>Terms and Conditions</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePrivacyPolicyPress}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>Version {Constants.expoConfig?.version || '1.0.0'}</Text>
        <Text style={styles.versionText}>Powered by bobakdevs</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#6b7280',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  reportIssueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  reportIssueText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  deleteAccountText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  linkText: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'underline',
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 4,
  },
});
