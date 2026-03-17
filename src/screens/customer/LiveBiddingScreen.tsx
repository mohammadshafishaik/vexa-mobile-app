import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, Users, Clock, TrendingUp } from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useJobStore } from '../../store/useJobStore';
import { Bid, CustomerStackParamList } from '../../types';
import { formatCurrency } from '../../utils/helpers';

type LiveBiddingRoute = RouteProp<CustomerStackParamList, 'LiveBidding'>;

const LiveBiddingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<LiveBiddingRoute>();
  const { jobId } = route.params;
  const bids = useJobStore((s) => s.bids);
  const selectedJob = useJobStore((s) => s.selectedJob);

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

  const handleAcceptBid = (bid: Bid) => {
    // Will connect to API in Phase 3
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

        <Button
          title="Accept Bid"
          onPress={() => handleAcceptBid(item)}
          variant="primary"
          size="sm"
          fullWidth
          style={{ marginTop: spacing[3] }}
        />
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
            {selectedJob?.title ?? 'Service Request'}
          </Text>
          <View style={styles.jobStats}>
            <View style={styles.statItem}>
              <Users size={16} color={colors.gray400} />
              <Text style={styles.statText}>{bids.length} bids</Text>
            </View>
            <View style={styles.statItem}>
              <TrendingUp size={16} color={colors.gray400} />
              <Text style={styles.statText}>
                Budget: {formatCurrency(selectedJob?.originalPrice ?? 0)}
              </Text>
            </View>
          </View>
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
              Waiting for providers to bid...
            </Text>
          </View>
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
});

export default LiveBiddingScreen;
