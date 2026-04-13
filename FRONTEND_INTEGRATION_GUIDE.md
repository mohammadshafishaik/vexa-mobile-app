# Frontend Integration Guide

Quick reference for integrating new features into your React Native frontend.

## 📸 Image Upload Integration

### Single Image Upload

```typescript
import { launchImageLibrary } from 'react-native-image-picker';
import { uploadService } from '../services/upload';

const handleImagePick = async () => {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.8,
  });

  if (result.assets && result.assets[0]) {
    const imageUri = result.assets[0].uri;
    try {
      const url = await uploadService.uploadImage(imageUri);
      console.log('Uploaded URL:', url);
      // Use url in your job/dispute/KYC submission
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }
};
```

### Multiple Images Upload

```typescript
import { launchImageLibrary } from 'react-native-image-picker';
import { uploadService } from '../services/upload';

const handleMultipleImagePick = async () => {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.8,
    selectionLimit: 5, // Max 5 images
  });

  if (result.assets) {
    const imageUris = result.assets.map(asset => asset.uri).filter(Boolean);
    try {
      const urls = await uploadService.uploadMultipleImages(imageUris);
      console.log('Uploaded URLs:', urls);
      // Use urls array in job creation
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }
};
```

### Job Creation with Images

```typescript
import { jobService } from '../services/jobs';

const createJobWithImages = async () => {
  // First, upload images
  const imageUrls = await uploadService.uploadMultipleImages(selectedImageUris);
  
  // Then create job with image URLs
  const jobData = {
    title: 'Plumbing Repair',
    description: 'Fix leaking pipe',
    category: 'Plumbing',
    location: 'Mumbai, Maharashtra',
    latitude: 19.0760,
    longitude: 72.8777,
    images: imageUrls,
    originalPrice: 500,
    urgency: 'HIGH',
    scheduledAt: new Date('2026-04-15T10:00:00'),
  };
  
  const job = await jobService.createJob(jobData);
};
```

---

## 🔔 Push Notifications Integration

### Step 1: Install Firebase Messaging

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### Step 2: Request Permission & Get Token

```typescript
import messaging from '@react-native-firebase/messaging';
import { userService } from '../services/users';

const setupPushNotifications = async () => {
  // Request permission
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    // Get FCM token
    const fcmToken = await messaging().getToken();
    console.log('FCM Token:', fcmToken);
    
    // Register token with backend
    await userService.registerDeviceToken(fcmToken);
  }
};

// Call this after user logs in
useEffect(() => {
  setupPushNotifications();
}, []);
```

### Step 3: Handle Foreground Notifications

```typescript
import messaging from '@react-native-firebase/messaging';
import { useEffect } from 'react';

const App = () => {
  useEffect(() => {
    // Handle foreground notifications
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('Notification received:', remoteMessage);
      
      // Show in-app notification
      Alert.alert(
        remoteMessage.notification?.title || 'Notification',
        remoteMessage.notification?.body || ''
      );
    });

    return unsubscribe;
  }, []);

  return <YourApp />;
};
```

### Step 4: Handle Background Notifications

```typescript
// In index.js (before AppRegistry)
import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background notification:', remoteMessage);
});
```

### Step 5: Handle Notification Tap

```typescript
import messaging from '@react-native-firebase/messaging';
import { useNavigation } from '@react-navigation/native';

const useNotificationHandler = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Handle notification tap when app is in background
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened:', remoteMessage);
      
      // Navigate based on notification data
      if (remoteMessage.data?.jobId) {
        navigation.navigate('JobDetails', { jobId: remoteMessage.data.jobId });
      }
    });

    // Handle notification tap when app was closed
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('App opened from notification:', remoteMessage);
          if (remoteMessage.data?.jobId) {
            navigation.navigate('JobDetails', { jobId: remoteMessage.data.jobId });
          }
        }
      });
  }, []);
};
```

### Step 6: Remove Token on Logout

```typescript
import messaging from '@react-native-firebase/messaging';
import { userService } from '../services/users';

const handleLogout = async () => {
  const fcmToken = await messaging().getToken();
  await userService.removeDeviceToken(fcmToken);
  
  // Then proceed with logout
  await authService.logout();
};
```

---

## 📍 Location & GPS Integration

### Request Location Permission

```typescript
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

const requestLocationPermission = async () => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'VEXA needs access to your location to find nearby services',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};
```

### Get Current Location

```typescript
import Geolocation from '@react-native-community/geolocation';

const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  });
};
```

### Use in Job Creation

```typescript
const PostJobScreen = () => {
  const [location, setLocation] = useState({ latitude: null, longitude: null });

  const fetchLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      try {
        const coords = await getCurrentLocation();
        setLocation(coords);
      } catch (error) {
        console.error('Location error:', error);
      }
    }
  };

  const handleSubmit = async () => {
    const jobData = {
      title,
      description,
      category,
      location: 'Mumbai, Maharashtra', // Text location
      latitude: location.latitude,
      longitude: location.longitude,
      // ... other fields
    };
    
    await jobService.createJob(jobData);
  };

  return (
    <View>
      <Button title="Use Current Location" onPress={fetchLocation} />
      {/* Rest of form */}
    </View>
  );
};
```

