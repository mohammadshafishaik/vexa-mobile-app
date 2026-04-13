import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
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
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { CustomerStackParamList, JobModification } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { jobService } from '../../services/jobs';
import { resolveImageUrl } from '../../utils/image';

type RevisionRoute = RouteProp<CustomerStackParamList, 'RevisionApproval'>;

const RevisionApprovalScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RevisionRoute>();
  const { jobId, modificationId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providerName, setProviderName] = useState('Service Provider');
  const [modification, setModification] = useState<JobModification | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const job = await jobService.getJobById(jobId);
        if (job.selectedProvider?.name) {
          setProviderName(job.selectedProvider.name);
        }

        const found = job.modifications?.find((m) => m.id === modificationId) || null;
        setModification(found);
      } catch (error: any) {
        Alert.alert('Error', error?.response?.data?.message || 'Failed to load revision request');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [jobId, modificationId]);

  const priceIncreasePercent = useMemo(() => {
    if (!modification || modification.originalPrice <= 0) return 0;
    return Math.round(((modification.revisedPrice - modification.originalPrice) / modification.originalPrice) * 100);
  }, [modification]);

  const handleRespond = async (approved: boolean) => {
    if (!modification) return;

    setIsSubmitting(true);
    try {
      await jobService.respondToModification(jobId, modification.id, { approved });
      Alert.alert(
        approved ? 'Revision Approved' : 'Revision Rejected',
        approved
          ? 'The revised price has been accepted and the job is back in progress.'
          : 'The revised price has been rejected and the job continues at the previous amount.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit your response');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
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
        <ActivityIndicator color={colors.white} style={{ flex: 1 }} />
      </ScreenContainer>
    );
  }

  if (!modification) {
    return (
      <ScreenContainer>
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

        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Request not found</Text>
          <Text style={styles.emptyText}>This revision request no longer exists or has already been resolved.</Text>
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
        <Text style={styles.headerTitle}>Revision Request</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <GlassCard style={styles.warningCard}>
            <View style={styles.warningRow}>
              <AlertTriangle size={20} color={colors.warning} />
              <Text style={styles.warningText}>
                {providerName} requested a price revision for additional on-site work. Review and choose whether to approve.
              </Text>
            </View>
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(400)}>
          <Text style={styles.sectionTitle}>Reason for Revision</Text>
          <GlassCard>
            <Text style={styles.reasonText}>{modification.revisionReason}</Text>
          </GlassCard>
        </Animated.View>

        {modification.revisionImages?.length > 0 && (
          <Animated.View entering={FadeInDown.delay(220).duration(400)}>
            <Text style={styles.sectionTitle}>Evidence Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {modification.revisionImages.map((img, index) => {
                const uri = resolveImageUrl(img);
                if (!uri) return null;
                return <Image key={`${uri}-${index}`} source={{ uri }} style={styles.thumbnail} />;
              })}
            </ScrollView>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(260).duration(400)}>
          <Text style={styles.sectionTitle}>Price Change</Text>
          <GlassCard>
            <View style={styles.priceCompare}>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>Original</Text>
                <Text style={styles.priceOriginal}>{formatCurrency(modification.originalPrice)}</Text>
              </View>
              <View style={styles.priceArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>Revised</Text>
                <Text style={styles.priceRevised}>{formatCurrency(modification.revisedPrice)}</Text>
              </View>
            </View>
            <View style={styles.percentBadge}>
              <Text style={styles.percentText}>+{priceIncreasePercent}% increase</Text>
            </View>
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(400)} style={styles.actions}>
          <Button
            title="Approve Revision"
            onPress={() => handleRespond(true)}
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
            icon={<CheckCircle size={18} color={colors.black} />}
          />
          <Button
            title="Reject Revision"
            onPress={() => handleRespond(false)}
            variant="danger"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
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
  imageScroll: {
    marginBottom: spacing[2],
  },
  thumbnail: {
    width: 120,
    height: 90,
    borderRadius: borderRadius.md,
    marginRight: spacing[2],
    backgroundColor: colors.gray800,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
  },
  emptyTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.white,
    marginBottom: spacing[2],
  },
  emptyText: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
  },
});

export default RevisionApprovalScreen;
