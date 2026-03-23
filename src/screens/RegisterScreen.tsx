import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Briefcase, User as UserIcon } from 'lucide-react-native';
import ScreenContainer from '../components/layout/ScreenContainer';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import GlassCard from '../components/ui/GlassCard';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { UserRole } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleComplete = async () => {
    if (!selectedRole || !name.trim() || !password.trim()) return;

    setIsSubmitting(true);
    try {
      const email = `${name.trim().toLowerCase().replace(/\s+/g, '.')}@vexa.app`;

      const response = await api.post('/auth/register', {
        email,
        name: name.trim(),
        phone: phone || null,
        role: selectedRole,
        password: password.trim(),
      });

      if (response.data.success) {
        const { user, tokens } = response.data.data;
        login(user, tokens);
      } else {
        Alert.alert('Registration Failed', response.data.message || 'Please try again');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || error.message || 'Registration failed';
      // If user already exists, try logging in
      if (msg === 'User already exists') {
        try {
          const email = `${name.trim().toLowerCase().replace(/\s+/g, '.')}@vexa.app`;
          const loginRes = await api.post('/auth/login', { email, password: password.trim() });
          if (loginRes.data.success) {
            const { user, tokens } = loginRes.data.data;
            login(user, tokens);
            return;
          }
        } catch (loginErr: any) {
          Alert.alert('Login Failed', loginErr?.response?.data?.message || 'Invalid credentials');
        }
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
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
      >
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={styles.title}>Complete your profile</Text>
          <Text style={styles.description}>
            Choose how you'd like to use VEXA
          </Text>
        </Animated.View>

        {/* Role Selection */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          style={styles.roleContainer}
        >
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === UserRole.CUSTOMER && styles.roleCardActive,
            ]}
            onPress={() => setSelectedRole(UserRole.CUSTOMER)}
            activeOpacity={0.7}
          >
            <View style={styles.roleIconBox}>
              <UserIcon
                size={24}
                color={
                  selectedRole === UserRole.CUSTOMER
                    ? colors.black
                    : colors.white
                }
              />
            </View>
            <View style={styles.roleContent}>
              <Text
                style={[
                  styles.roleTitle,
                  selectedRole === UserRole.CUSTOMER && styles.roleTitleActive,
                ]}
              >
                Customer
              </Text>
              <Text style={styles.roleDescription}>
                Post jobs and find service providers
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === UserRole.PROVIDER && styles.roleCardActive,
            ]}
            onPress={() => setSelectedRole(UserRole.PROVIDER)}
            activeOpacity={0.7}
          >
            <View style={styles.roleIconBox}>
              <Briefcase
                size={24}
                color={
                  selectedRole === UserRole.PROVIDER
                    ? colors.black
                    : colors.white
                }
              />
            </View>
            <View style={styles.roleContent}>
              <Text
                style={[
                  styles.roleTitle,
                  selectedRole === UserRole.PROVIDER && styles.roleTitleActive,
                ]}
              >
                Provider
              </Text>
              <Text style={styles.roleDescription}>
                Bid on jobs and offer your services
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Profile Form */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Input
            label="Full Name"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
          />
          <Input
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Input
            label="Phone (optional)"
            placeholder="+91 XXXXX XXXXX"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </Animated.View>

        {/* Submit */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(500)}
          style={styles.submitArea}
        >
          <Button
            title="Complete Registration"
            onPress={handleComplete}
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={!selectedRole || !name.trim() || !password.trim()}
          />
        </Animated.View>
      </ScrollView>
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
    marginBottom: spacing[6],
  },
  roleContainer: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  roleCard: {
    flexDirection: 'row',
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
    marginRight: spacing[4],
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.md,
    color: colors.white,
    marginBottom: 2,
  },
  roleTitleActive: {
    color: colors.white,
  },
  roleDescription: {
    ...typography.bodySm,
    color: colors.gray500,
  },
  submitArea: {
    marginTop: spacing[4],
  },
});

export default RegisterScreen;