---

## 📅 Calendar & Scheduling Integration

### Install Date Time Picker

```bash
npm install @react-native-community/datetimepicker
```

### Date Time Picker Component

```typescript
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Button, Text, View } from 'react-native';

const SchedulePicker = ({ onScheduleChange }) => {
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      setScheduledDate(selectedDate);
      onScheduleChange(selectedDate);
    }
  };

  return (
    <View>
      <Text>Scheduled Date: {scheduledDate.toLocaleString()}</Text>
      <Button title="Pick Date & Time" onPress={() => setShowPicker(true)} />
      
      {showPicker && (
        <DateTimePicker
          value={scheduledDate}
          mode="datetime"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </View>
  );
};
```

### Use in Job Creation

```typescript
const PostJobScreen = () => {
  const [scheduledAt, setScheduledAt] = useState(null);

  const handleSubmit = async () => {
    const jobData = {
      title,
      description,
      category,
      location,
      scheduledAt: scheduledAt?.toISOString(), // Send as ISO string
      // ... other fields
    };
    
    await jobService.createJob(jobData);
  };

  return (
    <View>
      <SchedulePicker onScheduleChange={setScheduledAt} />
      {/* Rest of form */}
    </View>
  );
};
```

---

## 🎨 Skeleton Loader Component

```typescript
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const Skeleton = ({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#E0E0E0',
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

// Usage: Job Card Skeleton
const JobCardSkeleton = () => (
  <View style={styles.card}>
    <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
    <Skeleton width="100%" height={16} style={{ marginBottom: 4 }} />
    <Skeleton width="100%" height={16} style={{ marginBottom: 4 }} />
    <Skeleton width="80%" height={16} style={{ marginBottom: 12 }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Skeleton width={80} height={32} borderRadius={16} />
      <Skeleton width={100} height={32} borderRadius={16} />
    </View>
  </View>
);

// Usage in List
const JobList = () => {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);

  if (loading) {
    return (
      <View>
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </View>
    );
  }

  return <FlatList data={jobs} renderItem={renderJob} />;
};
```

---

## 👤 Provider Profile & KYC

### Submit KYC Documents

```typescript
import { launchImageLibrary } from 'react-native-image-picker';
import { uploadService } from '../services/upload';
import { userService } from '../services/users';

const KYCScreen = () => {
  const [kycImages, setKycImages] = useState([]);

  const handlePickKYCDocuments = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.9,
      selectionLimit: 2, // Front and back of ID
    });

    if (result.assets) {
      const uris = result.assets.map(asset => asset.uri).filter(Boolean);
      setKycImages(uris);
    }
  };

  const handleSubmitKYC = async () => {
    try {
      // Upload images
      const urls = await uploadService.uploadMultipleImages(kycImages);
      
      // Submit KYC
      const response = await userService.submitKYC(urls);
      
      Alert.alert('Success', 'KYC documents submitted for verification');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit KYC documents');
    }
  };

  return (
    <View>
      <Button title="Pick ID Documents" onPress={handlePickKYCDocuments} />
      <Text>{kycImages.length} documents selected</Text>
      <Button title="Submit for Verification" onPress={handleSubmitKYC} />
    </View>
  );
};
```

### View Provider Profile

```typescript
import { userService } from '../services/users';
import { CheckCircle } from 'lucide-react-native';

const ProviderProfileScreen = ({ route }) => {
  const { providerId } = route.params;
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const data = await userService.getUserProfile(providerId);
    setProfile(data.data);
  };

  if (!profile) return <ActivityIndicator />;

  return (
    <ScrollView>
      <View style={styles.header}>
        <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.name}>{profile.name}</Text>
            {profile.kycStatus === 'VERIFIED' && (
              <CheckCircle size={20} color="#4CAF50" style={{ marginLeft: 8 }} />
            )}
          </View>
          <Text style={styles.email}>{profile.email}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.completedJobsCount}</Text>
          <Text style={styles.statLabel}>Jobs Completed</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.averageRating.toFixed(1)} ⭐</Text>
          <Text style={styles.statLabel}>Average Rating</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.totalRatings}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Reviews</Text>
      {profile.ratingsReceived.map((rating) => (
        <View key={rating.id} style={styles.review}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.reviewerName}>{rating.rater.name}</Text>
            <Text style={styles.reviewScore}>{'⭐'.repeat(rating.score)}</Text>
          </View>
          <Text style={styles.reviewText}>{rating.review}</Text>
          <Text style={styles.reviewDate}>
            {new Date(rating.createdAt).toLocaleDateString()}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};
```

---

