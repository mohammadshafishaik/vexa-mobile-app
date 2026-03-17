import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { CustomerStackParamList } from '../../types';
import { formatCurrency } from '../../utils/helpers';

type RevisionRoute = RouteProp<CustomerStackParamList, 'RevisionApproval'>;

const RevisionApprovalScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RevisionRoute>();
  const { jobId, modificationId } = route.params;

  // Will fetch real data from store/API in Phase 3
  const modification = {
    providerName: 'Service Provider',
    revisionReason:
      'After inspecting the site, additional plumbing work is required. The existing pipes need replacement which was not visible before.',
    originalPrice: 2500,
    revisedPrice: 3200,
    revisionImages: [] as string[],
  };

  const priceIncreasePercent = Math.round(
    ((modification.revisedPrice - modification.originalPrice) /
      modification.originalPrice) *
      100,
  );

  const handleApprove = () => {
    // Will connect to API in Phase 3
    navigation.goBack();
  };

  const handleReject = () => {
    // Will connect to API in Phase 3
    navigation.goBack();
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
        <Text style={styles.headerTitle}>Revision Request</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Banner */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <GlassCard style={styles.warningCard}>
            <View style={styles.warningRow}>
              <AlertTriangle size={20} color={colors.warning} />
              <Text style={styles.warningText}>
                The provider has requested a modification to this job.
                Review the details below.
              </Text>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Reason */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={styles.sectionTitle}>Reason for Revision</Text>
          <GlassCard>
            <Text style={styles.reasonText}>{modification.revisionReason}</Text>
          </GlassCard>
        </Animated.View>

        {/* Price Comparison */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)}>
          <Text style={styles.sectionTitle}>Price Change</Text>
          <GlassCard>
            <View style={styles.priceCompare}>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>Original</Text>
                <Text style={styles.priceOriginal}>
                  {formatCurrency(modification.originalPrice)}
                </Text>
              </View>
              <View style={styles.priceArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>Revised</Text>
                <Text style={styles.priceRevised}>
                  {formatCurrency(modification.revisedPrice)}
                </Text>
              </View>
            </View>
            <View style={styles.percentBadge}>
              <Text style={styles.percentText}>
                +{priceIncreasePercent}% increase
              </Text>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.actions}
        >
          <Button
            title="Approve Revision"
            onPress={handleApprove}
            variant="primary"
            size="lg"
            fullWidth
            icon={<CheckCircle size={18} color={colors.black} />}
          />
          <Button
            title="Reject Revision"
            onPress={handleReject}
            variant="danger"
            size="lg"
            fullWidth
            icon={<XCircle size={18} color={colors.white} />}
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
  warningCard: {
    marginBottom: spacing[5],
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
  sectionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.lg,
    color: colors.white,
    marginTop: spacing[4],
    marginBottom: spacing[3],
  },
  reasonText: {
    ...typography.body,
    color: colors.gray300,
    lineHeight: 22,
  },
  priceCompare: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  priceColumn: {
    alignItems: 'center',
  },
  priceLabel: {
    ...typography.caption,
    color: colors.gray500,
    marginBottom: spacing[1],
    textTransform: 'uppercase',
  },
  priceOriginal: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.gray400,
    textDecorationLine: 'line-through',
  },
  priceRevised: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.white,
  },
  priceArrow: {
    paddingHorizontal: spacing[3],
  },
  arrowText: {
    fontSize: 24,
    color: colors.gray500,
  },
  percentBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    marginTop: spacing[3],
  },
  percentText: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.sm,
    color: colors.warning,
  },
  actions: {
    gap: spacing[3],
    marginTop: spacing[6],
  },
});

export default RevisionApprovalScreen;
