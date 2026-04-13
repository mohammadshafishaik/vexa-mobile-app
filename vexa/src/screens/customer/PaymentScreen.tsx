import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ChevronLeft, Shield, CreditCard, Check, AlertCircle, Banknote, Smartphone } from 'lucide-react-native';
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
  const navigation = useNavigation<any>();
  const route = useRoute<PaymentRoute>();
  const { jobId } = route.params;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState('');
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'RAZORPAY' | 'CASH'>('RAZORPAY');
  const updateJob = useJobStore((s) => s.updateJob);

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

  const serviceFee = Math.round(amount * 0.05);
  const total = amount + serviceFee;

  const handleRazorpayPay = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const order = await paymentService.createOrder(jobId);
      const options = {
        description: order.jobTitle || 'Service Payment',
        image: 'https://i.imgur.com/3g7nmJC.png',
        currency: order.currency,
        key: order.keyId,
        amount: order.amount,
        name: 'VEXA',
        order_id: order.orderId,
        theme: { color: colors.white },
      };

      try {
        const data = await RazorpayCheckout.open(options);
        await paymentService.verifyPayment({
          jobId,
          razorpayOrderId: data.razorpay_order_id,
          razorpayPaymentId: data.razorpay_payment_id,
          razorpaySignature: data.razorpay_signature,
        });
        updateJob(jobId, { status: 'PAID' as any });
        Alert.alert('Payment Successful! ✅', 'Your payment has been processed successfully.', [
          { text: 'Rate Provider', onPress: () => navigation.replace('Rating', { jobId }) },
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } catch (checkoutError: any) {
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

  const handleCashPay = async () => {
    Alert.alert(
      'Confirm Cash Payment',
      `Are you sure you have paid ₹${total} in cash to the provider?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I Paid',
          onPress: async () => {
            setIsProcessing(true);
            setError(null);
            try {
              await paymentService.payCash(jobId);
              updateJob(jobId, { status: 'PAID' as any });
              Alert.alert('Cash Payment Recorded! ✅', 'Payment has been marked as completed.', [
                { text: 'Rate Provider', onPress: () => navigation.replace('Rating', { jobId }) },
                { text: 'Done', onPress: () => navigation.goBack() },
              ]);
            } catch (err: any) {
              setError(err?.response?.data?.message || err.message || 'Failed to record cash payment');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handlePay = () => {
    if (selectedMethod === 'RAZORPAY') {
      handleRazorpayPay();
    } else {
      handleCashPay();
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
              <Text style={styles.lineValue}>{formatCurrency(amount)}</Text>
            </View>
            <View style={styles.lineItem}>
              <Text style={styles.lineLabel}>Platform Fee (5%)</Text>
              <Text style={styles.lineValue}>{formatCurrency(serviceFee)}</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.lineItem}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Payment Method Selection */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          <TouchableOpacity
            style={[styles.methodCard, selectedMethod === 'RAZORPAY' && styles.methodCardSelected]}
            onPress={() => setSelectedMethod('RAZORPAY')}
            activeOpacity={0.7}
          >
            <View style={[styles.radio, selectedMethod === 'RAZORPAY' && styles.radioSelected]}>
              {selectedMethod === 'RAZORPAY' && <View style={styles.radioInner} />}
            </View>
            <Smartphone size={22} color={selectedMethod === 'RAZORPAY' ? colors.white : colors.gray500} />
            <View style={styles.methodInfo}>
              <Text style={[styles.methodTitle, selectedMethod === 'RAZORPAY' && styles.methodTitleSelected]}>
                Pay Online
              </Text>
              <Text style={styles.methodDesc}>UPI, Cards, Net Banking via Razorpay</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, selectedMethod === 'CASH' && styles.methodCardSelected]}
            onPress={() => setSelectedMethod('CASH')}
            activeOpacity={0.7}
          >
            <View style={[styles.radio, selectedMethod === 'CASH' && styles.radioSelected]}>
              {selectedMethod === 'CASH' && <View style={styles.radioInner} />}
            </View>
            <Banknote size={22} color={selectedMethod === 'CASH' ? colors.white : colors.gray500} />
            <View style={styles.methodInfo}>
              <Text style={[styles.methodTitle, selectedMethod === 'CASH' && styles.methodTitleSelected]}>
                Pay with Cash
              </Text>
              <Text style={styles.methodDesc}>Pay the provider directly in cash</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Security Notice */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <GlassCard style={styles.securityCard}>
            <View style={styles.securityRow}>
              <Shield size={20} color={colors.success} />
              <View style={styles.securityContent}>
                <Text style={styles.securityTitle}>
                  {selectedMethod === 'RAZORPAY' ? 'Secure Payment' : 'Cash Payment'}
                </Text>
                <Text style={styles.securityText}>
                  {selectedMethod === 'RAZORPAY'
                    ? 'Payment is processed securely via Razorpay. Your payment details are encrypted end-to-end.'
                    : 'Confirm that you have paid the provider in cash. This will be recorded in our system.'}
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Pay Button */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <Button
            title={selectedMethod === 'RAZORPAY' ? `Pay ${formatCurrency(total)}` : `Confirm Cash Payment`}
            onPress={handlePay}
            variant="primary"
            size="lg"
            fullWidth
            loading={isProcessing}
            icon={selectedMethod === 'RAZORPAY'
              ? <CreditCard size={18} color={colors.black} />
              : <Banknote size={18} color={colors.black} />
            }
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
    marginTop: spacing[4],
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
  // Payment Method Cards
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.gray900,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  methodCardSelected: {
    borderColor: colors.white,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.white,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.white,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.base,
    color: colors.gray500,
    marginBottom: 2,
  },
  methodTitleSelected: {
    color: colors.white,
  },
  methodDesc: {
    ...typography.caption,
    color: colors.gray500,
  },
  securityCard: {
    marginTop: spacing[2],
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
});

export default PaymentScreen;
