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
  PermissionsAndroid,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import {
  ChevronLeft,
  MapPin,
  Map,
  DollarSign,
  Camera,
  Tag,
  FileText,
  Zap,
} from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import GlassCard from '../../components/ui/GlassCard';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useJobStore } from '../../store/useJobStore';
import api from '../../services/api';
import { uploadService } from '../../services/upload';

const CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Cleaning',
  'Painting',
  'Carpentry',
  'Appliance Repair',
  'AC Service',
  'Pest Control',
  'Other',
];

const PostJobScreen: React.FC = () => {
  const navigation = useNavigation();
  const addJob = useJobStore((s) => s.addJob);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [price, setPrice] = useState('');
  const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      if (typeof Geolocation.requestAuthorization === 'function') {
        Geolocation.requestAuthorization('whenInUse');
      }
      return true;
    }

    try {
      const fineLocationPermission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
      const alreadyGranted = await PermissionsAndroid.check(fineLocationPermission);
      if (alreadyGranted) return true;

      const granted = await PermissionsAndroid.request(fineLocationPermission, {
        title: 'Allow Location Access',
        message: 'Vexa needs your location to auto-fill your service address using GPS.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const handleGetLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Location permission is needed to use GPS. Please allow it in app settings.');
      return;
    }

    setIsGettingLocation(true);
    Geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        setIsGettingLocation(false);
      },
      (error) => {
        Alert.alert('Location Error', error.message);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

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
    if (!title.trim() || !description.trim() || !category || !location.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      // Upload images first
      const uploadedUrls: string[] = [];
      let failedUploads = 0;
      for (const uri of images) {
        try {
          const url = await uploadService.uploadImage(uri);
          uploadedUrls.push(url);
        } catch (e) {
          failedUploads += 1;
          if (__DEV__) {
            console.log('Failed to upload image', e);
          }
        }
      }

      if (failedUploads > 0) {
        Alert.alert(
          'Image Upload Failed',
          'One or more photos could not be uploaded. Please try again before posting the job.',
        );
        return;
      }

      const res = await api.post('/jobs', {
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        latitude: coords?.lat,
        longitude: coords?.lng,
        originalPrice: price ? Number(price) : 0,
        urgency,
        images: uploadedUrls,
      });

      if (res.data.success) {
        addJob(res.data.data);
        Alert.alert('Success', 'Job posted successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to post job';
      Alert.alert('Error', msg);
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
          <Text style={styles.headerTitle}>Post a Job</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Input
              label="Job Title"
              placeholder="e.g., Fix kitchen sink leak"
              value={title}
              onChangeText={setTitle}
              icon={<FileText size={18} color={colors.gray500} />}
            />
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <Text style={styles.label}>DESCRIPTION</Text>
            <View style={styles.textAreaWrapper}>
              <TextInput
                style={styles.textArea}
                placeholder="Describe the service you need..."
                placeholderTextColor={colors.gray500}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </Animated.View>

          {/* Category */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text style={styles.label}>CATEGORY</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      category === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Location */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <View style={styles.locationContainer}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Location"
                  placeholder="Enter service location"
                  value={location}
                  onChangeText={setLocation}
                  icon={<MapPin size={18} color={colors.gray500} />}
                />
              </View>
              <TouchableOpacity style={styles.gpsButton} onPress={handleGetLocation} disabled={isGettingLocation}>
                <Map size={20} color={colors.white} />
                <Text style={styles.gpsText}>{isGettingLocation ? '...' : 'GPS'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Budget (Optional) */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Input
              label="Estimated Budget (₹) — Optional"
              placeholder="Leave blank if unsure"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              icon={<DollarSign size={18} color={colors.gray500} />}
            />
          </Animated.View>

          {/* Urgency */}
          <Animated.View entering={FadeInDown.delay(320).duration(400)}>
            <Text style={styles.label}>URGENCY</Text>
            <View style={styles.urgencyRow}>
              <TouchableOpacity
                style={[styles.urgencyChip, urgency === 'NORMAL' && styles.urgencyNormalActive]}
                onPress={() => setUrgency('NORMAL')}
              >
                <Text style={[styles.urgencyText, urgency === 'NORMAL' && styles.urgencyTextActive]}>Normal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.urgencyChip, urgency === 'URGENT' && styles.urgencyUrgentActive]}
                onPress={() => setUrgency('URGENT')}
              >
                <Zap size={14} color={urgency === 'URGENT' ? colors.black : colors.warning} />
                <Text style={[styles.urgencyText, urgency === 'URGENT' && { color: colors.black, fontFamily: fontFamilies.bold }]}>Urgent</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Photos */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <Text style={styles.label}>PHOTOS (OPTIONAL) - {images.length}/4</Text>
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

          {/* Submit */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <Button
              title="Post Job"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={
                !title.trim() ||
                !description.trim() ||
                !category ||
                !location.trim()
              }
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  categoryChip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray700,
    backgroundColor: colors.gray900,
  },
  categoryChipActive: {
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  categoryText: {
    ...typography.bodySm,
    color: colors.gray400,
  },
  categoryTextActive: {
    color: colors.black,
    fontFamily: fontFamilies.semibold,
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
  urgencyRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  urgencyChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray700,
    backgroundColor: colors.gray900,
  },
  urgencyNormalActive: {
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  urgencyUrgentActive: {
    borderColor: colors.warning,
    backgroundColor: colors.warning,
  },
  urgencyText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.base,
    color: colors.gray400,
  },
  urgencyTextActive: {
    color: colors.black,
    fontFamily: fontFamilies.bold,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  gpsButton: {
    backgroundColor: colors.gray800,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray700,
    width: 60,
    height: 50,
    marginTop: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsText: {
    ...typography.caption,
    color: colors.white,
    marginTop: 2,
  },
});

export default PostJobScreen;
