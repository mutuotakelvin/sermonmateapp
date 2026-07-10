import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import AppText from '@/components/ui/AppText';

export type ToastType = 'success' | 'warning' | 'info' | 'error';

export interface ToastConfig {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps extends ToastConfig {
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, title, message, duration = 4000, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const slideAnim = React.useRef(new Animated.Value(-200)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  const dismiss = React.useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(id);
    });
  }, [id, onDismiss]);

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        dismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, dismiss]);

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          iconColor: theme.color.sage,
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          iconColor: theme.color.sand,
        };
      case 'info':
        return {
          icon: 'information-circle' as const,
          iconColor: theme.color.dustyBlue,
        };
      case 'error':
        return {
          icon: 'close-circle' as const,
          iconColor: theme.color.danger,
        };
    }
  };

  const toastConfig = getToastConfig();

  return (
    <Animated.View
      style={[
        toastStyles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          top: insets.top + 12,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={toastStyles.toast}>
        <View style={toastStyles.content}>
          <View style={[toastStyles.iconContainer, { backgroundColor: toastConfig.iconColor }]}>
            <Ionicons name={toastConfig.icon} size={20} color={theme.color.accentText} />
          </View>
          <View style={toastStyles.textContainer}>
            <AppText variant="title" style={toastStyles.title}>{title}</AppText>
            {message && <AppText variant="caption" style={toastStyles.message}>{message}</AppText>}
          </View>
        </View>
        <Pressable onPress={dismiss} style={toastStyles.closeButton} hitSlop={8}>
          <Ionicons name="close" size={18} color={theme.color.textMuted} />
        </Pressable>
      </View>
    </Animated.View>
  );
};

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: theme.space.lg,
    right: theme.space.lg,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.space.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
    shadowColor: theme.color.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.space.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.space.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
  message: {
    lineHeight: 18,
  },
  closeButton: {
    padding: theme.space.xs,
  },
});

export default Toast;
