import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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


  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          iconColor: '#28A745',
          backgroundColor: '#FFFFFF',
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          iconColor: '#FFC107',
          backgroundColor: '#FFFFFF',
        };
      case 'info':
        return {
          icon: 'information-circle' as const,
          iconColor: '#17A2B8',
          backgroundColor: '#FFFFFF',
        };
      case 'error':
        return {
          icon: 'close-circle' as const,
          iconColor: '#DC3545',
          backgroundColor: '#FFFFFF',
        };
    }
  };

  const styles = getToastStyles();

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
      <View style={[toastStyles.toast, { backgroundColor: styles.backgroundColor }]}>
        <View style={toastStyles.content}>
          <View style={[toastStyles.iconContainer, { backgroundColor: styles.iconColor }]}>
            <Ionicons name={styles.icon} size={20} color="#FFFFFF" />
          </View>
          <View style={toastStyles.textContainer}>
            <Text style={toastStyles.title}>{title}</Text>
            {message && <Text style={toastStyles.message}>{message}</Text>}
          </View>
        </View>
        <Pressable onPress={dismiss} style={toastStyles.closeButton} hitSlop={8}>
          <Ionicons name="close" size={18} color="#6C757D" />
        </Pressable>
      </View>
    </Animated.View>
  );
};

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
});

export default Toast;

