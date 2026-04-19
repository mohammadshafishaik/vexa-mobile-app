import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GoogleSignin, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { Shield, Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import ScreenContainer from '../components/layout/ScreenContainer';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import Input from '../components/ui/Input';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { AuthStackParamList } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { validateEmail } from '../utils/validation';
import api, { warmupBackend } from '../services/api';

type LoginNav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const GOOGLE_WEB_CLIENT_ID = '926413154225-gu6bf8poq2i3cf0p7usr522rpdhpkkgk.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
});

const GoogleIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 533.5 544.3" accessibilityRole="image">
    <Path
      fill="#4285F4"
      d="M533.5 278.4c0-18.5-1.5-37-4.7-55H272v104.4h147.2c-6.4 34.6-25.9 63.9-55.2 83.5v69h89.2c52.2-48.1 80.3-119.1 80.3-201.9z"
    />
    <Path
      fill="#34A853"
      d="M272 544.3c72.6 0 133.8-24.1 178.4-64l-89.2-69c-24.8 16.6-56.5 26.3-89.2 26.3-68.6 0-126.8-46.4-147.6-108.9H32.2v68.9c45.6 90.8 138.5 146.7 239.8 146.7z"
    />
    <Path
      fill="#FBBC04"
      d="M124.4 328.7c-10.4-30.9-10.4-64.6 0-95.5V164.3H32.2c-38.5 76.8-38.5 167.9 0 244.7l92.2-68.9z"
    />
    <Path
      fill="#EA4335"
      d="M272 107.7c35.5-.6 69.8 12.9 95.7 37.7l71.1-71.1C401 35.1 338.7 0 272 0 170.7 0 77.8 55.9 32.2 146.7l92.2 68.9C145.2 154.1 203.4 107.7 272 107.7z"
    />
  </Svg>
);

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNav>();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleEmailBlur = useCallback(() => {
    if (email.trim()) {
      const error = validateEmail(email);
      setEmailError(error);
    }
  }, [email]);

  const handleLogin = async () => {
    // Validate
    setGeneralError(null);
    const emailErr = validateEmail(email);
    const passwordErr = !password.trim() ? 'Password is required' : null;

    setEmailError(emailErr);
    setPasswordError(passwordErr);

    if (emailErr || passwordErr) return;

    setIsLoading(true);
    try {
      await warmupBackend();

      const response = await api.post('/custom-auth/login', {
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (response.data.success) {
        const { user, tokens } = response.data.data;
        login(user, tokens);
      } else {
        setGeneralError(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      const serverMessage = error?.response?.data?.message;
      if (serverMessage) {
        setGeneralError(serverMessage);
        return;
      }

      const rawMessage = String(error?.message || '').toLowerCase();
      const isNetworkError =
        error?.code === 'ERR_NETWORK'
        || rawMessage.includes('network error')
        || (!error?.response && !!error?.request);
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const msg = isNetworkError
        ? 'Unable to reach server. Check internet connection and backend URL.'
        : isTimeout
        ? 'Server is waking up (free tier). Please wait 60 seconds and try again.'
        : error.message ||
          'Login failed. Please check your credentials.';
      setGeneralError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (forceAccountPicker = false) => {
    setGeneralError(null);
    setIsLoading(true);

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Force account chooser when user wants to switch Gmail accounts.
      if (forceAccountPicker) {
        try {
          const hasPrevious = await GoogleSignin.hasPreviousSignIn();
          if (hasPrevious) {
            await GoogleSignin.signOut();
          }
        } catch {
          // Ignore sign-out failures and continue sign-in.
        }
      }

      const signInResponse = await GoogleSignin.signIn();
      if (!isSuccessResponse(signInResponse)) {
        // User cancelled account selection.
        return;
      }

      const googleUser = signInResponse.data;
      let idToken = googleUser.idToken;
      const googleEmail = googleUser.user?.email;
      const name = googleUser.user?.name;
      const photoUrl = googleUser.user?.photo;
      const googleId = googleUser.user?.id;

      // Some devices return a null idToken in signIn() response. Fetch fresh tokens as fallback.
      if (!idToken) {
        try {
          const tokenResponse = await GoogleSignin.getTokens();
          idToken = tokenResponse.idToken || null;
        } catch {
          // Fallback failed; validation below will show a clear error.
        }
      }

      if (!idToken || !googleEmail || !googleId) {
        throw new Error('Google account data is incomplete. Please reconfigure Google Sign-In and try again.');
      }

      await warmupBackend();

      const response = await api.post('/custom-auth/google', {
        idToken,
        email: googleEmail,
        name,
        photoUrl,
        googleId,
      });

      if (response.data.success) {
        const { user, tokens } = response.data.data;
        login(user, tokens);
      } else {
        setGeneralError(response.data.message || 'Google Sign-In failed');
      }
    } catch (error: any) {
      const serverMessage = error?.response?.data?.message;
      if (serverMessage) {
        setGeneralError(serverMessage);
        return;
      }

      const rawMessage = String(error?.message || '');
      const lowerMessage = rawMessage.toLowerCase();
      const isTimeout = error?.code === 'ECONNABORTED' || lowerMessage.includes('timeout');

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled the sign-in flow.
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setGeneralError('Google Sign-In is already in progress. Please wait.');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setGeneralError('Google Play Services is not available or outdated on this device.');
      } else if (lowerMessage.includes('developer_error')) {
        setGeneralError(
          'Google Sign-In is not configured for this app signature yet. Add debug/release SHA-1 and SHA-256 in Firebase, download updated google-services.json, and rebuild the APK.',
        );
      } else if (error?.code === 'ERR_NETWORK' || (error?.isAxiosError && lowerMessage.includes('network error'))) {
        setGeneralError('Google account selected, but server is unreachable. Check backend URL and internet connection.');
      } else if (lowerMessage.includes('network error')) {
        setGeneralError('Unable to connect to Google services right now. Please check internet and try again.');
      } else if (isTimeout) {
        setGeneralError('Server is waking up (free tier). Please wait 60 seconds and try again.');
      } else {
        if (__DEV__) {
          console.warn('[Auth] Google Sign-In error:', error);
        }
        setGeneralError('Google Sign-In failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

          {/* Login Form */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(600)}
            style={styles.formContainer}
          >
            <GlassCard style={styles.formCard}>
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSubtitle}>
                Sign in to continue to your account
              </Text>

              {/* General Error */}
              {generalError && (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  style={styles.errorBanner}
                >
                  <Text style={styles.errorBannerText}>{generalError}</Text>
                </Animated.View>
              )}

              {/* Email */}
              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError(null);
                  if (generalError) setGeneralError(null);
                }}
                onBlur={handleEmailBlur}
                error={emailError || undefined}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                icon={<Mail size={18} color={emailError ? colors.error : colors.gray500} />}
              />

              {/* Password */}
              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError(null);
                  if (generalError) setGeneralError(null);
                }}
                error={passwordError || undefined}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                icon={<Lock size={18} color={passwordError ? colors.error : colors.gray500} />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.gray500} />
                    ) : (
                      <Eye size={18} color={colors.gray500} />
                    )}
                  </TouchableOpacity>
                }
              />

              {/* Forgot Password */}
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <Button
                title="Sign In"
                onPress={handleLogin}
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                disabled={isLoading}
              />
            </GlassCard>
          </Animated.View>

          {/* Divider */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            style={styles.dividerContainer}
          >
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* Google Sign In */}
          <Animated.View
            entering={FadeInUp.delay(500).duration(600)}
            style={styles.socialArea}
          >
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => handleGoogleSignIn(false)}
              activeOpacity={0.7}
            >
              <View style={styles.googleIcon}>
                <GoogleIcon />
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchGoogleAccountButton}
              onPress={() => handleGoogleSignIn(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.switchGoogleAccountText}>Use a different Google account</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Register Link */}
          <Animated.View
            entering={FadeInUp.delay(600).duration(600)}
            style={styles.registerArea}
          >
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Create Account</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Terms */}
          <Animated.View
            entering={FadeInUp.delay(700).duration(600)}
            style={styles.termsRow}
          >
            <Shield size={13} color={colors.gray600} />
            <Text style={styles.termsText}>
              Secured with end-to-end encryption
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  logoBox: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
    // Shadow
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  logoLetter: {
    fontFamily: fontFamilies.bold,
    fontSize: 44,
    color: colors.black,
    letterSpacing: -2,
  },
  appName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes['2xl'],
    color: colors.white,
    letterSpacing: 6,
    marginBottom: spacing[1],
  },
  subtitle: {
    fontFamily: fontFamilies.light,
    fontSize: fontSizes.xs,
    color: colors.gray500,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  formContainer: {
    marginBottom: spacing[5],
  },
  formCard: {
    padding: spacing[5],
  },
  formTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.white,
    marginBottom: spacing[1],
  },
  formSubtitle: {
    ...typography.bodySm,
    color: colors.gray500,
    marginBottom: spacing[5],
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  errorBannerText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.error,
    textAlign: 'center',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing[4],
    marginTop: -spacing[2],
  },
  forgotText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.gray400,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[5],
    paddingHorizontal: spacing[2],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.glassBorder,
  },
  dividerText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.gray600,
    paddingHorizontal: spacing[4],
  },
  socialArea: {
    marginBottom: spacing[6],
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3] + 2,
    backgroundColor: colors.gray900,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing[3],
  },
  googleIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.base,
    color: colors.gray300,
  },
  switchGoogleAccountButton: {
    alignSelf: 'center',
    marginTop: spacing[2],
  },
  switchGoogleAccountText: {
    ...typography.caption,
    color: colors.gray500,
    textDecorationLine: 'underline',
  },
  registerArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  registerText: {
    ...typography.bodySm,
    color: colors.gray500,
  },
  registerLink: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.sm,
    color: colors.white,
    textDecorationLine: 'underline',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
  },
  termsText: {
    ...typography.caption,
    color: colors.gray600,
  },
});

export default LoginScreen;
