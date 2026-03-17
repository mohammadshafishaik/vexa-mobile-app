import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes } from '../theme/typography';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { ANIMATION } from '../utils/constants';

type SplashNav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashNav>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);
  const screenOpacity = useSharedValue(1);

  const navigateAway = () => {
    if (isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: 'CustomerMain' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    }
  };

  useEffect(() => {
    // Logo fade in + scale
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });

    // Tagline slides up after logo
    taglineOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    taglineTranslateY.value = withDelay(400, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));

    // Fade out entire screen, then navigate
    screenOpacity.value = withDelay(
      ANIMATION.SPLASH_DURATION - 400,
      withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          runOnJS(navigateAway)();
        }
      }),
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, screenAnimatedStyle]}>
      {/* Logo */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <View style={styles.logoBox}>
          <Text style={styles.logoLetter}>V</Text>
        </View>
        <Text style={styles.logoText}>VEXA</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.taglineContainer, taglineAnimatedStyle]}>
        <Text style={styles.tagline}>Real-time service marketplace</Text>
      </Animated.View>

      {/* Subtle bottom line */}
      <View style={styles.bottomLine} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoLetter: {
    fontFamily: fontFamilies.bold,
    fontSize: 40,
    color: colors.black,
    letterSpacing: -2,
  },
  logoText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes['3xl'],
    color: colors.white,
    letterSpacing: 8,
  },
  taglineContainer: {
    marginTop: 12,
  },
  tagline: {
    fontFamily: fontFamilies.light,
    fontSize: fontSizes.base,
    color: colors.gray500,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bottomLine: {
    position: 'absolute',
    bottom: 60,
    width: 40,
    height: 2,
    backgroundColor: colors.gray700,
    borderRadius: 1,
  },
});

export default SplashScreen;
