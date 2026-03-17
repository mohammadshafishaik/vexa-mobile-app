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
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  MapPin,
  DollarSign,
  Camera,
  Tag,
  FileText,
} from 'lucide-react-native';
import ScreenContainer from '../../components/layout/ScreenContainer';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import GlassCard from '../../components/ui/GlassCard';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !category || !location.trim() || !price) {
      return;
    }
    setIsSubmitting(true);
    // Will connect to API in Phase 3
    setTimeout(() => setIsSubmitting(false), 1500);
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
            <Input
              label="Location"
              placeholder="Enter service location"
              value={location}
              onChangeText={setLocation}
              icon={<MapPin size={18} color={colors.gray500} />}
            />
          </Animated.View>

          {/* Price */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Input
              label="Budget (₹)"
              placeholder="Enter your budget"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              icon={<DollarSign size={18} color={colors.gray500} />}
            />
          </Animated.View>

          {/* Photos */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <Text style={styles.label}>PHOTOS (OPTIONAL)</Text>
            <TouchableOpacity style={styles.photoUpload} activeOpacity={0.7}>
              <Camera size={24} color={colors.gray500} />
              <Text style={styles.photoText}>Add photos</Text>
            </TouchableOpacity>
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
                !price
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
});

export default PostJobScreen;
