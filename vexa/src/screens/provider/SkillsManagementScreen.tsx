import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Alert, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus, Trash2, Shield, Briefcase } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/typography';
import { ProviderSkill } from '../../types';
import { skillsService } from '../../services/skills';

const SkillsManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [skills, setSkills] = useState<ProviderSkill[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [experienceMap, setExperienceMap] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    try {
      const [mySkills, cats] = await Promise.all([
        skillsService.getMySkills(),
        skillsService.getCategories(),
      ]);
      setSkills(mySkills);
      setCategories(cats);

      const selected = new Set(mySkills.map((s) => s.category));
      setSelectedCategories(selected);

      const expMap: Record<string, string> = {};
      mySkills.forEach((s) => {
        expMap[s.category] = String(s.experienceYears);
      });
      setExperienceMap(expMap);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
        const newMap = { ...experienceMap };
        delete newMap[category];
        setExperienceMap(newMap);
      } else {
        next.add(category);
        setExperienceMap((prev) => ({ ...prev, [category]: '0' }));
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedCategories.size === 0) {
      Alert.alert('No Skills', 'Please select at least one skill category.');
      return;
    }

    setSaving(true);
    try {
      const skillsData = Array.from(selectedCategories).map((cat) => ({
        category: cat,
        experienceYears: Number(experienceMap[cat]) || 0,
      }));

      await skillsService.setSkills(skillsData);
      Alert.alert('Success', 'Skills updated successfully!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to save skills');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Skills</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          Select the service categories you specialize in. Jobs will be filtered to match your skills.
        </Text>

        {/* Category Grid */}
        <View style={styles.categoriesGrid}>
          {categories.map((cat) => {
            const isSelected = selectedCategories.has(cat);
            const displayName = cat.charAt(0).toUpperCase() + cat.slice(1);
            const existingSkill = skills.find((s) => s.category === cat);

            return (
              <View key={cat} style={styles.categoryCard}>
                <TouchableOpacity
                  style={[styles.categoryButton, isSelected && styles.categoryButtonSelected]}
                  onPress={() => toggleCategory(cat)}
                >
                  <View style={styles.categoryHeader}>
                    <Briefcase size={18} color={isSelected ? colors.black : colors.gray400} />
                    <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
                      {displayName}
                    </Text>
                  </View>
                  {existingSkill?.isVerified && (
                    <View style={styles.verifiedTag}>
                      <Shield size={10} color={colors.success} />
                      <Text style={styles.verifiedTagText}>Verified</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {isSelected && (
                  <View style={styles.experienceRow}>
                    <Text style={styles.experienceLabel}>Experience (years):</Text>
                    <TextInput
                      style={styles.experienceInput}
                      value={experienceMap[cat] || '0'}
                      onChangeText={(text) => {
                        setExperienceMap((prev) => ({ ...prev, [cat]: text.replace(/[^0-9]/g, '') }));
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                      placeholder="0"
                      placeholderTextColor={colors.gray500}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.selectedCount}>
          {selectedCategories.size} of {categories.length} selected
        </Text>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.black} />
          ) : (
            <Text style={styles.saveButtonText}>Save Skills</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.glassBorder,
    backgroundColor: colors.gray900,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassWhite,
  },
  headerTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    color: colors.white,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  subtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.gray400,
    lineHeight: 20,
    marginBottom: 20,
  },
  // Categories
  categoriesGrid: {
    gap: 10,
  },
  categoryCard: {
    marginBottom: 4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray800,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryButtonSelected: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryName: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    color: colors.white,
  },
  categoryNameSelected: {
    color: colors.black,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedTagText: {
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    color: colors.success,
  },
  // Experience
  experienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  experienceLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.gray400,
  },
  experienceInput: {
    backgroundColor: colors.gray800,
    borderRadius: 8,
    width: 50,
    textAlign: 'center',
    paddingVertical: 6,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    color: colors.white,
    borderWidth: 0.5,
    borderColor: colors.glassBorder,
  },
  selectedCount: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: 16,
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 34,
    backgroundColor: colors.gray900,
    borderTopWidth: 0.5,
    borderTopColor: colors.glassBorder,
  },
  saveButton: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    color: colors.black,
  },
});

export default SkillsManagementScreen;
