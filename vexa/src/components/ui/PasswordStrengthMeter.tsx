import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { fontFamilies, fontSizes, typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { PasswordStrength } from '../../utils/validation';

interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
  show: boolean;
}

const strengthColors = {
  weak: '#EF4444',
  medium: '#F59E0B',
  strong: '#10B981',
};

const strengthLabels = {
  weak: 'Weak',
  medium: 'Medium',
  strong: 'Strong',
};

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  strength,
  show,
}) => {
  if (!show) return null;

  const barWidth = `${(strength.score / 5) * 100}%`;
  const barColor = strengthColors[strength.strength];

  const animatedBarStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(barColor, { duration: 300 }),
  }));

  return (
    <View style={styles.container}>
      {/* Strength Bar */}
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <Animated.View style={[styles.barFill, animatedBarStyle, { width: barWidth as any }]} />
        </View>
        <Text style={[styles.strengthLabel, { color: barColor }]}>
          {strengthLabels[strength.strength]}
        </Text>
      </View>

      {/* Requirements Checklist */}
      <View style={styles.checklistContainer}>
        <CheckItem label="8+ characters" checked={strength.checks.minLength} />
        <CheckItem label="Uppercase" checked={strength.checks.hasUppercase} />
        <CheckItem label="Lowercase" checked={strength.checks.hasLowercase} />
        <CheckItem label="Number" checked={strength.checks.hasNumber} />
        <CheckItem label="Special (!@#$)" checked={strength.checks.hasSpecial} />
      </View>
    </View>
  );
};

const CheckItem: React.FC<{ label: string; checked: boolean }> = ({
  label,
  checked,
}) => {
  return (
    <View style={styles.checkItem}>
      {checked ? (
        <Check size={12} color={colors.success} strokeWidth={3} />
      ) : (
        <X size={12} color={colors.gray600} strokeWidth={2} />
      )}
      <Text
        style={[
          styles.checkLabel,
          checked ? styles.checkLabelChecked : styles.checkLabelUnchecked,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[1],
    marginBottom: spacing[2],
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  barBackground: {
    flex: 1,
    height: 4,
    backgroundColor: colors.gray800,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: 56,
    textAlign: 'right',
  },
  checklistContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    backgroundColor: colors.gray900,
    borderRadius: borderRadius.full,
  },
  checkLabel: {
    fontSize: 11,
    fontFamily: fontFamilies.medium,
  },
  checkLabelChecked: {
    color: colors.gray300,
  },
  checkLabelUnchecked: {
    color: colors.gray600,
  },
});

export default PasswordStrengthMeter;
