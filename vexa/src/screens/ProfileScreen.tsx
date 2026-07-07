import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  ChevronRight,
  LogOut,
  User as UserIcon,
  Shield,
  Briefcase,
  Clock,
  Bell,
  HelpCircle,
  FileText,
  Key,
} from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import ScreenContainer from '../components/layout/ScreenContainer';
import GlassCard from '../components/ui/GlassCard';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import VerifiedName from '../components/ui/VerifiedName';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { useAuthStore } from '../store/useAuthStore';
import { socketService } from '../services/socket';
import api from '../services/api';
import { uploadService } from '../services/upload';
import { userService } from '../services/users';
import { availabilityService } from '../services/availability';
import { deriveKycDisplayStatus } from '../utils/kyc';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [stats, setStats] = useState({
    jobCount: 0,
    avgRating: 0,
    reviewCount: 0,
  });
  const [isKycUploading, setIsKycUploading] = useState(false);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);

  // Fetch stats on focus
  useFocusEffect(
    useCallback(() => {
      const fetchProfileAndStats = async () => {
        try {
          const [profileRes, statsRes] = await Promise.all([
            api.get('/custom-auth/profile'),
            api.get('/custom-auth/stats'),
          ]);

          if (profileRes.data.success) {
            updateUser(profileRes.data.data);
          }

          if (statsRes.data.success) {
            setStats(statsRes.data.data);
          }
        } catch (error) {
          console.warn('Failed to fetch profile/stats:', error);
        }
      };
      fetchProfileAndStats();
    }, [updateUser])
  );

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              const hasPreviousGoogleSession = await GoogleSignin.hasPreviousSignIn();
              if (hasPreviousGoogleSession) {
                await GoogleSignin.signOut();
              }
            } catch {
              // Ignore Google sign-out errors and continue app logout.
            }
            socketService.disconnect();
            logout();
          },
        },
      ]
    );
  };

  const kycDocuments = Array.isArray(user?.kycDocuments) ? user.kycDocuments : [];
  const providerAvailability = user?.role === 'PROVIDER'
    ? (user?.availabilityStatus || 'OFFLINE')
    : null;
  const kycDisplayStatus = deriveKycDisplayStatus({
    kycStatus: user?.kycStatus,
    kycDocuments,
  });
  const isVerifiedUser = kycDisplayStatus === 'VERIFIED';
  const isRejectedKyc = kycDisplayStatus === 'REJECTED';
  const hasSubmittedKycDocuments = kycDocuments.length > 0;
  const canSubmitVerification = kycDisplayStatus === 'REJECTED' || kycDisplayStatus === 'NOT_SUBMITTED';
  const verificationBadgeLabel = kycDisplayStatus === 'NOT_SUBMITTED' ? 'NOT SUBMITTED' : kycDisplayStatus;

  const verificationMessage = isVerifiedUser
    ? 'Your profile is verified. Your blue badge is visible beside your name in profile, bids, and job posts.'
    : isRejectedKyc
      ? 'Verification failed. Tap Reverify to upload Aadhaar or PAN again.'
      : hasSubmittedKycDocuments
        ? 'Your documents are under review. You will be notified once verification is complete.'
        : 'Upload Aadhaar or PAN to start verification. Admin will review and approve your profile.';

  const verificationActionTitle = isRejectedKyc ? 'Reverify' : 'Upload Aadhaar / PAN';

  const pickAndUploadKycDocument = async (docType: 'AADHAAR' | 'PAN') => {
    setIsKycUploading(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
      });

      const fileUri = result.assets?.[0]?.uri;
      if (!fileUri) {
        setIsKycUploading(false);
        return;
      }

      const uploadedUrl = await uploadService.uploadImage(fileUri);
      const preservedDocuments = kycDocuments.filter((doc) => !doc.startsWith(`${docType}|`));
      const nextKycDocuments = [...preservedDocuments, `${docType}|${uploadedUrl}`];

      const response = await userService.submitKYC(nextKycDocuments);
      if (response?.success && response?.data) {
        updateUser(response.data);
      }

      Alert.alert(
        'Verification Submitted',
        `${docType === 'AADHAAR' ? 'Aadhaar' : 'PAN'} document uploaded. Admin will review and verify your account.`,
      );
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to upload verification document.';
      Alert.alert('Upload Failed', message);
    } finally {
      setIsKycUploading(false);
    }
  };

  const handleUploadVerification = () => {
    Alert.alert(
      'Upload Verification ID',
      'Choose the document you want to upload for verification.',
      [
        { text: 'Aadhaar', onPress: () => pickAndUploadKycDocument('AADHAAR') },
        { text: 'PAN', onPress: () => pickAndUploadKycDocument('PAN') },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const baseMenuItems = [
    {
      icon: <UserIcon size={20} color={colors.gray400} />,
      label: 'Edit Profile',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: <Key size={20} color={colors.gray400} />,
      label: 'Change Password',
      onPress: () => navigation.navigate('ChangePassword'),
    },
  ];

  const providerMenuItems = user?.role === 'PROVIDER'
    ? [
      {
        icon: <Briefcase size={20} color={colors.gray400} />,
        label: 'Manage Skills',
        onPress: () => navigation.navigate('SkillsManagement'),
      },
      {
        icon: <FileText size={20} color={colors.gray400} />,
        label: 'Manage Portfolio',
        onPress: () => navigation.navigate('PortfolioManagement'),
      },
      {
        icon: <Clock size={20} color={colors.gray400} />,
        label: 'Set Availability',
        onPress: () => navigation.navigate('Availability'),
      },
    ]
    : [];

  const utilityMenuItems = [
    {
      icon: <Bell size={20} color={colors.gray400} />,
      label: 'Notification Settings',
      onPress: () => {
        Alert.alert('Coming Soon', 'Notification settings will be available in the next update.');
      },
    },
    {
      icon: <Shield size={20} color={colors.gray400} />,
      label: 'Privacy & Security',
      onPress: () => {
        Alert.alert('Coming Soon', 'Privacy settings will be available in the next update.');
      },
    },
    {
      icon: <FileText size={20} color={colors.gray400} />,
      label: 'Terms of Service',
      onPress: () => {
        Alert.alert('Terms of Service', 'VEXA Terms of Service v1.0\n\nBy using VEXA, you agree to our terms and conditions. Full terms will be available on our website.');
      },
    },
    {
      icon: <HelpCircle size={20} color={colors.gray400} />,
      label: 'Help & Support',
      onPress: () => {
        Alert.alert('Help & Support', 'Need help? Contact us at:\n\napp.vexa.in@gmail.com');
      },
    },
  ];

  const menuItems = [...baseMenuItems, ...providerMenuItems, ...utilityMenuItems];

  const handleQuickAvailabilityToggle = async () => {
    if (!providerAvailability || isTogglingAvailability) {
      return;
    }

    const nextStatus = providerAvailability === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    setIsTogglingAvailability(true);

    try {
      await availabilityService.setStatus(nextStatus);
      updateUser({ availabilityStatus: nextStatus });
    } catch (error: any) {
      Alert.alert(
        'Unable to Update Availability',
        error?.response?.data?.message || 'Please try again in a moment.',
      );
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.profileHeader}
        >
          <Avatar
            name={user?.name ?? 'User'}
            imageUrl={user?.avatarUrl}
            size="xl"
          />
          <VerifiedName
            name={user?.name ?? 'VEXA User'}
            isVerified={isVerifiedUser}
            textStyle={styles.userName}
          />
          <Text style={styles.userEmail}>{user?.email ?? 'user@vexa.app'}</Text>
          {user?.phone ? (
            <Text style={styles.profileMetaText}>Phone: {user.phone}</Text>
          ) : null}
          {providerAvailability ? (
            <Text style={styles.profileMetaText}>Availability: {providerAvailability}</Text>
          ) : null}
          {user?.bio && user.role !== 'CUSTOMER' ? (
            <Text style={styles.profileBio} numberOfLines={3}>{user.bio}</Text>
          ) : null}
          <Badge
            label={user?.role ?? 'CUSTOMER'}
            color={colors.white}
            variant="outlined"
            size="md"
            style={{ marginTop: spacing[2] }}
          />
        </Animated.View>

        {/* Stats Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          {providerAvailability ? (
            <GlassCard style={styles.quickAvailabilityCard}>
              <View style={styles.quickAvailabilityInfo}>
                <Text style={styles.quickAvailabilityTitle}>
                  {providerAvailability === 'ONLINE' ? 'You are available for jobs' : 'You are currently offline'}
                </Text>
                <Text style={styles.quickAvailabilityHint}>
                  {providerAvailability === 'ONLINE'
                    ? 'Tap below to pause new job requests.'
                    : 'Tap below to start receiving jobs instantly.'}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.quickAvailabilityButton,
                  providerAvailability === 'ONLINE'
                    ? styles.quickAvailabilityButtonOffline
                    : styles.quickAvailabilityButtonOnline,
                ]}
                onPress={handleQuickAvailabilityToggle}
                disabled={isTogglingAvailability}
                activeOpacity={0.8}
              >
                <Text style={styles.quickAvailabilityButtonText}>
                  {isTogglingAvailability
                    ? 'Updating...'
                    : providerAvailability === 'ONLINE'
                      ? 'Go Offline'
                      : 'Go Online'}
                </Text>
              </TouchableOpacity>
            </GlassCard>
          ) : null}

          <GlassCard style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.jobCount}</Text>
                <Text style={styles.statLabel}>Jobs</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'}
                </Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.reviewCount}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Verification */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <GlassCard style={styles.verificationCard}>
            <View style={styles.verificationHeaderRow}>
              <Text style={styles.verificationTitle}>Identity Verification</Text>
              <Badge
                label={verificationBadgeLabel}
                color={
                  kycDisplayStatus === 'VERIFIED'
                    ? colors.success
                    : kycDisplayStatus === 'REJECTED'
                    ? colors.error
                    : kycDisplayStatus === 'PENDING'
                    ? colors.warning
                    : colors.gray500
                }
                variant="filled"
                size="sm"
              />
            </View>
            <Text style={styles.verificationText}>
              {verificationMessage}
            </Text>
            {kycDocuments.length > 0 && (
              <Text style={styles.verificationMetaText}>
                Documents submitted: {kycDocuments.length}
              </Text>
            )}
            {canSubmitVerification && (
              <Button
                title={isKycUploading ? 'Uploading...' : verificationActionTitle}
                onPress={handleUploadVerification}
                variant="secondary"
                size="md"
                fullWidth
                loading={isKycUploading}
                disabled={isKycUploading}
                style={{ marginTop: spacing[3] }}
              />
            )}
          </GlassCard>
        </Animated.View>

        {/* Menu Items */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  index === menuItems.length - 1 && styles.menuItemLast,
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                {item.icon}
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight size={18} color={colors.gray600} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={20} color={colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* App Version */}
        <Text style={styles.version}>VEXA v1.0.0</Text>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing[10],
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  userName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.white,
    marginTop: spacing[3],
  },
  userEmail: {
    ...typography.bodySm,
    color: colors.gray500,
    marginTop: spacing[1],
  },
  profileMetaText: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: spacing[1],
  },
  profileBio: {
    ...typography.bodySm,
    color: colors.gray400,
    marginTop: spacing[2],
    textAlign: 'center',
    maxWidth: '90%',
  },
  statsCard: {
    marginBottom: spacing[5],
  },
  quickAvailabilityCard: {
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  quickAvailabilityInfo: {
    gap: spacing[1],
  },
  quickAvailabilityTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.base,
    color: colors.white,
  },
  quickAvailabilityHint: {
    ...typography.caption,
    color: colors.gray400,
  },
  quickAvailabilityButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAvailabilityButtonOnline: {
    backgroundColor: colors.success,
  },
  quickAvailabilityButtonOffline: {
    backgroundColor: colors.gray700,
  },
  quickAvailabilityButtonText: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.base,
    color: colors.white,
  },
  verificationCard: {
    marginBottom: spacing[5],
  },
  verificationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  verificationTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.base,
    color: colors.white,
  },
  verificationText: {
    ...typography.bodySm,
    color: colors.gray400,
  },
  verificationMetaText: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: spacing[2],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.white,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.caption,
    color: colors.gray500,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.glassBorder,
  },
  menuSection: {
    backgroundColor: colors.gray900,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing[5],
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.base,
    color: colors.white,
    flex: 1,
    marginLeft: spacing[3],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  logoutText: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.base,
    color: colors.error,
  },
  version: {
    ...typography.caption,
    color: colors.gray600,
    textAlign: 'center',
    marginTop: spacing[4],
  },
});

export default ProfileScreen;
