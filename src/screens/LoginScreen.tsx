import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, Shield } from 'lucide-react-native';
import ScreenContainer from '../components/layout/ScreenContainer';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { AuthStackParamList } from '../types';

type LoginNav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNav>();

  const handleGoogleSignIn = () => {
    // Will be implemented in Phase 5 — Google OAuth
    // For now, navigate to register for role selection
    navigation.navigate('Register');
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Area */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.logoArea}
        >
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>V</Text>
          </View>
          <Text style={styles.appName}>VEXA</Text>
          <Text style={styles.subtitle}>Real-time service marketplace</Text>
        </Animated.View>

        {/* Features */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(600)}
          style={styles.featuresContainer}
        >
          <GlassCard style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Post jobs & receive live bids</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Real-time provider matching</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Secure payments & ratings</Text>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Sign In Button */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(600)}
          style={styles.authArea}
        >
          <Button
            title="Continue with Google"
            onPress={handleGoogleSignIn}
            variant="primary"
            size="lg"
            fullWidth
            icon={
              <View style={styles.googleIcon}>
                <Text style={styles.googleG}>G</Text>
              </View>
            }
          />

          <View style={styles.termsRow}>
            <Shield size={14} color={colors.gray500} />
            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing[10],
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  logoLetter: {
    fontFamily: fontFamilies.bold,
    fontSize: 36,
    color: colors.black,
    letterSpacing: -2,
  },
  appName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes['2xl'],
    color: colors.white,
    letterSpacing: 6,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: fontFamilies.light,
    fontSize: fontSizes.sm,
    color: colors.gray500,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  featuresContainer: {
    marginBottom: spacing[10],
  },
  featureCard: {
    padding: spacing[5],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
    marginRight: spacing[3],
  },
  featureText: {
    ...typography.body,
    color: colors.gray300,
  },
  authArea: {
    alignItems: 'center',
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleG: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    color: colors.gray900,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[5],
    paddingHorizontal: spacing[6],
  },
  termsText: {
    ...typography.caption,
    color: colors.gray500,
    marginLeft: spacing[2],
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default LoginScreen;
