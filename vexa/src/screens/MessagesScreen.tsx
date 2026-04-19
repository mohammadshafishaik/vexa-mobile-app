import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MessageCircle } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/typography';
import { ChatConversation } from '../types';
import { chatService } from '../services/chat';

const MessagesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderConversation = ({ item }: { item: ChatConversation }) => {
    const hasUnread = item.unreadCount > 0;
    const otherUser = item.otherUser;

    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => navigation.navigate('Chat', { jobId: item.jobId })}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        {otherUser?.avatarUrl ? (
          <Image source={{ uri: otherUser.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {(otherUser?.name || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.conversationContent}>
          <View style={styles.topRow}>
            <Text style={[styles.userName, hasUnread && styles.userNameBold]} numberOfLines={1}>
              {otherUser?.name || 'Unknown'}
            </Text>
            {item.lastMessage && (
              <Text style={[styles.timeText, hasUnread && styles.timeTextUnread]}>
                {formatTime(item.lastMessage.createdAt)}
              </Text>
            )}
          </View>

          <Text style={styles.orderId}>#{item.orderId}</Text>

          <View style={styles.bottomRow}>
            <Text
              style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {item.lastMessage
                ? item.lastMessage.messageType === 'IMAGE'
                  ? '📷 Photo'
                  : item.lastMessage.content
                : 'No messages yet'}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 9 ? '9+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
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
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.jobId}
        renderItem={renderConversation}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageCircle size={48} color={colors.gray600} />
            <Text style={styles.emptyText}>No conversations</Text>
            <Text style={styles.emptySubtext}>
              Messages will appear here when you start chatting with a customer or provider
            </Text>
          </View>
        }
      />
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
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.glassBorder,
    backgroundColor: colors.gray900,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 28,
    color: colors.white,
  },
  // List
  listContent: {
    flexGrow: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.glassBorder,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.gray700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    color: colors.white,
  },
  conversationContent: {
    flex: 1,
    marginLeft: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    color: colors.white,
    flex: 1,
  },
  userNameBold: {
    fontFamily: fontFamilies.bold,
  },
  timeText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.gray500,
    marginLeft: 8,
  },
  timeTextUnread: {
    color: colors.white,
  },
  orderId: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.gray500,
    marginTop: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  lastMessage: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.gray400,
    flex: 1,
  },
  lastMessageUnread: {
    fontFamily: fontFamilies.medium,
    color: colors.white,
  },
  unreadBadge: {
    backgroundColor: colors.white,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    color: colors.black,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    color: colors.gray400,
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.gray500,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MessagesScreen;
