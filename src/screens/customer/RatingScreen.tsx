import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, Star } from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import Button from '../../components/ui/Button';
import GlassCard from '../../components/ui/GlassCard';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { CustomerStackParamList } from '../../types';
import { RATING } from '../../utils/constants';

type RatingRoute = RouteProp<CustomerStackParamList, 'Rating'>;

const RatingScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RatingRoute>();
  const { jobId } = route.params;
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    // Will connect to API in Phase 3
    setTimeout(() => {
      setIsSubmitting(false);
      navigation.goBack();
    }, 1500);
  };

  const getRatingLabel = (score: number) => {
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return labels[score] ?? '';
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
        <Text style={styles.headerTitle}>Rate Provider</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
              placeholder="Share your experience with this provider..."
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
            disabled={rating === 0}
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
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
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
});

export default RatingScreen;
