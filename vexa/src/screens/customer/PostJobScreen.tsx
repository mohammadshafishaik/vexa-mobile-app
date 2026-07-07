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
  IndianRupee,
  Camera,
  Tag,
  FileText,
  Zap,
  Sparkles,
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
import { recommendationService } from '../../services/recommendations';
import { sanitizeJobDescription } from '../../utils/helpers';

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

const CATEGORY_MIN_BUDGET: Record<string, number> = {
  Plumbing: 150,
  Electrical: 150,
  Cleaning: 100,
  Painting: 200,
  Carpentry: 150,
  'Appliance Repair': 150,
  'AC Service': 200,
  'Pest Control': 200,
  Other: 100,
};

const DEFAULT_MIN_BUDGET = 100;

const getMinimumBudgetForCategory = (category: string): number => {
  if (!category) return DEFAULT_MIN_BUDGET;
  return CATEGORY_MIN_BUDGET[category] ?? DEFAULT_MIN_BUDGET;
};

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
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiChecklist, setAiChecklist] = useState<string[]>([]);
  const selectedCategoryMinimum = getMinimumBudgetForCategory(category);

  const getCurrentPositionAsync = (options: any): Promise<any> =>
    new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(resolve, reject, options);
    });

  const getReadableLocationError = (error: any): string => {
    if (error?.code === 1) {
      return 'Location permission was denied. Please allow GPS access in app settings.';
    }
    if (error?.code === 2) {
      return 'Location is currently unavailable. Please ensure GPS is enabled and try again.';
    }
    if (error?.code === 3) {
      return 'Location request timed out. Move near open sky and try GPS again.';
    }
    return error?.message || 'Unable to get your location right now. Please enter location manually.';
  };

  const getAreaTextFromNominatim = (payload: any): string | null => {
    const address = payload?.address || {};
    const area = address.suburb
      || address.neighbourhood
      || address.village
      || address.town
      || address.city_district
      || address.city
      || address.county;
    const region = address.state_district || address.state;

    const compact = [area, region].filter(Boolean).join(', ');
    if (compact) return compact;

    if (payload?.display_name) {
      return String(payload.display_name)
        .split(',')
        .slice(0, 3)
        .map((part: string) => part.trim())
        .filter(Boolean)
        .join(', ');
    }

    return null;
  };

  const getAreaTextFromBigDataCloud = (payload: any): string | null => {
    const area = payload?.locality || payload?.city || payload?.principalSubdivision;
    const region = payload?.principalSubdivision || payload?.countryName;
    const compact = [area, region].filter(Boolean).join(', ');
    return compact || null;
  };

  const resolveAreaFromCoordinates = async (lat: number, lng: number): Promise<string | null> => {
    const fetchJsonWithTimeout = async (url: string, headers: Record<string, string>, timeoutMs = 3000) => {
      const timeoutPromise = new Promise((_, reject) => {
        const timer = setTimeout(() => {
          clearTimeout(timer);
          reject(new Error('reverse-geocode timeout'));
        }, timeoutMs);
      });

      const response = await Promise.race([
        fetch(url, { headers }),
        timeoutPromise,
      ]) as Response;

      if (!response.ok) return null;
      return response.json();
    };

    const providers: Array<{
      url: string;
      headers: Record<string, string>;
      parser: (payload: any) => string | null;
    }> = [
      {
        url: `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'VexaMobile/1.0',
        },
        parser: getAreaTextFromNominatim,
      },
      {
        url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        headers: {
          Accept: 'application/json',
        },
        parser: getAreaTextFromBigDataCloud,
      },
    ];

    for (const provider of providers) {
      try {
        const payload = await fetchJsonWithTimeout(provider.url, provider.headers);
        if (!payload) continue;
        const areaText = provider.parser(payload);
        if (areaText) return areaText;
      } catch {
        // Try the next reverse geocoding provider.
      }
    }

    return null;
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      if (typeof Geolocation.requestAuthorization === 'function') {
        Geolocation.requestAuthorization();
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
    try {
      let position: any;

      try {
        position = await getCurrentPositionAsync({
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 120000,
        });
      } catch {
        position = await getCurrentPositionAsync({
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 15000,
        });
      }

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setCoords({ lat, lng });

      const resolvedArea = await resolveAreaFromCoordinates(lat, lng);
      setLocation(resolvedArea || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch (error: any) {
      Alert.alert('Location Error', getReadableLocationError(error));
    } finally {
      setIsGettingLocation(false);
    }
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

  const handleGenerateAiSuggestion = async () => {
    if (!category) {
      Alert.alert('Select Category', 'Please choose a category first for better AI recommendations.');
      return;
    }

    if (!title.trim() && !description.trim()) {
      Alert.alert('Add Basic Details', 'Enter at least a title or short description first.');
      return;
    }

    setIsGeneratingAi(true);
    try {
      const recommendation = await recommendationService.suggestJobDescription({
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        budget: Number(price) || undefined,
        urgency,
      });

      if (recommendation.improvedTitle) {
        setTitle(recommendation.improvedTitle);
      }

      if (recommendation.improvedDescription) {
        setDescription(sanitizeJobDescription(recommendation.improvedDescription));
      }

      if (!price.trim() || Number(price) < recommendation.recommendedBudget.min) {
        setPrice(String(recommendation.recommendedBudget.recommended));
      }

      setAiChecklist(recommendation.checklist || []);

      if (recommendation.warnings?.length) {
        Alert.alert('AI Notes', recommendation.warnings.join('\n'));
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Unable to generate AI recommendation right now.';
      Alert.alert('AI Assistant', message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSubmit = async () => {
    const cleanDescription = sanitizeJobDescription(description);
    if (!title.trim() || !cleanDescription || !category || !location.trim()) {
      return;
    }

    const minimumBudget = getMinimumBudgetForCategory(category);
    const numericBudget = Number(price);
    if (!price.trim() || Number.isNaN(numericBudget) || numericBudget < minimumBudget) {
      Alert.alert(
        'Invalid Budget',
        `Minimum budget for ${category} is ₹${minimumBudget}. Please update the amount to continue.`,
      );
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
        description: cleanDescription,
        category,
        location: location.trim(),
        latitude: coords?.lat,
        longitude: coords?.lng,
        originalPrice: numericBudget,
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
            <View style={styles.aiAssistRow}>
              <View>
                <Text style={styles.label}>DESCRIPTION</Text>
                <Text style={styles.aiAssistMeta}>Customer AI Assistant</Text>
              </View>
              <TouchableOpacity
                onPress={handleGenerateAiSuggestion}
                style={styles.aiAssistButton}
                disabled={isGeneratingAi}
              >
                <Sparkles size={14} color={colors.white} />
                <Text style={styles.aiAssistText}>{isGeneratingAi ? 'Thinking...' : 'AI Improve'}</Text>
              </TouchableOpacity>
            </View>
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
            {aiChecklist.length > 0 && (
              <GlassCard style={styles.aiChecklistCard}>
                <Text style={styles.aiChecklistTitle}>AI Checklist</Text>
                {aiChecklist.map((item, index) => (
                  <Text key={`${item}-${index}`} style={styles.aiChecklistItem}>
                    • {item}
                  </Text>
                ))}
              </GlassCard>
            )}
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
                  onPress={() => {
                    setCategory(cat);
                    const minBudget = getMinimumBudgetForCategory(cat);
                    const existingPrice = Number(price);
                    if (!price.trim() || Number.isNaN(existingPrice) || existingPrice < minBudget) {
                      setPrice(String(minBudget));
                    }
                  }}
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
              label="Estimated Budget (₹)"
              placeholder={`Minimum ₹${selectedCategoryMinimum}`}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              icon={<IndianRupee size={18} color={colors.gray500} />}
              hint={
                category
                  ? `Minimum for ${category}: ₹${selectedCategoryMinimum}`
                  : `Select a category to set the minimum budget (starts at ₹${DEFAULT_MIN_BUDGET})`
              }
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
                !location.trim() ||
                !price.trim()
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
  aiAssistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiAssistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.gray800,
    borderColor: colors.gray700,
    borderWidth: 1,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.full,
    marginBottom: spacing[2],
  },
  aiAssistText: {
    ...typography.caption,
    color: colors.white,
    fontFamily: fontFamilies.semibold,
  },
  aiAssistMeta: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: -spacing[1],
    marginBottom: spacing[1],
  },
  aiChecklistCard: {
    marginTop: -spacing[2],
    marginBottom: spacing[4],
  },
  aiChecklistTitle: {
    ...typography.label,
    color: colors.white,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
  },
  aiChecklistItem: {
    ...typography.bodySm,
    color: colors.gray300,
    marginBottom: spacing[1],
    lineHeight: 18,
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
