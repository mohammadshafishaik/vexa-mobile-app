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
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { ChevronLeft, Camera, AlertTriangle } from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { CustomerStackParamList } from '../../types';
import { disputeService } from '../../services/disputes';
import { useJobStore } from '../../store/useJobStore';
import { uploadService } from '../../services/upload';

type DisputeRoute = RouteProp<CustomerStackParamList, 'Dispute'>;

const DisputeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<DisputeRoute>();
  const { jobId } = route.params;

  const [reason, setReason] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateJob = useJobStore((s) => s.updateJob);

  const handlePickImages = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 4 - images.length,
    });
    if (result.assets) {
      const newUris = result.assets.map((a) => a.uri!).filter(Boolean);
      setImages((prev) => [...prev, ...newUris]);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please provide a reason for the dispute.');
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const uri of images) {
        try {
          const url = await uploadService.uploadImage(uri);
          uploadedUrls.push(url);
        } catch (e) {
          console.error("Failed to upload evidence image", e);
        }
      }

      await disputeService.createDispute({
        jobId,
        reason: reason.trim(),
        evidence: uploadedUrls,
      });
      updateJob(jobId, { status: 'UNDER_DISPUTE' as any });
      Alert.alert('Dispute Raised', 'Your dispute has been recorded and the job is now under review by admin.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to raise dispute');
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Raise Dispute</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <GlassCard style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <AlertTriangle size={20} color={colors.error} />
                <Text style={styles.alertTitle}>Important Information</Text>
              </View>
              <Text style={styles.alertText}>
                Raising a dispute will pause the job workflow and escalate the issue to a VEXA admin for resolution. Only raise a dispute if you cannot resolve the issue directly with the other party.
              </Text>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text style={styles.label}>DISPUTE REASON</Text>
            <View style={styles.textAreaWrapper}>
              <TextInput
                style={styles.textArea}
                placeholder="Explain the issue in detail..."
                placeholderTextColor={colors.gray500}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text style={styles.label}>EVIDENCE PHOTOS (OPTIONAL) - {images.length}/4</Text>
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
                {images.map((uri, idx) => (
                   <View key={idx} style={{ marginRight: spacing[2], borderRadius: 8, overflow: 'hidden' }}>
                      <Animated.Image source={{ uri }} style={{ width: 80, height: 80 }} />
                   </View>
                ))}
              </ScrollView>
            )}
            {images.length < 4 && (
              <TouchableOpacity onPress={handlePickImages} style={styles.photoUpload} activeOpacity={0.7}>
                <Camera size={24} color={colors.gray500} />
                <Text style={styles.photoText}>Add photos</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <Button
              title="Submit Dispute"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              style={{ marginTop: spacing[4], backgroundColor: colors.error }}
              disabled={!reason.trim()}
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
    paddingVertical: spacing[4],
  },
  headerTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.md,
    color: colors.white,
  },
  scrollContent: {
    paddingBottom: spacing[10],
  },
  alertCard: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: spacing[6],
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  alertTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.md,
    color: colors.error,
  },
  alertText: {
    ...typography.bodySm,
    color: colors.gray400,
    lineHeight: 20,
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
    marginBottom: spacing[6],
  },
  textArea: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    color: colors.white,
    padding: spacing[4],
    minHeight: 120,
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
    marginBottom: spacing[6],
  },
  photoText: {
    ...typography.bodySm,
    color: colors.gray500,
  },
});

export default DisputeScreen;
