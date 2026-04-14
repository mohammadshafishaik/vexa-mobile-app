import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes } from '../theme/typography';
import { RootStackParamList, UserRole } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';

type SplashNav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashNav>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hydrateAuth = useAuthStore((s) => s.hydrateAuth);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);
  const screenOpacity = useSharedValue(1);

  const navigateAway = (authed: boolean, userObj?: any) => {
    if (authed && userObj) {
      // Go to AuthLoading screen (premium transition)
      navigation.reset({ index: 0, routes: [{ name: 'AuthLoading' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    }
  };

  useEffect(() => {
    // Start animations
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    taglineOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    taglineTranslateY.value = withDelay(400, withTiming(0, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    }));

    // Hydrate auth from secure storage
    const checkAuth = async () => {
      await hydrateAuth();

      // After hydration, check if we have valid tokens
      const state = useAuthStore.getState();

      if (state.isAuthenticated && state.tokens) {
        // Verify tokens are still valid by calling profile
        try {
          const profileRes = await api.get('/custom-auth/profile');
          if (profileRes.data.success) {
            // Update user data with latest from server
            const updatedUser = profileRes.data.data;
            login(updatedUser, state.tokens!);

            // Fade out and navigate
            screenOpacity.value = withDelay(800,
              withTiming(0, { duration: 400 }, (finished) => {
                if (finished) runOnJS(navigateAway)(true, updatedUser);
              })
            );
            return;
          }
        } catch (error) {
          // Token expired or invalid — force logout
          console.warn('[Splash] Token verification failed, logging out');
          logout();
        }
      }

      // Not authenticated — go to login
      screenOpacity.value = withDelay(1200,
        withTiming(0, { duration: 400 }, (finished) => {
          if (finished) runOnJS(navigateAway)(false);
        })
      );
    };

    // Small delay to let animations play, then check auth
    setTimeout(checkAuth, 500);
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
    width: 104,
    height: 104,
    borderRadius: 26,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    // Glow
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
  },
  logoLetter: {
    fontFamily: fontFamilies.bold,
    fontSize: 52,
    color: colors.black,
    letterSpacing: -2,
  },
  logoText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes['4xl'],
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
