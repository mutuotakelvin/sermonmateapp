import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
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

interface OnboardingScreenProps {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  gradientColors: string[];
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
  gradientColors,
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
          <Text style={styles.title}>{title}</Text>
        </Animated.View>
        <Animated.View style={[styles.textContainer, descStyle]}>
          <Text style={styles.description}>{description}</Text>
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
      title: 'Generate Sermons',
      description: 'Create powerful, AI-generated sermons tailored to your congregation\'s needs with just a few taps.',
      icon: 'sparkles',
      iconColor: '#FFCC00',
      gradientColors: ['#FFF9E6', '#FFF5D6', '#FFF0C2'],
    },
    {
      title: 'Share Sermons',
      description: 'Easily share your sermons with your team, congregation, or save them for later reference.',
      icon: 'share-social',
      iconColor: '#007AFF',
      gradientColors: ['#E6F3FF', '#D6EBFF', '#C7E3FF'],
    },
    {
      title: 'Save Sermons',
      description: 'Organize and save all your sermons in one place. Access them anytime, anywhere.',
      icon: 'bookmark',
      iconColor: '#34C759',
      gradientColors: ['#E6F9EC', '#D6F5E0', '#C7F1D4'],
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

  const currentGradient = (screens[currentPage]?.gradientColors || screens[0].gradientColors) as [string, string, ...string[]];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={currentGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
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
            gradientColors={screen.gradientColors}
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
              <Text style={styles.skipText}>SKIP</Text>
            </TouchableOpacity>
          )}
          <Animated.View style={[
            styles.buttonWrapper,
            currentPage === screens.length - 1 && { flex: 0, alignItems: 'center' },
            animatedButtonStyle
          ]}>
            <TouchableOpacity
              onPress={() => handleButtonPress(handleNext)}
              style={styles.nextButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#1f2937', '#374151']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.nextText}>
                  {currentPage === screens.length - 1 ? 'START' : 'NEXT'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
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
  },
  pagerView: {
    flex: 1,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    color: '#4b5563',
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingTop: 20,
    backgroundColor: 'transparent',
    position: 'relative',
    zIndex: 1,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1f2937',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonWrapper: {
    flex: 1,
    alignItems: 'flex-end',
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 120,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
  },
});

