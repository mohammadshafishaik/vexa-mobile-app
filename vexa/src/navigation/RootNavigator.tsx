import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { useJobStore } from '../store/useJobStore';
import { socketService } from '../services/socket';
import { NotificationService } from '../services/NotificationService';
import api from '../services/api';
import { colors } from '../theme/colors';
import { UserRole } from '../types';

// Stacks
import AuthStack from './AuthStack';
import CustomerTabs from './CustomerTabs';
import ProviderTabs from './ProviderTabs';
import SplashScreen from '../screens/SplashScreen';
import AuthLoadingScreen from '../screens/AuthLoadingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const updateJob = useJobStore((s) => s.updateJob);

  React.useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();

      socketService.onJobStatusChange((data: any) => {
        if (data && data.jobId) {
          updateJob(data.jobId, { status: data.status });
        }
      });

      socketService.onModificationSubmitted((data: any) => {
         if (data && data.jobId) {
            updateJob(data.jobId, { status: 'MODIFICATION_REQUESTED' as any });
         }
      });

      // Register Push Notifications
      const registerPush = async () => {
        try {
          const hasPermission = await NotificationService.requestUserPermission();
          if (hasPermission) {
            const token = await NotificationService.getToken();
            if (token) {
              await api.post('/users/device-token', { deviceToken: token });
            }
          }
        } catch (error) {
          console.warn('Failed to register push token:', error);
        }
      };
      registerPush();
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated, updateJob]);

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.white,
          background: colors.black,
          card: colors.gray900,
          text: colors.white,
          border: colors.glassBorder,
          notification: colors.error,
        },
        fonts: {
          regular: { fontFamily: 'Inter', fontWeight: '400' },
          medium: { fontFamily: 'Inter-Medium', fontWeight: '500' },
          bold: { fontFamily: 'Inter-Bold', fontWeight: '700' },
          heavy: { fontFamily: 'Inter-Bold', fontWeight: '900' },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.black },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <>
            <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
            {user?.role === UserRole.PROVIDER ? (
              <Stack.Screen name="ProviderMain" component={ProviderTabs} />
            ) : (
              <Stack.Screen name="CustomerMain" component={CustomerTabs} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