## 🔄 Real-Time Updates with Socket.io

### Listen for Modification Requests (Customer)

```typescript
import { useEffect } from 'react';
import { socketService } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';

const CustomerJobScreen = ({ jobId }) => {
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    // Join user room
    socketService.joinUserRoom(user.id);

    // Listen for modification requests
    socketService.on('modification:requested', (data) => {
      if (data.jobId === jobId) {
        Alert.alert(
          'Modification Request',
          `Provider requested a price change to ₹${data.modification.revisedPrice}`,
          [
            { text: 'View Details', onPress: () => {/* Navigate to modification screen */} }
          ]
        );
        // Refresh job data
        loadJob();
      }
    });

    return () => {
      socketService.off('modification:requested');
    };
  }, [jobId]);

  return <View>{/* Job details */}</View>;
};
```

### Listen for Modification Responses (Provider)

```typescript
const ProviderJobScreen = ({ jobId }) => {
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    socketService.joinUserRoom(user.id);

    socketService.on('modification:updated', (data) => {
      if (data.jobId === jobId) {
        const status = data.approvalStatus === 'APPROVED' ? 'approved' : 'rejected';
        Alert.alert(
          'Modification Response',
          `Customer ${status} your modification request`
        );
        loadJob();
      }
    });

    return () => {
      socketService.off('modification:updated');
    };
  }, [jobId]);

  return <View>{/* Job details */}</View>;
};
```

---

## 🎯 Complete Example: Post Job with All Features

```typescript
import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Alert, ScrollView } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Geolocation from '@react-native-community/geolocation';
import { uploadService } from '../services/upload';
import { jobService } from '../services/jobs';

const PostJobScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [originalPrice, setOriginalPrice] = useState('');
  const [urgency, setUrgency] = useState('NORMAL');
  const [scheduledAt, setScheduledAt] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handlePickImages = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 5,
    });

    if (result.assets) {
      setSelectedImages(result.assets.map(asset => asset.uri).filter(Boolean));
    }
  };

  const handleGetLocation = async () => {
    try {
      const coords = await getCurrentLocation();
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      Alert.alert('Success', 'Location captured');
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !category || !location) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setUploading(true);
    try {
      // Upload images
      let imageUrls = [];
      if (selectedImages.length > 0) {
        imageUrls = await uploadService.uploadMultipleImages(selectedImages);
      }

      // Create job
      const jobData = {
        title,
        description,
        category,
        location,
        latitude,
        longitude,
        images: imageUrls,
        originalPrice: parseFloat(originalPrice) || 0,
        urgency,
        scheduledAt: scheduledAt?.toISOString(),
      };

      const response = await jobService.createJob(jobData);
      
      Alert.alert('Success', 'Job posted successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to post job');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <TextInput
        placeholder="Job Title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      
      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={styles.input}
      />
      
      <TextInput
        placeholder="Category"
        value={category}
        onChangeText={setCategory}
        style={styles.input}
      />
      
      <TextInput
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
        style={styles.input}
      />
      
      <Button title="Use Current Location" onPress={handleGetLocation} />
      
      <TextInput
        placeholder="Budget (₹)"
        value={originalPrice}
        onChangeText={setOriginalPrice}
        keyboardType="numeric"
        style={styles.input}
      />
      
      <Button 
        title={`Schedule: ${scheduledAt ? scheduledAt.toLocaleString() : 'Not set'}`}
        onPress={() => setShowDatePicker(true)} 
      />
      
      {showDatePicker && (
        <DateTimePicker
          value={scheduledAt || new Date()}
          mode="datetime"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setScheduledAt(date);
          }}
          minimumDate={new Date()}
        />
      )}
      
      <Button title="Add Photos" onPress={handlePickImages} />
      <Text>{selectedImages.length} photos selected</Text>
      
      <Button 
        title={uploading ? 'Posting...' : 'Post Job'}
        onPress={handleSubmit}
        disabled={uploading}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
});

export default PostJobScreen;
```

---

## 📱 Android Manifest Permissions

Add these permissions to `vexa/android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
  <!-- Internet -->
  <uses-permission android:name="android.permission.INTERNET" />
  
  <!-- Location -->
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
  
  <!-- Camera & Storage -->
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
  
  <!-- Push Notifications -->
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  
  <application>
    <!-- ... -->
  </application>
</manifest>
```

---

## 🚀 Quick Start Checklist

- [ ] Install dependencies: `npm install`
- [ ] Set up Firebase and add `google-services.json`
- [ ] Configure backend URL in `api.ts`
- [ ] Implement image picker in job creation screen
- [ ] Add push notification setup in App.tsx
- [ ] Add location picker in job creation screen
- [ ] Add date/time picker for scheduling
- [ ] Implement skeleton loaders in list screens
- [ ] Add KYC upload screen for providers
- [ ] Test all features end-to-end

---

## 📞 Support

For detailed setup instructions, see:
- [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
