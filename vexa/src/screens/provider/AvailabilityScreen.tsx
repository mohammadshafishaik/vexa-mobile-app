import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Alert, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Clock, Calendar } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/typography';
import { ProviderAvailabilitySlot, ProviderAvailabilityStatus } from '../../types';
import { availabilityService } from '../../services/availability';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00',
];

const AvailabilityScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<ProviderAvailabilityStatus>('OFFLINE');
  const [slots, setSlots] = useState<Record<number, { startTime: string; endTime: string; isBlocked: boolean; enabled: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await availabilityService.getMyAvailability();
      setStatus(data.status);

      // Initialize all 7 days
      const slotsMap: typeof slots = {};
      for (let i = 0; i < 7; i++) {
        const existing = data.slots.find((s) => s.dayOfWeek === i);
        slotsMap[i] = {
          startTime: existing?.startTime || '09:00',
          endTime: existing?.endTime || '18:00',
          isBlocked: existing?.isBlocked || false,
          enabled: !!existing && !existing.isBlocked,
        };
      }
      setSlots(slotsMap);
    } catch (error) {
      console.error('Failed to load availability:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleOnline = async () => {
    const newStatus = status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      await availabilityService.setStatus(newStatus);
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const toggleDay = (day: number) => {
    setSlots((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        isBlocked: false,
      },
    }));
  };

  const updateSlot = (day: number, field: 'startTime' | 'endTime', value: string) => {
    setSlots((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const slotsData = Object.entries(slots)
        .filter(([_, val]) => val.enabled)
        .map(([day, val]) => ({
          dayOfWeek: Number(day),
          startTime: val.startTime,
          endTime: val.endTime,
          isBlocked: val.isBlocked,
        }));

      await availabilityService.setAvailability(slotsData);
      Alert.alert('Success', 'Availability updated!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to save');
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
        <Text style={styles.headerTitle}>Availability</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Online Toggle */}
        <View style={styles.statusCard}>
          <View style={styles.statusInfo}>
            <View style={[styles.statusDot, { backgroundColor: status === 'ONLINE' ? colors.success : colors.gray500 }]} />
            <View>
              <Text style={styles.statusLabel}>
                {status === 'ONLINE' ? 'You are Online' : 'You are Offline'}
              </Text>
              <Text style={styles.statusHint}>
                {status === 'ONLINE' ? 'You can receive new job requests' : 'Toggle on to receive jobs'}
              </Text>
            </View>
          </View>
          <Switch
            value={status === 'ONLINE'}
            onValueChange={toggleOnline}
            trackColor={{ false: colors.gray700, true: colors.success }}
            thumbColor={colors.white}
          />
        </View>

        {/* Weekly Schedule */}
        <Text style={styles.sectionTitle}>Weekly Schedule</Text>
        <Text style={styles.sectionSubtitle}>Set your working hours for each day</Text>

        {DAYS.map((dayName, dayNum) => {
          const slot = slots[dayNum];
          return (
            <View key={dayNum} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dayInfo}>
                  <Calendar size={16} color={slot?.enabled ? colors.white : colors.gray500} />
                  <Text style={[styles.dayName, !slot?.enabled && styles.dayNameDisabled]}>
                    {dayName}
                  </Text>
                </View>
                <Switch
                  value={slot?.enabled || false}
                  onValueChange={() => toggleDay(dayNum)}
                  trackColor={{ false: colors.gray700, true: colors.success }}
                  thumbColor={colors.white}
                />
              </View>

              {slot?.enabled && (
                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Start</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.timeChips}>
                        {TIME_OPTIONS.filter((_, i) => i < TIME_OPTIONS.length - 1).map((time) => (
                          <TouchableOpacity
                            key={time}
                            style={[styles.timeChip, slot.startTime === time && styles.timeChipSelected]}
                            onPress={() => updateSlot(dayNum, 'startTime', time)}
                          >
                            <Text style={[styles.timeChipText, slot.startTime === time && styles.timeChipTextSelected]}>
                              {time}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>End</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.timeChips}>
                        {TIME_OPTIONS.filter((t) => t > slot.startTime).map((time) => (
                          <TouchableOpacity
                            key={time}
                            style={[styles.timeChip, slot.endTime === time && styles.timeChipSelected]}
                            onPress={() => updateSlot(dayNum, 'endTime', time)}
                          >
                            <Text style={[styles.timeChipText, slot.endTime === time && styles.timeChipTextSelected]}>
                              {time}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          );
        })}
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
            <Text style={styles.saveButtonText}>Save Schedule</Text>
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
  // Status Card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray800,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  statusLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    color: colors.white,
  },
  statusHint: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.gray400,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    color: colors.white,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.gray400,
    marginBottom: 16,
  },
  // Day Card
  dayCard: {
    backgroundColor: colors.gray800,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayName: {
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    color: colors.white,
  },
  dayNameDisabled: {
    color: colors.gray500,
  },
  // Time
  timeRow: {
    marginTop: 12,
    gap: 10,
  },
  timeBlock: {
    gap: 6,
  },
  timeLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: colors.gray400,
  },
  timeChips: {
    flexDirection: 'row',
    gap: 6,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.gray700,
  },
  timeChipSelected: {
    backgroundColor: colors.white,
  },
  timeChipText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: colors.gray300,
  },
  timeChipTextSelected: {
    color: colors.black,
  },
  // Bottom Bar
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

export default AvailabilityScreen;
