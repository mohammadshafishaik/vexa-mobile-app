import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  ChevronLeft,
  Camera,
  IndianRupee,
  AlertTriangle,
  X,
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
import { jobService } from '../../services/jobs';
import { uploadService } from '../../services/upload';

type ModRoute = RouteProp<ProviderStackParamList, 'ModificationRequest'>;

const ModificationRequestScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<ModRoute>();
  const { jobId } = route.params;

  const [reason, setReason] = useState('');
  const [revisedPrice, setRevisedPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingJob, setIsLoadingJob] = useState(true);
  const [jobTitle, setJobTitle] = useState('');
  const [originalPrice, setOriginalPrice] = useState(0);
  const [modificationCount, setModificationCount] = useState(0);
  const [maxModifications, setMaxModifications] = useState<number>(JOB_LIMITS.MAX_MODIFICATIONS_PER_JOB);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const job = await jobService.getJobById(jobId);
        const basePrice = job.revisedPrice ?? job.originalPrice;
        setJobTitle(job.title);
        setOriginalPrice(basePrice);
        setRevisedPrice(String(basePrice));
        setModificationCount(job.modificationCount || 0);
        setMaxModifications(job.maxModifications || JOB_LIMITS.MAX_MODIFICATIONS_PER_JOB);
      } catch (error: any) {
        Alert.alert('Error', error?.response?.data?.message || 'Failed to load job details');
      } finally {
        setIsLoadingJob(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const parsedPrice = useMemo(() => parseFloat(revisedPrice) || 0, [revisedPrice]);
  const hasModificationsLeft = modificationCount < maxModifications;
  const isPriceValid = parsedPrice > originalPrice && isPriceIncreaseValid(
    originalPrice,
    parsedPrice,
    JOB_LIMITS.MAX_PRICE_INCREASE_PERCENT,
  );

  const handlePickImages = async () => {
    const remaining = JOB_LIMITS.MAX_IMAGES_PER_MODIFICATION - images.length;
    if (remaining <= 0) {
      Alert.alert('Limit reached', `You can upload up to ${JOB_LIMITS.MAX_IMAGES_PER_MODIFICATION} photos.`);
      return;
    }

    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: remaining,
    });

    if (result.assets?.length) {
      const newUris = result.assets.map((asset) => asset.uri).filter(Boolean) as string[];
      setImages((prev) => [...prev, ...newUris]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please provide a reason for the revision.');
      return;
    }

    if (!isPriceValid) {
      Alert.alert('Invalid revised price', `Please enter a revised price within ${JOB_LIMITS.MAX_PRICE_INCREASE_PERCENT}% of the current amount.`);
      return;
    }

    if (!hasModificationsLeft) {
      Alert.alert('Limit reached', 'No more modification requests are allowed for this job.');
      return;
    }

    setIsSubmitting(true);
    try {
      let revisionImages: string[] = [];
      if (images.length > 0) {
        revisionImages = await uploadService.uploadMultipleImages(images);
      }

      await jobService.submitModification(jobId, {
        revisionReason: reason.trim(),
        revisedPrice: parsedPrice,
        revisionImages,
      });

      Alert.alert(
        'Request submitted',
        'Your revised quote has been sent to the customer for approval.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit modification request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <GlassCard style={styles.warningCard}>
              <View style={styles.warningRow}>
                <AlertTriangle size={18} color={colors.warning} />
                <Text style={styles.warningText}>
                  Modifications used: {modificationCount}/{maxModifications}. Revised price must be above current amount and within {JOB_LIMITS.MAX_PRICE_INCREASE_PERCENT}% increase.
                </Text>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <GlassCard style={styles.priceCard}>
              <Text style={styles.jobTitle}>{jobTitle || 'Service Job'}</Text>
              <Text style={styles.priceLabel}>Current agreed amount</Text>
              <Text style={styles.priceValue}>{formatCurrency(originalPrice)}</Text>
              <Text style={styles.maxLabel}>
                Max revised amount: {formatCurrency(originalPrice * (1 + JOB_LIMITS.MAX_PRICE_INCREASE_PERCENT / 100))}
              </Text>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text style={styles.label}>REASON FOR REVISION</Text>
            <View style={styles.textAreaWrapper}>
              <TextInput
                style={styles.textArea}
                placeholder="Explain what additional work is required..."
                placeholderTextColor={colors.gray500}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <Input
              label="Revised Price (₹)"
              placeholder="Enter revised amount"
              value={revisedPrice}
              onChangeText={setRevisedPrice}
              keyboardType="numeric"
              icon={<IndianRupee size={18} color={colors.gray500} />}
              error={
                revisedPrice.length > 0 && !isPriceValid
                  ? `Must be greater than current and within ${JOB_LIMITS.MAX_PRICE_INCREASE_PERCENT}% increase`
                  : undefined
              }
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text style={styles.label}>EVIDENCE PHOTOS ({images.length}/{JOB_LIMITS.MAX_IMAGES_PER_MODIFICATION})</Text>

            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
                {images.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.previewWrap}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveImage(index)}>
                      <X size={14} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {images.length < JOB_LIMITS.MAX_IMAGES_PER_MODIFICATION && (
              <TouchableOpacity style={styles.photoUpload} activeOpacity={0.7} onPress={handlePickImages}>
                <Camera size={24} color={colors.gray500} />
                <Text style={styles.photoText}>Add supporting photos</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <Button
              title="Submit Revision Request"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting || isLoadingJob}
              disabled={isLoadingJob || isSubmitting || !hasModificationsLeft || !reason.trim() || !isPriceValid}
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
  jobTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.base,
    color: colors.white,
    marginBottom: spacing[2],
    textAlign: 'center',
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
  previewRow: {
    marginBottom: spacing[3],
  },
  previewWrap: {
    marginRight: spacing[2],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: 90,
    height: 90,
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
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
