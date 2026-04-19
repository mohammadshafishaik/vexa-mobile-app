import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  Briefcase,
  User as UserIcon,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Phone,
  UserCircle,
} from 'lucide-react-native';
import ScreenContainer from '../components/layout/ScreenContainer';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import GlassCard from '../components/ui/GlassCard';
import PasswordStrengthMeter from '../components/ui/PasswordStrengthMeter';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { AuthStackParamList, UserRole } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  passwordsMatch,
  formatPhoneNumber,
  getPhoneDigits,
} from '../utils/validation';
import api from '../services/api';

type RegisterNav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const PROVIDER_SERVICE_CATEGORIES = [
  { label: 'Plumbing', value: 'plumbing' },
  { label: 'Electrical', value: 'electrical' },
  { label: 'Cleaning', value: 'cleaning' },
  { label: 'Painting', value: 'painting' },
  { label: 'Carpentry', value: 'carpentry' },
  { label: 'Appliance Repair', value: 'appliance repair' },
  { label: 'AC Service', value: 'ac service' },
  { label: 'Pest Control', value: 'pest control' },
  { label: 'Other', value: 'other' },
] as const;

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterNav>();
  const login = useAuthStore((s) => s.login);

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedProviderSkills, setSelectedProviderSkills] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Password strength
  const passwordStrength = validatePassword(password);

  const handlePhoneChange = (text: string) => {
    const digits = getPhoneDigits(text);
    setPhone(digits);
    if (phoneError) setPhoneError(null);
  };

  const toggleProviderSkill = (skill: string) => {
    setSelectedProviderSkills((prev) => (
      prev.includes(skill)
        ? prev.filter((item) => item !== skill)
        : [...prev, skill]
    ));

    if (generalError) {
      setGeneralError(null);
    }
  };

  const validateAll = (): boolean => {
    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const phoneErr = phone ? validatePhone(phone) : null;
    const pwErr = password ? (passwordStrength.isValid ? null : 'Password is too weak') : 'Password is required';
    const confirmErr = passwordsMatch(password, confirmPassword);

    setNameError(nameErr);
    setEmailError(emailErr);
    setPhoneError(phoneErr);
    setPasswordError(pwErr);
    setConfirmError(confirmErr);

    const providerSkillsValid = selectedRole !== UserRole.PROVIDER || selectedProviderSkills.length > 0;
    return !nameErr && !emailErr && !phoneErr && !pwErr && !confirmErr && !!selectedRole && providerSkillsValid;
  };

  const handleComplete = async () => {
    if (!validateAll()) {
      if (!selectedRole) {
        setGeneralError('Please select a role (Customer or Provider)');
      } else if (selectedRole === UserRole.PROVIDER && selectedProviderSkills.length === 0) {
        setGeneralError('Please select at least one service category to continue as a provider.');
      }
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      const response = await api.post('/custom-auth/register', {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        phone: phone || null,
        role: selectedRole,
        password: password.trim(),
        initialSkills: selectedRole === UserRole.PROVIDER ? selectedProviderSkills : undefined,
      });

      if (response.data.success) {
        const { user, tokens } = response.data.data;
        login(user, tokens);
      } else {
        setGeneralError(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error.message ||
        'Registration failed';
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    selectedRole &&
    (selectedRole !== UserRole.PROVIDER || selectedProviderSkills.length > 0) &&
    name.trim().length >= 2 &&
    !validateEmail(email) &&
    passwordStrength.isValid &&
    password === confirmPassword;

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
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
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.description}>
              Join VEXA — the real-time service marketplace
            </Text>
          </Animated.View>

          {/* General Error */}
          {generalError && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={styles.errorBanner}
            >
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </Animated.View>
          )}

          {/* Role Selection */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.roleContainer}
          >
            <Text style={styles.sectionLabel}>I am a</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === UserRole.CUSTOMER && styles.roleCardActive,
                ]}
                onPress={() => {
                  setSelectedRole(UserRole.CUSTOMER);
                  setSelectedProviderSkills([]);
                  if (generalError) setGeneralError(null);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.roleIconBox,
                    selectedRole === UserRole.CUSTOMER && styles.roleIconBoxActive,
                  ]}
                >
                  <UserIcon
                    size={22}
                    color={
                      selectedRole === UserRole.CUSTOMER
                        ? colors.black
                        : colors.gray400
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.roleTitle,
                    selectedRole === UserRole.CUSTOMER && styles.roleTitleActive,
                  ]}
                >
                  Customer
                </Text>
                <Text style={styles.roleDesc}>Find services</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === UserRole.PROVIDER && styles.roleCardActive,
                ]}
                onPress={() => {
                  setSelectedRole(UserRole.PROVIDER);
                  if (generalError) setGeneralError(null);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.roleIconBox,
                    selectedRole === UserRole.PROVIDER && styles.roleIconBoxActive,
                  ]}
                >
                  <Briefcase
                    size={22}
                    color={
                      selectedRole === UserRole.PROVIDER
                        ? colors.black
                        : colors.gray400
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.roleTitle,
                    selectedRole === UserRole.PROVIDER && styles.roleTitleActive,
                  ]}
                >
                  Provider
                </Text>
                <Text style={styles.roleDesc}>Offer services</Text>
              </TouchableOpacity>
            </View>

            {selectedRole === UserRole.PROVIDER && (
              <View style={styles.skillsContainer}>
                <Text style={styles.skillsTitle}>Select Your Service Categories</Text>
                <Text style={styles.skillsSubtitle}>
                  Choose at least one category so matching customer jobs appear immediately.
                </Text>
                <View style={styles.skillsGrid}>
                  {PROVIDER_SERVICE_CATEGORIES.map((item) => {
                    const isSelected = selectedProviderSkills.includes(item.value);
                    return (
                      <TouchableOpacity
                        key={item.value}
                        style={[styles.skillChip, isSelected && styles.skillChipSelected]}
                        onPress={() => toggleProviderSkill(item.value)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.skillChipText, isSelected && styles.skillChipTextSelected]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </Animated.View>

          {/* Profile Form */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            {/* Name */}
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) setNameError(null);
              }}
              onBlur={() => {
                if (name.trim()) setNameError(validateName(name));
              }}
              error={nameError || undefined}
              icon={<UserCircle size={18} color={nameError ? colors.error : colors.gray500} />}
              autoCapitalize="words"
            />

            {/* Email */}
            <Input
              label="Email"
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
              icon={<Mail size={18} color={emailError ? colors.error : colors.gray500} />}
            />

            {/* Phone */}
            <Input
              label="Phone Number"
              placeholder="XXXXX XXXXX"
              value={formatPhoneNumber(phone)}
              onChangeText={handlePhoneChange}
              onBlur={() => {
                if (phone) setPhoneError(validatePhone(phone));
              }}
              error={phoneError || undefined}
              keyboardType="phone-pad"
              maxLength={11} // 10 digits + 1 space
              icon={<Phone size={18} color={phoneError ? colors.error : colors.gray500} />}
              hint="10 digit mobile number"
            />

            {/* Password */}
            <Input
              label="Password"
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

            {/* Password Strength Meter */}
            <PasswordStrengthMeter
              strength={passwordStrength}
              show={password.length > 0}
            />

            {/* Confirm Password */}
            <Input
              label="Confirm Password"
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
          </Animated.View>

          {/* Submit */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(500)}
            style={styles.submitArea}
          >
            <Button
              title="Create Account"
              onPress={handleComplete}
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={!isFormValid || isSubmitting}
            />
          </Animated.View>

          {/* Login Link */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(500)}
            style={styles.loginArea}
          >
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}>Sign In</Text>
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
    marginBottom: spacing[5],
  },
  sectionLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.sm,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[3],
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
  roleContainer: {
    marginBottom: spacing[5],
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.gray900,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray700,
  },
  roleCardActive: {
    borderColor: colors.white,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  roleIconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  roleIconBoxActive: {
    backgroundColor: colors.white,
  },
  roleTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.base,
    color: colors.gray400,
    marginBottom: 2,
  },
  roleTitleActive: {
    color: colors.white,
  },
  roleDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.gray600,
  },
  skillsContainer: {
    marginTop: spacing[4],
  },
  skillsTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.base,
    color: colors.white,
    marginBottom: spacing[1],
  },
  skillsSubtitle: {
    ...typography.bodySm,
    color: colors.gray500,
    marginBottom: spacing[3],
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  skillChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray700,
    backgroundColor: colors.gray900,
  },
  skillChipSelected: {
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  skillChipText: {
    ...typography.bodySm,
    color: colors.gray400,
  },
  skillChipTextSelected: {
    color: colors.black,
    fontFamily: fontFamilies.semibold,
  },
  submitArea: {
    marginTop: spacing[4],
  },
  loginArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[5],
  },
  loginText: {
    ...typography.bodySm,
    color: colors.gray500,
  },
  loginLink: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.sm,
    color: colors.white,
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;
