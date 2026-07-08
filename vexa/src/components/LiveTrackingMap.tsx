import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Animated, Image } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

interface Location {
  latitude: number;
  longitude: number;
}

interface LiveTrackingMapProps {
  customerLocation?: Location;
  providerLocation?: Location;
  isTracking?: boolean;
}

export function LiveTrackingMap({
  customerLocation,
  providerLocation,
  isTracking = true,
}: LiveTrackingMapProps) {
  const mapRef = useRef<MapView>(null);

  // Focus map on markers when they change
  useEffect(() => {
    if (!mapRef.current) return;

    const coordinates = [];
    if (customerLocation) coordinates.push(customerLocation);
    if (providerLocation) coordinates.push(providerLocation);

    if (coordinates.length > 0) {
      // Small delay to ensure map is mounted
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }, 500);
    }
  }, [customerLocation, providerLocation]);

  if (!customerLocation && !providerLocation) {
    return <View style={[styles.container, styles.empty]} />;
  }

  const initialRegion = customerLocation || providerLocation;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          latitude: initialRegion!.latitude,
          longitude: initialRegion!.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        pitchEnabled={false}
      >
        {customerLocation && (
          <Marker coordinate={customerLocation} title="You">
            <View style={styles.customerMarker}>
              <View style={styles.customerDot} />
            </View>
          </Marker>
        )}

        {providerLocation && (
          <Marker
            coordinate={providerLocation}
            title="Provider"
            description={isTracking ? 'On the way' : ''}
          >
            <View style={styles.providerMarker}>
              <View style={styles.providerDot} />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 250,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  customerMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.2)', // Blue
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  customerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  providerMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.2)', // Green
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  providerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
});
