import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';

export interface Location {
  latitude: number;
  longitude: number;
}

interface LiveTrackingMapProps {
  userLocation: Location;
  providerLocation?: Location;
}

const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({ userLocation, providerLocation }) => {
  const webviewRef = useRef<WebView>(null);

  // When provider location updates, inject JS to smoothly move the marker
  useEffect(() => {
    if (providerLocation && webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        if (window.updateProviderLocation) {
          window.updateProviderLocation(${providerLocation.latitude}, ${providerLocation.longitude});
        }
        true;
      `);
    }
  }, [providerLocation]);

  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; }
          #map { width: 100%; height: 100%; }
          /* CSS transition for smooth marker movement */
          .leaflet-marker-icon, .leaflet-marker-shadow {
            transition: transform 1.5s linear;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          let map;
          let userMarker;
          let providerMarker;
          
          const userIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          const providerIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          function initMap(userLat, userLng, providerLat, providerLng) {
            map = L.map('map', { zoomControl: false }).setView([userLat, userLng], 15);
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors',
              maxZoom: 19
            }).addTo(map);

            userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map).bindPopup('Your Location');
            
            if (providerLat && providerLng) {
              providerMarker = L.marker([providerLat, providerLng], { icon: providerIcon }).addTo(map).bindPopup('Provider');
              fitBounds();
            }
          }

          function fitBounds() {
            if (userMarker && providerMarker) {
              const bounds = L.latLngBounds([userMarker.getLatLng(), providerMarker.getLatLng()]);
              map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 });
            }
          }

          window.updateProviderLocation = function(lat, lng) {
            if (!providerMarker) {
              providerMarker = L.marker([lat, lng], { icon: providerIcon }).addTo(map).bindPopup('Provider');
            } else {
              providerMarker.setLatLng([lat, lng]);
            }
            fitBounds();
          };

          // Initialize with props
          initMap(
            ${userLocation.latitude}, 
            ${userLocation.longitude}, 
            ${providerLocation ? providerLocation.latitude : 'null'}, 
            ${providerLocation ? providerLocation.longitude : 'null'}
          );
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml, baseUrl: 'https://vexa.in' }}
        style={styles.webview}
        javaScriptEnabled={true}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default LiveTrackingMap;
