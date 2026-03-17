import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  ChevronLeft,
  Camera,
  DollarSign,
  AlertTriangle,
} from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import GlassCard from '../../components/ui/GlassCard';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { ProviderStackParamList } from '../../types';
import { JOB_LIMITS } from '../../utils/constants';
import { formatCurrency, isPriceIncreaseValid } from '../../utils/helpers';

type ModRoute = RouteProp<ProviderStackParamList, 'ModificationRequest'>;

const ModificationRequestScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ModRoute>();
  const { jobId } = route.params;

  const [reason, setReason] = useState('');
  const [revisedPrice, setRevisedPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Will fetch from store/API in Phase 3
  const originalPrice = 2500;
  const maxIncrease = JOB_LIMITS.MAX_PRICE_INCREASE_PERCENT;

  const parsedPrice = parseFloat(revisedPrice) || 0;
  const isPriceValid = parsedPrice > 0 && isPriceIncreaseValid(
    originalPrice,
    parsedPrice,
    maxIncrease,
  );

  const handleSubmit = () => {
    if (!reason.trim() || !isPriceValid) return;
    setIsSubmitting(true);
    // Will connect to API in Phase 3
    setTimeout(() => {
      setIsSubmitting(false);
      navigation.goBack();
    }, 1500);
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Modification</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Warning */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <GlassCard style={styles.warningCard}>
              <View style={styles.warningRow}>
                <AlertTriangle size={18} color={colors.warning} />
                <Text style={styles.warningText}>
                  Modifications are limited to {JOB_LIMITS.MAX_MODIFICATIONS_PER_JOB} per
                  job. Price increases cannot exceed {maxIncrease}% of the original price.
                </Text>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Original Price */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <GlassCard style={styles.priceCard}>
              <Text style={styles.priceLabel}>Original Price</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(originalPrice)}
              </Text>
              <Text style={styles.maxLabel}>
                Max allowed: {formatCurrency(originalPrice * (1 + maxIncrease / 100))}
              </Text>
            </GlassCard>
          </Animated.View>

          {/* Reason */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text style={styles.label}>REASON FOR MODIFICATION</Text>
            <View style={styles.textAreaWrapper}>
              <TextInput
                style={styles.textArea}
                placeholder="Explain why this modification is needed..."
                placeholderTextColor={colors.gray500}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </Animated.View>

          {/* Revised Price */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <Input
              label="Revised Price (₹)"
              placeholder="Enter revised price"
              value={revisedPrice}
              onChangeText={setRevisedPrice}
              keyboardType="numeric"
              icon={<DollarSign size={18} color={colors.gray500} />}
              error={
                parsedPrice > 0 && !isPriceValid
                  ? `Price cannot exceed ${maxIncrease}% increase`
                  : undefined
              }
            />
          </Animated.View>

          {/* Photos */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text style={styles.label}>EVIDENCE PHOTOS</Text>
            <TouchableOpacity style={styles.photoUpload} activeOpacity={0.7}>
              <Camera size={24} color={colors.gray500} />
              <Text style={styles.photoText}>
                Add photos to support your request
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Submit */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <Button
              title="Submit Modification Request"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={!reason.trim() || !isPriceValid}
              style={{ marginTop: spacing[4] }}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  warningCard: {
    marginBottom: spacing[4],
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  warningText: {
    ...typography.bodySm,
    color: colors.warning,
    flex: 1,
    lineHeight: 20,
  },
  priceCard: {
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  priceLabel: {
    ...typography.caption,
    color: colors.gray500,
    textTransform: 'uppercase',
    marginBottom: spacing[1],
  },
  priceValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes['2xl'],
    color: colors.white,
    marginBottom: spacing[1],
  },
  maxLabel: {
    ...typography.caption,
    color: colors.gray500,
  },
  label: {
    ...typography.label,
    color: colors.gray400,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
  },
  textAreaWrapper: {
    backgroundColor: colors.gray900,
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
  },
  textArea: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    color: colors.white,
    padding: spacing[4],
    minHeight: 100,
  },
  photoUpload: {
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.gray700,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  photoText: {
    ...typography.bodySm,
    color: colors.gray500,
  },
});

export default ModificationRequestScreen;
