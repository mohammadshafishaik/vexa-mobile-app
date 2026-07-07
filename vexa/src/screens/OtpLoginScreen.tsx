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
import { Mail, KeyRound, ArrowLeft } from 'lucide-react-native';
import ScreenContainer from '../components/layout/ScreenContainer';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import Input from '../components/ui/Input';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { AuthStackParamList } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { validateEmail } from '../utils/validation';
import { authService } from '../services/auth';
import TurnstileCaptcha from '../components/auth/TurnstileCaptcha';

type OtpLoginNav = NativeStackNavigationProp<AuthStackParamList, 'OtpLogin'>;

const OtpLoginScreen: React.FC = () => {
  const navigation = useNavigation<OtpLoginNav>();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [codeRequested, setCodeRequested] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaEnabled, setCaptchaEnabled] = useState(false);

  const handleEmailBlur = useCallback(() => {
    if (email.trim()) {
      setEmailError(validateEmail(email));
    }
  }, [email]);

  const handleSendCode = async () => {
    setGeneralError(null);
    setSuccessMessage(null);

    const validationError = validateEmail(email);
    setEmailError(validationError);
    if (validationError) {
      return;
    }

    if (!captchaToken && captchaEnabled) {
      setGeneralError('Please complete the captcha');
      return;
    }

    setIsSending(true);
    try {
      const response = await authService.sendLoginOtp(email.trim().toLowerCase(), captchaToken!);
      setCodeRequested(true);
      setSuccessMessage(response.message || 'OTP has been sent to your email address.');
    } catch (error: any) {
      const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
      setGeneralError(serverMessage || 'Unable to send OTP right now. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    setGeneralError(null);
    setSuccessMessage(null);

    if (!otp.trim()) {
      setOtpError('OTP code is required');
      return;
    }

    if (!codeRequested) {
      setGeneralError('Request an OTP code first.');
      return;
    }

    setOtpError(null);
    setIsVerifying(true);
    try {
      const response = await authService.verifyLoginOtp(email.trim().toLowerCase(), otp.trim());
      const { user, tokens } = response;
      login(user, tokens);
    } catch (error: any) {
      const serverMessage = error?.response?.data?.message || error?.response?.data?.error;
      setGeneralError(serverMessage || 'Invalid OTP code.');
    } finally {
      setIsVerifying(false);
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
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.hero}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={18} color={colors.white} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>V</Text>
            </View>
            <Text style={styles.title}>OTP Login</Text>
            <Text style={styles.subtitle}>Request a code and sign in without a password.</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(250).duration(600)} style={styles.formContainer}>
            <GlassCard style={styles.formCard}>
              {generalError && <Text style={styles.errorText}>{generalError}</Text>}
              {successMessage && <Text style={styles.successText}>{successMessage}</Text>}

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

              {!codeRequested && (
                <TurnstileCaptcha
                  action="otp_send"
                  onTokenChange={setCaptchaToken}
                  onEnabledChange={setCaptchaEnabled}
                />
              )}

              <Button
                title={codeRequested ? 'Resend OTP' : 'Send OTP'}
                onPress={handleSendCode}
                variant="primary"
                size="lg"
                fullWidth
                loading={isSending}
                disabled={isSending}
              />

              <Input
                label="OTP Code"
                placeholder="Enter 6-digit code"
                value={otp}
                onChangeText={(text) => {
                  setOtp(text.replace(/\D/g, '').slice(0, 6));
                  if (otpError) setOtpError(null);
                  if (generalError) setGeneralError(null);
                }}
                error={otpError || undefined}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                icon={<KeyRound size={18} color={otpError ? colors.error : colors.gray500} />}
              />

              <Button
                title="Verify and Sign In"
                onPress={handleVerifyCode}
                variant="secondary"
                size="lg"
                fullWidth
                loading={isVerifying}
                disabled={isVerifying || !codeRequested}
              />
            </GlassCard>
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
    paddingHorizontal: spacing[5],
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing[4],
    gap: 8,
  },
  backText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginBottom: spacing[4],
  },
  logoLetter: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.gray400,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  formContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  formCard: {
    padding: spacing[5],
    gap: spacing[4],
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  successText: {
    color: colors.success,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default OtpLoginScreen;