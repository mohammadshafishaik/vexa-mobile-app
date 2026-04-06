import React, { useState } from 'react';
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
import { ChevronLeft, Mail, CheckCircle } from 'lucide-react-native';
import ScreenContainer from '../components/layout/ScreenContainer';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import GlassCard from '../components/ui/GlassCard';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { AuthStackParamList } from '../types';
import { validateEmail } from '../utils/validation';
import api from '../services/api';

type ForgotNav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotNav>();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSendReset = async () => {
    const emailErr = validateEmail(email);
    setEmailError(emailErr);
    if (emailErr) return;

    setIsLoading(true);
    try {
      const response = await api.post('/custom-auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });

      if (response.data.success) {
        setIsSuccess(true);
        // In dev mode, the API returns the token for testing
        if (response.data.resetToken) {
          setResetToken(response.data.resetToken);
        }
      }
    } catch (error: any) {
      // Still show success to prevent email enumeration
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToReset = () => {
    if (resetToken) {
      navigation.navigate('ResetPassword', {
        token: resetToken,
        email: email.trim().toLowerCase(),
      });
    }
  };

  if (isSuccess) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.successContainer}>
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            style={styles.successContent}
          >
            <View style={styles.successIconBox}>
              <CheckCircle size={48} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successSubtitle}>
              If an account exists for {email.trim()}, we've sent password reset instructions.
            </Text>

            {/* Dev mode: show reset button */}
            {resetToken && (
              <Animated.View
                entering={FadeInUp.delay(300).duration(400)}
                style={styles.devModeContainer}
              >
                <Text style={styles.devModeLabel}>🧪 Dev Mode</Text>
                <Text style={styles.devModeText}>
                  Reset token received. Tap below to reset your password.
                </Text>
                <Button
                  title="Reset Password Now"
                  onPress={handleGoToReset}
                  variant="primary"
                  size="md"
                  fullWidth
                />
              </Animated.View>
            )}

            <Button
              title="Back to Login"
              onPress={() => navigation.goBack()}
              variant="secondary"
              size="lg"
              fullWidth
              style={{ marginTop: spacing[4] }}
            />
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.description}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <GlassCard style={styles.formCard}>
              <Input
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError(null);
                }}
                onBlur={() => {
                  if (email.trim()) setEmailError(validateEmail(email));
                }}
                error={emailError || undefined}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                icon={<Mail size={18} color={emailError ? colors.error : colors.gray500} />}
              />

              <Button
                title="Send Reset Link"
                onPress={handleSendReset}
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                disabled={isLoading || !email.trim()}
              />
            </GlassCard>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(300).duration(500)}
            style={styles.backArea}
          >
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backLink}>← Back to Sign In</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingVertical: spacing[3],
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing[10],
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes['2xl'],
    color: colors.white,
    marginBottom: spacing[2],
  },
  description: {
    ...typography.body,
    color: colors.gray500,
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  formCard: {
    padding: spacing[5],
  },
  backArea: {
    alignItems: 'center',
    marginTop: spacing[6],
  },
  backLink: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.gray400,
  },
  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing[10],
  },
  successContent: {
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  successTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.white,
    marginBottom: spacing[3],
  },
  successSubtitle: {
    ...typography.body,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: spacing[6],
  },
  devModeContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    width: '100%',
    marginBottom: spacing[2],
  },
  devModeLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: colors.info,
    marginBottom: spacing[1],
  },
  devModeText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.gray400,
    marginBottom: spacing[3],
    lineHeight: 18,
  },
});

export default ForgotPasswordScreen;
