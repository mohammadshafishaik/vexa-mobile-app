import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronRight,
  LogOut,
  User as UserIcon,
  Shield,
  Bell,
  HelpCircle,
  FileText,
  Moon,
} from 'lucide-react-native';
import ScreenContainer from '../components/layout/ScreenContainer';
import GlassCard from '../components/ui/GlassCard';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { useAuthStore } from '../store/useAuthStore';

const ProfileScreen: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const menuItems = [
    {
      icon: <UserIcon size={20} color={colors.gray400} />,
      label: 'Edit Profile',
      onPress: () => {},
    },
    {
      icon: <Bell size={20} color={colors.gray400} />,
      label: 'Notification Settings',
      onPress: () => {},
    },
    {
      icon: <Shield size={20} color={colors.gray400} />,
      label: 'Privacy & Security',
      onPress: () => {},
    },
    {
      icon: <FileText size={20} color={colors.gray400} />,
      label: 'Terms of Service',
      onPress: () => {},
    },
    {
      icon: <HelpCircle size={20} color={colors.gray400} />,
      label: 'Help & Support',
      onPress: () => {},
    },
  ];

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
          <Text style={styles.userName}>{user?.name ?? 'VEXA User'}</Text>
          <Text style={styles.userEmail}>{user?.email ?? 'user@vexa.app'}</Text>
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
          <GlassCard style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Jobs</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0.0</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Menu Items */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
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
            onPress={logout}
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
  statsCard: {
    marginBottom: spacing[5],
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
