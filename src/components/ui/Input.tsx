import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { typography, fontFamilies } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  icon,
  rightIcon,
  containerStyle,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useSharedValue(0);

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusAnim.value,
      [0, 1],
      [error ? colors.error : colors.gray700, error ? colors.error : colors.white],
    );
    return { borderColor };
  });

  const handleFocus = () => {
    setIsFocused(true);
    focusAnim.value = withTiming(1, { duration: 200 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusAnim.value = withTiming(0, { duration: 200 });
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View style={[styles.inputWrapper, animatedBorderStyle]}>
        {icon && <View style={styles.iconLeft}>{icon}</View>}
        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            icon ? { paddingLeft: 0 } : undefined,
            rightIcon ? { paddingRight: 0 } : undefined,
          ]}
          placeholderTextColor={colors.gray500}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={colors.white}
        />
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </Animated.View>
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  label: {
    ...typography.label,
    color: colors.gray400,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray900,
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    color: colors.white,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
  },
  iconLeft: {
    marginRight: spacing[2],
  },
  iconRight: {
    marginLeft: spacing[2],
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing[1],
  },
  hint: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: spacing[1],
  },
});

export default Input;
