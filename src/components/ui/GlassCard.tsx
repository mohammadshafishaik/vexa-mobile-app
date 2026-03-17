import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { borderRadius, shadows, spacing } from '../../theme/spacing';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  pressable?: boolean;
  onPress?: () => void;
  padding?: keyof typeof spacing;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  pressable = false,
  onPress,
  padding = 4,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (pressable) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (pressable) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }
  };

  const CardWrapper = pressable ? Animated.createAnimatedComponent(View) : View;

  return (
    <Animated.View
      style={[
        styles.card,
        { padding: spacing[padding] },
        animatedStyle,
        style,
      ]}
      onTouchStart={pressable ? handlePressIn : undefined}
      onTouchEnd={pressable ? handlePressOut : undefined}
      onTouchCancel={pressable ? handlePressOut : undefined}
    >
      {/* Inner glow border */}
      <View style={styles.innerBorder} />
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glassBackground,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
    ...shadows.glass,
  },
  innerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
});

export default GlassCard;
