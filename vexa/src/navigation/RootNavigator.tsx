import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/useAuthStore';
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
  const isHydrated = useAuthStore((s) => s.isHydrated);

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
