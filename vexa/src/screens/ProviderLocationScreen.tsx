import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Navigation, Clock, MapPin } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/typography';
import { locationService } from '../services/location';
import { socketService } from '../services/socket';
import { ProviderLocationData } from '../types';

const ProviderLocationScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { jobId } = route.params;

  const [locationData, setLocationData] = useState<ProviderLocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const loadLocation = async () => {
      try {
        const data = await locationService.getProviderLocation(jobId);
        setLocationData(data);
        if (data.providerLocationUpdatedAt) {
          setLastUpdate(new Date(data.providerLocationUpdatedAt));
        }
      } catch (error) {
        console.error('Failed to load location:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLocation();

    // Listen for real-time updates
    socketService.onProviderLocation((data) => {
      if (data.jobId === jobId) {
        setLocationData((prev) => prev ? {
          ...prev,
          providerLat: data.latitude,
          providerLng: data.longitude,
          providerLocationUpdatedAt: data.updatedAt,
        } : null);
        setLastUpdate(new Date(data.updatedAt));
      }
    });

    // Refresh every 15 seconds
    const interval = setInterval(loadLocation, 15000);

    return () => {
      clearInterval(interval);
      socketService.off('location:provider');
    };
  }, [jobId]);

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return 'N/A';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
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
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Map Placeholder - In production, use react-native-maps */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Navigation size={64} color={colors.gray600} />
          <Text style={styles.mapText}>Map View</Text>
          <Text style={styles.mapSubtext}>
            Integrate react-native-maps for full map experience
          </Text>
          {locationData?.providerLat && locationData?.providerLng && (
            <View style={styles.coordsCard}>
              <Text style={styles.coordsText}>
                Provider: {locationData.providerLat.toFixed(4)}, {locationData.providerLng.toFixed(4)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Info Cards */}
      <View style={styles.infoSection}>
        {/* ETA Card */}
        {locationData?.estimatedEtaMins != null && (
          <View style={styles.etaCard}>
            <View style={styles.etaIcon}>
              <Clock size={24} color={colors.white} />
            </View>
            <View>
              <Text style={styles.etaValue}>
                {locationData.estimatedEtaMins} min
              </Text>
              <Text style={styles.etaLabel}>Estimated Arrival</Text>
            </View>
          </View>
        )}

        {/* Distance Card */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MapPin size={20} color={colors.info} />
            <Text style={styles.statValue}>
              {locationData?.estimatedDistanceKm != null
                ? `${locationData.estimatedDistanceKm.toFixed(1)} km`
                : '—'}
            </Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>

          <View style={styles.statCard}>
            <Clock size={20} color={colors.success} />
            <Text style={styles.statValue}>
              {formatTimeAgo(lastUpdate)}
            </Text>
            <Text style={styles.statLabel}>Last Update</Text>
          </View>
        </View>

        {/* Job Location */}
        {locationData?.jobLocation && (
          <View style={styles.locationCard}>
            <MapPin size={16} color={colors.gray400} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Job Location</Text>
              <Text style={styles.locationText}>{locationData.jobLocation}</Text>
            </View>
          </View>
        )}

        {/* No location available */}
        {!locationData?.providerLat && (
          <View style={styles.noLocationCard}>
            <Text style={styles.noLocationText}>
              Provider location not available yet
            </Text>
            <Text style={styles.noLocationSubtext}>
              Location data will appear once the provider enables tracking
            </Text>
          </View>
        )}
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
    zIndex: 1,
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
  // Map
  mapContainer: {
    flex: 1,
    minHeight: 300,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: colors.gray900,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.glassBorder,
  },
  mapText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    color: colors.gray500,
    marginTop: 16,
  },
  mapSubtext: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.gray600,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 260,
  },
  coordsCard: {
    marginTop: 20,
    backgroundColor: colors.gray800,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  coordsText: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    color: colors.gray300,
  },
  // Info Section
  infoSection: {
    padding: 16,
  },
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray800,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    gap: 16,
  },
  etaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    color: colors.white,
  },
  etaLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.gray400,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.gray800,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: colors.white,
  },
  statLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.gray400,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.gray800,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: colors.gray500,
  },
  locationText: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.white,
    marginTop: 2,
  },
  noLocationCard: {
    backgroundColor: colors.gray800,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  noLocationText: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    color: colors.gray300,
  },
  noLocationSubtext: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.gray500,
    marginTop: 6,
    textAlign: 'center',
  },
});

export default ProviderLocationScreen;
