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
import {
  ChevronLeft,
  UserCircle,
  Phone,
  FileText,
} from 'lucide-react-native';
import ScreenContainer from '../components/layout/ScreenContainer';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import GlassCard from '../components/ui/GlassCard';
import Avatar from '../components/ui/Avatar';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { useAuthStore } from '../store/useAuthStore';
import {
  validateName,
  validatePhone,
  formatPhoneNumber,
  getPhoneDigits,
} from '../utils/validation';
import api from '../services/api';

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const hasChanges =
    name.trim() !== (user?.name || '') ||
    getPhoneDigits(phone) !== (user?.phone || '') ||
    bio.trim() !== (user?.bio || '');

  const handleSave = async () => {
    const nameErr = validateName(name);
    const phoneErr = phone ? validatePhone(phone) : null;

    setNameError(nameErr);
    setPhoneError(phoneErr);

    if (nameErr || phoneErr) return;

    setIsLoading(true);
    try {
      const response = await api.put('/custom-auth/profile', {
        name: name.trim(),
        phone: getPhoneDigits(phone) || null,
        bio: bio.trim() || null,
      });

      if (response.data.success) {
        updateUser(response.data.data);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update profile');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to update profile'
      );
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.avatarSection}
          >
            <Avatar
              name={name || user?.name || 'User'}
              imageUrl={user?.avatarUrl}
              size="xl"
            />
            <Text style={styles.avatarHint}>
              Avatar updates coming soon
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <GlassCard style={styles.formCard}>
              <Input
                label="Full Name"
                placeholder="Your name"
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

              <Input
                label="Phone Number"
                placeholder="XXXXX XXXXX"
                value={formatPhoneNumber(phone)}
                onChangeText={(text) => {
                  const digits = getPhoneDigits(text);
                  setPhone(digits);
                  if (phoneError) setPhoneError(null);
                }}
                onBlur={() => {
                  if (phone) setPhoneError(validatePhone(phone));
                }}
                error={phoneError || undefined}
                keyboardType="phone-pad"
                maxLength={11}
                icon={<Phone size={18} color={phoneError ? colors.error : colors.gray500} />}
                hint="10 digit mobile number"
              />

              {user?.role !== 'CUSTOMER' && (
                <Input
                  label="Bio"
                  placeholder="Tell others about your expertise and service style"
                  value={bio}
                  onChangeText={setBio}
                  icon={<FileText size={18} color={colors.gray500} />}
                  multiline
                  numberOfLines={3}
                  maxLength={240}
                  hint="Visible on your public profile"
                />
              )}

              {/* Email (read-only) */}
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyLabel}>EMAIL</Text>
                <Text style={styles.readOnlyValue}>{user?.email}</Text>
              </View>

              {/* Role (read-only) */}
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyLabel}>ROLE</Text>
                <Text style={styles.readOnlyValue}>{user?.role}</Text>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Save Button */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            style={styles.saveArea}
          >
            <Button
              title={isSaved ? '✓ Saved' : 'Save Changes'}
              onPress={handleSave}
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={isLoading || !hasChanges || isSaved}
            />
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing[5],
  },
  avatarHint: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: spacing[2],
  },
  formCard: {
    padding: spacing[5],
  },
  readOnlyField: {
    marginBottom: spacing[4],
  },
  readOnlyLabel: {
    ...typography.label,
    color: colors.gray600,
    marginBottom: spacing[1],
    textTransform: 'uppercase',
  },
  readOnlyValue: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.base,
    color: colors.gray400,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.gray900,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    overflow: 'hidden',
  },
  saveArea: {
    marginTop: spacing[5],
  },
});

export default EditProfileScreen;
