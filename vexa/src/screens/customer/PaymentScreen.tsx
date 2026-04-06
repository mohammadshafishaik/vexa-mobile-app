import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, Shield, CreditCard, Check, AlertCircle } from 'lucide-react-native';
import RazorpayCheckout from 'react-native-razorpay';
import ScreenContainer from '../../components/layout/ScreenContainer';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { CustomerStackParamList } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { paymentService } from '../../services/payments';
import { jobService } from '../../services/jobs';
import { useJobStore } from '../../store/useJobStore';

type PaymentRoute = RouteProp<CustomerStackParamList, 'Payment'>;

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<PaymentRoute>();
  const { jobId } = route.params;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState('');
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const updateJob = useJobStore((s) => s.updateJob);

  // Fetch real job details on mount
  useEffect(() => {
    const fetchJob = async () => {
      try {
        setIsLoading(true);
        const job = await jobService.getJobById(jobId);
        setJobTitle(job.title);
        setAmount(job.revisedPrice || job.originalPrice);
      } catch (err: any) {
        setError(err.message || 'Failed to load job details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  const serviceFee = Math.round(amount * 0.05); // 5% platform fee
  const total = amount + serviceFee;

  const handlePay = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      // Wait for the backend to create an order
      const order = await paymentService.createOrder(jobId);

      // Open Razorpay Checkout natively
      const options = {
        description: order.jobTitle || 'Service Payment',
        image: 'https://i.imgur.com/3g7nmJC.png', // Or your app logo URL
        currency: order.currency,
        key: order.keyId,
        amount: order.amount,
        name: 'VEXA',
        order_id: order.orderId,
        theme: { color: colors.white },
      };

      try {
        const data = await RazorpayCheckout.open(options);

        // Verify payment on our backend
        await paymentService.verifyPayment({
          jobId,
          razorpayOrderId: data.razorpay_order_id,
          razorpayPaymentId: data.razorpay_payment_id,
          razorpaySignature: data.razorpay_signature,
        });

        updateJob(jobId, { status: 'PAID' as any });
        Alert.alert('Success', 'Payment completed successfully!');
        navigation.goBack();
      } catch (checkoutError: any) {
        // User cancelled or payment failed
        const msg = checkoutError?.error?.description || 'Payment was cancelled or failed';
        setError(msg);
      } finally {
        setIsProcessing(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create payment order');
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
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
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Display */}
        {error && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <GlassCard style={styles.errorCard}>
              <View style={styles.errorRow}>
                <AlertCircle size={20} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Order Summary */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <GlassCard>
            <Text style={styles.jobTitle}>{jobTitle}</Text>

            <View style={styles.lineItem}>
              <Text style={styles.lineLabel}>Service Amount</Text>
              <Text style={styles.lineValue}>
                {formatCurrency(amount)}
              </Text>
            </View>
            <View style={styles.lineItem}>
              <Text style={styles.lineLabel}>Platform Fee (5%)</Text>
              <Text style={styles.lineValue}>
                {formatCurrency(serviceFee)}
              </Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.lineItem}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(total)}
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
            title={`Pay ${formatCurrency(total)}`}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.gray400,
  },
  errorCard: {
    marginBottom: spacing[4],
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    flex: 1,
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
