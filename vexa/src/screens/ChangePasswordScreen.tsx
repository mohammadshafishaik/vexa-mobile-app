import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import ScreenContainer from '../components/layout/ScreenContainer';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import GlassCard from '../components/ui/GlassCard';
import PasswordStrengthMeter from '../components/ui/PasswordStrengthMeter';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { validatePassword, passwordsMatch } from '../utils/validation';
import api from '../services/api';

const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [currentError, setCurrentError] = useState<string | null>(null);
  const [newError, setNewError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const strength = validatePassword(newPassword);

  const handleChangePassword = async () => {
    let hasError = false;

    if (!currentPassword) {
      setCurrentError('Current password is required');
      hasError = true;
    }
    if (!strength.isValid) {
      setNewError('New password is too weak');
      hasError = true;
    }
    const confErr = passwordsMatch(newPassword, confirmPassword);
    if (confErr) {
      setConfirmError(confErr);
      hasError = true;
    }
    if (currentPassword === newPassword) {
      setNewError('New password must be different from current password');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);
    setGeneralError(null);

    try {
      const response = await api.put('/custom-auth/change-password', {
        currentPassword,
        newPassword: newPassword.trim(),
      });

      if (response.data.success) {
        setIsSuccess(true);
      } else {
        setGeneralError(response.data.message || 'Failed to change password');
      }
    } catch (error: any) {
      setGeneralError(
        error?.response?.data?.message || 'Failed to change password'
      );
    } finally {
      setIsLoading(false);
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
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.successContainer}>
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            style={styles.successContent}
          >
            <View style={styles.successIconBox}>
              <ShieldCheck size={48} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>Password Changed!</Text>
            <Text style={styles.successSubtitle}>
              Your password has been updated successfully. Your account is now more secure.
            </Text>
            <Button
              title="Done"
              onPress={() => navigation.goBack()}
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
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={styles.description}>
              For your security, please enter your current password before creating a new one.
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

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <GlassCard style={styles.formCard}>
              {/* Current Password */}
              <Input
                label="Current Password"
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  if (currentError) setCurrentError(null);
                  if (generalError) setGeneralError(null);
                }}
                error={currentError || undefined}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                icon={<Lock size={18} color={currentError ? colors.error : colors.gray500} />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowCurrent(!showCurrent)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    {showCurrent ? (
                      <EyeOff size={18} color={colors.gray500} />
                    ) : (
                      <Eye size={18} color={colors.gray500} />
                    )}
                  </TouchableOpacity>
                }
              />

              <View style={styles.separator} />

              {/* New Password */}
              <Input
                label="New Password"
                placeholder="Create a strong password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (newError) setNewError(null);
                }}
                error={newError || undefined}
                secureTextEntry={!showNew}
                autoCapitalize="none"
                icon={<Lock size={18} color={newError ? colors.error : colors.gray500} />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowNew(!showNew)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    {showNew ? (
                      <EyeOff size={18} color={colors.gray500} />
                    ) : (
                      <Eye size={18} color={colors.gray500} />
                    )}
                  </TouchableOpacity>
                }
              />

              <PasswordStrengthMeter
                strength={strength}
                show={newPassword.length > 0}
              />

              {/* Confirm New Password */}
              <Input
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmError) setConfirmError(null);
                }}
                onBlur={() => {
                  if (confirmPassword) {
                    setConfirmError(passwordsMatch(newPassword, confirmPassword));
                  }
                }}
                error={confirmError || undefined}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                icon={<Lock size={18} color={confirmError ? colors.error : colors.gray500} />}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowConfirm(!showConfirm)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    {showConfirm ? (
                      <EyeOff size={18} color={colors.gray500} />
                    ) : (
                      <Eye size={18} color={colors.gray500} />
                    )}
                  </TouchableOpacity>
                }
              />

              <Button
                title="Update Password"
                onPress={handleChangePassword}
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                disabled={isLoading || !currentPassword || !strength.isValid || !confirmPassword}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
  },
  headerTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.lg,
    color: colors.white,
  },
  scrollContent: {
    paddingBottom: spacing[10],
  },
  description: {
    ...typography.body,
    color: colors.gray500,
    marginBottom: spacing[5],
    lineHeight: 22,
  },
  formCard: {
    padding: spacing[5],
  },
  separator: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: spacing[3],
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

export default ChangePasswordScreen;
