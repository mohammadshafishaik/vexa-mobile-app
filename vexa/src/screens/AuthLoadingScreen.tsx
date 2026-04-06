import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  withRepeat,
  Easing,
  runOnJS,
  interpolate,
  interpolateColor,
  SharedValue,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes } from '../theme/typography';
import { useAuthStore } from '../store/useAuthStore';
import { socketService } from '../services/socket';
import { RootStackParamList, UserRole } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type AuthLoadingNav = NativeStackNavigationProp<RootStackParamList, 'AuthLoading'>;

const AuthLoadingScreen: React.FC = () => {
  const navigation = useNavigation<AuthLoadingNav>();
  const user = useAuthStore((s) => s.user);

  // Animation values
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const welcomeOpacity = useSharedValue(0);
  const welcomeTranslateY = useSharedValue(20);
  const statusOpacity = useSharedValue(0);
  const statusTranslateY = useSharedValue(10);
  const progressWidth = useSharedValue(0);
  const progressShimmer = useSharedValue(0);
  const ring1Scale = useSharedValue(0.8);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0.8);
  const ring2Opacity = useSharedValue(0);
  const ring3Scale = useSharedValue(0.8);
  const ring3Opacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);
  const screenTranslateY = useSharedValue(0);

  const navigateToMain = () => {
    const route = user?.role === UserRole.PROVIDER ? 'ProviderMain' : 'CustomerMain';
    navigation.reset({ index: 0, routes: [{ name: route }] });
  };

  useEffect(() => {
    // Connect socket during loading
    try {
      const socket = socketService.connect();
      if (user?.id) {
        socket.emit('user:join', user.id);
      }
    } catch (e) {
      console.warn('[AuthLoading] Socket connection failed:', e);
    }

    // Phase 1: Logo appears (0-600ms)
    logoOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });

    // Phase 2: Welcome text (400-1000ms)
    welcomeOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    welcomeTranslateY.value = withDelay(400, withSpring(0, { damping: 15 }));

    // Phase 3: Pulsing rings (600-2200ms)
    const ringDuration = 1200;
    // Ring 1
    ring1Scale.value = withDelay(600,
      withRepeat(
        withSequence(
          withTiming(1.8, { duration: ringDuration, easing: Easing.out(Easing.cubic) }),
          withTiming(0.8, { duration: 0 })
        ), 2, false
      )
    );
    ring1Opacity.value = withDelay(600,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 100 }),
          withTiming(0, { duration: ringDuration - 100 })
        ), 2, false
      )
    );

    // Ring 2 (staggered)
    ring2Scale.value = withDelay(900,
      withRepeat(
        withSequence(
          withTiming(2.2, { duration: ringDuration, easing: Easing.out(Easing.cubic) }),
          withTiming(0.8, { duration: 0 })
        ), 2, false
      )
    );
    ring2Opacity.value = withDelay(900,
      withRepeat(
        withSequence(
          withTiming(0.4, { duration: 100 }),
          withTiming(0, { duration: ringDuration - 100 })
        ), 2, false
      )
    );

    // Ring 3 (most staggered)
    ring3Scale.value = withDelay(1200,
      withRepeat(
        withSequence(
          withTiming(2.6, { duration: ringDuration, easing: Easing.out(Easing.cubic) }),
          withTiming(0.8, { duration: 0 })
        ), 2, false
      )
    );
    ring3Opacity.value = withDelay(1200,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: 100 }),
          withTiming(0, { duration: ringDuration - 100 })
        ), 2, false
      )
    );

    // Phase 4: Status text + Progress bar (800-2500ms)
    statusOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    statusTranslateY.value = withDelay(800, withSpring(0, { damping: 15 }));

    // Progress bar fills
    progressWidth.value = withDelay(1000,
      withTiming(1, { duration: 1800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );

    // Progress shimmer
    progressShimmer.value = withDelay(1000,
      withRepeat(withTiming(1, { duration: 900 }), -1, true)
    );

    // Phase 5: Slide up and navigate (2800-3200ms)
    screenOpacity.value = withDelay(2800, withTiming(0, { duration: 400 }));
    screenTranslateY.value = withDelay(2800,
      withTiming(-50, { duration: 400, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(navigateToMain)();
        }
      })
    );
  }, []);

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const welcomeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: welcomeOpacity.value,
    transform: [{ translateY: welcomeTranslateY.value }],
  }));

  const statusAnimatedStyle = useAnimatedStyle(() => ({
    opacity: statusOpacity.value,
    transform: [{ translateY: statusTranslateY.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const progressShimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progressShimmer.value, [0, 0.5, 1], [0.6, 1, 0.6]),
  }));

  const ringStyle = (scale: SharedValue<number>, opacity: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

  const ring1Style = ringStyle(ring1Scale, ring1Opacity);
  const ring2Style = ringStyle(ring2Scale, ring2Opacity);
  const ring3Style = ringStyle(ring3Scale, ring3Opacity);

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: screenTranslateY.value }],
  }));

  const userName = user?.name?.split(' ')[0] || 'there';

  return (
    <Animated.View style={[styles.container, screenAnimatedStyle]}>
      {/* Rings */}
      <View style={styles.ringsContainer}>
        <Animated.View style={[styles.ring, styles.ring3, ring3Style]} />
        <Animated.View style={[styles.ring, styles.ring2, ring2Style]} />
        <Animated.View style={[styles.ring, styles.ring1, ring1Style]} />
      </View>

      {/* Logo */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <View style={styles.logoBox}>
          <Text style={styles.logoLetter}>V</Text>
        </View>
      </Animated.View>

      {/* Welcome text */}
      <Animated.View style={[styles.welcomeContainer, welcomeAnimatedStyle]}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{userName}!</Text>
      </Animated.View>

      {/* Status + Progress */}
      <Animated.View style={[styles.statusContainer, statusAnimatedStyle]}>
        <Text style={styles.statusText}>Setting up your workspace...</Text>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, progressBarStyle]}>
            <Animated.View style={[styles.progressShimmer, progressShimmerStyle]} />
          </Animated.View>
        </View>
      </Animated.View>
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
  ringsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
  },
  ring1: {
    width: 120,
    height: 120,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  ring2: {
    width: 120,
    height: 120,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  ring3: {
    width: 120,
    height: 120,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    // Glow
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  logoLetter: {
    fontFamily: fontFamilies.bold,
    fontSize: 36,
    color: colors.black,
    letterSpacing: -2,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontFamily: fontFamilies.light,
    fontSize: fontSizes.lg,
    color: colors.gray400,
    letterSpacing: 1,
  },
  nameText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes['2xl'],
    color: colors.white,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  statusContainer: {
    position: 'absolute',
    bottom: 100,
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  statusText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.gray500,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  progressTrack: {
    width: SCREEN_WIDTH - 120,
    height: 3,
    backgroundColor: colors.gray800,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressShimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
});

export default AuthLoadingScreen;
