import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Alert, Image, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Plus, Trash2, Camera } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/typography';
import { PortfolioItem } from '../../types';
import { portfolioService } from '../../services/portfolio';

const PortfolioManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);

  const loadPortfolio = useCallback(async () => {
    try {
      // Use the user's ID from auth store
      const { useAuthStore } = await import('../../store/useAuthStore');
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        const data = await portfolioService.getPortfolio(userId);
        setItems(data);
      }
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newImageUrl.trim()) {
      Alert.alert('Missing Fields', 'Title and image URL are required.');
      return;
    }

    setAdding(true);
    try {
      const item = await portfolioService.addItem({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        imageUrl: newImageUrl.trim(),
        category: newCategory.trim() || undefined,
      });
      setItems((prev) => [item, ...prev]);
      setShowAddForm(false);
      setNewTitle('');
      setNewDescription('');
      setNewImageUrl('');
      setNewCategory('');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to add item');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (itemId: string, title: string) => {
    Alert.alert(
      'Remove Portfolio Item',
      `Are you sure you want to remove "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await portfolioService.removeItem(itemId);
              setItems((prev) => prev.filter((i) => i.id !== itemId));
            } catch (error) {
              Alert.alert('Error', 'Failed to remove item');
            }
          },
        },
      ],
    );
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
        <Text style={styles.headerTitle}>Portfolio</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Add Form */}
        {showAddForm && (
          <View style={styles.addForm}>
            <Text style={styles.formTitle}>Add Work Sample</Text>

            <TextInput
              style={styles.formInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Title *"
              placeholderTextColor={colors.gray500}
            />
            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="Description (optional)"
              placeholderTextColor={colors.gray500}
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={styles.formInput}
              value={newImageUrl}
              onChangeText={setNewImageUrl}
              placeholder="Image URL *"
              placeholderTextColor={colors.gray500}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.formInput}
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="Category (optional)"
              placeholderTextColor={colors.gray500}
            />

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddForm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, adding && styles.submitButtonDisabled]}
                onPress={handleAdd}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator size="small" color={colors.black} />
                ) : (
                  <Text style={styles.submitButtonText}>Add Item</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Portfolio Grid */}
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Camera size={48} color={colors.gray600} />
            <Text style={styles.emptyText}>No portfolio items yet</Text>
            <Text style={styles.emptySubtext}>
              Showcase your best work to attract more customers
            </Text>
          </View>
        ) : (
          <View style={styles.portfolioGrid}>
            {items.map((item) => (
              <View key={item.id} style={styles.portfolioCard}>
                <Image source={{ uri: item.imageUrl }} style={styles.portfolioImage} />
                <View style={styles.portfolioInfo}>
                  <Text style={styles.portfolioTitle} numberOfLines={1}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.portfolioDesc} numberOfLines={2}>{item.description}</Text>
                  )}
                  {item.category && (
                    <Text style={styles.portfolioCategory}>{item.category}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id, item.title)}
                >
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassWhite,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Add Form
  addForm: {
    backgroundColor: colors.gray800,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    color: colors.white,
    marginBottom: 14,
  },
  formInput: {
    backgroundColor: colors.gray700,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.white,
    marginBottom: 10,
  },
  formTextarea: {
    height: 70,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.gray700,
  },
  cancelButtonText: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    color: colors.gray300,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    color: colors.black,
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    color: colors.gray400,
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.gray500,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 260,
  },
  // Grid
  portfolioGrid: {
    gap: 12,
  },
  portfolioCard: {
    flexDirection: 'row',
    backgroundColor: colors.gray800,
    borderRadius: 14,
    overflow: 'hidden',
  },
  portfolioImage: {
    width: 100,
    height: 100,
    backgroundColor: colors.gray700,
  },
  portfolioInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  portfolioTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    color: colors.white,
  },
  portfolioDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.gray400,
    marginTop: 4,
    lineHeight: 16,
  },
  portfolioCategory: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    color: colors.gray500,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  deleteButton: {
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PortfolioManagementScreen;
