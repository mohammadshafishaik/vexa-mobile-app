import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Bell, User } from 'lucide-react-native';
import { CustomerTabParamList, CustomerStackParamList } from '../types';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/typography';
import { useNotificationStore } from '../store/useNotificationStore';

// Screens
import CustomerDashboardScreen from '../screens/customer/DashboardScreen';
import PostJobScreen from '../screens/customer/PostJobScreen';
import LiveBiddingScreen from '../screens/customer/LiveBiddingScreen';
import JobDetailScreen from '../screens/customer/JobDetailScreen';
import RevisionApprovalScreen from '../screens/customer/RevisionApprovalScreen';
import PaymentScreen from '../screens/customer/PaymentScreen';
import RatingScreen from '../screens/customer/RatingScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const DashStack = createNativeStackNavigator<CustomerStackParamList>();
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
      <DashStack.Screen name="DashboardHome" component={CustomerDashboardScreen} />
      <DashStack.Screen name="PostJob" component={PostJobScreen} />
      <DashStack.Screen name="LiveBidding" component={LiveBiddingScreen} />
      <DashStack.Screen name="JobDetail" component={JobDetailScreen} />
      <DashStack.Screen name="RevisionApproval" component={RevisionApprovalScreen} />
      <DashStack.Screen name="Payment" component={PaymentScreen} />
      <DashStack.Screen name="Rating" component={RatingScreen} />
    </DashStack.Navigator>
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
    </ProfileStack.Navigator>
  );
};

const CustomerTabs: React.FC = () => {
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

export default CustomerTabs;
