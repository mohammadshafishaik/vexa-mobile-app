import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutUp,
} from 'react-native-reanimated';
import { Bell, X, ChevronRight } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NotificationToastProps {
  visible: boolean;
  title: string;
  body: string;
  type?: string;
  onPress?: () => void;
  onDismiss?: () => void;
}

const typeColors: Record<string, string> = {
  BID_RECEIVED: colors.info,
  BID_ACCEPTED: colors.success,
  PAYMENT_COMPLETED: colors.success,
  MODIFICATION_REQUEST: colors.warning,
  DISPUTE_OPENED: colors.error,
  JOB_UPDATE: colors.info,
  SYSTEM: colors.gray400,
};

const NotificationToast: React.FC<NotificationToastProps> = ({
  visible,
  title,
  body,
  type = 'SYSTEM',
  onPress,
  onDismiss,
}) => {
  const progressAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      progressAnim.setValue(1);
      RNAnimated.timing(progressAnim, {
        toValue: 0,
        duration: 4000,
        useNativeDriver: false,
      }).start(() => {
        onDismiss?.();
      });
    }
  }, [visible]);

  if (!visible) return null;

  const accentColor = typeColors[type] || colors.gray400;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18).stiffness(120).mass(0.8)}
      exiting={SlideOutUp.duration(300)}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.toast}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Accent line */}
        <View style={[styles.accentLine, { backgroundColor: accentColor }]} />

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20` }]}>
          <Bell size={18} color={accentColor} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {body}
          </Text>
        </View>

        {/* Dismiss */}
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismissButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <X size={16} color={colors.gray500} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <RNAnimated.View
          style={[
            styles.progressBar,
            {
              width: progressWidth,
              backgroundColor: accentColor,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: spacing[4],
    right: spacing[4],
    zIndex: 9999,
    elevation: 10,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray900,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  content: {
    flex: 1,
    marginRight: spacing[2],
  },
  title: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.sm,
    color: colors.white,
    marginBottom: 2,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.gray400,
    lineHeight: 16,
  },
  dismissButton: {
    padding: spacing[1],
  },
  progressContainer: {
    height: 2,
    backgroundColor: colors.gray800,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: -1,
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  },
});

export default NotificationToast;
