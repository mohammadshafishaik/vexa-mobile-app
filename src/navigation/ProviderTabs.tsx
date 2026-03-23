import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Bell, User } from 'lucide-react-native';
import { ProviderTabParamList, ProviderStackParamList } from '../types';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/typography';
import { useNotificationStore } from '../store/useNotificationStore';

// Screens
import ProviderDashboardScreen from '../screens/provider/DashboardScreen';
import ModificationRequestScreen from '../screens/provider/ModificationRequestScreen';
import JobDetailScreen from '../screens/customer/JobDetailScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<ProviderTabParamList>();
const Stack = createNativeStackNavigator<ProviderStackParamList>();

// Dashboard tab wraps the dashboard in a stack with sub-screens
const DashboardStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.black },
      }}
    >
      <Stack.Screen name="DashboardHome" component={ProviderDashboardScreen} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} />
      <Stack.Screen
        name="ModificationRequest"
        component={ModificationRequestScreen}
      />
    </Stack.Navigator>
  );
};

const ProviderTabs: React.FC = () => {
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.gray500,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View>
              <Bell size={size} color={color} strokeWidth={1.5} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} strokeWidth={1.5} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.gray900,
    borderTopColor: colors.glassBorder,
    borderTopWidth: 0.5,
    height: 80,
    paddingTop: 8,
    paddingBottom: 24,
  },
  tabLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 10,
  },
});

export default ProviderTabs;
