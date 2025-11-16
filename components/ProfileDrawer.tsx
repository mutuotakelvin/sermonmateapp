import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  Pressable,
  Dimensions,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/lib/stores/auth';
import { useThemeStore } from '@/lib/stores/theme';
import Constants from 'expo-constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

interface ProfileDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ visible, onClose }: ProfileDrawerProps) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const translateX = useSharedValue(-DRAWER_WIDTH);

  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, { duration: 300 });
    } else {
      translateX.value = withTiming(-DRAWER_WIDTH, { duration: 300 });
    }
  }, [visible]);

  const animatedDrawerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: visible ? withTiming(0.5, { duration: 300 }) : withTiming(0, { duration: 300 }),
    };
  });

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
            onClose();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleThemeToggle = async () => {
    await toggleTheme();
  };

  const handleTermsPress = () => {
    Linking.openURL('https://sermonmate.bobakdevs.com/terms');
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
    if (!user?.name) return '#3b82f6';
    const colors = [
      '#3b82f6', // blue
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#f59e0b', // amber
      '#10b981', // green
      '#ef4444', // red
      '#06b6d4', // cyan
    ];
    const index = user.name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const isDark = theme === 'dark';
  const styles = getStyles(isDark);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.overlayAnimated, animatedOverlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        
        <Animated.View style={[styles.drawer, animatedDrawerStyle]}>
          <View style={styles.drawerContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={isDark ? '#fff' : '#111827'} />
              </TouchableOpacity>
            </View>

            {/* Profile Section */}
            <View style={styles.profileSection}>
              <View style={[styles.avatarContainer, { backgroundColor: getAvatarColor() }]}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
              <Text style={styles.name}>{user?.name || 'User'}</Text>
              <Text style={styles.email}>{user?.email || ''}</Text>
            </View>

            {/* Settings Section */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Settings</Text>
              
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons 
                    name={isDark ? 'moon' : 'sunny'} 
                    size={20} 
                    color={isDark ? '#fff' : '#111827'} 
                  />
                  <Text style={styles.settingLabel}>Dark Mode</Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={handleThemeToggle}
                  trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                  thumbColor={isDark ? '#fff' : '#f3f4f6'}
                />
              </View>
            </View>

            {/* Sign Out Button */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
              
              <Text style={styles.versionText}>
                Version {Constants.expoConfig?.version || '1.0.0'}
              </Text>
              
              <Text style={styles.versionText}>
                Powered by bobakdevs
              </Text>
              
              <TouchableOpacity onPress={handleTermsPress}>
                <Text style={styles.versionText}>
                  Terms and Conditions
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    overlayAnimated: {
      flex: 1,
      backgroundColor: '#000',
    },
    drawer: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: DRAWER_WIDTH,
      backgroundColor: isDark ? '#1f2937' : '#fff',
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
    },
    drawerContent: {
      flex: 1,
      paddingTop: Constants.statusBarHeight || 0,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: 16,
    },
    closeButton: {
      padding: 8,
    },
    profileSection: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
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
      fontSize: 22,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#111827',
      marginBottom: 4,
    },
    email: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    settingsSection: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#fff' : '#111827',
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingLabel: {
      fontSize: 16,
      color: isDark ? '#fff' : '#111827',
    },
    footer: {
      marginTop: 'auto',
      padding: 16,
      gap: 16,
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
    versionText: {
      fontSize: 12,
      color: isDark ? '#6b7280' : '#9ca3af',
      textAlign: 'center',
    },
  });

