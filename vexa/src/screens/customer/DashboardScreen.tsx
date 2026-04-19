import React, { useEffect, useCallback } from 'react';
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
import { Plus, MapPin, Clock, ChevronRight } from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { JobStatusBadge } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useJobStore } from '../../store/useJobStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ServiceRequest } from '../../types';
import { formatCurrency, formatRelativeTime, sanitizeJobDescription, truncateText } from '../../utils/helpers';
import api from '../../services/api';

const CustomerDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const jobs = useJobStore((s) => s.jobs);
  const setJobs = useJobStore((s) => s.setJobs);
  const setSelectedJob = useJobStore((s) => s.setSelectedJob);
  const isLoading = useJobStore((s) => s.isLoading);
  const setLoading = useJobStore((s) => s.setLoading);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/jobs');
      if (res.data.success) {
        setJobs(res.data.data);
      }
    } catch (error) {
      if (__DEV__) {
        console.log('Failed to fetch jobs:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [setJobs, setLoading]);

  // Fetch jobs when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [fetchJobs])
  );

  const handleRefresh = () => {
    fetchJobs();
  };

  const handlePostJob = () => {
    navigation.navigate('PostJob');
  };

  const handleJobPress = (job: ServiceRequest) => {
    setSelectedJob(job);
    navigation.navigate('JobDetail', { jobId: job.id });
  };

  const renderJobCard = ({ item, index }: { item: ServiceRequest; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => handleJobPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.jobHeader}>
          <View style={styles.jobTitleRow}>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <ChevronRight size={18} color={colors.gray500} />
          </View>
          <JobStatusBadge status={item.status} />
        </View>

        <Text style={styles.jobDescription} numberOfLines={2}>
          {truncateText(sanitizeJobDescription(item.description), 100)}
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
          <Text style={styles.priceText}>
            {formatCurrency(item.revisedPrice ?? item.originalPrice)}
          </Text>
          {item.bids && item.bids.length > 0 && (
            <Text style={styles.bidCount}>
              {item.bids.length} bid{item.bids.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Plus size={32} color={colors.gray500} />
      </View>
      <Text style={styles.emptyTitle}>No jobs yet</Text>
      <Text style={styles.emptySubtitle}>
        Post your first service request and get bids from professionals
      </Text>
      <Button
        title="Post a Job"
        onPress={handlePostJob}
        variant="primary"
        size="md"
        style={{ marginTop: spacing[4] }}
      />
    </View>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {user?.name?.split(' ')[0] ?? 'there'}
          </Text>
          <Text style={styles.headerSubtitle}>Manage your service requests</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Profile')}>
          <Avatar
            name={user?.name ?? 'User'}
            imageUrl={user?.avatarUrl}
            size="md"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Quick Action */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <GlassCard style={styles.quickAction}>
          <View style={styles.quickActionContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickActionTitle}>Need a service?</Text>
              <Text style={styles.quickActionSubtitle}>
                Post a job and receive live bids
              </Text>
            </View>
            <Button title="Post" onPress={handlePostJob} size="sm" />
          </View>
        </GlassCard>
      </Animated.View>

      {/* Job List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Jobs</Text>
        <Text style={styles.sectionCount}>{jobs.length}</Text>
      </View>

      <FlatList
        data={jobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={isLoading ? <ActivityIndicator color={colors.white} style={{ marginTop: 40 }} /> : renderEmptyState()}
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
  quickAction: {
    marginBottom: spacing[5],
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.md,
    color: colors.white,
    marginBottom: 2,
  },
  quickActionSubtitle: {
    ...typography.bodySm,
    color: colors.gray500,
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
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  jobTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  jobTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.md,
    color: colors.white,
    flex: 1,
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
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray900,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.lg,
    color: colors.white,
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
    maxWidth: 280,
  },
});

export default CustomerDashboardScreen;
