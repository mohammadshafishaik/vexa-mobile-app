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
import { ChevronLeft, Users, Clock, TrendingUp } from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useJobStore } from '../../store/useJobStore';
import { useAuthStore } from '../../store/useAuthStore';
import Input from '../../components/ui/Input';
import { Bid, CustomerStackParamList, UserRole } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { bidService } from '../../services/bids';
import { socketService } from '../../services/socket';
import { SOCKET_EVENTS } from '../../utils/constants';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/image';

type LiveBiddingRoute = RouteProp<CustomerStackParamList, 'LiveBidding'>;

const LiveBiddingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<LiveBiddingRoute>();
  const { jobId } = route.params;
  const bids = useJobStore((s) => s.bids);
  const setBids = useJobStore((s) => s.setBids);
  const addBid = useJobStore((s) => s.addBid);
  const selectedJob = useJobStore((s) => s.selectedJob);
  const [jobDetails, setJobDetails] = useState<any>(selectedJob);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const isProvider = user?.role === UserRole.PROVIDER;
  const activeJob = jobDetails || selectedJob;

  // Provider Bid Modal State
  const [isBidModalVisible, setIsBidModalVisible] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidDuration, setBidDuration] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);

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
            // The response is the bids array directly from { success, data: bids }
            const bidsData = Array.isArray(response) ? response : (response as any)?.data || [];
            setBids(bidsData);

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

      return () => {
        isActive = false;
        socketService.leaveBiddingRoom(jobId);
        socketService.off(SOCKET_EVENTS.NEW_BID);
      };
    }, [jobId]),
  );

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
    
    setIsSubmittingBid(true);
    try {
      await bidService.placeBid({
        jobId,
        amount: Number(bidAmount),
        estimatedDuration: bidDuration,
        message: bidMessage,
      });
      Alert.alert('Success', 'Your bid has been placed! You are now competing live.');
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
              <Text style={styles.bidUserName}>
                {item.provider?.name ?? 'Service Provider'}
              </Text>
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
            title="Place Your Bid"
            onPress={() => setIsBidModalVisible(true)}
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
            <Text style={styles.modalTitle}>Submit Your Proposal</Text>
            
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
                title="Submit Bid"
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
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing[4],
  },
});

export default LiveBiddingScreen;
