import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, Star } from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import Button from '../../components/ui/Button';
import GlassCard from '../../components/ui/GlassCard';
import Avatar from '../../components/ui/Avatar';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { CustomerStackParamList } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { jobService } from '../../services/jobs';
import { socketService } from '../../services/socket';

type RatingRoute = RouteProp<CustomerStackParamList, 'Rating'>;

const RatingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RatingRoute>();
  const { jobId } = route.params;
  const currentUser = useAuthStore((s) => s.user);
  const isProvider = currentUser?.role === 'PROVIDER';

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateeId, setRateeId] = useState<string | null>(null);
  const [rateeName, setRateeName] = useState('');
  const [rateeAvatar, setRateeAvatar] = useState<string | null>(null);
  const [alreadyRated, setAlreadyRated] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const job = await jobService.getJobById(jobId);
        const existingRating = job.ratings?.find((r) => r.raterId === currentUser?.id);
        if (existingRating) {
          setAlreadyRated(true);
          setRating(existingRating.score);
          setReview(existingRating.review || '');
        }

        if (isProvider) {
          // Provider rates the customer
          setRateeId(job.customerId);
          setRateeName(job.customer?.name ?? 'Customer');
          setRateeAvatar(job.customer?.avatarUrl ?? null);
        } else {
          // Customer rates the provider
          if (job.selectedProviderId) {
            setRateeId(job.selectedProviderId);
          }
          if (job.selectedProvider) {
            setRateeName(job.selectedProvider.name);
            setRateeAvatar(job.selectedProvider.avatarUrl ?? null);
          }
        }
      } catch (err: any) {
        Alert.alert('Error', 'Failed to load job details');
      }
    };
    fetchJob();
  }, [jobId, isProvider, currentUser?.id]);

  // Listen for real-time rating events
  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      const handler = (data: any) => {
        if (data.jobId === jobId) {
          // Another party just rated — could show a notification
        }
      };
      socket.on('rating:new', handler);
      return () => { socket.off('rating:new', handler); };
    }
  }, [jobId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Required', 'Please select a star rating');
      return;
    }
    if (!rateeId) {
      Alert.alert('Error', 'Could not identify who to rate');
      return;
    }
    if (!review.trim()) {
      Alert.alert('Required', 'Please write a review before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      await jobService.submitRating(jobId, {
        rateeId,
        score: rating,
        review: review.trim(),
      });
      setAlreadyRated(true);
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Failed to submit rating';
      if (message.includes('already rated')) {
        setAlreadyRated(true);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (score: number) => {
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return labels[score] ?? '';
  };

  if (alreadyRated) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rating</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.successContainer}>
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.successContent}>
            <View style={styles.successIconBox}>
              <Star size={48} color={colors.warning} fill={colors.warning} />
            </View>
            <Text style={styles.successTitle}>Thank You! 🎉</Text>
            <Text style={styles.successSubtitle}>
              Your {rating > 0 ? `${rating}-star` : ''} rating has been submitted successfully.
              {'\n'}This helps improve the VEXA community.
            </Text>
            <Button
              title="Done"
              onPress={() => navigation.goBack()}
              variant="primary"
              size="lg"
              fullWidth
            />
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <ChevronLeft size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Rate {rateeName || (isProvider ? 'Customer' : 'Provider')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Ratee Profile */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.profileSection}>
          <Avatar name={rateeName || 'User'} imageUrl={rateeAvatar} size="xl" />
          <Text style={styles.rateeName}>{rateeName}</Text>
          <Text style={styles.rateeRole}>
            {isProvider ? 'Customer' : 'Service Provider'}
          </Text>
        </Animated.View>

        {/* Rating Stars */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.ratingContainer}
        >
          <Text style={styles.ratingPrompt}>
            How was your experience?
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                activeOpacity={0.7}
              >
                <Star
                  size={44}
                  color={star <= rating ? colors.warning : colors.gray700}
                  fill={star <= rating ? colors.warning : 'transparent'}
                  strokeWidth={1.5}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Animated.Text
              entering={FadeInDown.duration(300)}
              style={styles.ratingLabel}
            >
              {getRatingLabel(rating)}
            </Animated.Text>
          )}
        </Animated.View>

        {/* Review */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={styles.label}>WRITE A REVIEW</Text>
          <GlassCard>
            <TextInput
              style={styles.reviewInput}
              placeholder={`Share your experience with this ${isProvider ? 'customer' : 'provider'}...`}
              placeholderTextColor={colors.gray500}
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </GlassCard>
        </Animated.View>

        {/* Submit */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Button
            title="Submit Rating"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            fullWidth
            disabled={rating === 0 || !review.trim()}
            loading={isSubmitting}
            style={{ marginTop: spacing[6] }}
          />
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  rateeName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.white,
    marginTop: spacing[3],
  },
  rateeRole: {
    ...typography.bodySm,
    color: colors.gray500,
    marginTop: spacing[1],
  },
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  ratingPrompt: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.xl,
    color: colors.white,
    marginBottom: spacing[6],
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  ratingLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: colors.warning,
    marginTop: spacing[4],
    letterSpacing: 1,
  },
  label: {
    ...typography.label,
    color: colors.gray400,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
  },
  reviewInput: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.base,
    color: colors.white,
    minHeight: 120,
    lineHeight: 22,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[10],
  },
  successContent: {
    alignItems: 'center',
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  successTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.white,
    marginBottom: spacing[3],
  },
  successSubtitle: {
    ...typography.body,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: spacing[6],
  },
});

export default RatingScreen;
