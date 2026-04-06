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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import ScreenContainer from '../components/layout/ScreenContainer';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import GlassCard from '../components/ui/GlassCard';
import PasswordStrengthMeter from '../components/ui/PasswordStrengthMeter';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { AuthStackParamList } from '../types';
import { validatePassword, passwordsMatch } from '../utils/validation';
import api from '../services/api';

type ResetNav = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetRoute = RouteProp<AuthStackParamList, 'ResetPassword'>;

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetNav>();
  const route = useRoute<ResetRoute>();
  const { token, email } = route.params;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const strength = validatePassword(password);

  const handleReset = async () => {
    const pwErr = strength.isValid ? null : 'Password is too weak';
    const confErr = passwordsMatch(password, confirmPassword);

    setPasswordError(pwErr);
    setConfirmError(confErr);

    if (pwErr || confErr) return;

    setIsLoading(true);
    setGeneralError(null);

    try {
      const response = await api.post('/custom-auth/reset-password', {
        token,
        password: password.trim(),
      });

      if (response.data.success) {
        setIsSuccess(true);
      } else {
        setGeneralError(response.data.message || 'Failed to reset password');
      }
    } catch (error: any) {
      setGeneralError(
        error?.response?.data?.message ||
        'Failed to reset password. Token may have expired.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <ScreenContainer>
        <View style={styles.successContainer}>
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            style={styles.successContent}
          >
            <View style={styles.successIconBox}>
              <CheckCircle size={48} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>Password Reset!</Text>
            <Text style={styles.successSubtitle}>
              Your password has been successfully reset. You can now sign in with your new password.
            </Text>
            <Button
              title="Go to Sign In"
              onPress={() => {
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              }}
              variant="primary"
              size="lg"
              fullWidth
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
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.description}>
              Create a new password for {email}
            </Text>
          </Animated.View>

          {generalError && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={styles.errorBanner}
            >
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <GlassCard style={styles.formCard}>
              <Input
                label="New Password"
                placeholder="Create a strong password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError(null);
                }}
                error={passwordError || undefined}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
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

              <PasswordStrengthMeter
                strength={strength}
                show={password.length > 0}
              />

              <Input
                label="Confirm New Password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmError) setConfirmError(null);
                }}
                onBlur={() => {
                  if (confirmPassword) {
                    setConfirmError(passwordsMatch(password, confirmPassword));
                  }
                }}
                error={confirmError || undefined}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                icon={<Lock size={18} color={confirmError ? colors.error : colors.gray500} />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} color={colors.gray500} />
                    ) : (
                      <Eye size={18} color={colors.gray500} />
                    )}
                  </TouchableOpacity>
                }
              />

              <Button
                title="Reset Password"
                onPress={handleReset}
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                disabled={isLoading || !strength.isValid || !confirmPassword}
              />
            </GlassCard>
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
  },
  formCard: {
    padding: spacing[5],
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[10],
  },
  successContent: {
    alignItems: 'center',
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
});

export default ResetPasswordScreen;
