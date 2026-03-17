import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, Shield, CreditCard, Check } from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { CustomerStackParamList } from '../../types';
import { formatCurrency } from '../../utils/helpers';

type PaymentRoute = RouteProp<CustomerStackParamList, 'Payment'>;

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PaymentRoute>();
  const { jobId } = route.params;
  const [isProcessing, setIsProcessing] = useState(false);

  // Will fetch real data in Phase 3
  const paymentDetails = {
    jobTitle: 'Fix kitchen sink leak',
    amount: 3200,
    serviceFee: 160,
    total: 3360,
    currency: 'INR',
  };

  const handlePay = () => {
    setIsProcessing(true);
    // Will integrate Razorpay in Phase 7
    setTimeout(() => {
      setIsProcessing(false);
    }, 2000);
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
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <GlassCard>
            <Text style={styles.jobTitle}>{paymentDetails.jobTitle}</Text>

            <View style={styles.lineItem}>
              <Text style={styles.lineLabel}>Service Amount</Text>
              <Text style={styles.lineValue}>
                {formatCurrency(paymentDetails.amount)}
              </Text>
            </View>
            <View style={styles.lineItem}>
              <Text style={styles.lineLabel}>Platform Fee</Text>
              <Text style={styles.lineValue}>
                {formatCurrency(paymentDetails.serviceFee)}
              </Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.lineItem}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(paymentDetails.total)}
              </Text>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Security Notice */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <GlassCard style={styles.securityCard}>
            <View style={styles.securityRow}>
              <Shield size={20} color={colors.success} />
              <View style={styles.securityContent}>
                <Text style={styles.securityTitle}>Secure Payment</Text>
                <Text style={styles.securityText}>
                  Payment is processed securely via Razorpay.
                  Your payment details are encrypted end-to-end.
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Payment Benefits */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <View style={styles.benefitsList}>
            {[
              'Money held in escrow until job is verified',
              'Full refund if service is not completed',
              'Dispute resolution support',
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Check size={16} color={colors.success} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Pay Button */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <Button
            title={`Pay ${formatCurrency(paymentDetails.total)}`}
            onPress={handlePay}
            variant="primary"
            size="lg"
            fullWidth
            loading={isProcessing}
            icon={<CreditCard size={18} color={colors.black} />}
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
  sectionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.lg,
    color: colors.white,
    marginBottom: spacing[3],
  },
  jobTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.md,
    color: colors.white,
    marginBottom: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  lineLabel: {
    ...typography.body,
    color: colors.gray400,
  },
  lineValue: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.base,
    color: colors.white,
  },
  totalDivider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: spacing[2],
  },
  totalLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: colors.white,
  },
  totalValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.white,
  },
  securityCard: {
    marginTop: spacing[4],
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.base,
    color: colors.success,
    marginBottom: 4,
  },
  securityText: {
    ...typography.bodySm,
    color: colors.gray400,
    lineHeight: 20,
  },
  benefitsList: {
    marginTop: spacing[4],
    gap: spacing[3],
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  benefitText: {
    ...typography.body,
    color: colors.gray300,
  },
});

export default PaymentScreen;
