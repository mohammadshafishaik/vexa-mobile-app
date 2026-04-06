import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Bell, Check, CheckCheck } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../components/layout/ScreenContainer';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import { colors } from '../theme/colors';
import { fontFamilies, fontSizes, typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { useNotificationStore } from '../store/useNotificationStore';
import { Notification, NotificationType } from '../types';
import { formatRelativeTime } from '../utils/helpers';
import api from '../services/api';

const getNotificationIcon = (type: NotificationType) => {
  const iconColors: Partial<Record<NotificationType, string>> = {
    [NotificationType.BID_RECEIVED]: colors.info,
    [NotificationType.BID_ACCEPTED]: colors.success,
    [NotificationType.PAYMENT_COMPLETED]: colors.success,
    [NotificationType.MODIFICATION_REQUEST]: colors.warning,
    [NotificationType.DISPUTE_OPENED]: colors.error,
  };
  return iconColors[type] ?? colors.gray400;
};

const NotificationScreen: React.FC = () => {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const setLoading = useNotificationStore((s) => s.setLoading);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [setNotifications, setLoading]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
      try {
        await api.patch('/notifications/read', { ids: [notification.id] });
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    markAllAsRead();
    try {
      await api.patch('/notifications/read', {});
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const renderNotification = ({
    item,
    index,
  }: {
    item: Notification;
    index: number;
  }) => (
    <Animated.View entering={FadeInRight.delay(index * 60).duration(300)}>
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.isRead && styles.notificationUnread,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconDot,
            { backgroundColor: getNotificationIcon(item.type) },
          ]}
        />
        <View style={styles.notificationContent}>
          <Text
            style={[
              styles.notificationTitle,
              !item.isRead && styles.notificationTitleUnread,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notificationTime}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <View style={styles.markAllButton}>
              <CheckCheck size={16} color={colors.gray400} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchNotifications}
            tintColor={colors.white}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={colors.white} style={{ marginTop: 60 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Bell size={32} color={colors.gray500} />
              </View>
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtitle}>
                You'll be notified about bids, payments, and job updates
              </Text>
            </View>
          )
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: colors.white,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  markAllText: {
    ...typography.bodySm,
    color: colors.gray400,
  },
  listContent: {
    paddingBottom: spacing[20],
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[4],
    marginBottom: spacing[1],
    borderRadius: borderRadius.md,
  },
  notificationUnread: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  iconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: spacing[3],
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.base,
    color: colors.gray300,
    marginBottom: 2,
  },
  notificationTitleUnread: {
    fontFamily: fontFamilies.semibold,
    color: colors.white,
  },
  notificationBody: {
    ...typography.bodySm,
    color: colors.gray500,
    lineHeight: 20,
    marginBottom: spacing[1],
  },
  notificationTime: {
    ...typography.caption,
    color: colors.gray600,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.info,
    marginTop: 8,
    marginLeft: spacing[2],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray900,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.lg,
    color: colors.white,
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
    maxWidth: 280,
  },
});

export default NotificationScreen;
