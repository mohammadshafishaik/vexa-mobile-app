import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  ChevronLeft,
  MapPin,
  Clock,
  User,
  CreditCard,
  Star,
  AlertCircle,
} from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { JobStatusBadge } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useJobStore } from '../../store/useJobStore';
import { JobStatus, CustomerStackParamList } from '../../types';
import { formatCurrency, formatRelativeTime } from '../../utils/helpers';

type JobDetailRoute = RouteProp<CustomerStackParamList, 'JobDetail'>;

const JobDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<JobDetailRoute>();
  const { jobId } = route.params;
  const selectedJob = useJobStore((s) => s.selectedJob);

  const job = selectedJob;

  const handleViewBids = () => {
    navigation.navigate('LiveBidding', { jobId });
  };

  const handlePayment = () => {
    navigation.navigate('Payment', { jobId });
  };

  const handleRate = () => {
    navigation.navigate('Rating', { jobId });
  };

  const handleViewModification = () => {
    if (job?.modifications?.[0]) {
      navigation.navigate('RevisionApproval', {
        jobId,
        modificationId: job.modifications[0].id,
      });
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
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Title */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <JobStatusBadge status={job?.status ?? JobStatus.POSTED} />
          <Text style={styles.jobTitle}>{job?.title ?? 'Service Request'}</Text>
          <Text style={styles.jobDescription}>
            {job?.description ?? 'No description provided'}
          </Text>
        </Animated.View>

        {/* Info Cards */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <GlassCard style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MapPin size={18} color={colors.gray400} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>
                  {job?.location ?? 'Not specified'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Clock size={18} color={colors.gray400} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Posted</Text>
                <Text style={styles.infoValue}>
                  {job?.createdAt ? formatRelativeTime(job.createdAt) : 'Unknown'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <CreditCard size={18} color={colors.gray400} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Price</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceValue}>
                    {formatCurrency(job?.revisedPrice ?? job?.originalPrice ?? 0)}
                  </Text>
                  {job?.revisedPrice && job.revisedPrice !== job.originalPrice && (
                    <Text style={styles.originalPrice}>
                      {formatCurrency(job.originalPrice)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Provider Info */}
        {job?.selectedProvider && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text style={styles.sectionTitle}>Provider</Text>
            <GlassCard style={styles.providerCard}>
              <View style={styles.providerRow}>
                <Avatar
                  name={job.selectedProvider.name}
                  imageUrl={job.selectedProvider.avatarUrl}
                  size="lg"
                />
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>
                    {job.selectedProvider.name}
                  </Text>
                  <Text style={styles.providerMeta}>
                    {job.selectedProvider.email}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Action Buttons */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.actions}
        >
          {job?.status === JobStatus.BIDDING && (
            <Button
              title="View Live Bids"
              onPress={handleViewBids}
              variant="primary"
              size="lg"
              fullWidth
            />
          )}
          {job?.status === JobStatus.MODIFICATION_REQUESTED && (
            <Button
              title="Review Modification"
              onPress={handleViewModification}
              variant="secondary"
              size="lg"
              fullWidth
              icon={<AlertCircle size={18} color={colors.white} />}
            />
          )}
          {job?.status === JobStatus.PAYMENT_PENDING && (
            <Button
              title="Make Payment"
              onPress={handlePayment}
              variant="primary"
              size="lg"
              fullWidth
              icon={<CreditCard size={18} color={colors.black} />}
            />
          )}
          {job?.status === JobStatus.PAID && (
            <Button
              title="Rate Provider"
              onPress={handleRate}
              variant="primary"
              size="lg"
              fullWidth
              icon={<Star size={18} color={colors.black} />}
            />
          )}
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  headerTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.md,
    color: colors.white,
  },
  scrollContent: {
    paddingBottom: spacing[10],
  },
  jobTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.white,
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  jobDescription: {
    ...typography.body,
    color: colors.gray400,
    marginBottom: spacing[5],
    lineHeight: 22,
  },
  infoCard: {
    marginBottom: spacing[5],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  infoContent: {
    marginLeft: spacing[3],
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.gray500,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.base,
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: spacing[2],
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  priceValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.white,
  },
  originalPrice: {
    ...typography.bodySm,
    color: colors.gray500,
    textDecorationLine: 'line-through',
  },
  sectionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.lg,
    color: colors.white,
    marginBottom: spacing[3],
  },
  providerCard: {
    marginBottom: spacing[5],
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerInfo: {
    marginLeft: spacing[4],
    flex: 1,
  },
  providerName: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.md,
    color: colors.white,
    marginBottom: 2,
  },
  providerMeta: {
    ...typography.bodySm,
    color: colors.gray500,
  },
  actions: {
    gap: spacing[3],
    marginTop: spacing[2],
  },
});

export default JobDetailScreen;
