import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, SafeAreaView, FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  ArrowLeft, Star, MapPin, Shield, Briefcase, Clock,
  Award, ChevronRight, MessageCircle, Mail, Phone,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/typography';
import { User, ProviderSkill, PortfolioItem } from '../types';
import api from '../services/api';
import { skillsService } from '../services/skills';
import { portfolioService } from '../services/portfolio';

const ProviderProfileScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get(`/users/profile/${userId}`);
        setProfile(response.data.data);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = profile.availabilityStatus === 'ONLINE' ? colors.success
    : profile.availabilityStatus === 'BUSY' ? colors.warning
    : colors.gray500;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provider Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(profile.name || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>

          <Text style={styles.profileName}>{profile.name}</Text>

          <View style={styles.badgeRow}>
            {profile.kycStatus === 'VERIFIED' && (
              <View style={styles.verifiedBadge}>
                <Shield size={12} color={colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            <View style={[styles.statusBadge, { borderColor: statusColor }]}>
              <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {profile.availabilityStatus || 'OFFLINE'}
              </Text>
            </View>
          </View>

          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          <Text style={styles.memberSince}>
            Member since {new Date(profile.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.completedJobsCount || 0}</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.ratingRow}>
              <Star size={16} color={colors.warning} fill={colors.warning} />
              <Text style={styles.statValue}> {(profile.averageRating || 0).toFixed(1)}</Text>
            </View>
            <Text style={styles.statLabel}>{profile.totalRatings || 0} reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{Math.round(profile.totalEarnings || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>

        {/* Contact Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Details</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactRow}>
              <Phone size={16} color={colors.gray400} />
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>{profile.phone || 'Not provided'}</Text>
            </View>
            <View style={styles.contactDivider} />
            <View style={styles.contactRow}>
              <Mail size={16} color={colors.gray400} />
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue} numberOfLines={1}>{profile.email || 'Not provided'}</Text>
            </View>
          </View>
        </View>

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsContainer}>
              {profile.skills.map((skill: ProviderSkill) => (
                <View key={skill.id} style={styles.skillChip}>
                  <Text style={styles.skillText}>
                    {skill.category.charAt(0).toUpperCase() + skill.category.slice(1)}
                  </Text>
                  {skill.experienceYears > 0 && (
                    <Text style={styles.skillExp}>{skill.experienceYears}y</Text>
                  )}
                  {skill.isVerified && (
                    <Shield size={12} color={colors.success} style={{ marginLeft: 4 }} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Portfolio */}
        {profile.portfolioItems && profile.portfolioItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio ({profile.portfolioItems.length})</Text>
            <FlatList
              horizontal
              data={profile.portfolioItems}
              keyExtractor={(item: PortfolioItem) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }: { item: PortfolioItem }) => (
                <View style={styles.portfolioItem}>
                  <Image source={{ uri: item.imageUrl }} style={styles.portfolioImage} />
                  <Text style={styles.portfolioTitle} numberOfLines={1}>{item.title}</Text>
                  {item.category && (
                    <Text style={styles.portfolioCategory}>{item.category}</Text>
                  )}
                </View>
              )}
            />
          </View>
        )}

        {/* Reviews */}
        {profile.ratingsReceived && profile.ratingsReceived.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {profile.ratingsReceived.slice(0, 5).map((rating: any, idx: number) => (
              <View key={idx} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    {rating.rater?.avatarUrl ? (
                      <Image source={{ uri: rating.rater.avatarUrl }} style={styles.reviewerAvatar} />
                    ) : (
                      <View style={styles.reviewerAvatarPlaceholder}>
                        <Text style={styles.reviewerInitial}>
                          {(rating.rater?.name || '?')[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.reviewerName}>{rating.rater?.name || 'User'}</Text>
                  </View>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        color={colors.warning}
                        fill={s <= rating.score ? colors.warning : 'transparent'}
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewText}>{rating.review}</Text>
                <Text style={styles.reviewDate}>
                  {new Date(rating.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    color: colors.gray400,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.glassBorder,
    backgroundColor: colors.gray900,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassWhite,
  },
  headerTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    color: colors.white,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Profile Card
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.glassBorder,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.gray700,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarInitial: {
    fontFamily: fontFamilies.bold,
    fontSize: 36,
    color: colors.white,
  },
  statusDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: colors.black,
  },
  profileName: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    color: colors.white,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: colors.success,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
  },
  bio: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.gray300,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  memberSince: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.gray500,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.gray800,
    borderRadius: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: colors.white,
  },
  statLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.gray400,
    marginTop: 4,
  },
  statDivider: {
    width: 0.5,
    height: 36,
    backgroundColor: colors.glassBorder,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactCard: {
    backgroundColor: colors.gray800,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  contactDivider: {
    height: 0.5,
    backgroundColor: colors.glassBorder,
  },
  contactLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.gray300,
    width: 48,
  },
  contactValue: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.white,
    flex: 1,
  },
  // Section
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    color: colors.white,
    marginBottom: 12,
  },
  // Skills
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray800,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: colors.glassBorder,
  },
  skillText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.white,
  },
  skillExp: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: colors.gray400,
    marginLeft: 6,
  },
  // Portfolio
  portfolioItem: {
    width: 160,
    marginRight: 12,
  },
  portfolioImage: {
    width: 160,
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.gray800,
  },
  portfolioTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.white,
    marginTop: 8,
  },
  portfolioCategory: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: colors.gray400,
    marginTop: 2,
  },
  // Reviews
  reviewCard: {
    backgroundColor: colors.gray800,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  reviewerAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray600,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  reviewerInitial: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    color: colors.white,
  },
  reviewerName: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    color: colors.white,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.gray300,
    lineHeight: 18,
  },
  reviewDate: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: colors.gray500,
    marginTop: 6,
  },
});

export default ProviderProfileScreen;
