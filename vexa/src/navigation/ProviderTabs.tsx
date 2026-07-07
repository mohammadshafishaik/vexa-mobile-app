import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Bell, User, MessageCircle } from 'lucide-react-native';
import { ProviderTabParamList, ProviderStackParamList } from '../types';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/typography';
import { useNotificationStore } from '../store/useNotificationStore';

// Screens
import ProviderDashboardScreen from '../screens/provider/DashboardScreen';
import ModificationRequestScreen from '../screens/provider/ModificationRequestScreen';
import SkillsManagementScreen from '../screens/provider/SkillsManagementScreen';
import PortfolioManagementScreen from '../screens/provider/PortfolioManagementScreen';
import AvailabilityScreen from '../screens/provider/AvailabilityScreen';
import JobDetailScreen from '../screens/customer/JobDetailScreen';
import LiveBiddingScreen from '../screens/customer/LiveBiddingScreen';
import PaymentScreen from '../screens/customer/PaymentScreen';
import RatingScreen from '../screens/customer/RatingScreen';
import DisputeScreen from '../screens/customer/DisputeScreen';
import ChatScreen from '../screens/ChatScreen';
import ProviderProfileScreen from '../screens/ProviderProfileScreen';
import MessagesScreen from '../screens/MessagesScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

const Tab = createBottomTabNavigator<ProviderTabParamList>();
const DashStack = createNativeStackNavigator<ProviderStackParamList>();
const MessagesStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// Dashboard tab wraps the dashboard in a stack with sub-screens
const DashboardStackScreen: React.FC = () => {
  return (
    <DashStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.black },
      }}
    >
      <DashStack.Screen name="DashboardHome" component={ProviderDashboardScreen} />
      <DashStack.Screen name="JobDetail" component={JobDetailScreen} />
      <DashStack.Screen name="LiveBidding" component={LiveBiddingScreen} />
      <DashStack.Screen
        name="ModificationRequest"
        component={ModificationRequestScreen}
      />
      <DashStack.Screen name="Payment" component={PaymentScreen} />
      <DashStack.Screen name="Rating" component={RatingScreen} />
      <DashStack.Screen name="Dispute" component={DisputeScreen} />
      <DashStack.Screen name="Chat" component={ChatScreen} />
      <DashStack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
      <DashStack.Screen name="SkillsManagement" component={SkillsManagementScreen} />
      <DashStack.Screen name="PortfolioManagement" component={PortfolioManagementScreen} />
      <DashStack.Screen name="Availability" component={AvailabilityScreen} />
    </DashStack.Navigator>
  );
};

// Messages tab with sub-screens
const MessagesStackScreen: React.FC = () => {
  return (
    <MessagesStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.black },
      }}
    >
      <MessagesStack.Screen name="MessagesHome" component={MessagesScreen} />
      <MessagesStack.Screen name="Chat" component={ChatScreen} />
    </MessagesStack.Navigator>
  );
};

// Profile tab with sub-screens
const ProfileStackScreen: React.FC = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.black },
      }}
    >
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <ProfileStack.Screen name="SkillsManagement" component={SkillsManagementScreen} />
      <ProfileStack.Screen name="PortfolioManagement" component={PortfolioManagementScreen} />
      <ProfileStack.Screen name="Availability" component={AvailabilityScreen} />
    </ProfileStack.Navigator>
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
        component={DashboardStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStackScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} strokeWidth={1.5} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
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
