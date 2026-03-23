import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Briefcase, MapPin, Clock, ChevronRight, IndianRupee, CheckCircle } from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import GlassCard from '../../components/ui/GlassCard';
import { JobStatusBadge } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useJobStore } from '../../store/useJobStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ServiceRequest } from '../../types';
import { formatCurrency, formatRelativeTime } from '../../utils/helpers';
import api from '../../services/api';

const ProviderDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const jobs = useJobStore((s) => s.jobs);
  const setJobs = useJobStore((s) => s.setJobs);
  const setSelectedJob = useJobStore((s) => s.setSelectedJob);
  const isLoading = useJobStore((s) => s.isLoading);
  const setLoading = useJobStore((s) => s.setLoading);
  const [stats, setStats] = useState({ active: 0, completed: 0, earned: 0 });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/jobs');
      if (res.data.success) {
        const allJobs: ServiceRequest[] = res.data.data;
        setJobs(allJobs);

        // Calculate provider-specific stats
        const myActiveJobs = allJobs.filter(
          (j) => j.selectedProviderId === user?.id &&
            ['ACCEPTED', 'IN_PROGRESS', 'ON_SITE_INSPECTION'].includes(j.status)
        );
        const myCompletedJobs = allJobs.filter(
          (j) => j.selectedProviderId === user?.id &&
            ['COMPLETED', 'PAID'].includes(j.status)
        );
        const totalEarned = myCompletedJobs.reduce(
          (sum, j) => sum + (j.revisedPrice ?? j.originalPrice), 0
        );

        setStats({
          active: myActiveJobs.length,
          completed: myCompletedJobs.length,
          earned: totalEarned,
        });
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [setJobs, setLoading, user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [fetchJobs])
  );

  const handleRefresh = () => {
    fetchJobs();
  };

  const handleJobPress = (job: ServiceRequest) => {
    setSelectedJob(job);
    navigation.navigate('JobDetail', { jobId: job.id });
  };

  // Separate available jobs (POSTED/BIDDING) from my assigned jobs
  const availableJobs = jobs.filter(
    (j) => ['POSTED', 'BIDDING'].includes(j.status) && j.selectedProviderId !== user?.id
  );
  const myJobs = jobs.filter((j) => j.selectedProviderId === user?.id);

  const renderJobCard = ({ item, index }: { item: ServiceRequest; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => handleJobPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
          <ChevronRight size={18} color={colors.gray500} />
        </View>
        <JobStatusBadge status={item.status} style={{ marginBottom: spacing[2] }} />

        {/* Show customer name for provider */}
        {item.customer && (
          <View style={styles.customerRow}>
            <Avatar name={item.customer.name} size="sm" />
            <Text style={styles.customerName}>{item.customer.name}</Text>
          </View>
        )}

        <Text style={styles.jobDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.jobMeta}>
          <View style={styles.metaItem}>
            <MapPin size={14} color={colors.gray500} />
            <Text style={styles.metaText}>{item.location}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={14} color={colors.gray500} />
            <Text style={styles.metaText}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.jobFooter}>
          <Text style={styles.priceText}>{formatCurrency(item.originalPrice)}</Text>
          {item.bids && item.bids.length > 0 && (
            <Text style={styles.bidCount}>
              {item.bids.length} bid{item.bids.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {user?.name?.split(' ')[0] ?? 'Provider'}
          </Text>
          <Text style={styles.headerSubtitle}>Find and manage your jobs</Text>
        </View>
        <Avatar
          name={user?.name ?? 'Provider'}
          imageUrl={user?.avatarUrl}
          size="md"
        />
      </Animated.View>

      {/* Stats — Provider specific */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsRow}>
        <GlassCard style={styles.statCard}>
          <Briefcase size={18} color={colors.white} style={{ marginBottom: 4 }} />
          <Text style={styles.statNumber}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <CheckCircle size={18} color={colors.white} style={{ marginBottom: 4 }} />
          <Text style={styles.statNumber}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <IndianRupee size={18} color={colors.white} style={{ marginBottom: 4 }} />
          <Text style={styles.statNumber}>₹{stats.earned}</Text>
          <Text style={styles.statLabel}>Earned</Text>
        </GlassCard>
      </Animated.View>

      {/* My Assigned Jobs */}
      {myJobs.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Jobs</Text>
            <Text style={styles.sectionCount}>{myJobs.length}</Text>
          </View>
          {myJobs.map((job, index) => renderJobCard({ item: job, index }))}
        </>
      )}

      {/* Available Jobs */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Jobs</Text>
        <Text style={styles.sectionCount}>{availableJobs.length}</Text>
      </View>

      <FlatList
        data={availableJobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.white} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Briefcase size={32} color={colors.gray500} />
              <Text style={styles.emptyTitle}>No jobs available</Text>
              <Text style={styles.emptySubtitle}>
                New jobs will appear here when customers post them. Pull down to refresh!
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.white}
          />
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  greeting: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.white,
  },
  headerSubtitle: {
    ...typography.bodySm,
    color: colors.gray500,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[4],
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.lg,
    color: colors.white,
  },
  sectionCount: {
    ...typography.bodySm,
    color: colors.gray500,
  },
  listContent: {
    paddingBottom: spacing[20],
  },
  jobCard: {
    backgroundColor: colors.gray900,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  jobTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.md,
    color: colors.white,
    flex: 1,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  customerName: {
    ...typography.bodySm,
    color: colors.gray400,
  },
  jobDescription: {
    ...typography.bodySm,
    color: colors.gray400,
    marginBottom: spacing[3],
  },
  jobMeta: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  metaText: {
    ...typography.caption,
    color: colors.gray500,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    paddingTop: spacing[3],
  },
  priceText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.white,
  },
  bidCount: {
    ...typography.bodySm,
    color: colors.gray500,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[12],
    gap: spacing[3],
  },
  emptyTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.lg,
    color: colors.white,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
    maxWidth: 280,
  },
});

export default ProviderDashboardScreen;
