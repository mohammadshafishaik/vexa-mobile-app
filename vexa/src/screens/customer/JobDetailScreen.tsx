import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import {
  ChevronLeft,
  MapPin,
  Clock,
  User,
  CreditCard,
  Star,
  AlertCircle,
  Camera,
  CheckCircle,
  Mail,
  Zap,
  Zap,
  AlertTriangle,
  MessageCircle,
  XCircle,
  Phone,
} from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { JobStatusBadge } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import VerifiedName from '../../components/ui/VerifiedName';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useJobStore } from '../../store/useJobStore';
import { useAuthStore } from '../../store/useAuthStore';
import { JobStatus, CustomerStackParamList, ServiceRequest } from '../../types';
import { formatCurrency, formatRelativeTime, sanitizeJobDescription } from '../../utils/helpers';
import { jobService } from '../../services/jobs';
import { paymentService } from '../../services/payments';
import { cancellationService } from '../../services/cancellations';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/image';
import { isKycVerifiedStatus } from '../../utils/kyc';
import { socketService } from '../../services/socket';

type JobDetailRoute = RouteProp<CustomerStackParamList, 'JobDetail'>;

const JobDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<JobDetailRoute>();
  const { jobId } = route.params;
  const setSelectedJob = useJobStore((s) => s.setSelectedJob);
  const currentUser = useAuthStore((s) => s.user);
  const [job, setJob] = useState<ServiceRequest | null>(useJobStore.getState().selectedJob);
  const [loading, setLoading] = useState(!job);
  const [actionLoading, setActionLoading] = useState(false);

  const isProvider = currentUser?.role === 'PROVIDER';
  const isCustomer = currentUser?.role === 'CUSTOMER';
  const isAssignedProvider = job?.selectedProviderId === currentUser?.id;
  const isParticipant = !!job && (job.customerId === currentUser?.id || job.selectedProviderId === currentUser?.id);
  const canOpenProviderChat = !!(
    job?.selectedProviderId
    && isParticipant
    && ![JobStatus.POSTED, JobStatus.BIDDING, JobStatus.CANCELLED].includes(job.status)
  );
  const canCallProvider = !!(
    job?.selectedProviderId
    && isCustomer
    && [JobStatus.ACCEPTED, JobStatus.ON_SITE_INSPECTION, JobStatus.IN_PROGRESS].includes(job.status)
    && job.selectedProvider?.phone
  );
  const hasCurrentUserRated = !!job?.ratings?.some((r) => r.raterId === currentUser?.id);
  const pendingModification = job?.modifications?.find((m) => m.approvalStatus === 'PENDING') || job?.modifications?.[0];
  const canRequestModification = !!(
    isAssignedProvider
    && job
    && ['ACCEPTED', 'IN_PROGRESS', 'ON_SITE_INSPECTION'].includes(job.status)
    && job.modificationCount < job.maxModifications
  );
  const latestPayment = job?.payments?.length
    ? [...job.payments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0]
    : null;
  const isCashPaymentAwaitingProviderConfirmation = (
    job?.status === JobStatus.PAYMENT_PENDING
    && latestPayment?.paymentMethod === 'CASH'
    && latestPayment?.status === 'PENDING'
  );
  const canCancelJob = !!(
    job
    && (isCustomer || isAssignedProvider)
    && ![JobStatus.COMPLETED, JobStatus.PAYMENT_PENDING, JobStatus.PAID, JobStatus.CANCELLED].includes(job.status)
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchJob = async () => {
        try {
          const res = await api.get(`/jobs/${jobId}`);
          if (res.data.success && isActive) {
            setJob(res.data.data);
            setSelectedJob(res.data.data);
          }
        } catch (error) {
          console.error('Failed to fetch job:', error);
        } finally {
          if (isActive) setLoading(false);
        }
      };
      fetchJob();
      return () => { isActive = false; };
    }, [jobId])
  );

  const handleViewBids = () => {
    navigation.navigate('LiveBidding', { jobId });
  };

  const handleOpenChat = () => {
    navigation.navigate('Chat', { jobId });
  };

  const handleViewProviderProfile = () => {
    if (!job?.selectedProviderId) return;
    navigation.navigate('ProviderProfile', { userId: job.selectedProviderId });
  };

  const handleCallProvider = () => {
    if (job?.selectedProvider?.phone) {
      Linking.openURL(`tel:${job.selectedProvider.phone}`);
    }
  };

  const handleFinishWork = async () => {
    navigation.navigate('Payment', { jobId });
  };

  const handlePayment = () => {
    navigation.navigate('Payment', { jobId });
  };

  const handleRate = () => {
    navigation.navigate('Rating', { jobId });
  };

  const handleViewModification = () => {
    if (pendingModification) {
      navigation.navigate('RevisionApproval', {
        jobId,
        modificationId: pendingModification.id,
      });
    }
  };

  const handleRequestModification = () => {
    navigation.navigate('ModificationRequest', { jobId });
  };

  // Provider marks work as complete
  const handleFinishWork = () => {
    Alert.alert(
      'Mark Work as Complete',
      'Are you sure you have finished the work? The customer will review your completion.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Finish Work',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await jobService.completeJob(jobId);
              setJob(updated);
              setSelectedJob(updated);
              Alert.alert('Success', 'Work marked as completed! The customer will now review.');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to complete job');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Customer accepts completed work
  const handleAcceptWork = () => {
    Alert.alert(
      'Accept Work',
      'Are you satisfied with the completed work? After accepting, you will proceed to payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept & Proceed to Pay',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await jobService.acceptWork(jobId);
              setJob(updated);
              setSelectedJob(updated);
              Alert.alert('Work Accepted!', 'You can now proceed to payment.', [
                { text: 'Pay Now', onPress: handlePayment },
                { text: 'Later' },
              ]);
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to accept work');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`Issue with Job: ${job?.title || jobId}`);
    const body = encodeURIComponent(
      `Job ID: ${jobId}\nJob Title: ${job?.title}\nStatus: ${job?.status}\n\nDescribe your issue:\n`
    );
    Linking.openURL(`mailto:app.vexa.in@gmail.com?subject=${subject}&body=${body}`);
  };

  const handleRaiseDispute = () => {
    navigation.navigate('Dispute', { jobId });
  };

  const handleCancelJobWithReason = (reason: string) => {
    Alert.alert(
      'Confirm Cancellation',
      'Are you sure you want to cancel this job?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Job',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const response = await cancellationService.cancelJob(jobId, reason);
              if (response?.job) {
                setJob(response.job as any);
                setSelectedJob(response.job as any);
              }

              const feeMessage = response?.feeApplied && response.feeApplied > 0
                ? ` Cancellation fee: ${formatCurrency(response.feeApplied)}.`
                : '';

              Alert.alert('Cancelled', `Job cancelled successfully.${feeMessage}`);
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel job');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCancelJob = () => {
    const reasonOptions = isCustomer
      ? [
          'No longer required',
          'Found another provider',
          'Schedule changed',
          'Posted by mistake',
        ]
      : [
          'Unable to reach location',
          'Personal emergency',
          'Scope mismatch',
          'Schedule conflict',
        ];

    Alert.alert(
      'Cancel Job',
      'Select a reason for cancellation.',
      [
        ...reasonOptions.map((reason) => ({ text: reason, onPress: () => handleCancelJobWithReason(reason) })),
        { text: 'Other', onPress: () => handleCancelJobWithReason('Cancelled due to unforeseen circumstances') },
        { text: 'Back', style: 'cancel' as const },
      ],
    );
  };

  const handleConfirmCashReceived = () => {
    Alert.alert(
      'Confirm Cash Receipt',
      'Please confirm only if you have received cash from the customer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Received',
          onPress: async () => {
            setActionLoading(true);
            try {
              const response = await paymentService.confirmCashReceived(jobId);
              if (response?.job) {
                setJob(response.job);
                setSelectedJob(response.job);
              }
              Alert.alert('Confirmed', 'Cash receipt confirmed. Job is now marked as paid.');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to confirm cash receipt');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.white} style={{ flex: 1 }} />
      </ScreenContainer>
    );
  }

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
        <TouchableOpacity onPress={handleContactSupport}>
          <Mail size={22} color={colors.gray400} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Title */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View style={styles.statusRow}>
            <JobStatusBadge status={job?.status ?? JobStatus.POSTED} />
            {job?.urgency === 'URGENT' && (
              <View style={styles.urgentBadge}>
                <Zap size={12} color={colors.warning} />
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>
          <Text style={styles.jobTitle}>{job?.title ?? 'Service Request'}</Text>
          <Text style={styles.jobDescription}>
            {sanitizeJobDescription(job?.description || '') || 'No description provided'}
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
            {(job?.originalPrice ?? 0) > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <CreditCard size={18} color={colors.gray400} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Budget</Text>
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
              </>
            )}
          </GlassCard>
        </Animated.View>

        {/* Problem Images */}
        {job?.images && job.images.length > 0 && (
          <Animated.View entering={FadeInDown.delay(220).duration(400)}>
            <Text style={styles.sectionTitle}>Problem Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {job.images.map((img, i) => {
                const uri = resolveImageUrl(img);
                if (!uri) return null;
                return <Image key={`${uri}-${i}`} source={{ uri }} style={styles.thumbnail} />;
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* Completed Work Photos */}
        {job?.completedImages && job.completedImages.length > 0 && (
          <Animated.View entering={FadeInDown.delay(230).duration(400)}>
            <Text style={styles.sectionTitle}>Completion Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {job.completedImages.map((img, i) => {
                const uri = resolveImageUrl(img);
                if (!uri) return null;
                return <Image key={`${uri}-${i}`} source={{ uri }} style={styles.thumbnail} />;
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* Bids Summary */}
        {job?.bids && job.bids.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <Text style={styles.sectionTitle}>Bids ({job.bids.length})</Text>
            <GlassCard style={styles.providerCard}>
              {job.bids.slice(0, 3).map((bid: any) => (
                <TouchableOpacity
                  key={bid.id}
                  style={styles.bidRow}
                  onPress={() => {
                    if (isCustomer && bid.provider?.id) {
                      navigation.navigate('ProviderProfile', { userId: bid.provider.id });
                    }
                  }}
                  disabled={!isCustomer || !bid.provider?.id}
                  activeOpacity={isCustomer ? 0.7 : 1}
                >
                  <Avatar name={bid.provider?.name ?? 'Provider'} size="sm" />
                  <View style={{ flex: 1, marginLeft: spacing[3] }}>
                    <VerifiedName
                      name={bid.provider?.name ?? 'Provider'}
                      isVerified={isKycVerifiedStatus(bid.provider?.kycStatus)}
                      textStyle={styles.providerName}
                    />
                    <Text style={styles.providerMeta}>{bid.message}</Text>
                  </View>
                  <Text style={styles.priceValue}>{formatCurrency(bid.amount)}</Text>
                </TouchableOpacity>
              ))}
            </GlassCard>
          </Animated.View>
        )}

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
                  <VerifiedName
                    name={job.selectedProvider.name}
                    isVerified={isKycVerifiedStatus(job.selectedProvider.kycStatus)}
                    textStyle={styles.providerName}
                  />
                  <Text style={styles.providerMeta}>
                    {job.selectedProvider.email}
                  </Text>
                </View>
              </View>

              <View style={styles.providerActionsRow}>
                <TouchableOpacity
                  style={styles.providerActionButton}
                  onPress={handleViewProviderProfile}
                  activeOpacity={0.8}
                >
                  <User size={16} color={colors.white} />
                  <Text style={styles.providerActionText}>View Profile</Text>
                </TouchableOpacity>

                {canOpenProviderChat && (
                  <TouchableOpacity
                    style={styles.providerActionButton}
                    onPress={handleOpenChat}
                    activeOpacity={0.8}
                  >
                    <MessageCircle size={16} color={colors.white} />
                    <Text style={styles.providerActionText}>Chat</Text>
                  </TouchableOpacity>
                )}

                {canCallProvider && (
                  <TouchableOpacity
                    style={styles.providerActionButton}
                    onPress={handleCallProvider}
                    activeOpacity={0.8}
                  >
                    <Phone size={16} color={colors.white} />
                    <Text style={styles.providerActionText}>Call</Text>
                  </TouchableOpacity>
                )}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Action Buttons */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.actions}
        >
          {/* BIDDING: Customer sees View Bids, Provider sees View Bids too */}
          {job?.status === JobStatus.BIDDING && (
            <Button
              title={`View Live Bids${job.bids ? ` (${job.bids.length})` : ''}`}
              onPress={handleViewBids}
              variant="primary"
              size="lg"
              fullWidth
            />
          )}

          {/* ACCEPTED / IN_PROGRESS: Provider can mark work as done */}
          {(job?.status === JobStatus.ACCEPTED || job?.status === JobStatus.IN_PROGRESS) && isAssignedProvider && (
            <Button
              title="✅ Finish Work"
              onPress={handleFinishWork}
              variant="primary"
              size="lg"
              fullWidth
              loading={actionLoading}
              icon={<CheckCircle size={18} color={colors.black} />}
            />
          )}

          {/* COMPLETED: Customer reviews and accepts work */}
          {job?.status === JobStatus.COMPLETED && isCustomer && (
            <Button
              title="Accept Work & Proceed to Pay"
              onPress={handleAcceptWork}
              variant="primary"
              size="lg"
              fullWidth
              loading={actionLoading}
              icon={<CheckCircle size={18} color={colors.black} />}
            />
          )}

          {/* COMPLETED: Provider sees waiting message */}
          {job?.status === JobStatus.COMPLETED && isAssignedProvider && (
            <GlassCard style={styles.waitingCard}>
              <View style={styles.waitingRow}>
                <Clock size={20} color={colors.warning} />
                <Text style={styles.waitingText}>
                  Waiting for customer to review and accept your work...
                </Text>
              </View>
            </GlassCard>
          )}

          {/* Provider can request a revised price after inspection */}
          {canRequestModification && (
            <Button
              title="Request Price Revision"
              onPress={handleRequestModification}
              variant="secondary"
              size="lg"
              fullWidth
              icon={<AlertCircle size={18} color={colors.white} />}
            />
          )}

          {job?.status === JobStatus.MODIFICATION_REQUESTED && isAssignedProvider && (
            <GlassCard style={styles.waitingCard}>
              <View style={styles.waitingRow}>
                <Clock size={20} color={colors.warning} />
                <Text style={styles.waitingText}>
                  Waiting for customer approval on your revised quote.
                </Text>
              </View>
            </GlassCard>
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

          {/* PAYMENT_PENDING: Customer can pay */}
          {job?.status === JobStatus.PAYMENT_PENDING && isCustomer && !isCashPaymentAwaitingProviderConfirmation && (
            <Button
              title="Make Payment"
              onPress={handlePayment}
              variant="primary"
              size="lg"
              fullWidth
              icon={<CreditCard size={18} color={colors.black} />}
            />
          )}

          {/* PAYMENT_PENDING: Provider sees waiting */}
          {job?.status === JobStatus.PAYMENT_PENDING && isCustomer && isCashPaymentAwaitingProviderConfirmation && (
            <GlassCard style={styles.waitingCard}>
              <View style={styles.waitingRow}>
                <CreditCard size={20} color={colors.warning} />
                <Text style={styles.waitingText}>
                  Cash payment submitted. Waiting for provider to confirm receipt.
                </Text>
              </View>
            </GlassCard>
          )}

          {job?.status === JobStatus.PAYMENT_PENDING && isAssignedProvider && isCashPaymentAwaitingProviderConfirmation && (
            <Button
              title={actionLoading ? 'Confirming...' : 'Confirm Cash Received'}
              onPress={handleConfirmCashReceived}
              variant="primary"
              size="lg"
              fullWidth
              loading={actionLoading}
              disabled={actionLoading}
              icon={<CheckCircle size={18} color={colors.black} />}
            />
          )}

          {job?.status === JobStatus.PAYMENT_PENDING && isAssignedProvider && !isCashPaymentAwaitingProviderConfirmation && (
            <GlassCard style={styles.waitingCard}>
              <View style={styles.waitingRow}>
                <CreditCard size={20} color={colors.warning} />
                <Text style={styles.waitingText}>
                  Waiting for customer to complete payment...
                </Text>
              </View>
            </GlassCard>
          )}

          {/* PAID: Both can rate */}
          {job?.status === JobStatus.PAID && !hasCurrentUserRated && (
            <Button
              title={isProvider ? 'Rate Customer' : 'Rate Provider'}
              onPress={handleRate}
              variant="primary"
              size="lg"
              fullWidth
              icon={<Star size={18} color={colors.black} />}
            />
          )}

          {job?.status === JobStatus.PAID && hasCurrentUserRated && (
            <GlassCard style={styles.waitingCard}>
              <View style={styles.waitingRow}>
                <CheckCircle size={20} color={colors.success} />
                <Text style={[styles.waitingText, { color: colors.success }]}>
                  Your rating is already submitted.
                </Text>
              </View>
            </GlassCard>
          )}

          {canCancelJob && (
            <TouchableOpacity
              style={[styles.cancelJobButton, actionLoading && styles.cancelJobButtonDisabled]}
              onPress={handleCancelJob}
              disabled={actionLoading}
            >
              <XCircle size={16} color={colors.error} />
              <Text style={styles.cancelJobText}>{actionLoading ? 'Cancelling...' : 'Cancel Job'}</Text>
            </TouchableOpacity>
          )}

          {/* Contact Support — always visible */}
          <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
            <Mail size={16} color={colors.gray400} />
            <Text style={styles.supportText}>Report Issue / Contact Support</Text>
          </TouchableOpacity>

          {/* Raise Dispute */}
          {(isCustomer || isAssignedProvider) && job?.status !== JobStatus.POSTED && job?.status !== JobStatus.BIDDING && job?.status !== JobStatus.CANCELLED && job?.status !== 'UNDER_DISPUTE' && (
            <TouchableOpacity style={styles.disputeButton} onPress={handleRaiseDispute}>
              <AlertTriangle size={16} color={colors.error} />
              <Text style={styles.disputeText}>Raise Dispute</Text>
            </TouchableOpacity>
          )}

          {job?.status === 'UNDER_DISPUTE' && (
            <GlassCard style={[styles.waitingCard, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <View style={styles.waitingRow}>
                <AlertTriangle size={20} color={colors.error} />
                <Text style={[styles.waitingText, { color: colors.error }]}>
                  This job is currently under dispute review.
                </Text>
              </View>
            </GlassCard>
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    gap: 4,
  },
  urgentText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: colors.warning,
    letterSpacing: 1,
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
  imageScroll: {
    marginBottom: spacing[5],
  },
  thumbnail: {
    width: 120,
    height: 90,
    borderRadius: borderRadius.md,
    marginRight: spacing[2],
    backgroundColor: colors.gray800,
  },
  providerCard: {
    marginBottom: spacing[5],
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  providerInfo: {
    marginLeft: spacing[4],
    flex: 1,
  },
  providerActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  providerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.gray800,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  providerActionText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.white,
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
  waitingCard: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  waitingText: {
    ...typography.bodySm,
    color: colors.warning,
    flex: 1,
    lineHeight: 20,
  },
  cancelJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing[3],
  },
  cancelJobButtonDisabled: {
    opacity: 0.6,
  },
  cancelJobText: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.sm,
    color: colors.error,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    marginTop: spacing[2],
  },
  supportText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.gray400,
  },
  disputeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  disputeText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: colors.error,
  },
});

export default JobDetailScreen;
