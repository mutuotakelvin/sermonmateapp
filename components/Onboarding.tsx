import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  title: string;
  description: string;
  image: any;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ title, description, image }) => (
  <View style={styles.screen}>
    <View style={styles.imageContainer}>
      <Image source={image} style={styles.image} resizeMode="contain" />
    </View>
    <View style={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  </View>
);

export default function Onboarding() {
  const [currentPage, setCurrentPage] = useState(0);

  const screens = [
    {
      title: 'Welcome to SermonMate',
      description: 'Your AI-powered companion for spiritual growth and sermon preparation.',
      image: require('../../assets/images/icon.png'),
    },
    {
      title: 'AI Sermon Generation',
      description: 'Generate powerful sermons with AI assistance, tailored to your congregation\'s needs.',
      image: require('../../assets/images/icon.png'),
    },
    {
      title: 'Interactive AI Sessions',
      description: 'Engage in meaningful conversations with AI to explore faith, get guidance, and grow spiritually.',
      image: require('../../assets/images/icon.png'),
    },
  ];

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/(protected)');
  };

  const handleNext = async () => {
    if (currentPage < screens.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.replace('/(protected)');
    }
  };

  return (
    <View style={styles.container}>
      <PagerView
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        {screens.map((screen, index) => (
          <OnboardingScreen
            key={index}
            title={screen.title}
            description={screen.description}
            image={screen.image}
          />
        ))}
      </PagerView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {screens.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentPage && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
            <Text style={styles.nextText}>
              {currentPage === screens.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pagerView: {
    flex: 1,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width * 0.6,
    height: width * 0.6,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1f2937',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    color: '#6b7280',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#3b82f6',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 16,
    color: '#6b7280',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});









