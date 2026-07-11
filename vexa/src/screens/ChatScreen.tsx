import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, SafeAreaView, Image, ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Send, Check, CheckCheck } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/typography';
import { ChatMessage } from '../types';
import { chatService } from '../services/chat';
import { socketService } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';
import { recommendationService } from '../services/recommendations';

const ChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { jobId } = route.params;
  const user = useAuthStore((s) => s.user);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [aiSafetyNote, setAiSafetyNote] = useState('');
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      const result = await chatService.getMessages(jobId);
      setMessages(result.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadMessages();

    // Join chat room
    socketService.joinChatRoom(jobId);

    // Mark messages as read
    chatService.markAsRead(jobId).catch(() => {});

    // Listen for new messages
    socketService.onChatMessage((message: any) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      // Mark as read since we're viewing the chat
      chatService.markAsRead(jobId).catch(() => {});
    });

    // Listen for typing indicators
    socketService.onChatTyping((data) => {
      if (data.userId !== user?.id && data.jobId === jobId) {
        setOtherTyping(data.isTyping);
      }
    });

    // Listen for read receipts
    socketService.onChatRead((data) => {
      if (data.jobId === jobId && data.readBy !== user?.id) {
        setMessages((prev) => prev.map((m) =>
          m.senderId === user?.id ? { ...m, isRead: true } : m
        ));
      }
    });

    return () => {
      socketService.leaveChatRoom(jobId);
      socketService.off('chat:message');
      socketService.off('chat:typing');
      socketService.off('chat:read');
    };
  }, [jobId, user?.id, loadMessages]);

  const getAiMessageSeed = useCallback((latestMessage?: string) => {
    const directSeed = (latestMessage || '').trim();
    if (directSeed) return directSeed;

    const latestIncoming = [...messages]
      .reverse()
      .find((message) => message.senderId !== user?.id && String(message.content || '').trim().length > 0);

    if (latestIncoming?.content) {
      return latestIncoming.content.trim();
    }

    const latestMessageInThread = [...messages]
      .reverse()
      .find((message) => String(message.content || '').trim().length > 0);

    if (latestMessageInThread?.content) {
      return latestMessageInThread.content.trim();
    }

    return inputText.trim();
  }, [messages, user?.id, inputText]);

  const generateSmartReplies = useCallback(async (latestMessage?: string) => {
    const messageSeed = getAiMessageSeed(latestMessage);
    if (!messageSeed) {
      setSmartReplies([]);
      return;
    }

    setIsGeneratingReplies(true);
    try {
      const recommendation = await recommendationService.suggestChatReplies({
        latestMessage: messageSeed,
        draft: inputText,
      });
      setSmartReplies(recommendation.quickReplies || []);
      setAiSafetyNote(recommendation.safetyNote || '');
    } catch {
      setSmartReplies([]);
      setAiSafetyNote('');
    } finally {
      setIsGeneratingReplies(false);
    }
  }, [inputText, getAiMessageSeed]);

  useEffect(() => {
    if (!messages.length || !user?.id) return;

    const latest = messages[messages.length - 1];
    if (latest.senderId !== user.id) {
      generateSmartReplies(latest.content);
    }
  }, [messages, user?.id, generateSmartReplies]);

  const aiSectionLabel = user?.role === 'PROVIDER'
    ? 'Provider AI Assistant'
    : 'Customer AI Assistant';

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');

    // Send typing stop
    if (user?.id) {
      socketService.sendTypingIndicator(jobId, user.id, false);
    }

    try {
      // Emit message natively via socket.io instead of REST API
      socketService.sendChatMessage({
        jobId,
        senderId: user!.id,
        content: text,
      });
      
      // Scroll to bottom optimistically (message will be added by socket listener)
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message via socket:', error);
      setInputText(text); // Restore text on failure
    } finally {
      setSending(false);
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (user?.id) {
      socketService.sendTypingIndicator(jobId, user.id, text.length > 0);

      // Auto-stop typing after 3 seconds of inactivity
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketService.sendTypingIndicator(jobId, user.id, false);
      }, 3000);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].createdAt).toDateString();
    const prevDate = new Date(messages[index - 1].createdAt).toDateString();
    return currentDate !== prevDate;
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMine = item.senderId === user?.id;
    const showDate = shouldShowDateSeparator(index);

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            <View style={styles.dateLine} />
          </View>
        )}
        <View style={[styles.messageRow, isMine && styles.messageRowRight]}>
          {!isMine && item.sender?.avatarUrl && (
            <Image source={{ uri: item.sender.avatarUrl }} style={styles.avatar} />
          )}
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            {item.messageType === 'IMAGE' && item.imageUrl && (
              <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
            )}
            {item.content ? (
              <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
                {item.content}
              </Text>
            ) : null}
            <View style={styles.messageFooter}>
              <Text style={[styles.timeText, isMine && styles.timeTextMine]}>
                {formatTime(item.createdAt)}
              </Text>
              {isMine && (
                item.isRead 
                  ? <CheckCheck size={14} color={colors.info} style={{ marginLeft: 4 }} />
                  : <Check size={14} color={colors.gray400} style={{ marginLeft: 4 }} />
              )}
            </View>
          </View>
        </View>
      </View>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Chat</Text>
          {otherTyping && (
            <Text style={styles.typingText}>typing...</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          }
        />

        <View style={styles.aiSuggestionsWrap}>
          <View style={styles.aiSuggestionsHeader}>
            <Text style={styles.aiSuggestionsLabel}>{aiSectionLabel}</Text>
            <TouchableOpacity
              onPress={() => {
                const latest = messages[messages.length - 1];
                generateSmartReplies(latest?.content || '');
              }}
              disabled={isGeneratingReplies}
            >
              <Text style={styles.aiRefreshText}>{isGeneratingReplies ? 'Generating...' : 'Generate Replies'}</Text>
            </TouchableOpacity>
          </View>

          {smartReplies.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {smartReplies.map((reply, index) => (
                <TouchableOpacity
                  key={`${reply}-${index}`}
                  style={styles.aiChip}
                  onPress={() => setInputText(reply)}
                >
                  <Text style={styles.aiChipText}>{reply}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.aiEmptyText}>
              Tap "Generate Replies" to get context-aware AI suggestions.
            </Text>
          )}

          {aiSafetyNote ? (
            <Text style={styles.aiSafetyText}>{aiSafetyNote}</Text>
          ) : null}
        </View>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={handleTextChange}
            placeholder="Type a message..."
            placeholderTextColor={colors.gray500}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Send size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.glassBorder,
    backgroundColor: colors.gray900,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassWhite,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    color: colors.white,
  },
  typingText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.success,
    marginTop: 2,
  },
  // Messages
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    maxWidth: '80%',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  bubbleMine: {
    backgroundColor: colors.white,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.gray800,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    color: colors.white,
    lineHeight: 20,
  },
  messageTextMine: {
    color: colors.black,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 6,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: colors.gray500,
  },
  timeTextMine: {
    color: colors.gray600,
  },
  // Date Separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: colors.glassBorder,
  },
  dateText: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: colors.gray500,
    marginHorizontal: 12,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
    color: colors.gray400,
  },
  emptySubtext: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: colors.gray500,
    marginTop: 4,
  },
  aiSuggestionsWrap: {
    borderTopWidth: 0.5,
    borderTopColor: colors.glassBorder,
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 4,
    backgroundColor: colors.gray900,
  },
  aiSuggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiSuggestionsLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    color: colors.gray400,
  },
  aiRefreshText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    color: colors.white,
  },
  aiChip: {
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  aiChipText: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: colors.white,
  },
  aiEmptyText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: colors.gray500,
    marginBottom: 8,
  },
  aiSafetyText: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    color: colors.gray500,
    marginBottom: 6,
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: colors.glassBorder,
    backgroundColor: colors.gray900,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.gray800,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    color: colors.white,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});

export default ChatScreen;
