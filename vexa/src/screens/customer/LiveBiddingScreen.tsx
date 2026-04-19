import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Users, Clock, TrendingUp, Sparkles } from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import VerifiedName from '../../components/ui/VerifiedName';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useJobStore } from '../../store/useJobStore';
import { useAuthStore } from '../../store/useAuthStore';
import Input from '../../components/ui/Input';
import { Bid, BidRecommendation, CustomerStackParamList, UserRole } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { bidService } from '../../services/bids';
import { socketService } from '../../services/socket';
import { SOCKET_EVENTS } from '../../utils/constants';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/image';
import { isKycVerifiedStatus } from '../../utils/kyc';
import { recommendationService } from '../../services/recommendations';

type LiveBiddingRoute = RouteProp<CustomerStackParamList, 'LiveBidding'>;

const LiveBiddingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<LiveBiddingRoute>();
  const { jobId } = route.params;
  const bids = useJobStore((s) => s.bids);
  const setBids = useJobStore((s) => s.setBids);
  const addBid = useJobStore((s) => s.addBid);
  const updateBidInStore = useJobStore((s) => s.updateBid);
  const selectedJob = useJobStore((s) => s.selectedJob);
  const [jobDetails, setJobDetails] = useState<any>(selectedJob);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const isProvider = user?.role === UserRole.PROVIDER;
  const activeJob = jobDetails || selectedJob;
  const providerExistingBid = isProvider && user?.id
    ? bids.find((bid) => bid.providerId === user.id) || null
    : null;

  // Provider Bid Modal State
  const [isBidModalVisible, setIsBidModalVisible] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidDuration, setBidDuration] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [isGeneratingBidAi, setIsGeneratingBidAi] = useState(false);
  const [bidRecommendation, setBidRecommendation] = useState<BidRecommendation | null>(null);

  // Live pulse animation for the "LIVE" indicator
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(0.3, { duration: 800 }),
      -1,
      true,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Load bids from API and connect to Socket.IO on mount
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadBids = async () => {
        try {
          setIsLoading(true);
          const [response, jobResponse] = await Promise.all([
            bidService.getBidsForJob(jobId),
            api.get(`/jobs/${jobId}`),
          ]);

          if (isActive) {
            setBids(response);

            if (jobResponse.data?.success) {
              setJobDetails(jobResponse.data.data);
            }
          }
        } catch (err: any) {
          console.error('[LiveBidding] Failed to load bids:', err);
        } finally {
          if (isActive) setIsLoading(false);
        }
      };

      loadBids();

      // Join the Socket.IO bidding room for real-time updates
      socketService.joinBiddingRoom(jobId);

      // Listen for new bids arriving in real-time
      socketService.onNewBid((bid: any) => {
        if (isActive && bid.jobId === jobId) {
          addBid(bid);
        }
      });

      socketService.onBidUpdate((payload: any) => {
        if (!isActive) return;

        // Handles both payload shapes: full bid object and { jobId, bid }
        const updatedBid = payload?.bid || payload;
        const bidJobId = updatedBid?.jobId || payload?.jobId;

        if (updatedBid?.id && bidJobId === jobId) {
          updateBidInStore(updatedBid.id, updatedBid);
        }
      });

      return () => {
        isActive = false;
        socketService.leaveBiddingRoom(jobId);
        socketService.off(SOCKET_EVENTS.NEW_BID);
        socketService.off(SOCKET_EVENTS.BID_UPDATE);
      };
    }, [jobId, addBid, setBids, updateBidInStore]),
  );

  const openBidModal = () => {
    if (providerExistingBid) {
      setBidAmount(String(providerExistingBid.amount));
      setBidDuration(providerExistingBid.estimatedDuration || '');
      setBidMessage(providerExistingBid.message || '');
    } else {
      setBidAmount('');
      setBidDuration('');
      setBidMessage('');
    }

    setBidRecommendation(null);
    setIsBidModalVisible(true);
  };

  const handleGenerateBidRecommendation = async () => {
    if (!activeJob) return;

    const competitorBids = bids
      .filter((bid) => bid.providerId !== user?.id)
      .map((bid) => bid.amount)
      .filter((amount) => Number.isFinite(amount));
    const currentLowestBid = competitorBids.length > 0
      ? Math.min(...competitorBids)
      : undefined;

    setIsGeneratingBidAi(true);
    try {
      const recommendation = await recommendationService.suggestBid({
        jobTitle: activeJob.title,
        jobDescription: activeJob.description,
        jobCategory: activeJob.category,
        currentLowestBid,
        myBidAmount: Number(bidAmount) || undefined,
        estimatedDuration: bidDuration,
        message: bidMessage,
      });

      setBidRecommendation(recommendation);

      if (
        recommendation.suggestedBidAmount &&
        (!bidAmount.trim() || Number(bidAmount) > recommendation.suggestedBidAmount)
      ) {
        setBidAmount(String(recommendation.suggestedBidAmount));
      }

      if (!bidMessage.trim() || bidMessage.trim().length < 20) {
        setBidMessage(recommendation.suggestedMessage);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to generate bid recommendation right now.';
      Alert.alert('AI Bid Assistant', message);
    } finally {
      setIsGeneratingBidAi(false);
    }
  };

  const handleAcceptBid = async (bid: Bid) => {
    Alert.alert(
      'Accept Bid',
      `Accept ${bid.provider?.name}'s bid of ${formatCurrency(bid.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setAcceptingBidId(bid.id);
            try {
              // Call the backend to accept the bid
              await api.post(`/bids/${bid.id}/accept`);
              Alert.alert('Success', 'Bid accepted! The provider has been notified.');
              navigation.goBack();
            } catch (err: any) {
              const message = err?.response?.data?.message || 'Failed to accept bid';
              Alert.alert('Error', message);
            } finally {
              setAcceptingBidId(null);
            }
          },
        },
      ],
    );
  };

  const handlePlaceBid = async () => {
    if (!bidAmount.trim() || !bidDuration.trim() || !bidMessage.trim()) {
      Alert.alert('Error', 'Please fill in all fields to place a bid');
      return;
    }

    const amount = Number(bidAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid bid amount');
      return;
    }

    if (providerExistingBid && amount >= providerExistingBid.amount) {
      Alert.alert(
        'Lower Price Required',
        `Your new bid must be lower than your current bid of ${formatCurrency(providerExistingBid.amount)}.`,
      );
      return;
    }
    
    setIsSubmittingBid(true);
    try {
      if (providerExistingBid) {
        await bidService.updateBid(providerExistingBid.id, {
          amount,
          estimatedDuration: bidDuration,
          message: bidMessage,
        });
      } else {
        await bidService.placeBid({
          jobId,
          amount,
          estimatedDuration: bidDuration,
          message: bidMessage,
        });
      }

      const refreshedBids = await bidService.getBidsForJob(jobId);
      setBids(refreshedBids);

      Alert.alert(
        'Success',
        providerExistingBid
          ? 'Your bid was updated. You are still in the live competition.'
          : 'Your bid has been placed! You are now competing live.',
      );
      setIsBidModalVisible(false);
      setBidAmount('');
      setBidDuration('');
      setBidMessage('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to place bid';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmittingBid(false);
    }
  };

  const renderBidItem = ({ item, index }: { item: Bid; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 100).duration(400)}>
      <GlassCard style={styles.bidCard}>
        <View style={styles.bidHeader}>
          <View style={styles.bidUserInfo}>
            <Avatar
              name={item.provider?.name ?? 'Provider'}
              imageUrl={item.provider?.avatarUrl}
              size="md"
            />
            <View style={styles.bidUserMeta}>
              <VerifiedName
                name={item.provider?.name ?? 'Service Provider'}
                isVerified={isKycVerifiedStatus(item.provider?.kycStatus)}
                textStyle={styles.bidUserName}
              />
              <Text style={styles.bidDuration}>
                <Clock size={12} color={colors.gray500} /> {item.estimatedDuration}
              </Text>
            </View>
          </View>
          <Text style={styles.bidAmount}>{formatCurrency(item.amount)}</Text>
        </View>

        <Text style={styles.bidMessage}>{item.message}</Text>

        {!isProvider && (
          <Button
            title={acceptingBidId === item.id ? 'Accepting...' : 'Accept Bid'}
            onPress={() => handleAcceptBid(item)}
            variant="primary"
            size="sm"
            fullWidth
            loading={acceptingBidId === item.id}
            disabled={!!acceptingBidId}
            style={{ marginTop: spacing[3] }}
          />
        )}
      </GlassCard>
    </Animated.View>
  );

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
        <Text style={styles.headerTitle}>Live Bidding</Text>
        <View style={styles.liveIndicator}>
          <Animated.View style={[styles.liveDot, pulseStyle]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Job Summary */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <GlassCard style={styles.jobSummary}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {activeJob?.title ?? 'Service Request'}
          </Text>
          <View style={styles.jobStats}>
            <View style={styles.statItem}>
              <Users size={16} color={colors.gray400} />
              <Text style={styles.statText}>{bids.length} bids</Text>
            </View>
            <View style={styles.statItem}>
              <TrendingUp size={16} color={colors.gray400} />
              <Text style={styles.statText}>
                Budget: {formatCurrency(activeJob?.originalPrice ?? 0)}
              </Text>
            </View>
          </View>

          {activeJob?.images?.length > 0 && (
            <View style={styles.photosSection}>
              <Text style={styles.photosTitle}>Problem Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {activeJob.images.map((uri: string, index: number) => {
                  const imageUri = resolveImageUrl(uri);
                  if (!imageUri) return null;
                  return (
                    <Image
                      key={`${imageUri}-${index}`}
                      source={{ uri: imageUri }}
                      style={styles.photoThumb}
                    />
                  );
                })}
              </ScrollView>
            </View>
          )}
        </GlassCard>
      </Animated.View>

      {/* Bids List */}
      <Text style={styles.sectionTitle}>
        Incoming Bids ({bids.length})
      </Text>

      <FlatList
        data={bids}
        renderItem={renderBidItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading bids...' : 'Waiting for providers to bid...'}
            </Text>
          </View>
        }
      />

      {/* Provider Place Bid Bottom Action Area */}
      {isProvider && (
        <View style={styles.providerActionContainer}>
          <Button
            title={providerExistingBid ? 'Re-bid with Lower Price' : 'Place Your Bid'}
            onPress={openBidModal}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      )}

      {/* Provider Place Bid Modal */}
      <Modal visible={isBidModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {providerExistingBid ? 'Update Your Bid' : 'Submit Your Proposal'}
            </Text>

            {providerExistingBid && (
              <Text style={styles.currentBidText}>
                Current bid: {formatCurrency(providerExistingBid.amount)}
              </Text>
            )}

            <TouchableOpacity
              style={styles.aiBidButton}
              onPress={handleGenerateBidRecommendation}
              disabled={isGeneratingBidAi}
            >
              <Sparkles size={14} color={colors.white} />
              <Text style={styles.aiBidButtonText}>
                {isGeneratingBidAi ? 'Thinking...' : 'AI Recommend'}
              </Text>
            </TouchableOpacity>

            {bidRecommendation && (
              <GlassCard style={styles.aiBidCard}>
                <Text style={styles.aiBidTitle}>AI Bid Score: {bidRecommendation.score}/100</Text>
                <Text style={styles.aiBidBody}>{bidRecommendation.strategy}</Text>
                {bidRecommendation.suggestedBidAmount ? (
                  <Text style={styles.aiBidBody}>
                    Suggested amount: {formatCurrency(bidRecommendation.suggestedBidAmount)}
                  </Text>
                ) : null}
                {bidRecommendation.riskFlags?.slice(0, 2).map((flag, index) => (
                  <Text key={`${flag}-${index}`} style={styles.aiBidRisk}>• {flag}</Text>
                ))}
              </GlassCard>
            )}
            
            <Input
              label="Bid Amount (₹)"
              placeholder="e.g. 5000"
              value={bidAmount}
              onChangeText={setBidAmount}
              keyboardType="numeric"
            />
            
            <Input
              label="Estimated Duration"
              placeholder="e.g. 2 Days"
              value={bidDuration}
              onChangeText={setBidDuration}
            />
            
            <Input
              label="Proposal Message & Strategy"
              placeholder="Briefly describe why you are the best fit..."
              value={bidMessage}
              onChangeText={setBidMessage}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setIsBidModalVisible(false)}
                variant="secondary"
                style={{ flex: 1 }}
                disabled={isSubmittingBid}
              />
              <View style={{ width: spacing[3] }} />
              <Button
                title={providerExistingBid ? 'Update Bid' : 'Submit Bid'}
                onPress={handlePlaceBid}
                variant="primary"
                style={{ flex: 1 }}
                loading={isSubmittingBid}
                disabled={isSubmittingBid}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  liveText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: colors.error,
    letterSpacing: 1,
  },
  jobSummary: {
    marginBottom: spacing[4],
  },
  photosSection: {
    marginTop: spacing[3],
  },
  photosTitle: {
    ...typography.caption,
    color: colors.gray500,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  photoThumb: {
    width: 110,
    height: 82,
    borderRadius: borderRadius.md,
    marginRight: spacing[2],
    backgroundColor: colors.gray800,
  },
  jobTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.md,
    color: colors.white,
    marginBottom: spacing[2],
  },
  jobStats: {
    flexDirection: 'row',
    gap: spacing[6],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statText: {
    ...typography.bodySm,
    color: colors.gray400,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.lg,
    color: colors.white,
    marginBottom: spacing[3],
  },
  listContent: {
    paddingBottom: spacing[20],
  },
  bidCard: {
    marginBottom: spacing[3],
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  bidUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bidUserMeta: {
    marginLeft: spacing[3],
    flex: 1,
  },
  bidUserName: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.base,
    color: colors.white,
  },
  bidDuration: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  bidAmount: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.white,
  },
  bidMessage: {
    ...typography.bodySm,
    color: colors.gray400,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  emptyText: {
    ...typography.body,
    color: colors.gray500,
  },
  providerActionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing[4],
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.gray900,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing[5],
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing[5],
  },
  modalTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.white,
    marginBottom: spacing[4],
  },
  currentBidText: {
    ...typography.bodySm,
    color: colors.gray400,
    marginBottom: spacing[3],
  },
  aiBidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderColor: colors.gray700,
    backgroundColor: colors.gray800,
    borderRadius: borderRadius.full,
    paddingVertical: spacing[2],
    marginBottom: spacing[3],
  },
  aiBidButtonText: {
    ...typography.caption,
    color: colors.white,
    fontFamily: fontFamilies.semibold,
  },
  aiBidCard: {
    marginBottom: spacing[3],
  },
  aiBidTitle: {
    fontFamily: fontFamilies.semibold,
    color: colors.white,
    marginBottom: spacing[1],
  },
  aiBidBody: {
    ...typography.bodySm,
    color: colors.gray300,
    marginBottom: spacing[1],
  },
  aiBidRisk: {
    ...typography.caption,
    color: colors.warning,
    marginBottom: spacing[1],
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing[4],
  },
});

export default LiveBiddingScreen;
