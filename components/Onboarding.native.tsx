import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/lib/theme';
import AppText from '@/components/ui/AppText';
import PrimaryButton from '@/components/ui/PrimaryButton';

interface OnboardingScreenProps {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  index: number;
  currentPage: number;
}

// Animated Illustration Component
const AnimatedIllustration: React.FC<{
  icon: string;
  iconColor: string;
  index: number;
  currentPage: number;
}> = ({ icon, iconColor, index, currentPage }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (currentPage === index) {
      scale.value = withSpring(1, { damping: 10, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 600 });
      rotate.value = withSpring(360, { damping: 15 });
    } else {
      scale.value = withTiming(0.8, { duration: 300 });
      opacity.value = withTiming(0.5, { duration: 300 });
    }
  }, [currentPage, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (currentPage === index) {
      pulseScale.value = withSpring(1.1, { damping: 8 }, () => {
        pulseScale.value = withSpring(1, { damping: 8 });
      });
    }
  }, [currentPage, index]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={styles.illustrationContainer}>
      <Animated.View style={[styles.iconCircle, { backgroundColor: iconColor + '20' }, pulseStyle]}>
        <Animated.View style={[styles.iconInnerCircle, { backgroundColor: iconColor + '15' }]}>
          <Animated.View style={animatedStyle}>
            <Ionicons name={icon as any} size={80} color={iconColor} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  title,
  description,
  icon,
  iconColor,
  index,
  currentPage,
}) => {
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const descOpacity = useSharedValue(0);
  const descTranslateY = useSharedValue(20);

  useEffect(() => {
    if (currentPage === index) {
      titleOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
      titleTranslateY.value = withDelay(200, withSpring(0, { damping: 12 }));
      descOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
      descTranslateY.value = withDelay(400, withSpring(0, { damping: 12 }));
    } else {
      titleOpacity.value = withTiming(0, { duration: 300 });
      titleTranslateY.value = withTiming(20, { duration: 300 });
      descOpacity.value = withTiming(0, { duration: 300 });
      descTranslateY.value = withTiming(20, { duration: 300 });
    }
  }, [currentPage, index]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const descStyle = useAnimatedStyle(() => ({
    opacity: descOpacity.value,
    transform: [{ translateY: descTranslateY.value }],
  }));

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <AnimatedIllustration
          icon={icon}
          iconColor={iconColor}
          index={index}
          currentPage={currentPage}
        />
        <Animated.View style={[styles.textContainer, titleStyle]}>
          <AppText variant="display" style={styles.title}>{title}</AppText>
        </Animated.View>
        <Animated.View style={[styles.textContainer, descStyle]}>
          <AppText variant="body" style={styles.description}>{description}</AppText>
        </Animated.View>
      </View>
    </View>
  );
};

export default function Onboarding() {
  const [currentPage, setCurrentPage] = useState(0);
  const pagerRef = React.useRef<PagerView>(null);

  const screens = [
    {
      title: 'Daily Reflections',
      description: 'Get a short, personalized reflection on Scripture for whatever is on your heart, in a few taps.',
      icon: 'sparkles',
      iconColor: theme.color.accent,
    },
    {
      title: 'Share Reflections',
      description: 'Easily share an inspiring message with friends, family, or your study group.',
      icon: 'share-social',
      iconColor: theme.color.dustyBlue,
    },
    {
      title: 'Save Reflections',
      description: 'Keep your favorite reflections in one place. Access them anytime, anywhere.',
      icon: 'bookmark',
      iconColor: theme.color.sage,
    },
  ];

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/sign-up');
  };

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentPage < screens.length - 1) {
      pagerRef.current?.setPage(currentPage + 1);
    } else {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.replace('/sign-up');
    }
  };

  const buttonScale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleButtonPress = (callback: () => void) => {
    buttonScale.value = withSpring(0.95, { damping: 10 }, () => {
      buttonScale.value = withSpring(1, { damping: 10 });
    });
    setTimeout(callback, 100);
  };

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        {screens.map((screen, index) => (
          <OnboardingScreen
            key={index}
            title={screen.title}
            description={screen.description}
            icon={screen.icon}
            iconColor={screen.iconColor}
            index={index}
            currentPage={currentPage}
          />
        ))}
      </PagerView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {screens.map((_, index) => (
            <PaginationDot
              key={index}
              index={index}
              currentPage={currentPage}
            />
          ))}
        </View>

        <View style={[
          styles.buttons,
          currentPage === screens.length - 1 && { justifyContent: 'center' }
        ]}>
          {currentPage < screens.length - 1 && (
            <TouchableOpacity
              onPress={() => handleButtonPress(handleSkip)}
              style={styles.skipButton}
              activeOpacity={0.7}
            >
              <AppText style={styles.skipText}>SKIP</AppText>
            </TouchableOpacity>
          )}
          <Animated.View style={[
            styles.buttonWrapper,
            currentPage === screens.length - 1 && { flex: 0, alignItems: 'center' },
            animatedButtonStyle
          ]}>
            <PrimaryButton
              label={currentPage === screens.length - 1 ? 'START' : 'NEXT'}
              onPress={() => handleButtonPress(handleNext)}
              style={styles.nextButton}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

// Animated Pagination Dot
const PaginationDot: React.FC<{ index: number; currentPage: number }> = ({
  index,
  currentPage,
}) => {
  const scale = useSharedValue(index === currentPage ? 1.2 : 1);
  const opacity = useSharedValue(index === currentPage ? 1 : 0.4);
  const width = useSharedValue(index === currentPage ? 24 : 8);

  useEffect(() => {
    if (index === currentPage) {
      scale.value = withSpring(1.2, { damping: 10 });
      opacity.value = withTiming(1, { duration: 300 });
      width.value = withSpring(24, { damping: 10 });
    } else {
      scale.value = withSpring(1, { damping: 10 });
      opacity.value = withTiming(0.4, { duration: 300 });
      width.value = withSpring(8, { damping: 10 });
    }
  }, [currentPage, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    width: width.value,
  }));

  return (
    <Animated.View style={[styles.dot, animatedStyle]} />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.paper,
  },
  pagerView: {
    flex: 1,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.xxl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 60,
  },
  illustrationContainer: {
    marginBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInnerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    width: '100%',
    paddingHorizontal: theme.space.xl,
    marginBottom: theme.space.lg,
  },
  title: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: theme.space.lg,
    letterSpacing: -0.5,
  },
  description: {
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: theme.space.sm,
  },
  footer: {
    paddingHorizontal: theme.space.xxl,
    paddingBottom: Platform.OS === 'ios' ? 48 : theme.space.xxl,
    paddingTop: theme.space.xl,
    backgroundColor: 'transparent',
    position: 'relative',
    zIndex: 1,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: theme.space.sm,
  },
  dot: {
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.accent,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: theme.space.xl,
  },
  skipText: {
    fontSize: 16,
    color: theme.color.textMuted,
    letterSpacing: 0.5,
    fontFamily: theme.font.sansSemibold,
  },
  buttonWrapper: {
    flex: 1,
    alignItems: 'flex-end',
  },
  nextButton: {
    minWidth: 120,
  },
});
